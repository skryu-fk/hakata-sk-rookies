/**
 * /api/line/status — ログイン中の本人のLINE連携の状態。
 *   GET    → { ok, enabled, linked }
 *   DELETE → 連携を解除する
 *
 * 解除しても、IDとパスワードでのログインは今までどおりできる。
 * 端末を手放したときなどに、自分で切れるようにしておく。
 */
import { readSession, readCookie, MEMBER_COOKIE, sameOrigin, crossOriginDenied } from "@/lib/security";
import { callAppsScript } from "@/lib/admin-shared";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";
import { lineEnabled, ACCOUNT_LINE_COL } from "@/lib/lineAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Row = { rowIndex: number; data: string[] };

async function currentRow(headers: Headers) {
  const sess = readSession(readCookie(headers, MEMBER_COOKIE), "member");
  if (!sess?.sub) return null;
  const list = await callAppsScript({ op: "list", sheet: "accounts" });
  if (!list.ok) return { error: list.error, status: list.status } as const;
  const rows = (list.data as { rows?: Row[] }).rows ?? [];
  const row = rows.find(r => (r.data[0] ?? "") === sess.sub);
  return row ? ({ row } as const) : null;
}

export async function GET(request: Request) {
  if (!lineEnabled()) return Response.json({ ok: true, enabled: false, linked: false });

  // ここは「LINEのボタンを出してよいか」の判断にも使う。
  // ログイン画面はまだログインしていないので、401 を返すとボタンが出せない。
  // 設定されているかどうかは本人の情報ではないので、未ログインでも答える。
  const found = await currentRow(request.headers);
  if (!found) return Response.json({ ok: true, enabled: true, linked: false });
  if ("error" in found) return Response.json({ ok: false, error: found.error }, { status: found.status });

  return Response.json({
    ok: true,
    enabled: true,
    linked: !!(found.row.data[ACCOUNT_LINE_COL] ?? ""),
  });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return crossOriginDenied();
  const rl = rateLimit(`line-unlink:${clientIp(request.headers)}`, { limit: 10, windowMs: 10 * 60_000 });
  if (!rl.ok) return tooMany(rl.retryAfter);

  const found = await currentRow(request.headers);
  if (!found) return Response.json({ ok: false, error: "ログインが必要です。" }, { status: 401 });
  if ("error" in found) return Response.json({ ok: false, error: found.error }, { status: found.status });

  const next = found.row.data.slice();
  while (next.length <= ACCOUNT_LINE_COL) next.push("");
  next[ACCOUNT_LINE_COL] = "";
  const saved = await callAppsScript({
    op: "update", sheet: "accounts", rowIndex: found.row.rowIndex, row: next,
  });
  if (!saved.ok) return Response.json({ ok: false, error: saved.error }, { status: saved.status });

  return Response.json({ ok: true, linked: false });
}
