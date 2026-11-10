/**
 * /api/line/start — LINEの同意画面へ送り出す。
 *   GET ?mode=link            … ログイン中の自分のアカウントにLINEを紐づける
 *   GET ?mode=login           … 紐づけ済みの人が、LINEでログインする
 *   GET ?mode=register&t=…    … LINEで新規登録する（t は /api/line/register の引換券）
 *
 * 往復のあいだに必要なもの（誰の手続きか・nonce）は、署名付きの state に
 * 入れて持たせる。Cookieに預けないのは、iPhoneのホーム画面に追加した
 * アプリからLINEへ行くと、戻り先がSafariになり、Cookieの置き場が別で
 * 読めなくなるため。署名があるので、書き換えられたものは通らない。
 *
 * PKCE の code_verifier は state から計算し直す（lineAuth.verifierFor）。
 * 持ち歩かせないので、URLにも履歴にも残らない。
 */
import { readSession, readCookie, MEMBER_COOKIE, signValue, readValue } from "@/lib/security";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";
import {
  lineEnabled, buildAuthUrl, randomToken, redirectUri, verifierFor, resultPage,
} from "@/lib/lineAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 往復に使える時間。同意画面で迷っても足りるが、放置すれば切れる */
const ROUND_TRIP_SECONDS = 10 * 60;

export async function GET(request: Request) {
  const rl = rateLimit(`line-start:${clientIp(request.headers)}`, { limit: 20, windowMs: 10 * 60_000 });
  if (!rl.ok) return tooMany(rl.retryAfter);

  if (!lineEnabled()) {
    return Response.json({ ok: false, error: "LINEログインは設定されていません。" }, { status: 503 });
  }

  const params = new URL(request.url).searchParams;
  const asked = params.get("mode");
  const mode = asked === "login" || asked === "register" ? asked : "link";

  /*
   * ホーム画面アプリ用の受け渡し（src/lib/loginHandoff.ts）。
   *   ph  … アプリが作った合言葉の指紋。指紋だけでは引き出せないので往復に載せてよい
   *   pwa … ホーム画面アプリから来たか。戻り先の案内文を変えるのに使う
   * どちらも無くても動く（そのときは今までどおりSafariの中で完結する）。
   */
  const ph = params.get("ph") ?? "";
  const handoff = /^[0-9a-f]{64}$/.test(ph) ? ph : "";
  const fromApp = params.get("pwa") === "1";

  /*
   * sub には「誰の手続きか」を入れる。
   *   link     … ログイン中のアカウントID
   *   register … 名簿のメンバーID（引換券から取り出す）
   *   login    … まだ誰か分からないので空（戻ってきてから探す）
   */
  let sub = "";

  // 紐づけは、ログインしている本人からの操作に限る
  if (mode === "link") {
    const sess = readSession(readCookie(request.headers, MEMBER_COOKIE), "member");
    if (!sess?.sub) {
      return Response.json({ ok: false, error: "ログインが必要です。" }, { status: 401 });
    }
    sub = sess.sub;
  }

  /*
   * 新規登録は、先に /api/line/register で名簿と照らし合わせてある。
   * その引換券（署名付き・10分）がなければ、ここから先へは進めない。
   * 画面遷移の途中なので、JSONではなく読める画面を返す。
   */
  if (mode === "register") {
    const ticket = readValue<{ k?: string; m?: string }>(params.get("t"));
    if (ticket?.k !== "line-reg" || !ticket.m) {
      return resultPage({
        ok: false,
        title: "登録をやり直してください",
        body: "手続きの途中で時間が経ちすぎたようです。アプリの「新規登録」から、もう一度お試しください。",
      });
    }
    sub = ticket.m;
  }

  const nonce = randomToken();
  // state は base64url と「.」だけでできているので、URLエンコードは不要
  const state = signValue({ mode, sub, nonce, ph: handoff, pwa: fromApp }, ROUND_TRIP_SECONDS);

  return new Response(null, {
    status: 302,
    headers: {
      Location: buildAuthUrl({
        state, nonce, verifier: verifierFor(state), redirect: redirectUri(request),
      }),
      "cache-control": "no-store",
    },
  });
}
