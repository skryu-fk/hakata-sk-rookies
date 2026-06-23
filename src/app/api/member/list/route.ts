/**
 * /api/member/list — メンバー閲覧用の read-only 一覧 API。
 *
 * 管理者用 /api/admin/list と違い、許可するシートを成績系のみに絞る。
 * （メンバーが集金や運営データを覗けないように）
 * パスワードは MEMBER_PASSWORD で、ヘッダ `x-member-password` で渡す。
 */

import { ensureMemberAuth, callAppsScript } from "@/lib/admin-shared";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MEMBER_ALLOWED_SHEETS = new Set([
  "members",
  "batting",
  "pitching",
  "catching",
  "fielding",
  "practices",   // 日程表示用
  "probables",   // 予告先発表示用
  "announcements", // お知らせ表示用
  "participants",  // 練習の参加予定メンバー表示用
  "settings",      // メンテナンス状態の確認用
  "attendance",    // 練習参加投票（自分の出欠）表示用
  "pending",       // スコアラー記録の確認用
]);

export async function POST(request: Request) {
  const rl = rateLimit(`member-list:${clientIp(request.headers)}`, { limit: 100, windowMs: 60_000 });
  if (!rl.ok) return tooMany(rl.retryAfter);

  const authErr = ensureMemberAuth(request.headers);
  if (authErr) return authErr;

  let body: { sheet?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "リクエスト形式が不正です。" }, { status: 400 });
  }

  if (!body.sheet || !MEMBER_ALLOWED_SHEETS.has(body.sheet)) {
    return Response.json({ ok: false, error: "閲覧できないシートです。" }, { status: 400 });
  }

  const result = await callAppsScript({ op: "list", sheet: body.sheet });
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: result.status });
  }
  return Response.json({ ok: true, rows: (result.data as { rows?: unknown }).rows ?? [] });
}
