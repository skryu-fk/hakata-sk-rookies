/**
 * /api/line/callback — LINEから戻ってくるところ。
 *
 * 流れ:
 *   1. state の署名を確かめる（なりすまし・改ざん防止）
 *   2. 認可コードをIDトークンに交換する
 *   3. IDトークンの署名・発行元・宛先・期限・nonce を確かめる
 *   4. mode=link  … state に入っているアカウントにLINEのユーザーIDを紐づける
 *      mode=login … 紐づけ済みのアカウントを探し、ログインさせる
 *
 * ── Cookieに頼らない理由 ──
 * iPhoneのホーム画面に追加したアプリからLINEへ行くと、戻り先がSafariになる。
 * アプリとSafariはCookieの置き場が別なので、預けたCookieは読めない。
 * そこで state 自体に署名を付けて必要な情報を持たせ、
 * PKCE の verifier は state から計算し直す。どこへ戻ってきても復元できる。
 */
import {
  issueSession, buildSetCookie, buildRoundTripCookie,
  readValue, MEMBER_COOKIE,
} from "@/lib/security";
import { callAppsScript } from "@/lib/admin-shared";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";
import {
  lineEnabled, exchangeCode, verifyIdToken, redirectUri, resultPage, verifierFor,
  LINE_STATE_COOKIE, ACCOUNT_LINE_COL,
} from "@/lib/lineAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Row = { rowIndex: number; data: string[] };
type Stash = { mode: string; sub: string; nonce: string };

const SESSION_TTL = 60 * 60 * 24 * 7;   // メンバーのログインと同じ7日

/** 画面に出す文言。何が起きたかと、次にどうすればいいかを必ず書く */
const MESSAGES: Record<string, { ok: boolean; title: string; body: string }> = {
  linked: {
    ok: true, title: "LINEと連携しました",
    body: "次からは、ログイン画面の「LINEでログイン」で入れます。アプリを開いているときは、一度閉じて開き直すと表示が新しくなります。",
  },
  not_linked: {
    ok: false, title: "まだ連携されていません",
    body: "先にユーザーIDとパスワードでログインし、マイページの「LINEでログイン」から連携してください。",
  },
  already_used: {
    ok: false, title: "別の人が使っています",
    body: "このLINEアカウントは、すでに別のメンバーに連携されています。心当たりがなければ代表にご連絡ください。",
  },
  expired: {
    ok: false, title: "時間が経ちすぎました",
    body: "手続きの途中で10分以上かかったようです。お手数ですが、もう一度やり直してください。",
  },
  canceled: {
    ok: false, title: "キャンセルしました",
    body: "LINEでの連携をとりやめました。",
  },
  pending: {
    ok: false, title: "承認待ちです",
    body: "アカウントがまだ承認されていません。代表の承認後にご利用ください。",
  },
  rejected: {
    ok: false, title: "ご利用いただけません",
    body: "このアカウントは現在利用できません。代表にご確認ください。",
  },
  no_column: {
    ok: false, title: "連携を保存できませんでした",
    body: "データベースの準備が済んでいません。代表にこの画面を見せてください（supabase/schema.sql の実行が必要です）。",
  },
  disabled: {
    ok: false, title: "いま使えません",
    body: "LINEログインの設定が済んでいません。代表にご連絡ください。",
  },
};

const FALLBACK = {
  ok: false, title: "うまくいきませんでした",
  body: "もう一度お試しください。何度も失敗する場合は、この画面を代表にお見せください。",
};

function done(code: string, extraHeaders?: Record<string, string>): Response {
  const m = MESSAGES[code] ?? FALLBACK;
  // ログインできたときだけ、そのままアプリへ進める
  const res = resultPage({ ...m, auto: code === "login_ok" });
  const headers = new Headers(res.headers);
  headers.append("Set-Cookie", buildRoundTripCookie(LINE_STATE_COOKIE, "", 0));
  for (const [k, v] of Object.entries(extraHeaders ?? {})) headers.append(k, v);
  return new Response(res.body, { status: res.status, headers });
}

MESSAGES.login_ok = {
  ok: true, title: "ログインしました",
  body: "アプリに進みます。",
};

export async function GET(request: Request) {
  const rl = rateLimit(`line-callback:${clientIp(request.headers)}`, { limit: 30, windowMs: 10 * 60_000 });
  if (!rl.ok) return tooMany(rl.retryAfter);
  if (!lineEnabled()) return done("disabled");

  const url = new URL(request.url);

  // ユーザーが同意画面で「キャンセル」したとき
  if (url.searchParams.get("error")) return done("canceled");

  // state は署名付き。改ざんされていれば読めない＝こちらが始めた手続きではない
  const state = url.searchParams.get("state") ?? "";
  const stash = readValue<Stash>(state);
  if (!stash?.nonce) return done("expired");

  const code = url.searchParams.get("code") ?? "";
  if (!code) return done("expired");

  const token = await exchangeCode(code, verifierFor(state), redirectUri(request));
  if (!token.ok) return done("token_failed");

  const verified = verifyIdToken(token.idToken, stash.nonce);
  if (!verified.ok) {
    console.error("[line] id token rejected:", verified.error);
    return done("bad_token");
  }
  const lineUserId = verified.sub;

  const list = await callAppsScript({ op: "list", sheet: "accounts" });
  if (!list.ok) return done("server_error");
  const rows = (list.data as { rows?: Row[] }).rows ?? [];

  if (stash.mode === "link") {
    const target = rows.find(r => (r.data[0] ?? "") === stash.sub);
    if (!target) return done("no_account");

    // 1つのLINEアカウントを複数のメンバーに紐づけさせない。
    // 紐づけられると、他人になりすましてログインできてしまう
    const taken = rows.find(
      r => (r.data[ACCOUNT_LINE_COL] ?? "") === lineUserId && (r.data[0] ?? "") !== stash.sub,
    );
    if (taken) return done("already_used");

    const next = target.data.slice();
    while (next.length <= ACCOUNT_LINE_COL) next.push("");
    next[ACCOUNT_LINE_COL] = lineUserId;
    const saved = await callAppsScript({
      op: "update", sheet: "accounts", rowIndex: target.rowIndex, row: next,
    });
    if (!saved.ok) {
      console.error("[line] link save failed:", saved.error);
      return done(/line_user_id|列がありません/.test(saved.error) ? "no_column" : "save_failed");
    }
    return done("linked");
  }

  // mode === "login"
  const acc = rows.find(r => (r.data[ACCOUNT_LINE_COL] ?? "") === lineUserId);
  if (!acc) return done("not_linked");

  const status = (acc.data[5] ?? "").trim();
  if (status === "pending") return done("pending");
  if (status !== "approved") return done("rejected");

  const session = issueSession("member", SESSION_TTL, acc.data[0] ?? "");
  return done("login_ok", {
    "Set-Cookie": buildSetCookie(MEMBER_COOKIE, session, SESSION_TTL),
  });
}
