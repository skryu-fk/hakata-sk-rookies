/**
 * /api/line/claim — LINEで成立したログインを、アプリ側が引き取る。
 *   POST { pairId } → ログインのCookieを発行
 *
 * iPhoneのホーム画面アプリとSafariは、ログイン情報の保管庫が別。
 * LINEから戻ってくる先はSafariなので、そこで発行したCookieはアプリに届かない。
 * アプリが自分で取りに来れば、アプリの保管庫にログインが入る。
 * 仕組みの全体は src/lib/loginHandoff.ts にまとめてある。
 *
 * 引換券は一度きり・10分。合言葉はアプリの中にしかなく、
 * LINEへの往復に載っているのはその指紋だけ。
 */
import {
  issueSession, buildSetCookie, sameOrigin, crossOriginDenied, MEMBER_COOKIE,
} from "@/lib/security";
import { callAppsScript } from "@/lib/admin-shared";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";
import { claimHandoff } from "@/lib/loginHandoff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** メンバーのログインと同じ7日 */
const SESSION_TTL = 60 * 60 * 24 * 7;

export async function POST(request: Request) {
  if (!sameOrigin(request)) return crossOriginDenied();

  const rl = rateLimit(`line-claim:${clientIp(request.headers)}`, {
    limit: 30, windowMs: 10 * 60_000,
  });
  if (!rl.ok) return tooMany(rl.retryAfter);

  let body: { pairId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  // 合言葉は32バイトを16進にしたもの。形が違えば読みにいかない
  const secret = String(body.pairId ?? "");
  if (!/^[0-9a-f]{64}$/.test(secret)) return Response.json({ ok: false }, { status: 400 });

  const accountId = await claimHandoff(secret);
  // 無い・期限切れ・使用済みは、どれも同じ返事にする（内情を伝えない）
  if (!accountId) return Response.json({ ok: false }, { status: 404 });

  // 預けてから取りに来るまでの間に、止められている可能性がある
  const list = await callAppsScript({ op: "list", sheet: "accounts" });
  if (!list.ok) return Response.json({ ok: false, error: list.error }, { status: list.status });
  const rows = (list.data as { rows?: { data: string[] }[] }).rows ?? [];
  const acc = rows.find(r => (r.data[0] ?? "") === accountId);
  if (!acc || (acc.data[5] ?? "").trim() !== "approved") {
    return Response.json({ ok: false }, { status: 403 });
  }

  const session = issueSession("member", SESSION_TTL, accountId);
  return Response.json(
    { ok: true, name: acc.data[1] ?? "" },
    { headers: { "Set-Cookie": buildSetCookie(MEMBER_COOKIE, session, SESSION_TTL) } },
  );
}
