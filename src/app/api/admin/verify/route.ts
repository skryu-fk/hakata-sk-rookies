/**
 * /api/admin/verify — 管理者パスワード検証 & セッション発行。
 *   POST { password } → 照合し、成功時に HttpOnly 管理者 Cookie を発行
 *   GET               → 既存 Cookie の有効性チェック
 *
 * 総当たり対策として IP 単位のレート制限＋ロックアウトを行う。
 */
import {
  safeEqual, issueSession, sessionRemaining, readCookie, buildSetCookie, ADMIN_COOKIE,
} from "@/lib/security";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TTL = 60 * 60 * 12; // 12時間（管理者は短め）

/**
 * GET — いまのログインが有効かを返す。
 *
 * 残りが半分を切っていたら、その場で発行し直す（使っている間は切れない）。
 * 管理画面は開いたときとこまめに、この窓口を叩いている。
 * 使われなくなればそのまま期限切れになるので、放置した端末に
 * いつまでもログインが残ることはない。
 */
export async function GET(request: Request) {
  const left = sessionRemaining(readCookie(request.headers, ADMIN_COOKIE), "admin");
  if (left === null) return Response.json({ ok: false }, { status: 401 });

  if (left < TTL / 2) {
    const token = issueSession("admin", TTL);
    return Response.json(
      { ok: true, renewed: true },
      { headers: { "Set-Cookie": buildSetCookie(ADMIN_COOKIE, token, TTL) } },
    );
  }
  return Response.json({ ok: true });
}

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  // 管理者ログインは特に厳しめ：5分で8回まで、超えたら30分ロック
  const rl = rateLimit(`admin-verify:${ip}`, { limit: 8, windowMs: 5 * 60_000, lockMs: 30 * 60_000 });
  if (!rl.ok) return tooMany(rl.retryAfter);

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "リクエスト形式が不正です。" }, { status: 400 });
  }

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return Response.json({ ok: false, error: "サーバー設定エラー（ADMIN_PASSWORD 未設定）" }, { status: 500 });
  }
  if (!body.password || !safeEqual(body.password, expected)) {
    return Response.json({ ok: false, error: "パスワードが違います。" }, { status: 401 });
  }

  const token = issueSession("admin", TTL);
  return Response.json(
    { ok: true },
    { headers: { "Set-Cookie": buildSetCookie(ADMIN_COOKIE, token, TTL) } }
  );
}
