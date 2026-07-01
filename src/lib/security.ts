/**
 * セキュリティ関連の共通ユーティリティ。
 */
import { createHmac, timingSafeEqual, randomBytes, scryptSync } from "crypto";

/* ── パスワードのハッシュ化（scrypt + salt）─────────────────────── */
// 個人アカウントのパスワードは平文で保存せず、ソルト付き scrypt ハッシュで保存する。

/** パスワードから { salt, hash }（どちらも hex）を生成する。 */
export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

/** 入力パスワードが保存済みハッシュと一致するか（定数時間比較）。 */
export function verifyPassword(password: string, salt: string, hash: string): boolean {
  if (!salt || !hash) return false;
  try {
    const computed = scryptSync(password, salt, 64);
    const stored = Buffer.from(hash, "hex");
    if (computed.length !== stored.length) return false;
    return timingSafeEqual(computed, stored);
  } catch {
    return false;
  }
}

/** 本名のゆれを吸収した照合キー（前後空白除去・全空白除去・小文字化）。 */
export function nameKey(name: string): string {
  return String(name).trim().toLowerCase().replace(/\s+/g, "");
}

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

/** role と有効期限を埋め込んだトークンを発行する。sub は任意の識別子（アカウントID等）。 */
export function issueSession(role: SessionRole, ttlSeconds: number, sub?: string): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const body: { r: SessionRole; exp: number; s?: string } = { r: role, exp };
  if (sub) body.s = sub;
  const payload = Buffer.from(JSON.stringify(body)).toString("base64url");
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

/**
 * verifySession と同じ検証を行い、成功時は埋め込まれた sub（アカウントID等）を返す。
 * 「自分自身のデータだけ編集させる」ために、Cookie から本人を特定するのに使う。
 */
export function readSession(token: string | undefined | null, role: SessionRole): { sub: string | null } | null {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (data.r !== role) return null;
    if (typeof data.exp !== "number" || data.exp < Math.floor(Date.now() / 1000)) return null;
    return { sub: typeof data.s === "string" ? data.s : null };
  } catch {
    return null;
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
