import type { Metadata } from "next";
import Link from "next/link";
import ActivityTable from "@/components/ActivityTable";
import { RecruitStatusStrip } from "@/components/RecruitStatus";
import { SubHeader, SubHero, SubFooter } from "@/components/SubPageChrome";

export const metadata: Metadata = {
  title: "活動概要（場所・頻度・費用） | 博多SKルーキーズ",
  description:
    "福岡市の草野球チーム「博多SKルーキーズ」の活動概要。舞鶴公園・山王公園・東平尾公園（ベスト電器スタジアム）を中心とした活動場所、週1〜2回＋月3〜4回の活動頻度、入会費・月会費・グラウンド代、必要な道具までまとめています。",
  alternates: { canonical: "/activity" },
  robots: { index: true, follow: true },
};

export default function ActivityPage() {
  return (
    <>
      <SubHeader />
      <RecruitStatusStrip />
      <main>
        <SubHero
          en="ACTIVITY"
          jp="活動概要"
          lead="どこで、どれくらいの頻度で、いくらかかるのか。参加を考えるときに知りたいことをまとめました。"
        />
        <section className="bg-base border-b border-line">
          <div className="max-w-[1280px] mx-auto px-5 md:px-8 py-12 md:py-20">
            <ActivityTable full />

            <div className="reveal" style={{ marginTop: 28, display: "flex", flexWrap: "wrap", gap: 12 }}>
              <Link href="/#schedule" className="hover:bg-navy hover:text-white transition-colors"
                style={{ display: "inline-flex", alignItems: "center", padding: "13px 26px", border: "1px solid #0b1e3f", color: "#0b1e3f", textDecoration: "none", fontSize: 13.5, fontWeight: 700, letterSpacing: "0.08em" }}>
                直近の練習日程を見る →
              </Link>
              <Link href="/faq" className="hover:bg-navy hover:text-white transition-colors"
                style={{ display: "inline-flex", alignItems: "center", padding: "13px 26px", border: "1px solid #0b1e3f", color: "#0b1e3f", textDecoration: "none", fontSize: 13.5, fontWeight: 700, letterSpacing: "0.08em" }}>
                よくある質問 →
              </Link>
              <Link href="/uniform" className="hover:bg-navy hover:text-white transition-colors"
                style={{ display: "inline-flex", alignItems: "center", padding: "13px 26px", border: "1px solid #0b1e3f", color: "#0b1e3f", textDecoration: "none", fontSize: 13.5, fontWeight: 700, letterSpacing: "0.08em" }}>
                ユニフォーム →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SubFooter />
    </>
  );
}
