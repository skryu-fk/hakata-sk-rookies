/**
 * /api/staff/save — 首脳陣向けの書き込み。
 *   POST { kind, op, row?, rowIndex? }
 *
 * 表ごとに「どの権限が要るか」をここで決める。画面側の出し分けとは別に、
 * サーバーでも必ず確かめる（APIを直接叩かれても通さないため）。
 *
 * 作った人以外は直せない表（指導レポートなど）は、保存前に持ち主を確認する。
 * 代表（レベル4）はどれでも直せる。
 */
import { callAppsScript } from "@/lib/admin-shared";
import { requireStaff, writeAudit, staffId, nowJst } from "@/lib/staffAuth";
import { LEVEL, type Permission } from "@/lib/staffRoles";
import { sameOrigin, crossOriginDenied } from "@/lib/security";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 書き込める表と、必要な権限・持ち主の列番号 */
const TABLES: Record<string, {
  sheet: string;
  perm: Permission;
  /** 作成者のアカウントIDが入っている列。自分のものだけ直せる表に指定する */
  ownerCol?: number;
  /** 新規作成時の id の接頭辞 */
  prefix: string;
  label: string;
}> = {
  report:   { sheet: "staff_reports",  perm: "report.create",   ownerCol: 2, prefix: "rp", label: "指導レポート" },
  practice: { sheet: "practice_menus", perm: "practice.create", ownerCol: 6, prefix: "pm", label: "練習メニュー" },
  order:    { sheet: "order_plans",    perm: "order.create",    ownerCol: 3, prefix: "op", label: "オーダー案" },
  topic:    { sheet: "staff_topics",   perm: "meeting.join",    ownerCol: 3, prefix: "tp", label: "議題" },
  comment:  { sheet: "staff_comments", perm: "meeting.join",    ownerCol: 2, prefix: "cm", label: "コメント" },
};

export async function POST(request: Request) {
  if (!sameOrigin(request)) return crossOriginDenied();
  const rl = rateLimit(`staff-save:${clientIp(request.headers)}`, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) return tooMany(rl.retryAfter);

  let body: { kind?: string; op?: string; row?: unknown[]; rowIndex?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "リクエスト形式が不正です。" }, { status: 400 });
  }

  const table = TABLES[String(body.kind ?? "")];
  if (!table) return Response.json({ ok: false, error: "未知の種別です。" }, { status: 400 });

  const gate = await requireStaff(request.headers, table.perm);
  if ("error" in gate) return gate.error;
  const me = gate.user;

  const op = String(body.op ?? "");
  if (op !== "append" && op !== "update" && op !== "delete") {
    return Response.json({ ok: false, error: "未知の操作です。" }, { status: 400 });
  }

  // 既存の行を触るときは、持ち主かどうかを確かめる
  if (op === "update" || op === "delete") {
    const rowIndex = Number(body.rowIndex);
    if (!Number.isFinite(rowIndex) || rowIndex < 1) {
      return Response.json({ ok: false, error: "行の指定が不正です。" }, { status: 400 });
    }
    if (table.ownerCol !== undefined && me.level < LEVEL.OWNER) {
      const list = await callAppsScript({ op: "list", sheet: table.sheet });
      if (!list.ok) return Response.json({ ok: false, error: list.error }, { status: list.status });
      const rows = (list.data as { rows?: { rowIndex: number; data: string[] }[] }).rows ?? [];
      const target = rows.find(r => r.rowIndex === rowIndex);
      if (!target) return Response.json({ ok: false, error: "対象が見つかりません。" }, { status: 404 });
      if ((target.data[table.ownerCol] ?? "") !== me.accountId) {
        return Response.json(
          { ok: false, error: "自分が作成したものだけ編集できます。" },
          { status: 403 },
        );
      }
    }

    if (op === "delete") {
      const res = await callAppsScript({ op: "delete", sheet: table.sheet, rowIndex });
      if (!res.ok) return Response.json({ ok: false, error: res.error }, { status: res.status });
      await writeAudit(me, `${table.label}を削除`, table.sheet, `row=${rowIndex}`);
      return Response.json({ ok: true });
    }
  }

  const row = Array.isArray(body.row) ? body.row.map(v => (v ?? "").toString().slice(0, 4000)) : null;
  if (!row || row.length === 0) {
    return Response.json({ ok: false, error: "内容が空です。" }, { status: 400 });
  }

  if (op === "append") {
    // id と作成日時はサーバー側で入れる（画面からの詐称を防ぐ）
    row[0] = staffId(table.prefix);
    row[row.length - 1] = nowJst();
    if (table.ownerCol !== undefined) row[table.ownerCol] = me.accountId;
    const res = await callAppsScript({ op: "append", sheet: table.sheet, row });
    if (!res.ok) return Response.json({ ok: false, error: res.error }, { status: res.status });
    await writeAudit(me, `${table.label}を作成`, table.sheet, String(row[1] ?? ""));
    return Response.json({ ok: true, id: row[0] });
  }

  // update
  if (table.ownerCol !== undefined && me.level < LEVEL.OWNER) row[table.ownerCol] = me.accountId;
  const res = await callAppsScript({
    op: "update", sheet: table.sheet, rowIndex: Number(body.rowIndex), row,
  });
  if (!res.ok) return Response.json({ ok: false, error: res.error }, { status: res.status });
  await writeAudit(me, `${table.label}を更新`, table.sheet, String(row[1] ?? ""));
  return Response.json({ ok: true });
}
