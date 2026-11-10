/**
 * /api/line/start — LINEの同意画面へ送り出す。
 *   GET ?mode=link   … ログイン中の自分のアカウントにLINEを紐づける
 *   GET ?mode=login  … 紐づけ済みの人が、LINEでログインする
 *
 * 往復のあいだに必要なもの（誰の手続きか・nonce）は、署名付きの state に
 * 入れて持たせる。Cookieに預けないのは、iPhoneのホーム画面に追加した
 * アプリからLINEへ行くと、戻り先がSafariになり、Cookieの置き場が別で
 * 読めなくなるため。署名があるので、書き換えられたものは通らない。
 *
 * PKCE の code_verifier は state から計算し直す（lineAuth.verifierFor）。
 * 持ち歩かせないので、URLにも履歴にも残らない。
 */
import { readSession, readCookie, MEMBER_COOKIE, signValue } from "@/lib/security";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";
import {
  lineEnabled, buildAuthUrl, randomToken, redirectUri, verifierFor,
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

  const mode = new URL(request.url).searchParams.get("mode") === "login" ? "login" : "link";

  // 紐づけは、ログインしている本人からの操作に限る
  let sub = "";
  if (mode === "link") {
    const sess = readSession(readCookie(request.headers, MEMBER_COOKIE), "member");
    if (!sess?.sub) {
      return Response.json({ ok: false, error: "ログインが必要です。" }, { status: 401 });
    }
    sub = sess.sub;
  }

  const nonce = randomToken();
  // state は base64url と「.」だけでできているので、URLエンコードは不要
  const state = signValue({ mode, sub, nonce }, ROUND_TRIP_SECONDS);

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
