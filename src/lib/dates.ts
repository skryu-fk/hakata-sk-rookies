/**
 * 日付の表記をそろえる
 *
 * 名簿の加入日は、入力された場所によって形がばらばらに保存されている。
 * 管理画面から入れたものは "2026-04-15" だが、スプレッドシートに
 * 直接入れたものや古い行には
 * "Wed Apr 15 2026 00:00:00 GMT+0900 (Japan Standard Time)" のような
 * JavaScript の Date.toString() がそのまま入っていることがある。
 * これをそのまま画面に出すと、マイページの「加入日」が1行では収まらず
 * 英語の長文になってしまうため、出すところで必ず通す。
 */

/** どんな形でも "YYYY-MM-DD" にそろえる。読めなければ元の文字列を返す */
export function normalizeDate(s: string): string {
  if (!s) return "";
  const cleaned = String(s).replace(/[./]/g, "-");
  const m = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;

  // Date.toString() 系。new Date() に通して組み直す
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return String(s);
}

/** "2026-04-15" → "2026年4月15日"。読めなければ元の文字列を返す */
export function formatJpDate(s: string): string {
  const m = normalizeDate(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return String(s ?? "");
  return `${Number(m[1])}年${Number(m[2])}月${Number(m[3])}日`;
}
