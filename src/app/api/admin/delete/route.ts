/**
 * /api/admin/delete — 既存行(rowIndex 指定)を削除する。
 */

import { ensureAuth, ensureSheet, callAppsScript, flushCaches } from "@/lib/admin-shared";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const rl = rateLimit(`admin:${clientIp(request.headers)}`, { limit: 200, windowMs: 60_000 });
  if (!rl.ok) return tooMany(rl.retryAfter);

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
  // 行の識別子は 1 から始まる（Supabase の row_id）。
  // スプレッドシート時代は 1 行目がヘッダだったため 2 以上を必須にしていたが、
  // その名残で「各テーブルの 1 行目だけ編集・削除できない」不具合になっていた。
  // シート側を使う場合のヘッダ保護は Apps Script 側で行っている。
  if (!Number.isFinite(rowIndex) || rowIndex < 1) {
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
