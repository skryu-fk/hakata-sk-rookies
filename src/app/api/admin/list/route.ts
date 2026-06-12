/**
 * /api/admin/list — 指定シートの全行をrowIndex付きで取得する。
 *
 * 編集・削除の対象を選ぶための一覧表示用。
 */

import { ensureAuth, ensureSheet, callAppsScript } from "@/lib/admin-shared";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rl = rateLimit(`admin:${clientIp(request.headers)}`, { limit: 200, windowMs: 60_000 });
  if (!rl.ok) return tooMany(rl.retryAfter);

  const authErr = ensureAuth(request.headers);
  if (authErr) return authErr;

  let body: { sheet?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "リクエスト形式が不正です。" }, { status: 400 });
  }

  const sheetErr = ensureSheet(body.sheet);
  if (sheetErr) return sheetErr;

  const result = await callAppsScript({ op: "list", sheet: body.sheet });
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: result.status });
  }

  // Apps Script returns { ok: true, rows: [{ rowIndex, data: [...] }] }
  return Response.json({ ok: true, rows: (result.data as { rows?: unknown }).rows ?? [] });
}
