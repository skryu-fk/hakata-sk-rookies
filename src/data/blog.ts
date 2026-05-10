/**
 * ブログ記事データ
 *
 * 編集方法（推奨・pushなし）:
 *   Google スプレッドシートの "blog" シートを編集。
 *   列構成: date | category | title | excerpt | content | slug
 *
 *   content は本文。改行で段落区切り。次の記法が使えます:
 *     ・――              区切り線
 *     ・【セクション名】 大見出し（赤帯）
 *     ・■ 項目          中見出し
 *     ・・本文          箇条書き
 *     ・Q. / A.          Q&A
 *     ・**太字**         インライン強調
 *     ・[リンク](URL)    リンク
 *
 *   slug が空欄の場合は自動生成。
 *
 * 編集方法（管理画面・pushなし）:
 *   /admin の「ブログ」タブから入力。
 */

import { fetchSheetCSV } from "@/lib/sheets";

export const BLOG_CATEGORIES = [
  "コラム",
  "活動報告",
  "お役立ち",
  "試合レポート",
  "お知らせ",
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export type BlogPost = {
  slug: string;
  title: string;
  date: string;
  category: BlogCategory;
  excerpt: string;
  /** 本文。改行区切りの段落。各段落は prefix（■・Q.A.【】――）または markdown インライン。 */
  content: string;
};

export const blogPosts: BlogPost[] = [
  {
    slug: "team-launch",
    title: "博多SKルーキーズ、始動。— 福岡市で草野球チームを立ち上げた話",
    date: "2026.04.20",
    category: "コラム",
    excerpt:
      "19歳・野球未経験の代表が、なぜ今、福岡市で草野球チームを立ち上げようと思ったのか。チーム誕生の背景と、これから描きたい景色について書きます。",
    content: [
      "はじめまして。博多SKルーキーズ代表の柏木海斗です。",
      "2026年春、福岡市を拠点に新しい草野球チーム「博多SKルーキーズ / HAKATA SK ROOKIES」を立ち上げました。この記事では、なぜ今このチームを作ろうと思ったのか、そしてこれからどんなチームにしていきたいのかを書き残しておきます。",
      "――",
      "正直に言うと、僕自身は野球経験者ではありません。小さい頃にキャッチボールをしたくらいで、チームでプレーした経験はほぼゼロ。それでも、「大人になってから本気で野球に向き合ってみたい」という気持ちが抑えきれず、だったら自分で場所を作ってしまおう、と思い立ちました。",
      "福岡市で草野球をやりたい人を探すと、実は結構いるんです。経験者同士が集まる本格派のチームはたくさんあるけれど、「初心者が気軽に始められる場所」はまだ少ない。僕と同じように「やってみたいけど、未経験で飛び込むのは怖い」と思っている人は、絶対にいるはず。そういう人たちの受け皿になるチームを作りたかった。",
      "博多SKルーキーズのコンセプトはシンプルです。",
      "・初心者中心、経験者も歓迎",
      "・10代〜40代まで、世代をまたいで楽しむ",
      "・勝ち負けより、まずは全力で楽しむ",
      "・月500円＋グラウンド代実費だけの、ゆるい運営",
      "代表が10代ですが、年齢差はまったく気にしていません。社会人の方、主婦の方、学生、ブランクのある経験者、みんなフラットに「野球仲間」として接する雰囲気を大切にします。",
      "――",
      "これからの活動場所は、福岡市内の公営グラウンド（雁の巣・西南杜の湖畔公園・美野島公園など）を予定しています。キャッチボール中心の公園練習は週1〜2回、野球場を借りてのノック・バッティング練習は月3〜4回。平日夜や週末、どちらも動きます。無理なく続けられるペースを大事にしたいので、毎回出られなくても全然OK。",
      "まずはメンバーを集めること。そこから道具を揃えて、他チームとの練習試合にも挑戦していきたい。1年後、2年後には福岡市の草野球シーンで「初心者が最初に選ぶチーム」と言ってもらえる存在になれたら最高です。",
      "少しでも興味を持ってくれた方、ぜひお気軽に連絡ください。X（@SK_rookies_FK）のDM、サイトの応募フォーム、どちらからでもOK。「見学だけ」「質問だけ」も大歓迎です。",
      "野球で、福岡を、熱くする。ここから始めます。",
    ].join("\n"),
  },
  {
    slug: "beginner-gear-guide",
    title: "草野球を始めるための持ち物ガイド — 福岡市の初心者向け",
    date: "2026.04.19",
    category: "お役立ち",
    excerpt:
      "野球を始めたいけど、何を揃えればいい？ グローブは？バットは？服装は？ 福岡市で草野球を始めたい初心者向けに、最小限の持ち物リストをまとめました。",
    content: [
      "「草野球を始めてみたい」そう思ったとき、最初にぶつかるのが「何を揃えればいいの？」という壁。",
      "博多SKルーキーズでは初心者の方を多く想定しているので、この記事で「最初に揃えればいい最小限の持ち物」を解説します。結論から言うと、グローブさえあれば始められます。",
      "――",
      "【絶対に必要なもの】",
      "■ グローブ（1個）",
      "最初に買うべきはグローブ1個だけ。スポーツ量販店（スポーツデポ・ヒマラヤ・ゼビオなど福岡市内のチェーン店）で3,000〜5,000円の初心者用で十分です。軟式野球用を選んでください。硬式用は草野球では使いません。サイズは11〜12インチあたりが扱いやすいです。",
      "――",
      "【チームで用意します】",
      "■ バット・ボール・ベース",
      "チーム共通の備品として用意します。自分で買う必要はありません。",
      "■ ヘルメット（打席に入るとき用）",
      "共通備品で回します。",
      "――",
      "【あると便利だけど必須じゃないもの】",
      "■ スパイクまたは野球用シューズ",
      "最初は普通のスニーカーでOK。慣れてきて「もっと本気でやりたい」と思ったタイミングで、3,000〜6,000円の樹脂製スパイクを買えば十分。",
      "■ 帽子",
      "夏場は日よけのため推奨。キャップなら何でもOK、野球帽じゃなくて大丈夫です。",
      "■ 動きやすい服装",
      "ジャージやスウェット、動きやすいTシャツとパンツで十分。ユニフォームの強制購入はありません。",
      "――",
      "【よくある質問】",
      "Q. グローブはどこで買えばいい？",
      "A. 福岡市内だと、スポーツデポ博多バイパス店、ヒマラヤ福岡東店、ゼビオ各店などで軟式グローブが豊富に揃っています。ネットで買うなら、サイズ感が分かりにくいのでできれば実店舗で試着を推奨。",
      "Q. 左利きです、大丈夫？",
      "A. もちろんOK。左利き用グローブも普通に売っています（右手にハメる形のもの）。店員さんに「軟式の左利き用」と聞けば出してくれます。",
      "Q. 女性でも同じグローブでいい？",
      "A. 基本は同じですが、手が小さめの方は10.5〜11インチあたりの小さめサイズが扱いやすいです。店員さんに相談してください。",
      "――",
      "持ち物のハードルは、草野球においては本当に低いです。「気になってるけど踏み出せない」方、まずはグローブだけ買って、見学からでもOKなので博多SKルーキーズに遊びに来てください。",
      "応募・質問は X（@SK_rookies_FK）またはサイトの応募フォームから。お待ちしています。",
    ].join("\n"),
  },
];

function normalizeCategory(v: string): BlogCategory {
  const t = v.trim();
  return (BLOG_CATEGORIES as readonly string[]).includes(t)
    ? (t as BlogCategory)
    : "コラム";
}

function autoSlug(date: string, idx: number): string {
  const d = date.replace(/[./]/g, "-");
  return `${d}-${idx + 1}`;
}

/** スプレッドシートから記事を取得。失敗時は静的配列にフォールバック。 */
export async function getBlogs(): Promise<BlogPost[]> {
  const rows = await fetchSheetCSV("blog");
  if (rows.length <= 1) return blogPosts;

  // ── 防御: gviz は存在しないシート名を指定するとデフォルト（先頭）シートを
  //          返してしまう仕様があるため、1行目のヘッダを確認して
  //          本当にブログシートかを判定する。
  const header = (rows[0] ?? []).map(c => c.toLowerCase().trim());
  const looksLikeBlog =
    header.includes("content") || header.includes("excerpt") ||
    // 見出しが日本語の場合も許容
    header.some(h => h.includes("本文") || h.includes("excerpt") || h.includes("抜粋"));
  if (!looksLikeBlog) {
    // 別シートのデータを掴まされている可能性 → 静的フォールバックに退避
    return blogPosts;
  }

  // 列: date | category | title | excerpt | content | slug
  const parsed = rows.slice(1)
    .map<BlogPost | null>((r, i) => {
      const date = (r[0] ?? "").trim();
      const title = (r[2] ?? "").trim();
      const content = (r[4] ?? "").trim();
      if (!date || !title || !content) return null;
      const explicitSlug = (r[5] ?? "").trim();
      return {
        slug: explicitSlug || autoSlug(date, i),
        title,
        date,
        category: normalizeCategory(r[1] ?? ""),
        excerpt: (r[3] ?? "").trim(),
        content,
      };
    })
    .filter((p): p is BlogPost => p !== null);
  return parsed.length > 0 ? parsed : blogPosts;
}

/** slug 検索（詳細ページ用） */
export async function getBlogBySlug(slug: string): Promise<BlogPost | null> {
  const items = await getBlogs();
  return items.find(p => p.slug === slug) ?? null;
}
