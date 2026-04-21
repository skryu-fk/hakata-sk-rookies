/**
 * Google Sheets（公開シート）から CSV を取得してパースするヘルパー。
 *
 * セットアップ（1回だけ）:
 *   1. Google スプレッドシートを新規作成
 *   2. シート（タブ）名を "news" と "practices" に変更
 *   3. それぞれの1行目に列見出しを入れる（下記参照）
 *   4. 「共有」→「リンクを知っている全員」＝閲覧者 に設定
 *   5. URL `https://docs.google.com/spreadsheets/d/XXXXXXXX/edit` の
 *      XXXXXXXX 部分（スプレッドシートID）をコピー
 *   6. Vercel ダッシュボード → Settings → Environment Variables に
 *      `SHEETS_ID = XXXXXXXX` を追加 → Redeploy
 *
 * シート形式:
 *   news:       date | category | title
 *                例: 2026.04.21 | 募集 | メンバーを5人ほど募集中！
 *
 *   practices:  date | type | place | status | time | note
 *                例: 2026-04-21 | キャッチボール | 東平尾公園 | 未定 | 18:00〜20:00 | 天候次第
 *
 * 未設定・取得失敗時は src/data/*.ts の静的配列にフォールバック。
 * 編集後、最大5分でサイトに反映されます（ISR revalidate: 300）。
 */

export async function fetchSheetCSV(sheetName: string): Promise<string[][]> {
  const sheetId = process.env.SHEETS_ID;
  if (!sheetId) return [];
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  try {
    const res = await fetch(url, {
      next: { revalidate: 300, tags: [`sheet:${sheetName}`] },
    });
    if (!res.ok) return [];
    const text = await res.text();
    return parseCSV(text);
  } catch {
    return [];
  }
}

/** 簡易CSVパーサ。ダブルクオート・カンマ・改行のエスケープに対応。 */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field); field = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); rows.push(row); row = []; field = "";
      } else {
        field += c;
      }
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  // 空行を除外
  return rows.filter(r => r.some(v => v.trim().length > 0));
}
