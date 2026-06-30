/**
 * /api/admin/append — 新規行をシート先頭に追加する。
 */

import { ensureAuth, ensureSheet, callAppsScript, flushCaches, safeRow } from "@/lib/admin-shared";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const rl = rateLimit(`admin:${clientIp(request.headers)}`, { limit: 200, windowMs: 60_000 });
  if (!rl.ok) return tooMany(rl.retryAfter);

  const authErr = ensureAuth(request.headers);
  if (authErr) return authErr;

  let body: { sheet?: string; row?: unknown[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "リクエスト形式が不正です。" }, { status: 400 });
  }

  const sheetErr = ensureSheet(body.sheet);
  if (sheetErr) return sheetErr;

  if (!Array.isArray(body.row) || body.row.length === 0 || body.row.length > 16) {
    return Response.json({ ok: false, error: "row が不正です。" }, { status: 400 });
  }

  const result = await callAppsScript({
    op: "append",
    sheet: body.sheet,
    row: safeRow(body.row),
  });
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: result.status });
  }

  flushCaches(body.sheet!);
  return Response.json({ ok: true });
}
