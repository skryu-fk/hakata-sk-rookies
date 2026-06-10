import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "博多SKルーキーズメンバー成績アプリ",
  description: "博多SKルーキーズ メンバー専用の成績確認アプリ。打率・OPS・防御率・盗塁阻止率をまとめて確認できます。",
  appleWebApp: {
    capable: true,
    title: "SKR 成績",
    statusBarStyle: "black-translucent",
  },
};

export default function StatsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
