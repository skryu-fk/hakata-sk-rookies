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
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://hakata-sk-rookies.vercel.app";

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
    "対戦相手募集",
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
};

const jsonLd = {
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
  areaServed: {
    "@type": "City",
    name: "福岡市",
  },
  location: {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      addressLocality: "福岡市",
      addressRegion: "福岡県",
      addressCountry: "JP",
    },
  },
};

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
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
