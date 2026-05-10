/**
 * /api/admin/update — 既存行(rowIndex 指定)を上書きする。
 */

import { ensureAuth, ensureSheet, callAppsScript, flushCaches, safeRow } from "@/lib/admin-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authErr = ensureAuth(request.headers);
  if (authErr) return authErr;

  let body: { sheet?: string; rowIndex?: number; row?: unknown[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "リクエスト形式が不正です。" }, { status: 400 });
  }

  const sheetErr = ensureSheet(body.sheet);
  if (sheetErr) return sheetErr;

  const rowIndex = Number(body.rowIndex);
  if (!Number.isFinite(rowIndex) || rowIndex < 2) {
    return Response.json({ ok: false, error: "rowIndex が不正です。" }, { status: 400 });
  }
  if (!Array.isArray(body.row) || body.row.length === 0 || body.row.length > 16) {
    return Response.json({ ok: false, error: "row が不正です。" }, { status: 400 });
  }

  const result = await callAppsScript({
    op: "update",
    sheet: body.sheet,
    rowIndex,
    row: safeRow(body.row),
  });
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: result.status });
  }

  flushCaches(body.sheet!);
  return Response.json({ ok: true });
}
