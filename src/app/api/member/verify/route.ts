/**
 * /api/member/verify — メンバー閲覧用パスワード検証エンドポイント。
 * /stats など read-only ページの初期アクセスで使用。
 *   POST body: { password: string }
 *   → 200 { ok: true } / 401 { ok: false, error: "..." }
 */

import { ensureMemberAuth } from "@/lib/admin-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "リクエスト形式が不正です。" }, { status: 400 });
  }
  const headers = new Headers(request.headers);
  headers.set("x-member-password", body.password ?? "");
  const err = ensureMemberAuth(headers);
  if (err) return err;
  return Response.json({ ok: true });
}
