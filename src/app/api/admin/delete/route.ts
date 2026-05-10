/**
 * /api/admin/delete — 既存行(rowIndex 指定)を削除する。
 */

import { ensureAuth, ensureSheet, callAppsScript, flushCaches } from "@/lib/admin-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authErr = ensureAuth(request.headers);
  if (authErr) return authErr;

  let body: { sheet?: string; rowIndex?: number };
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

  const result = await callAppsScript({
    op: "delete",
    sheet: body.sheet,
    rowIndex,
  });
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: result.status });
  }

  flushCaches(body.sheet!);
  return Response.json({ ok: true });
}
