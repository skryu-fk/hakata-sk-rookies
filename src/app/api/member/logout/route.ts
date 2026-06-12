/**
 * /api/member/logout — メンバーセッション Cookie を破棄する。
 */
import { buildClearCookie, MEMBER_COOKIE } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return Response.json(
    { ok: true },
    { headers: { "Set-Cookie": buildClearCookie(MEMBER_COOKIE) } }
  );
}
