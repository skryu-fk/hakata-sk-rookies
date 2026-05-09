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
 *   news:       date | category | title | body | slug
 *                例: 2026.04.21 | 募集 | メンバーを5人ほど募集中！ | 〜詳細本文〜 | （任意）
 *                ※ body 列を埋めるとお知らせ一覧から /news/[slug] にリンクされる。
 *                ※ slug 列が空の時は date+行番号から自動生成。
 *
 *   tweets:     date | text | url
 *                例: 2026-05-08 | 山王公園球場で球場練習でした！ | https://x.com/SK_rookies_FK/status/...
 *                ※ Xにポストしたあと、トップに載せたいものだけここにコピペすれば
 *                   サイトの「公式Xの最新投稿」にカードで反映される。
 *
 *   blog:       date | category | title | excerpt | content | slug
 *                例: 2026.05.10 | 活動報告 | 5月の活動まとめ | 〜2〜3行〜 | 〜本文〜 | （任意）
 *                ※ content の記法（改行で段落 / ―― / 【】 / ■ / ・ / Q. A. / **太字** / [リンク](URL)）。
 *                ※ slug が空欄なら自動生成。
 *
 *   practices:  date | type | place | status | time | note
 *                例: 2026-04-21 | キャッチボール | 東平尾公園 | 未定 | 18:00〜20:00 | 天候次第
 *                ※ type 列は基本空欄でOK（"試合" のときだけ "試合" と書く）。
 *                   練習種別は place で自動判定:
 *                     ・place に "球場" or "野球場" を含む → 球場練習
 *                     ・それ以外                         → 公園練習
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
