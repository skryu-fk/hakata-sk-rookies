/**
 * /api/admin/list — 指定シートの全行をrowIndex付きで取得する。
 *
 * 編集・削除の対象を選ぶための一覧表示用。
 */

import { ensureAuth, ensureSheet, callAppsScript, ALLOWED_SHEETS } from "@/lib/admin-shared";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const rl = rateLimit(`admin:${clientIp(request.headers)}`, { limit: 200, windowMs: 60_000 });
  if (!rl.ok) return tooMany(rl.retryAfter);

  const authErr = ensureAuth(request.headers);
  if (authErr) return authErr;

  let body: { sheet?: string; sheets?: string[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "リクエスト形式が不正です。" }, { status: 400 });
  }

  // ── 複数シートを1往復でまとめて取得 ──
  // Apps Script は1往復が重く、同時に何本も叩くと順番待ちでタイムアウトしやすい。
  // まとめて取ることで呼び出し回数を減らし、失敗確率を大きく下げる。
  if (Array.isArray(body.sheets)) {
    const allowed = body.sheets.filter(s => ALLOWED_SHEETS.has(s));
    if (allowed.length === 0) {
      return Response.json({ ok: false, error: "未知の sheet です。" }, { status: 400 });
    }
    const many = await callAppsScript({ op: "listMany", sheets: allowed });
    if (many.ok) {
      return Response.json({ ok: true, sheets: (many.data as { sheets?: unknown }).sheets ?? {} });
    }
    // 旧デプロイ（listMany 未対応）は従来どおり個別取得にフォールバック
    if (/unknown/i.test(many.error)) {
      const results = await Promise.all(
        allowed.map(async sheet => {
          const r = await callAppsScript({ op: "list", sheet });
          return [sheet, r.ok ? (r.data as { rows?: unknown }).rows ?? [] : []] as const;
        })
      );
      const sheets: Record<string, unknown> = {};
      for (const [name, rows] of results) sheets[name] = rows;
      return Response.json({ ok: true, sheets });
    }
    return Response.json({ ok: false, error: many.error }, { status: many.status });
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
