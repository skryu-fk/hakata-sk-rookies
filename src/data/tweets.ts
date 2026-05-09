/**
 * X（Twitter）投稿データ。
 * Twitter公式の widget はアカウント・広告ブロッカー・iOS の Cookie 設定で
 * しょっちゅう表示されないため、公式タイムライン埋め込みはやめて
 * スプレッドシートから手動で同期するキュレーション方式に統一。
 *
 * 編集方法（推奨・pushなし）:
 *   Google スプレッドシートに "tweets" シートを作成し、1行目を見出しに:
 *     date | text | url
 *     例: 2026-05-08 | 今日は山王公園球場で球場練習でした！ | https://x.com/SK_rookies_FK/status/123...
 *
 *   サイト側で記事の左に投稿日、本文、Xへのリンクを表示します（最新6件まで）。
 */

import { fetchSheetCSV } from "@/lib/sheets";

export type Tweet = {
  date: string;
  text: string;
  url?: string;
};

/** フォールバック（スプレッドシート未設定・取得失敗時に使われる） */
export const tweets: Tweet[] = [
  {
    date: "2026-05-08",
    text: "メンバー13人になりました！\n初心者中心でわいわい楽しくやってます。引き続き募集中なので、気になる方はDMください⚾️",
    url: "https://x.com/SK_rookies_FK",
  },
  {
    date: "2026-05-03",
    text: "公式Instagramを開設しました📸 練習・試合の様子はこちらでも！\n@hakata_sk_rookies",
    url: "https://x.com/SK_rookies_FK",
  },
  {
    date: "2026-04-21",
    text: "東平尾公園でキャッチボール練習！未経験のメンバーも続々参加中です。",
    url: "https://x.com/SK_rookies_FK",
  },
];

function normalizeDate(v: string): string {
  // "YYYY.MM.DD" / "YYYY/MM/DD" → "YYYY-MM-DD"
  const t = v.trim().replace(/[./]/g, "-");
  const m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return t; // 形式不一致でも生のまま表示しておく（破棄しない）
  return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

/** スプレッドシートから最新の投稿を取得。失敗時は静的配列にフォールバック。 */
export async function getTweets(): Promise<Tweet[]> {
  const rows = await fetchSheetCSV("tweets");
  if (rows.length <= 1) return tweets;
  const parsed = rows.slice(1)
    .map<Tweet | null>(r => {
      const date = normalizeDate(r[0] ?? "");
      const text = (r[1] ?? "").trim();
      if (!date || !text) return null;
      return {
        date,
        text,
        url: (r[2] ?? "").trim() || undefined,
      };
    })
    .filter((t): t is Tweet => t !== null)
    // 新しい順
    .sort((a, b) => b.date.localeCompare(a.date));
  return parsed.length > 0 ? parsed : tweets;
}
