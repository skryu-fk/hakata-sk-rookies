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
  /** URLスラグ。スプレッドシートで指定されない場合は date+index から自動生成。 */
  slug: string;
  date: string;
  category: NewsCategory;
  title: string;
  /** 詳細本文。空なら一覧上はクリック不可（プレーン表示）。改行は <br/>、リンクは [text](url)、太字は **text** のみサポート。 */
  body?: string;
};

/** フォールバック（スプレッドシート未設定・取得失敗時に使われる） */
export const news: NewsItem[] = [
  {
    slug: "2026-05-10-members-13",
    date: "2026.05.10",
    category: "募集",
    title: "メンバーが13人になりました！引き続き募集中。",
    body: "立ち上げから約3週間でメンバーが13人になりました。\nこれからもどんどん仲間を増やしていきたいので、興味のある方はお気軽にご連絡ください。",
  },
  {
    slug: "2026-05-03-instagram",
    date: "2026.05.03",
    category: "告知",
    title: "公式Instagram（@hakata_sk_rookies）を開設しました！",
    body: "Instagramで練習・試合の様子を投稿していきます。\n[フォローはこちら](https://www.instagram.com/hakata_sk_rookies/) からお願いします。",
  },
  {
    slug: "2026-04-20-recruit-5",
    date: "2026.04.20",
    category: "募集",
    title: "メンバーを5人ほど募集しています！ぜひ参加お願いします。",
  },
  {
    slug: "2026-04-20-x-launch",
    date: "2026.04.20",
    category: "告知",
    title: "公式X（@SK_rookies_FK）を開設しました！",
  },
  {
    slug: "2026-04-19-recruit-start",
    date: "2026.04.19",
    category: "募集",
    title: "メンバー募集を開始。10代〜40代まで初心者中心。",
  },
  {
    slug: "2026-04-19-site-launch",
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

function autoSlug(date: string, idx: number): string {
  // "2026.04.21" / "2026/04/21" / "2026-04-21" → "2026-04-21-{idx}"
  const d = date.replace(/[./]/g, "-");
  return `${d}-${idx + 1}`;
}

/** スプレッドシートから最新のお知らせを取得。失敗時は静的配列にフォールバック。 */
export async function getNews(): Promise<NewsItem[]> {
  const rows = await fetchSheetCSV("news");
  if (rows.length <= 1) return news;
  // 1行目はヘッダなのでスキップ
  // 列構成: date | category | title | body | slug
  const parsed = rows.slice(1)
    .map<NewsItem | null>((r, i) => {
      const date = (r[0] ?? "").trim();
      const title = (r[2] ?? "").trim();
      if (!date || !title) return null;
      const explicitSlug = (r[4] ?? "").trim();
      return {
        slug: explicitSlug || autoSlug(date, i),
        date,
        category: normalizeCategory(r[1] ?? ""),
        title,
        body: (r[3] ?? "").trim() || undefined,
      };
    })
    .filter((n): n is NewsItem => n !== null);
  return parsed.length > 0 ? parsed : news;
}

/** slug 検索（詳細ページ用） */
export async function getNewsBySlug(slug: string): Promise<NewsItem | null> {
  const items = await getNews();
  return items.find(n => n.slug === slug) ?? null;
}
