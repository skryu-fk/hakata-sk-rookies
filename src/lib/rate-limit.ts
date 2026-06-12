/**
 * 簡易レート制限（インメモリ）。
 *
 * Vercel のサーバーレスはインスタンスごとにメモリが分かれるため完全ではないが、
 * 同一インスタンスへの連続アクセス（総当たり・スパム）に対しては十分に効く。
 * ログイン系は厳しめ＋一定回数でロックアウト、データ取得系は緩めに設定する。
 */
type Bucket = { count: number; resetAt: number; lockedUntil: number };

const store = new Map<string, Bucket>();

export type RateOptions = {
  limit: number;       // ウィンドウ内の許容回数
  windowMs: number;    // ウィンドウ長
  lockMs?: number;     // 超過時のロックアウト時間（省略時はウィンドウ終了まで）
};

export function rateLimit(key: string, opts: RateOptions): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  let b = store.get(key);

  if (b && b.lockedUntil > now) {
    return { ok: false, retryAfter: Math.ceil((b.lockedUntil - now) / 1000) };
  }
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + opts.windowMs, lockedUntil: 0 };
    store.set(key, b);
  }
  b.count++;

  if (b.count > opts.limit) {
    b.lockedUntil = now + (opts.lockMs ?? Math.max(0, b.resetAt - now));
    return { ok: false, retryAfter: Math.ceil((b.lockedUntil - now) / 1000) };
  }

  // たまにお掃除（メモリ肥大防止）
  if (store.size > 5000) {
    for (const [k, v] of store) {
      if (v.lockedUntil < now && v.resetAt < now) store.delete(k);
    }
  }
  return { ok: true, retryAfter: 0 };
}

/** プロキシ経由でも実クライアントIPを推定する。 */
export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip") || headers.get("x-vercel-forwarded-for") || "unknown";
}

export function tooMany(retryAfter: number): Response {
  return Response.json(
    { ok: false, error: "アクセスが集中しています。しばらく待ってから再度お試しください。" },
    { status: 429, headers: { "Retry-After": String(Math.max(1, retryAfter)) } }
  );
}
