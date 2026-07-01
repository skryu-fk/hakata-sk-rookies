/**
 * /api/admin/accounts — メンバー個人アカウントの承認・連携管理（管理者専用）。
 *   POST { op: "list" }                     → アカウント一覧（ハッシュ/ソルトは返さない）
 *   POST { op: "approve", rowIndex }        → status を approved に（ログイン許可）
 *   POST { op: "reject",  rowIndex }        → status を rejected に（ログイン不可）
 *   POST { op: "link", rowIndex, memberId } → 名簿メンバー(memberId)に連携（成績と紐付け）
 *
 * パスワードハッシュはブラウザへ一切返さない（list は本名・状態・申請日時・連携先のみ）。
 * どの操作も hash/salt はサーバ側で保持したまま該当列だけ書き換える。
 */
import { ensureAuth, callAppsScript } from "@/lib/admin-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = ensureAuth(request.headers);
  if (auth) return auth;

  let body: { op?: string; rowIndex?: number; memberId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "リクエスト形式が不正です。" }, { status: 400 });
  }
  const op = body.op || "list";

  const list = await callAppsScript({ op: "list", sheet: "accounts" });
  if (!list.ok) return Response.json({ ok: false, error: list.error }, { status: list.status });
  const rows = (list.data as { rows?: { rowIndex: number; data: string[] }[] }).rows ?? [];

  if (op === "list") {
    // accounts 列: [id, name, nameKey, hash, salt, status, createdAt, memberId]
    // hash / salt はクライアントに渡さない。
    const accounts = rows.map(r => ({
      id: r.data[0] ?? "",
      name: r.data[1] ?? "",
      status: r.data[5] ?? "",
      createdAt: r.data[6] ?? "",
      memberId: r.data[7] ?? "",
      rowIndex: r.rowIndex,
    }));
    return Response.json({ ok: true, accounts });
  }

  if (op === "approve" || op === "reject" || op === "link") {
    const rowIndex = Number(body.rowIndex);
    const target = rows.find(r => r.rowIndex === rowIndex);
    if (!target) return Response.json({ ok: false, error: "対象アカウントが見つかりません。" }, { status: 404 });
    const next = target.data.slice();
    while (next.length < 8) next.push("");
    if (op === "link") {
      next[7] = String(body.memberId ?? ""); // 空文字なら連携解除
    } else {
      next[5] = op === "approve" ? "approved" : "rejected";
    }
    const res = await callAppsScript({ op: "update", sheet: "accounts", rowIndex, row: next });
    if (!res.ok) return Response.json({ ok: false, error: res.error }, { status: res.status });
    return Response.json({ ok: true });
  }

  return Response.json({ ok: false, error: "unknown op" }, { status: 400 });
}
