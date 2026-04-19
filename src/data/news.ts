/**
 * お知らせデータ
 *
 * 追加方法:
 *   1. 下の news 配列の一番上に新しい項目を追加
 *   2. category は下の NEWS_CATEGORIES のどれかを必ず使う
 *   3. date は "YYYY.MM.DD" の形式
 *   4. 保存 → commit & push → Vercelが自動で反映
 *
 * GitHubから編集する場合:
 *   https://github.com/skryu-fk/hakata-sk-rookies/edit/main/src/data/news.ts
 */

export const NEWS_CATEGORIES = [
  "サイト",
  "募集",
  "対戦",
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

export const news: NewsItem[] = [
  {
    {
  date: "2026.04.19",
  category: "募集",
  title: "公式Xを開設しました！",
},
    date: "2026.04.19",
    category: "対戦",
    title: "対戦相手チーム・個人も同時募集中です。",
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
  対戦: "bg-gold text-navy",
  活動: "bg-navy-3 text-white",
  試合: "bg-red-2 text-white",
  告知: "bg-muted text-white",
};
