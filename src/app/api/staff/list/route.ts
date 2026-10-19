/**
 * /api/staff/list — 首脳陣向けの読み取り。
 *   POST { sheets: [...] } → { ok, sheets }
 *
 * 読める表は首脳陣の仕事に必要なものだけに絞る。
 * 集金や領収書など運営のお金まわりは、代表の管理サイトにしか無い。
 *
 * レベルによる差:
 *   - 操作履歴（staff_audit）は代表だけ
 *   - 指導レポートの全件閲覧はレベル2以上。レベル1は自分が書いたものだけ
 */
import { callAppsScript } from "@/lib/admin-shared";
import { currentStaff } from "@/lib/staffAuth";
import { can } from "@/lib/staffRoles";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 首脳陣が読める表 */
const ALLOWED = new Set([
  "members", "batting", "pitching", "catching", "fielding",
  "practices", "probables", "participants", "attendance", "announcements",
  "games", "opponents", "lineups", "evaluations",
  "staff_reports", "practice_menus", "order_plans",
  "staff_topics", "staff_comments", "staff_approvals", "staff_audit",
]);

export async function POST(request: Request) {
  const rl = rateLimit(`staff-list:${clientIp(request.headers)}`, { limit: 100, windowMs: 60_000 });
  if (!rl.ok) return tooMany(rl.retryAfter);

  const me = await currentStaff(request.headers);
  if (!me) {
    return Response.json({ ok: false, error: "首脳陣としてログインしてください。" }, { status: 401 });
  }

  let body: { sheets?: string[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "リクエスト形式が不正です。" }, { status: 400 });
  }

  const wanted = (Array.isArray(body.sheets) ? body.sheets : []).filter(s => ALLOWED.has(s));
  if (wanted.length === 0) {
    return Response.json({ ok: false, error: "閲覧できない表です。" }, { status: 400 });
  }
  // 操作履歴は代表だけ
  const sheets = wanted.filter(s => s !== "staff_audit" || can(me, "audit.view"));

  const many = await callAppsScript({ op: "listMany", sheets });
  let result: Record<string, { rowIndex: number; data: string[] }[]>;
  if (many.ok) {
    result = (many.data as { sheets?: Record<string, { rowIndex: number; data: string[] }[]> }).sheets ?? {};
  } else {
    // listMany が使えない場合は1枚ずつ取りにいく
    result = {};
    await Promise.all(sheets.map(async sheet => {
      const r = await callAppsScript({ op: "list", sheet });
      result[sheet] = r.ok ? ((r.data as { rows?: { rowIndex: number; data: string[] }[] }).rows ?? []) : [];
    }));
  }

  // レベル1は、他人が書いた指導レポートは見られない（自分のぶんだけ）
  if (!can(me, "report.viewAll") && result.staff_reports) {
    result.staff_reports = result.staff_reports.filter(r => (r.data[2] ?? "") === me.accountId);
  }

  // アカウント一覧は返さない（パスワードのハッシュが入っているため）
  delete result.accounts;

  return Response.json({ ok: true, sheets: result });
}
