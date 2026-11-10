import type { Metadata } from "next";
import FaqSection from "@/components/FaqSection";
import { RecruitStatusStrip } from "@/components/RecruitStatus";
import { SubHeader, SubHero, SubFooter } from "@/components/SubPageChrome";
import { MANAGER_OPEN } from "@/data/recruit";
import { FAQS } from "@/data/faq";

export const metadata: Metadata = {
  title: "よくある質問 | 博多SKルーキーズ",
  description:
    `福岡市の草野球チーム「博多SKルーキーズ」によくいただく質問と回答。活動場所・費用・道具・年齢・見学${MANAGER_OPEN ? "・マネージャー募集" : ""}・リーグについてまとめています。`,
  alternates: { canonical: "/faq" },
  robots: { index: true, follow: true },
};

/**
 * 検索結果用の構造化データ。
 * 本文（FaqSection）とまったく同じ FAQS から作るので、片方だけ古くなることがない。
 * ページに出ていない質問を載せるとGoogleの規約違反になるため、
 * 全問を表示しているこの /faq にだけ置く。
 */
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map(f => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function FaqPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <SubHeader />
      <RecruitStatusStrip />
      <main>
        <SubHero
          en="FAQ"
          jp="よくある質問"
          lead={`活動場所・費用・道具・年齢・見学${MANAGER_OPEN ? "・マネージャー募集" : ""}・リーグまで、よくいただく${FAQS.length}件の質問にお答えします。`}
        />
        <FaqSection full />
      </main>
      <SubFooter />
    </>
  );
}
