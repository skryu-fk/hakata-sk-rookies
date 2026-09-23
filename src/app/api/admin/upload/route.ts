/**
 * /api/admin/upload — 管理者が画像をアップロードして、表示用のURLを受け取る。
 *   POST multipart/form-data: file=<画像>
 *   → { ok: true, url }
 *
 * 保存先は Supabase Storage。置き場所（バケット）は初回に自動で作られるため、
 * 事前の手作業は不要。画像以外・大きすぎるファイルはここで弾く。
 */
import { ensureAuth } from "@/lib/admin-shared";
import { supabaseEnabled, uploadImage } from "@/lib/supabaseData";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 6 * 1024 * 1024; // 6MB（スマホ写真がそのまま通る程度）
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  const rl = rateLimit(`admin-upload:${clientIp(request.headers)}`, { limit: 40, windowMs: 10 * 60_000 });
  if (!rl.ok) return tooMany(rl.retryAfter);

  const authErr = ensureAuth(request.headers);
  if (authErr) return authErr;

  if (!supabaseEnabled()) {
    return Response.json({ ok: false, error: "画像の保存先が設定されていません。" }, { status: 500 });
  }

  let file: File | null = null;
  try {
    const form = await request.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch {
    return Response.json({ ok: false, error: "ファイルを読み取れませんでした。" }, { status: 400 });
  }
  if (!file) return Response.json({ ok: false, error: "画像が選ばれていません。" }, { status: 400 });

  if (!ALLOWED.has(file.type)) {
    return Response.json({ ok: false, error: "画像ファイル（JPEG / PNG / WebP / GIF）を選んでください。" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json(
      { ok: false, error: `画像が大きすぎます（${(file.size / 1024 / 1024).toFixed(1)}MB）。6MB以下にしてください。` },
      { status: 400 },
    );
  }

  try {
    const url = await uploadImage(file);
    return Response.json({ ok: true, url });
  } catch (e) {
    console.error("[upload] failed:", e);
    return Response.json({ ok: false, error: `アップロードに失敗しました: ${(e as Error).message}` }, { status: 502 });
  }
}
