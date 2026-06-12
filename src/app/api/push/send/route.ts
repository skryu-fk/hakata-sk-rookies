/**
 * /api/push/send — 管理者が全購読者へプッシュ通知を送る。
 *   POST body: { title: string, body: string, url?: string, tag?: string }
 *   ヘッダ x-admin-password で管理者認証。
 */
import { ensureAuth } from "@/lib/admin-shared";
import { sendToAll } from "@/lib/push-server";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rl = rateLimit(`push-send:${clientIp(request.headers)}`, { limit: 30, windowMs: 5 * 60_000 });
  if (!rl.ok) return tooMany(rl.retryAfter);

  const authErr = ensureAuth(request.headers);
  if (authErr) return authErr;

  let body: { title?: string; body?: string; url?: string; tag?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "リクエスト形式が不正です。" }, { status: 400 });
  }

  const title = (body.title ?? "").toString().trim().slice(0, 120);
  const text = (body.body ?? "").toString().trim().slice(0, 300);
  if (!title) {
    return Response.json({ ok: false, error: "タイトルは必須です。" }, { status: 400 });
  }

  const result = await sendToAll({
    title,
    body: text,
    url: (body.url ?? "/stats").toString(),
    tag: (body.tag ?? "").toString() || undefined,
  });
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error ?? "送信に失敗しました。" }, { status: 500 });
  }
  return Response.json({ ok: true, sent: result.sent, failed: result.failed, total: result.total });
}
