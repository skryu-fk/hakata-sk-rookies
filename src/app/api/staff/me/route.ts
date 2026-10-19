/**
 * /api/staff/me — ログインしている首脳陣の情報を返す。
 *   GET → { ok, user } / 首脳陣でなければ 401
 *
 * 画面はこの結果を見て、出すメニューを決める。
 * ただし「見えない＝できない」ではないので、実際の可否は各APIで再確認する。
 */
import { currentStaff } from "@/lib/staffAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await currentStaff(request.headers);
  if (!user) {
    return Response.json({ ok: false, error: "首脳陣としてログインしてください。" }, { status: 401 });
  }
  return Response.json({ ok: true, user });
}
