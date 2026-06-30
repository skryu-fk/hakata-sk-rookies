/**
 * /api/member/register — メンバー個人アカウントの新規登録（承認制）。
 *   POST { name, password, password2 }
 *     - name      : 本名（必須）
 *     - password  : パスワード（8文字以上）
 *     - password2 : 確認用（password と一致必須）
 *
 * 登録は「承認待ち(pending)」として accounts シートに保存される。
 * パスワードは平文では保存せず scrypt ハッシュ＋ソルトで保存。
 * 管理者が承認するまでログインはできない。
 */
import { hashPassword, nameKey } from "@/lib/security";
import { callAppsScript } from "@/lib/admin-shared";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function genId(): string {
  return `acc_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export async function POST(request: Request) {
  // 登録は厳しめのレート制限（いたずら登録防止）
  const rl = rateLimit(`member-register:${clientIp(request.headers)}`, { limit: 5, windowMs: 10 * 60_000, lockMs: 20 * 60_000 });
  if (!rl.ok) return tooMany(rl.retryAfter);

  let body: { name?: string; password?: string; password2?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "リクエスト形式が不正です。" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const password = body.password ?? "";
  const password2 = body.password2 ?? "";

  if (name.length < 2 || name.length > 40) {
    return Response.json({ ok: false, error: "本名を正しく入力してください（2〜40文字）。" }, { status: 400 });
  }
  if (password.length < 8 || password.length > 72) {
    return Response.json({ ok: false, error: "パスワードは8文字以上にしてください。" }, { status: 400 });
  }
  if (password !== password2) {
    return Response.json({ ok: false, error: "確認用パスワードが一致しません。" }, { status: 400 });
  }

  const key = nameKey(name);

  // 既存アカウントとの重複チェック（却下済みは再登録を許可）
  const list = await callAppsScript({ op: "list", sheet: "accounts" });
  if (!list.ok) return Response.json({ ok: false, error: list.error }, { status: list.status });
  const rows = (list.data as { rows?: { data: string[] }[] }).rows ?? [];
  const dup = rows.find(r => (r.data[2] ?? "") === key && (r.data[5] ?? "") !== "rejected");
  if (dup) {
    return Response.json({ ok: false, error: "その本名はすでに登録されています。ログイン、または管理者にご確認ください。" }, { status: 409 });
  }

  const { salt, hash } = hashPassword(password);
  const row = [genId(), name, key, hash, salt, "pending", new Date().toISOString().slice(0, 19).replace("T", " ")];

  const res = await callAppsScript({ op: "append", sheet: "accounts", row });
  if (!res.ok) return Response.json({ ok: false, error: res.error }, { status: res.status });

  return Response.json({ ok: true, message: "登録申請を受け付けました。管理者の承認後にログインできます。" });
}
