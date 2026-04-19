import type { Metadata } from "next";
import { Noto_Sans_JP, Bebas_Neue } from "next/font/google";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

const bebas = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "博多SKルーキーズ | HAKATA SK ROOKIES — 福岡市の草野球チーム メンバー募集",
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
      className={`${notoSansJp.variable} ${bebas.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream text-ink">
        {children}
      </body>
    </html>
  );
}
