/**
 * /api/member/verify — メンバーのログイン & セッション発行。
 *   POST { userId, password } → accounts シートで照合し、HttpOnly セッション Cookie を発行
 *   GET                       → 既存 Cookie の有効性チェック（再ログイン省略用）
 *
 * ログインは「ユーザーID（例 SKR-8421）＋ パスワード」。
 * 氏名を変更してもログインに影響しないよう、IDを認証キーにしている。
 * 総当たり対策として IP 単位のレート制限＋ロックアウトを行う。
 */
import { verifyPassword, userIdKey, issueSession, sessionRemaining, readSession, readCookie, buildSetCookie, MEMBER_COOKIE } from "@/lib/security";
import { callAppsScript } from "@/lib/admin-shared";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * ログインを保つ期間。
 *
 * 30日にしていたが、Cookieを抜き取られた場合そのあいだ使われ続けてしまう。
 * 7日に縮め、代わりに「使っている間は切れない」ようにした（下のGET）。
 * 使わなくなればそのまま期限切れになるので、端末を手放しても残らない。
 */
const TTL = 60 * 60 * 24 * 7; // 7日
const GENERIC = "ユーザーIDまたはパスワードが違います。";

/**
 * GET — いまのログインが有効かを返す。
 *
 * 残りが半分を切っていたら、その場で発行し直す。アプリは開くたびに
 * ここを叩くので、使っている人が突然ログアウトされることはない。
 */
export async function GET(request: Request) {
  const left = sessionRemaining(readCookie(request.headers, MEMBER_COOKIE), "member");
  if (left === null) return Response.json({ ok: false }, { status: 401 });

  if (left < TTL / 2) {
    const token = issueSession("member", TTL, readSub(request.headers));
    return Response.json(
      { ok: true, renewed: true },
      { headers: { "Set-Cookie": buildSetCookie(MEMBER_COOKIE, token, TTL) } },
    );
  }
  return Response.json({ ok: true });
}

/** 発行し直すときに、本人の識別子（アカウントID）を引き継ぐ */
function readSub(headers: Headers): string | undefined {
  const sess = readSession(readCookie(headers, MEMBER_COOKIE), "member");
  return sess?.sub ?? undefined;
}

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const rl = rateLimit(`member-verify:${ip}`, { limit: 10, windowMs: 5 * 60_000, lockMs: 15 * 60_000 });
  if (!rl.ok) return tooMany(rl.retryAfter);

  let body: { userId?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "リクエスト形式が不正です。" }, { status: 400 });
  }

  const uid = userIdKey(body.userId ?? "");
  const password = body.password ?? "";
  if (!uid || !password) {
    return Response.json({ ok: false, error: GENERIC }, { status: 401 });
  }

  // IPごとの制限は、送る側がIPを変えられると効かない。
  // 「このユーザーIDへの試行」も数えて、1人のアカウントを狙い撃ちされるのを防ぐ。
  const perUser = rateLimit(`member-verify-id:${uid}`, {
    limit: 8, windowMs: 10 * 60_000, lockMs: 30 * 60_000,
  });
  if (!perUser.ok) return tooMany(perUser.retryAfter);

  const list = await callAppsScript({ op: "list", sheet: "accounts" });
  if (!list.ok) return Response.json({ ok: false, error: list.error }, { status: list.status });
  const rows = (list.data as { rows?: { data: string[] }[] }).rows ?? [];
  // accounts 列: [id, name, nameKey, hash, salt, status, createdAt, memberId, userId]
  const acc = rows.find(r => userIdKey(r.data[8] ?? "") === uid);

  if (!acc) return Response.json({ ok: false, error: GENERIC }, { status: 401 });
  const realName = acc.data[1] ?? "";
  const status = acc.data[5] ?? "";

  // パスワードは必ず照合する（見つかった/見つからないで処理時間を変えない）
  const passOk = verifyPassword(password, acc.data[4] ?? "", acc.data[3] ?? "");

  if (status === "rejected") {
    return Response.json({ ok: false, error: "このアカウントは現在利用できません。管理者にご確認ください。" }, { status: 403 });
  }
  if (status === "pending") {
    return Response.json({ ok: false, error: "アカウントは承認待ちです。管理者の承認後にログインできます。" }, { status: 403 });
  }
  if (!passOk) {
    return Response.json({ ok: false, error: GENERIC }, { status: 401 });
  }

  // セッションにアカウントID(sub)を埋め込む → マイページで本人だけを特定できる。
  const token = issueSession("member", TTL, acc.data[0] ?? "");
  return Response.json(
    { ok: true, name: realName },
    { headers: { "Set-Cookie": buildSetCookie(MEMBER_COOKIE, token, TTL) } }
  );
}
