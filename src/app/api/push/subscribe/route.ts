/**
 * /api/push/subscribe — メンバーがプッシュ通知を購読する。
 *   POST body: { subscription: PushSubscriptionJSON, label?: string }
 *   ヘッダ x-member-password でメンバー認証。
 *
 * subscriptions シートに {endpoint, p256dh, auth, label, createdAt} を保存する。
 * 同じ endpoint が既にあれば重複登録しない。
 */
import { ensureMemberAuth, callAppsScript } from "@/lib/admin-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SubJson = { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

export async function POST(request: Request) {
  const authErr = ensureMemberAuth(request.headers);
  if (authErr) return authErr;

  let body: { subscription?: SubJson; label?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "リクエスト形式が不正です。" }, { status: 400 });
  }

  const sub = body.subscription;
  const endpoint = sub?.endpoint ?? "";
  const p256dh = sub?.keys?.p256dh ?? "";
  const auth = sub?.keys?.auth ?? "";
  if (!endpoint || !p256dh || !auth) {
    return Response.json({ ok: false, error: "購読情報が不完全です。" }, { status: 400 });
  }

  // 既存重複チェック
  const list = await callAppsScript({ op: "list", sheet: "subscriptions" });
  if (list.ok) {
    const rows = (list.data as { rows?: { data: string[] }[] }).rows ?? [];
    if (rows.some(r => (r.data[0] ?? "") === endpoint)) {
      return Response.json({ ok: true, duplicate: true });
    }
  }

  const label = (body.label ?? "").toString().slice(0, 60);
  const createdAt = new Date().toISOString().slice(0, 19).replace("T", " ");
  const res = await callAppsScript({
    op: "append",
    sheet: "subscriptions",
    row: [endpoint, p256dh, auth, label, createdAt],
  });
  if (!res.ok) {
    return Response.json({ ok: false, error: res.error }, { status: res.status });
  }
  return Response.json({ ok: true });
}
