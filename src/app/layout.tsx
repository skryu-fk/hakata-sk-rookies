import type { Metadata, Viewport } from "next";
import { Zen_Kaku_Gothic_New, Oswald, RocknRoll_One } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import {
  MANAGER_OPEN,
  RECRUIT_OPEN,
} from "@/data/recruit";
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

/**
 * viewport-fit=cover を指定すると、画面の端いっぱいまで描画される代わりに
 * env(safe-area-inset-*) が実際の値（ホームインジケーターの高さ等）を返すようになる。
 * これが無いと env() が常に 0 になり、画面下のタブバーが
 * iPhone のホームインジケーター（下の細い横棒）と重なってしまう。
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "博多SKルーキーズ | HAKATA SK ROOKIES — 福岡市の草野球チーム",
  // 検索結果に出る説明文。募集を休止している間は、ここでも必ず伝える
  // （「サイトでは募集中と書いてあった」という行き違いを防ぐため）
  description: RECRUIT_OPEN
    ? "福岡市を拠点に活動する草野球チーム『博多SKルーキーズ』。初心者中心、10〜40代まで、野球を全力で楽しむ仲間を募集中。月額500円、グローブがあれば始められます。"
    : MANAGER_OPEN
      ? "福岡市を拠点に活動する草野球チーム『博多SKルーキーズ』。マネージャー募集中（撮影・イベント企画・選手データ管理／野球経験不要・完全ボランティアで費用は一切なし）。※選手の募集は休止中です。"
      : "福岡市を拠点に活動する草野球チーム『博多SKルーキーズ』。初心者中心、10〜40代まで、野球を全力で楽しんでいます。※現在、新規メンバーの募集は休止中です（練習試合・スポンサー・道具のご支援のご相談は受付中）。",
  applicationName: "博多SKルーキーズ",
  authors: [{ name: "博多SKルーキーズ" }],
  creator: "博多SKルーキーズ",
  publisher: "博多SKルーキーズ",
  keywords: [
    "草野球",
    "草野球チーム",
    "福岡",
    "福岡市",
    "博多",
    "メンバー募集",
    "マネージャー募集",
    "草野球 マネージャー",
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
  // ファビコン（app/ icon.png, apple-icon.png から自動生成されるが、念のため明示）
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "any" },
    ],
    shortcut: "/icon.png",
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "博多SKルーキーズ | HAKATA SK ROOKIES",
    description: RECRUIT_OPEN
      ? "福岡市の草野球チーム『博多SKルーキーズ』メンバー募集中。初心者歓迎・10〜40代。"
      : MANAGER_OPEN
        ? "福岡市の草野球チーム『博多SKルーキーズ』マネージャー募集中。撮影・イベント企画・データ管理／野球経験不要・完全ボランティアで費用は一切なし。※選手の募集は休止中。"
        : "福岡市の草野球チーム『博多SKルーキーズ』。初心者中心・10〜40代。※現在、新規メンバーの募集は休止中です。",
    url: SITE_URL,
    siteName: "博多SKルーキーズ",
    locale: "ja_JP",
    type: "website",
    images: [{ url: "/sk_logo.png", width: 1536, height: 1024, alt: "博多SKルーキーズ ロゴ" }],
  },
  twitter: {
    card: "summary",
    title: "博多SKルーキーズ | HAKATA SK ROOKIES",
    description: RECRUIT_OPEN
      ? "福岡市の草野球チーム。初心者歓迎・メンバー募集中。"
      : MANAGER_OPEN
        ? "福岡市の草野球チーム。マネージャー募集中（野球経験不要・完全ボランティアで費用なし）。※選手の募集は休止中。"
        : "福岡市の草野球チーム。初心者中心。※現在、新規メンバーの募集は休止中です。",
    images: ["/sk_logo.png"],
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
  // ── WebSite ── Google検索結果のサイト名（「Vercel」ではなく「博多SKルーキーズ」）に効く
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "博多SKルーキーズ",
    alternateName: ["HAKATA SK ROOKIES", "博多SKルーキーズ公式サイト"],
    url: SITE_URL,
    inLanguage: "ja-JP",
    publisher: {
      "@type": "Organization",
      name: "博多SKルーキーズ",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/sk_logo.png` },
    },
  },
  // ── Organization ── 検索結果のロゴ表示と団体名認識のため
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "博多SKルーキーズ",
    alternateName: "HAKATA SK ROOKIES",
    url: SITE_URL,
    logo: `${SITE_URL}/sk_logo.png`,
    sameAs: [
      "https://x.com/SK_rookies_FK",
      "https://www.instagram.com/hakata_sk_rookies/",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: "博多SKルーキーズ",
    alternateName: "HAKATA SK ROOKIES",
    sport: "Baseball",
    url: SITE_URL,
    logo: `${SITE_URL}/sk_logo.png`,
    foundingDate: "2026",
    description:
      "福岡市を拠点に活動する草野球チーム。初心者中心、10〜40代までのメンバーが在籍。",
    sameAs: [
      "https://x.com/SK_rookies_FK",
      "https://www.instagram.com/hakata_sk_rookies/",
    ],
    areaServed: { "@type": "City", name: "福岡市" },
    location: {
      "@type": "Place",
      name: "福岡・博多オフィス",
      address: {
        "@type": "PostalAddress",
        streetAddress: "博多駅前1丁目23番2号 ParkFront博多駅前1丁目 5F-B",
        addressLocality: "福岡市博多区",
        addressRegion: "福岡県",
        postalCode: "812-0011",
        addressCountry: "JP",
      },
    },
  },
  // FAQ の構造化データ（FAQPage）は /faq のページ側で、src/data/faq.ts から
  // 組み立てている。ここに手で書いていたときは本文と別々に直す形になっていて、
  // 活動球場が古いまま（雁の巣など）検索エンジンに出ていた。
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
        <Analytics />
      </body>
    </html>
  );
}
