/**
 * LINEログイン
 *
 * 「LINEで入れる」ようにするだけで、誰が入れるかの判断は今までどおり。
 * LINEで入れるのは、代表が承認済みのアカウントに自分で紐づけた人だけ。
 * LINE側で新しく登録できるわけではない。
 *
 * 保存するのは LINE のユーザーID（U から始まる文字列）だけ。
 * 表示名もアイコンも保存しない。ユーザーIDはプロバイダーごとの値で、
 * 本人が変えられないため、照合に使えるのはこれだけ。
 *
 * ── 往復のあいだの守り ──
 *   state  … 毎回ランダム。戻ってきたときに一致を確かめる（なりすまし防止）
 *   nonce  … 毎回ランダム。IDトークンの中身と一致を確かめる（使い回し防止）
 *   PKCE   … code_verifier を作り、S256 のハッシュだけ先に渡す
 *   これらは署名付きCookieに預ける。サーバー側に置き場を作らずに済ませるため。
 */
import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";

const AUTH_URL = "https://access.line.me/oauth2/v2.1/authorize";
const TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";
const ISSUER = "https://access.line.me";

/** 往復のあいだ state などを預けるCookie */
export const LINE_STATE_COOKIE = "skr_line";

/** accounts シートの列番号（supabaseData.ts の COLUMNS.accounts と同じ並び） */
export const ACCOUNT_LINE_COL = 12;

export function lineChannelId(): string {
  return (process.env.LINE_CHANNEL_ID ?? "").trim();
}

function lineChannelSecret(): string {
  return (process.env.LINE_CHANNEL_SECRET ?? "").trim();
}

/** LINEログインが使える設定になっているか */
export function lineEnabled(): boolean {
  return !!(lineChannelId() && lineChannelSecret());
}

/**
 * 戻り先。LINE Developers に登録したコールバックURLと一字一句そろえる。
 * 末尾のスラッシュや www の有無が違うだけで弾かれるため、
 * サイトのURLから組み立てて、ずれないようにしている。
 */
export function redirectUri(request: Request): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/+$/, "")
    || new URL(request.url).origin;
  return `${base}/api/line/callback`;
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** PKCE の code_verifier から code_challenge（S256）を作る */
export function codeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function buildAuthUrl(opts: {
  state: string; nonce: string; verifier: string; redirect: string;
}): string {
  // URLSearchParams は空白を「+」にする。LINEの例は「%20」なので、
  // scope だけは自分で組み立ててそろえる
  const p = new URLSearchParams({
    response_type: "code",
    client_id: lineChannelId(),
    redirect_uri: opts.redirect,
    state: opts.state,
    nonce: opts.nonce,
    code_challenge: codeChallenge(opts.verifier),
    code_challenge_method: "S256",
  });
  // メールアドレスは取らない（取るには別途申請が必要）
  const scope = ["profile", "openid"].map(encodeURIComponent).join("%20");
  return `${AUTH_URL}?${p.toString()}&scope=${scope}`;
}

type TokenResponse = { id_token?: string; error?: string; error_description?: string };

/** 認可コードをトークンに交換する。有効期間は10分・1回だけ */
export async function exchangeCode(code: string, verifier: string, redirect: string): Promise<
  { ok: true; idToken: string } | { ok: false; error: string }
> {
  let res: Response;
  try {
    res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirect,
        client_id: lineChannelId(),
        client_secret: lineChannelSecret(),
        code_verifier: verifier,
      }),
    });
  } catch {
    return { ok: false, error: "LINEに接続できませんでした。" };
  }

  const data = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok || !data.id_token) {
    // LINE側の文言をそのまま画面に出さない（設定の内情が伝わるため）
    console.error("[line] token exchange failed:", res.status, data.error, data.error_description);
    return { ok: false, error: "LINEとのやり取りに失敗しました。もう一度お試しください。" };
  }
  return { ok: true, idToken: data.id_token };
}

type IdTokenPayload = { iss?: string; sub?: string; aud?: string; exp?: number; nonce?: string };

/**
 * IDトークンを検証して、LINEのユーザーID（sub）を返す。
 *
 * ウェブログインのIDトークンは HS256 で、チャネルシークレットで検証できる。
 * 署名・発行元・宛先・期限・nonce をすべて確かめる。ひとつでも違えば拒否する。
 */
export function verifyIdToken(idToken: string, expectedNonce: string): { ok: true; sub: string } | { ok: false; error: string } {
  const parts = idToken.split(".");
  if (parts.length !== 3) return { ok: false, error: "IDトークンの形式が不正です。" };
  const [headerB64, payloadB64, sigB64] = parts;

  let header: { alg?: string };
  let payload: IdTokenPayload;
  try {
    header = JSON.parse(Buffer.from(headerB64, "base64url").toString("utf8"));
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return { ok: false, error: "IDトークンを読めませんでした。" };
  }

  // alg を信じて切り替えない。ウェブログインは HS256 と決まっている
  if (header.alg !== "HS256") return { ok: false, error: "IDトークンの署名方式が想定と違います。" };

  const expected = createHmac("sha256", lineChannelSecret())
    .update(`${headerB64}.${payloadB64}`)
    .digest();
  const actual = Buffer.from(sigB64, "base64url");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return { ok: false, error: "IDトークンの署名が一致しません。" };
  }

  if (payload.iss !== ISSUER) return { ok: false, error: "IDトークンの発行元が違います。" };
  if (payload.aud !== lineChannelId()) return { ok: false, error: "IDトークンの宛先が違います。" };
  if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) {
    return { ok: false, error: "IDトークンの有効期限が切れています。" };
  }
  if (!expectedNonce || payload.nonce !== expectedNonce) {
    return { ok: false, error: "IDトークンのnonceが一致しません。" };
  }
  if (!payload.sub) return { ok: false, error: "IDトークンにユーザーIDが入っていません。" };

  return { ok: true, sub: payload.sub };
}

/**
 * 戻ってきたあとの転送。
 *
 * メンバーのCookieは SameSite=Strict なので、LINEからの転送で直接
 * /stats を開くと送られてこない（＝ログインしていない扱いになる）。
 * いったん自分のページを返して、そこから移動させることで同一サイト扱いにする。
 */
export function bounceTo(path: string): Response {
  const safe = path.startsWith("/") ? path : "/stats";
  const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<meta name="robots" content="noindex"><title>ログイン中…</title>
<style>body{background:#000;color:#fff;font-family:system-ui,-apple-system,"Hiragino Sans",sans-serif;
display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-size:14px}</style>
</head><body>アプリに戻っています…
<script>location.replace(${JSON.stringify(safe)})</script>
</body></html>`;
  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}
