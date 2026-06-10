import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "博多SKルーキーズメンバー成績アプリ",
  description: "博多SKルーキーズ メンバー専用の成績確認アプリ。打率・OPS・防御率・盗塁阻止率をまとめて確認できます。",
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
      {/* /stats 配下では html/body をダークに固定。
          ルートの body は明色 (bg-base) のため、スマホのオーバースクロール
          （ゴムバンド）時に白い背景が見えてしまうのを防ぐ。 */}
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
