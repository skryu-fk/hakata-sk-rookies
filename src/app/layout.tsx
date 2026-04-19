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

export const metadata: Metadata = {
  title: "博多SKルーキーズ | HAKATA SK ROOKIES — 福岡市の草野球チーム",
  description:
    "福岡市を拠点に活動する草野球チーム『博多SKルーキーズ』。初心者中心、10〜40代まで、野球を全力で楽しむ仲間を募集中。",
  openGraph: {
    title: "博多SKルーキーズ | HAKATA SK ROOKIES",
    description:
      "福岡市の草野球チーム『博多SKルーキーズ』メンバー募集中。初心者歓迎・10〜40代。",
    type: "website",
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
        {children}
      </body>
    </html>
  );
}
