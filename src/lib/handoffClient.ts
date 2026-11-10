/**
 * ログインの引き渡し（アプリ側）
 *
 * 仕組みの説明は src/lib/loginHandoff.ts にまとめてある。
 * ここは「合言葉を作って自分の中に置く」「戻ってきたら引き取る」側。
 *
 * 合言葉はこの端末の中（localStorage）だけに置き、
 * 外へ出すのはその指紋（SHA-256）だけ。指紋はLINEへの往復で
 * URLに載るが、指紋からは合言葉を作れないので、拾われても使えない。
 */

const KEY = "skr_line_handoff";

/** 作ってから使われないまま残った合言葉を捨てるまでの時間 */
const STALE_MS = 15 * 60_000;

type Stored = { s: string; t: number };

function read(): Stored | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Stored;
    if (!v?.s || typeof v.t !== "number") return null;
    if (Date.now() - v.t > STALE_MS) { localStorage.removeItem(KEY); return null; }
    return v;
  } catch {
    return null;
  }
}

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * 合言葉を作って端末に置き、その指紋を返す。
 * 指紋だけをLINEへの往復に持たせる。
 *
 * 作れなかったとき（古い端末・保存が使えない等）は空文字を返す。
 * そのときは引き渡しなしで進み、戻ってからIDとパスワードで入ってもらう。
 */
export async function newHandoff(): Promise<string> {
  try {
    if (!window.crypto?.subtle) return "";
    const raw = new Uint8Array(32);
    crypto.getRandomValues(raw);
    const secret = toHex(raw.buffer);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
    localStorage.setItem(KEY, JSON.stringify({ s: secret, t: Date.now() } satisfies Stored));
    return toHex(digest);
  } catch {
    return "";
  }
}

/** 引き取り待ちの合言葉。無ければ空文字 */
export function pendingHandoff(): string {
  return read()?.s ?? "";
}

export function clearHandoff(): void {
  try { localStorage.removeItem(KEY); } catch { /* 消せなくても期限で消える */ }
}

/**
 * ホーム画面に追加したアプリとして開かれているか。
 *
 * これが本当のときは、LINEから戻った先（Safari）で先に進ませても意味がない。
 * 「アプリに戻ってください」と伝えるために、往復に持たせる。
 */
export function isStandalone(): boolean {
  try {
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
    // iPhoneのSafariだけが持つ古い印。いまも標準の指標より確実に効く
    return (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
}

/**
 * LINEへ送り出すURLを組み立てる。
 * 合言葉の指紋と、アプリから来たかどうかだけを持たせる。
 */
export async function lineStartUrl(mode: "login" | "link" | "register", ticket?: string): Promise<string> {
  const p = new URLSearchParams({ mode });
  if (ticket) p.set("t", ticket);
  const ph = await newHandoff();
  if (ph) p.set("ph", ph);
  if (isStandalone()) p.set("pwa", "1");
  return `/api/line/start?${p.toString()}`;
}
