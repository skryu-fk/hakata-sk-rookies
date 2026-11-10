/**
 * /api/line/callback — LINEから戻ってくるところ。
 *
 * 流れ:
 *   1. 預けたCookieを読み、state が一致するか確かめる（なりすまし防止）
 *   2. 認可コードをIDトークンに交換する
 *   3. IDトークンの署名・発行元・宛先・期限・nonce を確かめる
 *   4. mode=link  … いまログイン中のアカウントにLINEのユーザーIDを紐づける
 *      mode=login … 紐づけ済みのアカウントを探し、ログインさせる
 *
 * LINEで新しくアカウントを作ることはできない。ログインできるのは、
 * 代表が承認済みのアカウントに、本人が自分で紐づけた場合だけ。
 */
import {
  issueSession, buildSetCookie, buildRoundTripCookie,
  readCookie, readValue, MEMBER_COOKIE,
} from "@/lib/security";
import { callAppsScript } from "@/lib/admin-shared";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";
import {
  lineEnabled, exchangeCode, verifyIdToken, redirectUri, bounceTo,
  LINE_STATE_COOKIE, ACCOUNT_LINE_COL,
} from "@/lib/lineAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Row = { rowIndex: number; data: string[] };
type Stash = { state: string; nonce: string; verifier: string; mode: string; accountId: string };

const SESSION_TTL = 60 * 60 * 24 * 7;   // メンバーのログインと同じ7日

/** 画面に出すための結果つきで /stats に戻す。Cookieの後片付けも一緒に行う */
function back(result: string, extra?: Record<string, string>): Response {
  const res = bounceTo(`/stats?line=${encodeURIComponent(result)}`);
  const headers = new Headers(res.headers);
  headers.append("Set-Cookie", buildRoundTripCookie(LINE_STATE_COOKIE, "", 0));
  for (const [k, v] of Object.entries(extra ?? {})) headers.append(k, v);
  return new Response(res.body, { status: res.status, headers });
}

export async function GET(request: Request) {
  const rl = rateLimit(`line-callback:${clientIp(request.headers)}`, { limit: 30, windowMs: 10 * 60_000 });
  if (!rl.ok) return tooMany(rl.retryAfter);
  if (!lineEnabled()) return back("disabled");

  const url = new URL(request.url);
  const stash = readValue<Stash>(readCookie(request.headers, LINE_STATE_COOKIE));
  if (!stash) return back("expired");

  // ユーザーが同意画面で「キャンセル」したとき
  if (url.searchParams.get("error")) return back("canceled");

  // state が合わなければ、こちらが始めたログインではない
  const state = url.searchParams.get("state") ?? "";
  if (!state || state !== stash.state) return back("bad_state");

  const code = url.searchParams.get("code") ?? "";
  if (!code) return back("no_code");

  const token = await exchangeCode(code, stash.verifier, redirectUri(request));
  if (!token.ok) return back("token_failed");

  const verified = verifyIdToken(token.idToken, stash.nonce);
  if (!verified.ok) {
    console.error("[line] id token rejected:", verified.error);
    return back("bad_token");
  }
  const lineUserId = verified.sub;

  const list = await callAppsScript({ op: "list", sheet: "accounts" });
  if (!list.ok) return back("server_error");
  const rows = (list.data as { rows?: Row[] }).rows ?? [];

  if (stash.mode === "link") {
    const target = rows.find(r => (r.data[0] ?? "") === stash.accountId);
    if (!target) return back("no_account");

    // 1つのLINEアカウントを複数のメンバーに紐づけさせない。
    // 紐づけられると、他人になりすましてログインできてしまう
    const taken = rows.find(
      r => (r.data[ACCOUNT_LINE_COL] ?? "") === lineUserId && (r.data[0] ?? "") !== stash.accountId,
    );
    if (taken) return back("already_used");

    const next = target.data.slice();
    while (next.length <= ACCOUNT_LINE_COL) next.push("");
    next[ACCOUNT_LINE_COL] = lineUserId;
    const saved = await callAppsScript({
      op: "update", sheet: "accounts", rowIndex: target.rowIndex, row: next,
    });
    if (!saved.ok) return back("save_failed");
    return back("linked");
  }

  // mode === "login"
  const acc = rows.find(r => (r.data[ACCOUNT_LINE_COL] ?? "") === lineUserId);
  if (!acc) return back("not_linked");

  const status = (acc.data[5] ?? "").trim();
  if (status === "pending") return back("pending");
  if (status !== "approved") return back("rejected");

  const session = issueSession("member", SESSION_TTL, acc.data[0] ?? "");
  return back("login_ok", {
    "Set-Cookie": buildSetCookie(MEMBER_COOKIE, session, SESSION_TTL),
  });
}
