import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "博多SKルーキーズメンバー成績アプリ",
  description: "博多SKルーキーズ メンバー専用の成績確認アプリ。",
  manifest: "/stats-app.webmanifest",
  // 個人情報を含むため検索エンジンに載せない
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  appleWebApp: {
    capable: true,
    title: "SKR 成績",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#070b16",
};

export default function StatsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* /stats 配下のグローバル調整。
          このサイトは body をスクロールコンテナとして使う（グローバルCSSの
          `overflow-x:hidden` が body の overflow-y を auto に昇格させている）。
          トップページと同じ挙動にするため overflow/height はいじらず、
          背景のダーク固定とオーバースクロール抑制だけ行う。
          （PCでホイールが効かなかった原因はダッシュボード直下の overflow:hidden
            だったため、そちらを撤去して解決） */}
      <style>{`
        html, body {
          background: #070b16 !important;
          overscroll-behavior-y: none;
        }
      `}</style>
      {children}
    </>
  );
}
