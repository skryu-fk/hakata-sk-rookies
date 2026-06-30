/**
 * /api/member/vote — メンバーが練習の参加/不参加を投票する。
 *   POST { date, memberId, status }  status = "出席" | "欠席"
 *
 * attendance シートに upsert（同じ date+memberId があれば更新、無ければ追加）し、
 * 管理者の「練習出欠」にそのまま反映される。
 * 認証はメンバーセッション Cookie。memberId は実在メンバーのみ許可。
 */
import { ensureMemberAuth, callAppsScript } from "@/lib/admin-shared";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ALLOWED_STATUS = new Set(["出席", "欠席"]);

export async function POST(request: Request) {
  const rl = rateLimit(`member-vote:${clientIp(request.headers)}`, { limit: 40, windowMs: 60_000 });
  if (!rl.ok) return tooMany(rl.retryAfter);

  const authErr = ensureMemberAuth(request.headers);
  if (authErr) return authErr;

  let body: { date?: string; memberId?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "リクエスト形式が不正です。" }, { status: 400 });
  }

  const date = (body.date ?? "").trim();
  const memberId = (body.memberId ?? "").trim();
  const status = (body.status ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ ok: false, error: "日付が不正です。" }, { status: 400 });
  }
  if (!memberId || !ALLOWED_STATUS.has(status)) {
    return Response.json({ ok: false, error: "入力が不正です。" }, { status: 400 });
  }

  // 実在メンバーか確認し、表示名を取得
  const mem = await callAppsScript({ op: "list", sheet: "members" });
  if (!mem.ok) return Response.json({ ok: false, error: mem.error }, { status: mem.status });
  const memberRows = (mem.data as { rows?: { data: string[] }[] }).rows ?? [];
  const me = memberRows.find(r => (r.data[0] ?? "") === memberId);
  if (!me) return Response.json({ ok: false, error: "メンバーが見つかりません。" }, { status: 400 });
  const memberName = me.data[1] ?? "";

  // attendance を upsert
  const att = await callAppsScript({ op: "list", sheet: "attendance" });
  if (!att.ok) return Response.json({ ok: false, error: att.error }, { status: att.status });
  const rows = (att.data as { rows?: { rowIndex: number; data: string[] }[] }).rows ?? [];
  const existing = rows.find(r => (r.data[0] ?? "").slice(0, 10) === date && (r.data[1] ?? "") === memberId);
  const row = [date, memberId, memberName, status, "アプリ投票"];

  const res = existing
    ? await callAppsScript({ op: "update", sheet: "attendance", rowIndex: existing.rowIndex, row })
    : await callAppsScript({ op: "append", sheet: "attendance", row });
  if (!res.ok) return Response.json({ ok: false, error: res.error }, { status: res.status });

  return Response.json({ ok: true, status });
}
