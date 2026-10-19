/**
 * /api/staff/approval — 代表への承認申請。
 *   POST { op: "request", kind, refId, title, summary }       … 首脳陣が申請する
 *   POST { op: "decide", rowIndex, status, comment }          … 代表が裁く（承認/差し戻し/却下）
 *
 * ここが首脳陣アプリの背骨。練習メニューの公開・オーダーの確定・
 * メンバー向けのお知らせなど、外に出る変更はすべてこの申請を通す。
 *
 * 裁けるのは代表だけ（approval.decide はレベル4）。
 * 承認されると、申請の種類に応じて元の表の状態も「公開」に切り替える。
 */
import { callAppsScript } from "@/lib/admin-shared";
import { requireStaff, writeAudit, staffId, nowJst } from "@/lib/staffAuth";
import { sameOrigin, crossOriginDenied } from "@/lib/security";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 申請の種類 → 承認されたときに書き換える表と、状態を入れる列 */
const TARGETS: Record<string, { sheet: string; statusCol: number; label: string }> = {
  practice: { sheet: "practice_menus", statusCol: 11, label: "練習メニューの公開" },
  order:    { sheet: "order_plans",    statusCol: 9,  label: "オーダーの確定" },
  report:   { sheet: "staff_reports",  statusCol: 12, label: "レポートの本人公開" },
};

const STATUSES = ["承認", "差し戻し", "却下"];

export async function POST(request: Request) {
  if (!sameOrigin(request)) return crossOriginDenied();
  const rl = rateLimit(`staff-approval:${clientIp(request.headers)}`, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) return tooMany(rl.retryAfter);

  let body: {
    op?: string; kind?: string; refId?: string; title?: string; summary?: string;
    rowIndex?: number; status?: string; comment?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "リクエスト形式が不正です。" }, { status: 400 });
  }

  /* ── 申請する ── */
  if (body.op === "request") {
    const gate = await requireStaff(request.headers, "approval.request");
    if ("error" in gate) return gate.error;
    const me = gate.user;

    const kind = String(body.kind ?? "");
    if (!TARGETS[kind]) return Response.json({ ok: false, error: "未知の申請です。" }, { status: 400 });
    const title = String(body.title ?? "").trim().slice(0, 120);
    if (!title) return Response.json({ ok: false, error: "件名を入れてください。" }, { status: 400 });

    const row = [
      staffId("ap"), kind, String(body.refId ?? "").slice(0, 60),
      title, String(body.summary ?? "").slice(0, 1000),
      me.accountId, me.name,
      "申請中", "", "", "",
      nowJst(),
    ];
    const res = await callAppsScript({ op: "append", sheet: "staff_approvals", row });
    if (!res.ok) return Response.json({ ok: false, error: res.error }, { status: res.status });
    await writeAudit(me, "承認を申請", TARGETS[kind].label, title);
    return Response.json({ ok: true });
  }

  /* ── 裁く（代表のみ） ── */
  if (body.op === "decide") {
    const gate = await requireStaff(request.headers, "approval.decide");
    if ("error" in gate) return gate.error;
    const me = gate.user;

    const rowIndex = Number(body.rowIndex);
    const status = String(body.status ?? "");
    if (!Number.isFinite(rowIndex) || rowIndex < 1) {
      return Response.json({ ok: false, error: "行の指定が不正です。" }, { status: 400 });
    }
    if (!STATUSES.includes(status)) {
      return Response.json({ ok: false, error: "未知の判断です。" }, { status: 400 });
    }

    const list = await callAppsScript({ op: "list", sheet: "staff_approvals" });
    if (!list.ok) return Response.json({ ok: false, error: list.error }, { status: list.status });
    const rows = (list.data as { rows?: { rowIndex: number; data: string[] }[] }).rows ?? [];
    const target = rows.find(r => r.rowIndex === rowIndex);
    if (!target) return Response.json({ ok: false, error: "申請が見つかりません。" }, { status: 404 });

    const d = [...target.data];
    d[7] = status;
    d[8] = me.name;
    d[9] = nowJst();
    d[10] = String(body.comment ?? "").slice(0, 500);
    const upd = await callAppsScript({ op: "update", sheet: "staff_approvals", rowIndex, row: d });
    if (!upd.ok) return Response.json({ ok: false, error: upd.error }, { status: upd.status });

    // 承認されたら、元の表の状態も切り替える（ここを忘れると「承認したのに公開されない」）
    const t = TARGETS[d[1] ?? ""];
    if (status === "承認" && t && d[2]) {
      const srcList = await callAppsScript({ op: "list", sheet: t.sheet });
      if (srcList.ok) {
        const srcRows = (srcList.data as { rows?: { rowIndex: number; data: string[] }[] }).rows ?? [];
        const src = srcRows.find(r => (r.data[0] ?? "") === d[2]);
        if (src) {
          const sd = [...src.data];
          sd[t.statusCol] = "公開";
          await callAppsScript({ op: "update", sheet: t.sheet, rowIndex: src.rowIndex, row: sd });
        }
      }
    }

    await writeAudit(me, `申請を${status}`, t?.label ?? (d[1] ?? ""), d[3] ?? "");
    return Response.json({ ok: true });
  }

  return Response.json({ ok: false, error: "未知の操作です。" }, { status: 400 });
}
