/**
 * /api/admin/upsert — キー列の値で「あれば更新・なければ追加」する冪等な書き込み。
 *   POST { sheet, keyCol, keyVal, row }
 *     - keyCol : キー列（1始まり。省略時は1列目）
 *     - keyVal : その列で一致を探す値（例: settings の "maintenance"）
 *
 * 同じ操作を何度実行しても結果が同じ（冪等）なので、タイムアウト時に
 * callAppsScript 側で安全に自動リトライできる（重複行を作らない）。
 * メンテナンス切替など「設定の上書き」に使う。
 *
 * Apps Script 側が upsert 未対応（旧デプロイ）の場合は
 * list → update / append に自動フォールバックする（再デプロイ前でも動く）。
 */
import { ensureAuth, ensureSheet, callAppsScript, flushCaches, safeRow } from "@/lib/admin-shared";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // Apps Script のコールドスタート＋リトライに余裕を持たせる

export async function POST(request: Request) {
  const rl = rateLimit(`admin:${clientIp(request.headers)}`, { limit: 200, windowMs: 60_000 });
  if (!rl.ok) return tooMany(rl.retryAfter);

  const authErr = ensureAuth(request.headers);
  if (authErr) return authErr;

  let body: { sheet?: string; keyCol?: number; keyVal?: string; row?: unknown[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "リクエスト形式が不正です。" }, { status: 400 });
  }

  const sheetErr = ensureSheet(body.sheet);
  if (sheetErr) return sheetErr;

  const keyCol = Number.isFinite(Number(body.keyCol)) && Number(body.keyCol) >= 1 ? Math.floor(Number(body.keyCol)) : 1;
  const keyVal = String(body.keyVal ?? "");
  if (!keyVal) {
    return Response.json({ ok: false, error: "keyVal が必要です。" }, { status: 400 });
  }
  if (!Array.isArray(body.row) || body.row.length === 0 || body.row.length > 16) {
    return Response.json({ ok: false, error: "row が不正です。" }, { status: 400 });
  }
  const row = safeRow(body.row);

  // 1) Apps Script の upsert（冪等・原子的）を試す
  const result = await callAppsScript({ op: "upsert", sheet: body.sheet, keyCol, keyVal, row });

  if (result.ok) {
    flushCaches(body.sheet!);
    return Response.json({ ok: true });
  }

  // 2) 旧デプロイ（upsert 未対応）の場合は list → update/append にフォールバック
  if (/unknown/i.test(result.error)) {
    const list = await callAppsScript({ op: "list", sheet: body.sheet });
    if (!list.ok) return Response.json({ ok: false, error: list.error }, { status: list.status });
    const rows = (list.data as { rows?: { rowIndex: number; data: string[] }[] }).rows ?? [];
    const hit = rows.find(r => (r.data[keyCol - 1] ?? "") === keyVal);
    const fb = hit
      ? await callAppsScript({ op: "update", sheet: body.sheet, rowIndex: hit.rowIndex, row })
      : await callAppsScript({ op: "append", sheet: body.sheet, row });
    if (!fb.ok) return Response.json({ ok: false, error: fb.error }, { status: fb.status });
    flushCaches(body.sheet!);
    return Response.json({ ok: true });
  }

  return Response.json({ ok: false, error: result.error }, { status: result.status });
}
