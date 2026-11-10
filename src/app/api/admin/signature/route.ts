/**
 * /api/admin/signature — 規約同意の手書き署名を表示する（管理者のみ）。
 *   GET ?path=<保存場所>
 *
 * 署名は本人の筆跡そのものなので、公開の置き場には置かない。
 * 非公開のバケットに入れておき、ここで「60秒だけ開けるURL」を作って
 * そこへ転送する。URLが人づてに回っても、すぐ使えなくなる。
 *
 * path は consents に保存された値をそのまま渡す。ディレクトリ移動のような
 * 文字列は signedUrlFor 側で弾いている。
 */
import { ensureAuth } from "@/lib/admin-shared";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";
import { supabaseEnabled, signedUrlFor } from "@/lib/supabaseData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rl = rateLimit(`admin-signature:${clientIp(request.headers)}`, { limit: 120, windowMs: 60_000 });
  if (!rl.ok) return tooMany(rl.retryAfter);

  const authErr = ensureAuth(request.headers);
  if (authErr) return authErr;

  const path = new URL(request.url).searchParams.get("path") ?? "";
  if (!path) return Response.json({ ok: false, error: "保存場所が指定されていません。" }, { status: 400 });

  if (!supabaseEnabled()) {
    return Response.json({ ok: false, error: "画像の保存先が設定されていません。" }, { status: 500 });
  }

  const url = await signedUrlFor(path, 60);
  if (!url) return Response.json({ ok: false, error: "署名が見つかりません。" }, { status: 404 });

  return Response.redirect(url, 302);
}
