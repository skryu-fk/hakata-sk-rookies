/**
 * /api/member/verify — メンバー個人アカウントのログイン & セッション発行。
 *   POST { name, password }  → accounts シートで照合し、承認済みなら HttpOnly セッション Cookie を発行
 *   GET                       → 既存 Cookie の有効性チェック（再ログイン省略用）
 *
 * 認証は「本名 + 個人パスワード（scrypt ハッシュ照合）」。共通パスワードは廃止。
 * 管理者が承認した(status=approved)アカウントのみログイン可。
 * 総当たり対策として IP 単位のレート制限＋ロックアウトを行う。
 */
import { verifyPassword, nameKey, issueSession, verifySession, readCookie, buildSetCookie, MEMBER_COOKIE } from "@/lib/security";
import { callAppsScript } from "@/lib/admin-shared";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TTL = 60 * 60 * 24 * 30; // 30日
const GENERIC = "本名またはパスワードが違います。";

export async function GET(request: Request) {
  if (verifySession(readCookie(request.headers, MEMBER_COOKIE), "member")) {
    return Response.json({ ok: true });
  }
  return Response.json({ ok: false }, { status: 401 });
}

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  // ログイン試行は厳しめ：5分で10回まで、超えたら15分ロック
  const rl = rateLimit(`member-verify:${ip}`, { limit: 10, windowMs: 5 * 60_000, lockMs: 15 * 60_000 });
  if (!rl.ok) return tooMany(rl.retryAfter);

  let body: { name?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "リクエスト形式が不正です。" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const password = body.password ?? "";
  if (!name || !password) {
    return Response.json({ ok: false, error: GENERIC }, { status: 401 });
  }
  const key = nameKey(name);

  const list = await callAppsScript({ op: "list", sheet: "accounts" });
  if (!list.ok) return Response.json({ ok: false, error: list.error }, { status: list.status });
  const rows = (list.data as { rows?: { data: string[] }[] }).rows ?? [];
  // accounts 列: [id, name, nameKey, hash, salt, status, createdAt]
  const acc = rows.find(r => (r.data[2] ?? "") === key);

  if (!acc) return Response.json({ ok: false, error: GENERIC }, { status: 401 });
  const realName = acc.data[1] ?? name;
  const hash = acc.data[3] ?? "";
  const salt = acc.data[4] ?? "";
  const status = acc.data[5] ?? "";

  // パスワードは見つかった/見つからないに関わらず必ず照合（タイミングをならす）
  const passOk = verifyPassword(password, salt, hash);

  if (status === "pending") {
    return Response.json({ ok: false, error: "アカウントは承認待ちです。管理者の承認後にログインできます。", pending: true }, { status: 403 });
  }
  if (status !== "approved" || !passOk) {
    return Response.json({ ok: false, error: GENERIC }, { status: 401 });
  }

  const token = issueSession("member", TTL);
  return Response.json(
    { ok: true, name: realName },
    { headers: { "Set-Cookie": buildSetCookie(MEMBER_COOKIE, token, TTL) } }
  );
}
