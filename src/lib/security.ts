/**
 * セキュリティ関連の共通ユーティリティ。
 */
import { createHmac, timingSafeEqual, randomBytes, randomInt, scryptSync } from "crypto";

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

/* ── カタカナ名・パスワード・ユーザーID ───────────────────────── */

/**
 * 氏名は「全角カタカナ＋スペース」のみ許可する（漢字・ひらがな・英数字は不可）。
 * 半角カナで打たれても NFKC で全角に寄せてから判定する。
 */
export function isKatakanaName(name: string): boolean {
  const s = String(name).normalize("NFKC").trim();
  if (!s) return false;
  // ゠-ヿ = カタカナブロック（ー・ヴ・「・」含む）
  if (!/^[゠-ヿ 　]+$/.test(s)) return false;
  // スペースや記号だけは不可。カナ本体が1文字以上必要。
  return /[ァ-ヺ]/.test(s);
}

/**
 * 名簿照合用のカナキー。
 * 全角化 → ひらがなをカタカナへ → 空白を全除去、で表記ゆれを吸収する。
 */
export function kanaKey(s: string): string {
  return String(s)
    .normalize("NFKC")
    .replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60))
    .replace(/\s+/g, "")
    .trim();
}

/** パスワード条件: 8文字以上72文字以下で、英字と数字を両方含む。 */
export function isStrongPassword(pw: string): boolean {
  if (typeof pw !== "string") return false;
  if (pw.length < 8 || pw.length > 72) return false;
  return /[A-Za-z]/.test(pw) && /[0-9]/.test(pw);
}

/**
 * ユーザーID（例: SKR-482130）を1件生成する。重複確認は呼び出し側で行う。
 *
 * Math.random() は予測できてしまううえ、4桁では9000通りしかなかった。
 * ログインIDが絞り込めると総当たりの的が小さくなるので、
 * 暗号用の乱数で6桁にしている。既存の4桁のIDはそのまま使える。
 */
export function genUserId(): string {
  return `SKR-${String(randomInt(0, 1_000_000)).padStart(6, "0")}`;
}

/** 入力されたユーザーIDの表記ゆれ（小文字・全角・ハイフン抜け）を吸収する。 */
export function userIdKey(v: string): string {
  return String(v).normalize("NFKC").toUpperCase().replace(/[^A-Z0-9]/g, "");
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

let warnedNoSecret = false;

/**
 * セッションの署名に使う鍵。
 *
 * SESSION_SECRET を必ず設定すること。未設定だと管理者パスワードから鍵を
 * 作ることになり、パスワードが漏れた時点でセッションを偽造できてしまう。
 * （人が決めたパスワードは、鍵としては短く推測もしやすい）
 */
function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;

  if (!warnedNoSecret) {
    warnedNoSecret = true;
    console.warn(
      "[security] SESSION_SECRET が未設定です。管理者パスワードから鍵を作っています。" +
      "Vercel の環境変数にランダムな長い文字列を設定してください。",
    );
  }
  return `${process.env.MEMBER_PASSWORD ?? ""}|${process.env.ADMIN_PASSWORD ?? ""}|skr-session-v1`;
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

/* ── 短期間だけ持たせる署名付きの値 ───────────────────────────
 * ログインの往復（LINEへ飛んで戻ってくる）のあいだ、state や nonce を
 * 預けておくのに使う。サーバーに置き場を作らずに済ませるため、
 * 中身に署名を付けてCookieに持たせ、戻ってきたときに改ざんを検出する。
 */

/** 任意の値に署名して、期限付きの文字列にする */
export function signValue(data: Record<string, unknown>, ttlSeconds: number): string {
  const body = { ...data, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const payload = Buffer.from(JSON.stringify(body)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/**
 * 同じ入力から、いつでも同じ秘密の文字列を作る（43文字）。
 *
 * サーバーだけが計算できるので、持ち歩かせたくない値を
 * 「保存せずに、必要なときに作り直す」のに使える。
 * PKCE の code_verifier をこれで作っている。
 */
export function deriveSecret(input: string): string {
  return sign(input);
}

/** signValue で作った文字列を読む。署名が違う・期限切れなら null */
export function readValue<T = Record<string, unknown>>(token: string | undefined | null): T | null {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  const a = Buffer.from(token.slice(dot + 1));
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof data.exp !== "number" || data.exp < Math.floor(Date.now() / 1000)) return null;
    return data as T;
  } catch {
    return null;
  }
}

/**
 * 外部サイトから戻ってくる途中で使うCookie。
 *
 * SameSite=Strict だと、LINEから戻ってきた最初のリクエストで送られてこない。
 * 行って帰ってくるあいだだけ必要な値なので、Lax にして期限も短くする。
 */
export function buildRoundTripCookie(name: string, value: string, maxAgeSeconds: number): string {
  const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";
  return `${name}=${value}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly;${secure} SameSite=Lax`;
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


/**
 * 書き込み系APIが「自分のサイトから呼ばれたか」を確かめる。
 *
 * Cookie は SameSite=Strict なので他サイトからは送られない。ただしそれは
 * ブラウザ側の約束であって、古い端末や将来の仕様変更では保証にならない。
 * データを消す・書き換える操作は、Origin も見て二重に防ぐ。
 *
 * Origin が付かないリクエスト（同一オリジンの一部や curl など）は、
 * Cookie が無ければどのみち認証で弾かれるため、ここでは通す。
 */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const from = new URL(origin).host;
    const host = request.headers.get("host");
    if (host && from === host) return true;
    const site = process.env.NEXT_PUBLIC_SITE_URL;
    if (site && from === new URL(site).host) return true;
    return false;
  } catch {
    return false;
  }
}

/** 別サイトからの書き込みを断るときの返事 */
export function crossOriginDenied(): Response {
  return Response.json(
    { ok: false, error: "不正なリクエストです。" },
    { status: 403 },
  );
}

/**
 * セッションの残り時間（秒）。無効なら null。
 *
 * 「使っている間は切れない」ようにするために使う。残りが少なくなったら
 * 発行し直すことで、作業中に突然ログアウトされるのを防ぐ。
 * 一方、使われなくなればそのまま期限切れになるので、放置した端末に
 * いつまでもログインが残ることはない。
 */
export function sessionRemaining(
  token: string | undefined | null,
  role: SessionRole,
): number | null {
  if (!verifySession(token, role)) return null;
  try {
    const payload = token!.slice(0, token!.indexOf("."));
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Math.max(0, data.exp - Math.floor(Date.now() / 1000));
  } catch {
    return null;
  }
}
