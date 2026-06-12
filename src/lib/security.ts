/**
 * セキュリティ関連の共通ユーティリティ。
 */
import { createHmac, timingSafeEqual } from "crypto";

/**
 * 定数時間でのパスワード比較。`===` は早期リターンで長さ・内容の差が
 * 処理時間に出るため、タイミング攻撃の手がかりになる。常に同じ手順で比較する。
 */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(String(a), "utf8");
  const bb = Buffer.from(String(b), "utf8");
  if (ab.length !== bb.length) {
    // 長さが違っても早期に返さず、ダミー比較で時間をならす
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

/* ── 署名付きセッショントークン（ステートレス・HMAC） ─────────── */

function sessionSecret(): string {
  // 専用の SESSION_SECRET を推奨。未設定時はサーバ専用の各パスワードから導出
  return (
    process.env.SESSION_SECRET ||
    `${process.env.MEMBER_PASSWORD ?? ""}|${process.env.ADMIN_PASSWORD ?? ""}|skr-session-v1`
  );
}

export type SessionRole = "member" | "admin";

function sign(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

/** role と有効期限を埋め込んだトークンを発行する。 */
export function issueSession(role: SessionRole, ttlSeconds: number): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = Buffer.from(JSON.stringify({ r: role, exp })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** トークンが正しく署名され、期限内で、role が一致するか検証する。 */
export function verifySession(token: string | undefined | null, role: SessionRole): boolean {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot < 1) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (data.r !== role) return false;
    if (typeof data.exp !== "number" || data.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}

export const MEMBER_COOKIE = "skr_m";
export const ADMIN_COOKIE = "skr_a";

/** Cookie ヘッダから 1 つの値を取り出す。 */
export function readCookie(headers: Headers, name: string): string | null {
  const raw = headers.get("cookie");
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

/** Set-Cookie 文字列を組み立てる（HttpOnly / SameSite=Strict / 本番のみ Secure）。 */
export function buildSetCookie(name: string, value: string, maxAgeSeconds: number): string {
  const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";
  return `${name}=${value}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly;${secure} SameSite=Strict`;
}

export function buildClearCookie(name: string): string {
  const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";
  return `${name}=; Path=/; Max-Age=0; HttpOnly;${secure} SameSite=Strict`;
}
