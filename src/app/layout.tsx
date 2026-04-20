import type { Metadata } from "next";
import { Zen_Kaku_Gothic_New, Oswald, RocknRoll_One } from "next/font/google";
import "./globals.css";

const zenKaku = Zen_Kaku_Gothic_New({
  variable: "--font-zen",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const rocknRoll = RocknRoll_One({
  variable: "--font-rocknroll",
  subsets: ["latin"],
  weight: ["400"],
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://hakata-sk-rookies-v2y8.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "博多SKルーキーズ | HAKATA SK ROOKIES — 福岡市の草野球チーム",
  description:
    "福岡市を拠点に活動する草野球チーム『博多SKルーキーズ』。初心者中心、10〜40代まで、野球を全力で楽しむ仲間を募集中。月額500円、グローブがあれば始められます。",
  keywords: [
    "草野球",
    "草野球チーム",
    "福岡",
    "福岡市",
    "博多",
    "メンバー募集",
    "初心者歓迎",
    "草野球 初心者",
    "博多SKルーキーズ",
    "HAKATA SK ROOKIES",
    "社会人野球",
    "スポンサー募集",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "博多SKルーキーズ | HAKATA SK ROOKIES",
    description:
      "福岡市の草野球チーム『博多SKルーキーズ』メンバー募集中。初心者歓迎・10〜40代。",
    url: SITE_URL,
    siteName: "博多SKルーキーズ",
    locale: "ja_JP",
    type: "website",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "博多SKルーキーズ ロゴ" }],
  },
  twitter: {
    card: "summary",
    title: "博多SKルーキーズ | HAKATA SK ROOKIES",
    description: "福岡市の草野球チーム。初心者歓迎・メンバー募集中。",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  verification: {
    google: "C3WLC75ZuuIE4u8H4A0U49vovHYyrsp-ksLv39LrkJs",
  },
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: "博多SKルーキーズ",
    alternateName: "HAKATA SK ROOKIES",
    sport: "Baseball",
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    foundingDate: "2026",
    description:
      "福岡市を拠点に活動する草野球チーム。初心者中心、10〜40代までのメンバーが在籍。",
    sameAs: ["https://x.com/SK_rookies_FK"],
    areaServed: { "@type": "City", name: "福岡市" },
    location: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: "福岡市",
        addressRegion: "福岡県",
        addressCountry: "JP",
      },
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "本当に未経験・初心者でも大丈夫ですか？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "大丈夫です。代表自身も野球未経験スタートで、みんなで少しずつ覚えながら楽しんでいくスタイルのチームです。ルールを知らない段階でも気後れなく参加できます。",
        },
      },
      {
        "@type": "Question",
        name: "福岡市のどこで活動していますか？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "福岡市内の公営グラウンド（雁の巣・西南杜の湖畔公園・美野島公園など）を中心に活動します。市内・近郊のどこからでも通いやすい場所を選びます。",
        },
      },
      {
        "@type": "Question",
        name: "費用はいくらかかりますか？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "月額500円のチーム費と、活動日ごとのグラウンド代実費シェア（数百円）のみ。ユニフォーム購入や入会金、年会費はありません。",
        },
      },
      {
        "@type": "Question",
        name: "道具は何が必要ですか？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "グローブだけ用意してもらえればOKです。バット・ボールなどはチームで用意します。グローブは初心者用3,000〜5,000円のもので十分です。",
        },
      },
      {
        "@type": "Question",
        name: "何歳まで参加できますか？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "10代〜40代まで幅広く歓迎します。代表は19歳ですが、社会人・主婦・学生など多様な年齢のメンバーを歓迎しています。",
        },
      },
      {
        "@type": "Question",
        name: "女性も参加できますか？マネージャー希望でもOK？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "もちろんです。プレイヤーとしてだけでなく、スコア記録・撮影・練習サポートなどを担当するマネージャーとしての参加も大歓迎です。",
        },
      },
      {
        "@type": "Question",
        name: "代表が19歳（10代）と若いけど、20代〜40代でも参加できますか？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "全く問題ありません。代表が10代だからといって遠慮する必要はありません。こちらは年齢差をまったく気にしていないので、フラットに野球を楽しむ仲間として接します。",
        },
      },
      {
        "@type": "Question",
        name: "活動はどれくらいの頻度ですか？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "月2〜3回、主に週末（土日祝）の活動を予定しています。毎回参加できなくても問題ありません。",
        },
      },
    ],
  },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${zenKaku.variable} ${oswald.variable} ${rocknRoll.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-base text-ink">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ("scrollRestoration" in history) history.scrollRestoration = "manual";
              if (!location.hash) {
                window.scrollTo(0, 0);
                window.addEventListener("load", function () { if (!location.hash) window.scrollTo(0, 0); });
                window.addEventListener("beforeunload", function () { window.scrollTo(0, 0); });
              }
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
