/**
 * /api/member/verify — メンバー閲覧用パスワード検証 & セッション発行。
 *   POST { password }     → 照合し、成功時に HttpOnly セッション Cookie を発行
 *   GET                   → 既存 Cookie の有効性チェック（再ログイン省略用）
 *
 * 総当たり対策として IP 単位のレート制限＋ロックアウトを行う。
 */
import { safeEqual, issueSession, verifySession, readCookie, buildSetCookie, MEMBER_COOKIE } from "@/lib/security";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TTL = 60 * 60 * 24 * 30; // 30日

export async function GET(request: Request) {
  if (verifySession(readCookie(request.headers, MEMBER_COOKIE), "member")) {
    return Response.json({ ok: true });
  }
  return Response.json({ ok: false }, { status: 401 });
}

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  // ログイン試行は厳しめ：5分で10回まで、超えたら15分ロック
  const rl = rateLimit(`member-verify:${ip}`, { limit: 10, windowMs: 5 * 60_000, lockMs: 15 * 60_000 });
  if (!rl.ok) return tooMany(rl.retryAfter);

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "リクエスト形式が不正です。" }, { status: 400 });
  }

  const expected = process.env.MEMBER_PASSWORD;
  if (!expected) {
    return Response.json({ ok: false, error: "サーバー設定エラー（MEMBER_PASSWORD 未設定）" }, { status: 500 });
  }
  if (!body.password || !safeEqual(body.password, expected)) {
    return Response.json({ ok: false, error: "パスワードが違います。" }, { status: 401 });
  }

  const token = issueSession("member", TTL);
  return Response.json(
    { ok: true },
    { headers: { "Set-Cookie": buildSetCookie(MEMBER_COOKIE, token, TTL) } }
  );
}
