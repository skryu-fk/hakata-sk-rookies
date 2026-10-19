/**
 * /api/staff/roles — 首脳陣の任命・解任（代表のみ）
 *   GET                                        → 全アカウントの役割一覧
 *   POST { accountId, level, title, area }     → 役割を設定（level 0 で解任）
 *
 * アカウント自体は既存のメンバー登録をそのまま使い、ここでは役割だけを足し引きする。
 * パスワードのハッシュは返さない。
 */
import { callAppsScript } from "@/lib/admin-shared";
import { requireStaff, writeAudit } from "@/lib/staffAuth";
import { AREAS, LEVEL_LABEL, type StaffArea, type StaffLevel } from "@/lib/staffRoles";
import { sameOrigin, crossOriginDenied } from "@/lib/security";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const gate = await requireStaff(request.headers, "staff.manage");
  if ("error" in gate) return gate.error;

  const list = await callAppsScript({ op: "list", sheet: "accounts" });
  if (!list.ok) return Response.json({ ok: false, error: list.error }, { status: list.status });
  const rows = (list.data as { rows?: { rowIndex: number; data: string[] }[] }).rows ?? [];

  // パスワード関連の列は落として返す
  const accounts = rows
    .filter(r => (r.data[5] ?? "").trim() === "approved")
    .map(r => ({
      rowIndex: r.rowIndex,
      accountId: r.data[0] ?? "",
      name: r.data[1] ?? "",
      userId: r.data[8] ?? "",
      memberId: r.data[7] ?? "",
      level: Number(r.data[9] ?? "0") || 0,
      title: r.data[10] ?? "",
      area: r.data[11] ?? "全体",
    }));
  return Response.json({ ok: true, accounts });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return crossOriginDenied();
  const rl = rateLimit(`staff-roles:${clientIp(request.headers)}`, { limit: 40, windowMs: 60_000 });
  if (!rl.ok) return tooMany(rl.retryAfter);

  const gate = await requireStaff(request.headers, "staff.manage");
  if ("error" in gate) return gate.error;
  const me = gate.user;

  let body: { accountId?: string; level?: number; title?: string; area?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "リクエスト形式が不正です。" }, { status: 400 });
  }

  const accountId = String(body.accountId ?? "");
  const level = Number(body.level);
  if (!accountId) return Response.json({ ok: false, error: "アカウントが未指定です。" }, { status: 400 });
  if (!Number.isInteger(level) || level < 0 || level > 4) {
    return Response.json({ ok: false, error: "権限レベルが不正です。" }, { status: 400 });
  }
  const area = AREAS.includes(body.area as StaffArea) ? (body.area as StaffArea) : "全体";

  const list = await callAppsScript({ op: "list", sheet: "accounts" });
  if (!list.ok) return Response.json({ ok: false, error: list.error }, { status: list.status });
  const rows = (list.data as { rows?: { rowIndex: number; data: string[] }[] }).rows ?? [];
  const target = rows.find(r => (r.data[0] ?? "") === accountId);
  if (!target) return Response.json({ ok: false, error: "アカウントが見つかりません。" }, { status: 404 });

  const d = [...target.data];
  d[9] = level === 0 ? "" : String(level);
  d[10] = String(body.title ?? "").trim().slice(0, 40);
  d[11] = level === 0 ? "" : area;

  const res = await callAppsScript({ op: "update", sheet: "accounts", rowIndex: target.rowIndex, row: d });
  if (!res.ok) return Response.json({ ok: false, error: res.error }, { status: res.status });

  await writeAudit(
    me,
    level === 0 ? "首脳陣を解任" : "首脳陣を任命",
    d[1] ?? accountId,
    level === 0 ? "" : `${LEVEL_LABEL[level as StaffLevel]} / ${d[10] || "役職名なし"} / ${area}`,
  );
  return Response.json({ ok: true });
}
