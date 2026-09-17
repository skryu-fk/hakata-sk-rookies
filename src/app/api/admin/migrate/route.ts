/**
 * /api/admin/migrate — スプレッドシート(Apps Script) → Supabase へのデータ移行（管理者専用）。
 *   POST { op: "check" }   → 現在の設定と、両側の件数を確認する（変更しない）
 *   POST { op: "migrate" } → 全シートを読み取り、Supabase に丸ごとコピーする
 *
 * 移行は「読み取りは必ず Apps Script から / 書き込みは Supabase へ」と明示的に行う。
 * 何度実行しても同じ結果になる（対象テーブルを入れ替えるため重複しない）。
 */
import { ensureAuth, callAppsScriptLegacy } from "@/lib/admin-shared";
import { supabaseEnabled, replaceAll, SUPABASE_TABLES, callSupabase } from "@/lib/supabaseData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Row = { rowIndex: number; data: string[] };

// 移行対象。members/accounts など運用に必要なものを網羅する。
const SHEETS = SUPABASE_TABLES;

export async function POST(request: Request) {
  const auth = ensureAuth(request.headers);
  if (auth) return auth;

  let body: { op?: string; sheets?: string[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "リクエスト形式が不正です。" }, { status: 400 });
  }
  const op = body.op || "check";
  // 対象を絞れるようにする（件数が多いと1回の実行時間に収まらないため、
  // 残りだけをやり直せるようにしておく）
  const targets = Array.isArray(body.sheets) && body.sheets.length > 0
    ? SHEETS.filter(s => body.sheets!.includes(s))
    : SHEETS;

  if (!supabaseEnabled()) {
    return Response.json({
      ok: false,
      error: "Supabase が未設定です。Vercel の環境変数に SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください。",
    }, { status: 400 });
  }

  // ── 現状確認（変更しない）──
  if (op === "check") {
    const rows: { sheet: string; sheetCount: number | null; dbCount: number | null; error?: string }[] = [];
    for (const sheet of targets) {
      let sheetCount: number | null = null;
      let dbCount: number | null = null;
      let error: string | undefined;
      const src = await callAppsScriptLegacy({ op: "list", sheet });
      if (src.ok) sheetCount = ((src.data as { rows?: Row[] }).rows ?? []).length;
      else error = src.error;
      const dst = await callSupabase({ op: "list", sheet });
      if (dst.ok) dbCount = ((dst.data as { rows?: Row[] }).rows ?? []).length;
      rows.push({ sheet, sheetCount, dbCount, error });
    }
    return Response.json({ ok: true, rows });
  }

  // ── 実行 ──
  if (op === "migrate") {
    const results: { sheet: string; moved: number; error?: string }[] = [];
    for (const sheet of targets) {
      try {
        const src = await callAppsScriptLegacy({ op: "list", sheet });
        if (!src.ok) {
          // 元データが読めないシートは触らない（既存のDBデータを壊さない）
          results.push({ sheet, moved: 0, error: src.error });
          continue;
        }
        const rows = ((src.data as { rows?: Row[] }).rows ?? []).map(r => r.data ?? []);
        const moved = await replaceAll(sheet, rows);
        results.push({ sheet, moved });
      } catch (e) {
        results.push({ sheet, moved: 0, error: (e as Error).message });
      }
    }
    const total = results.reduce((s, r) => s + r.moved, 0);
    const failed = results.filter(r => r.error);
    return Response.json({ ok: true, total, results, failedCount: failed.length });
  }

  return Response.json({ ok: false, error: "unknown op" }, { status: 400 });
}
