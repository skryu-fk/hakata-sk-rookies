/**
 * ブラウザ内の簡易キャッシュ（localStorage）。
 *
 * Apps Script（スプレッドシート）は1往復が重く、毎回まっさらから取り直すと
 * 画面が数秒空っぽになる。前回取得した内容をすぐ描画して、裏で最新を取り直す
 * （stale-while-revalidate）ことで体感速度を大きく改善するために使う。
 *
 * 注意: 端末内にのみ保存される。ログアウト時は clearCache() で消すこと。
 */
const PREFIX = "skr_cache_v1:";

export function readCache<T>(key: string, maxAgeMs = 24 * 60 * 60 * 1000): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const o = JSON.parse(raw) as { at?: number; v?: T };
    if (!o || typeof o.at !== "number" || o.v === undefined) return null;
    if (Date.now() - o.at > maxAgeMs) return null;
    return o.v as T;
  } catch {
    return null;
  }
}

/** 値と「取得してからの経過ミリ秒」を返す。十分新しければ再取得を省くのに使う。 */
export function readCacheWithAge<T>(key: string, maxAgeMs = 24 * 60 * 60 * 1000): { v: T; age: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const o = JSON.parse(raw) as { at?: number; v?: T };
    if (!o || typeof o.at !== "number" || o.v === undefined) return null;
    const age = Date.now() - o.at;
    if (age > maxAgeMs) return null;
    return { v: o.v as T, age };
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, v: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), v }));
  } catch {
    /* 容量超過などは無視（キャッシュは無くても動く） */
  }
}

/** ログアウト時などにアプリのキャッシュを全部消す。 */
export function clearCache(): void {
  if (typeof window === "undefined") return;
  try {
    const del: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(PREFIX)) del.push(k);
    }
    del.forEach(k => window.localStorage.removeItem(k));
  } catch {
    /* 無視 */
  }
}
