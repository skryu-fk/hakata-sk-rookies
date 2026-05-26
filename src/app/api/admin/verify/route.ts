/**
 * /api/admin/verify — パスワード検証専用エンドポイント。
 * 管理ページ（/admin/team）の初期アクセスで使用。
 *   POST body: { password: string }
 *   → 200 { ok: true } / 401 { ok: false, error: "..." }
 */

import { ensureAuth } from "@/lib/admin-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "リクエスト形式が不正です。" }, { status: 400 });
  }
  // ensureAuth はヘッダから読むので、互換のため Headers にコピーして検証
  const headers = new Headers(request.headers);
  headers.set("x-admin-password", body.password ?? "");
  const err = ensureAuth(headers);
  if (err) return err;
  return Response.json({ ok: true });
}
