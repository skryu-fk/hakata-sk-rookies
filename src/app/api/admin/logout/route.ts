/**
 * /api/admin/logout — 管理者セッションを本当に終わらせる。
 *
 * これまで画面の「ログアウト」は中の状態を消すだけで、
 * ブラウザに残った管理者Cookieはそのままだった（最大12時間有効）。
 * 共用の端末やスマホを人に貸したときに、戻るだけで入り直せてしまうので、
 * サーバー側でCookieを無効にする口を用意する。
 */
import { buildClearCookie, ADMIN_COOKIE } from "@/lib/security";
import { sameOrigin, crossOriginDenied } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // 別サイトからの書き込みを断る
  if (!sameOrigin(request)) return crossOriginDenied();
  return Response.json(
    { ok: true },
    { headers: { "Set-Cookie": buildClearCookie(ADMIN_COOKIE) } },
  );
}
