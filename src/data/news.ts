/**
 * お知らせデータ
 *
 * 編集方法（推奨・pushなし）:
 *   Google スプレッドシートの "news" シートを編集。
 *   セットアップは src/lib/sheets.ts のコメント参照。
 *
 * 編集方法（GitHub直編集）:
 *   https://github.com/skryu-fk/hakata-sk-rookies/edit/main/src/data/news.ts
 *   下の news 配列を編集 → commit → Vercel が自動デプロイ。
 *
 * 下の news 配列はスプレッドシート未設定・取得失敗時のフォールバック。
 */

import { fetchSheetCSV } from "@/lib/sheets";

export const NEWS_CATEGORIES = [
  "サイト",
  "募集",
  "活動",
  "試合",
  "告知",
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export type NewsItem = {
  date: string;
  category: NewsCategory;
  title: string;
};

/** フォールバック（スプレッドシート未設定・取得失敗時に使われる） */
export const news: NewsItem[] = [
  {
    date: "2026.04.20",
    category: "募集",
    title: "メンバーを5人ほど募集しています！ぜひ参加お願いします。",
  },
  {
    date: "2026.04.20",
    category: "告知",
    title: "公式X（@SK_rookies_FK）を開設しました！",
  },
  {
    date: "2026.04.19",
    category: "募集",
    title: "メンバー募集を開始。10代〜40代まで初心者中心。",
  },
  {
    date: "2026.04.19",
    category: "サイト",
    title: "公式サイトを開設しました。",
  },
];

export const CATEGORY_STYLES: Record<NewsCategory, string> = {
  サイト: "bg-navy text-white",
  募集: "bg-red text-white",
  活動: "bg-navy-3 text-white",
  試合: "bg-red-2 text-white",
  告知: "bg-gold text-navy",
};

function normalizeCategory(v: string): NewsCategory {
  const t = v.trim();
  return (NEWS_CATEGORIES as readonly string[]).includes(t) ? (t as NewsCategory) : "告知";
}

/** スプレッドシートから最新のお知らせを取得。失敗時は静的配列にフォールバック。 */
export async function getNews(): Promise<NewsItem[]> {
  const rows = await fetchSheetCSV("news");
  if (rows.length <= 1) return news;
  // 1行目はヘッダなのでスキップ
  const parsed = rows.slice(1)
    .map<NewsItem | null>(r => {
      const date = (r[0] ?? "").trim();
      const title = (r[2] ?? "").trim();
      if (!date || !title) return null;
      return {
        date,
        category: normalizeCategory(r[1] ?? ""),
        title,
      };
    })
    .filter((n): n is NewsItem => n !== null);
  return parsed.length > 0 ? parsed : news;
}
