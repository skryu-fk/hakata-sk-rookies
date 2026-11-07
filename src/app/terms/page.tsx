import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { RecruitStatusStrip } from "@/components/RecruitStatus";
import { SubHeader, SubHero, SubFooter } from "@/components/SubPageChrome";
import { renderMarkdown } from "@/lib/markdown";
import { TERMS } from "@/data/terms";

export const metadata: Metadata = {
  title: "チーム規約 | 博多SKルーキーズ",
  description:
    "福岡市の草野球チーム「博多SKルーキーズ」のチーム規約（第2版）。月会費・球場代・保険・リーグ戦の登録・退団・休会など、メンバーが守る約束をまとめています。",
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
};

/**
 * チーム規約のページ
 *
 * 本文は docs/team-rules-2026.md を読んで描画する。配布用のPDFも同じファイルから
 * 作っているので、規約を直すときに触るのは .md 1か所でよい。
 * ビルド時に読み込んで静的に書き出すため、公開後にファイルを探しにいくことはない。
 */
export default function TermsPage() {
  const md = fs.readFileSync(
    path.join(process.cwd(), "docs", "team-rules-2026.md"),
    "utf8"
  );

  return (
    <>
      <SubHeader />
      <RecruitStatusStrip />
      <main>
        <SubHero
          en="TERMS"
          jp="チーム規約（第2版）"
          lead={`メンバーが守る約束をまとめたものです。施行日は${TERMS.effectiveDate}。入団時の「メンバー加入契約書」第3条〜第11条は、この規約に置き換わります。`}
        />

        <section className="bg-base border-b border-line">
          <div className="max-w-[860px] mx-auto px-5 md:px-8 py-10 md:py-16">
            {/* 配布物のダウンロード */}
            <div className="mb-10" style={{ background: "#0b1e3f", padding: "22px 24px" }}>
              <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 10, color: "#d4a82a", letterSpacing: "0.35em", marginBottom: 10 }}>
                DOWNLOAD
              </p>
              <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.72)", lineHeight: 1.9, marginBottom: 16 }}>
                印刷用のPDFです。すでに在籍しているメンバーの方は、規約をお読みのうえ同意書（A4 1枚）にご記入ください。
                これから入団する方は、加入契約書（第2版）の最後のページにご記入ください。
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <a href={TERMS.rulesPdf} download={TERMS.rulesPdfName} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", padding: "12px 22px", background: "#d4a82a", color: "#0b1e3f", textDecoration: "none", fontSize: 13, fontWeight: 900, letterSpacing: "0.04em" }}>
                  チーム規約（PDF）→
                </a>
                <a href={TERMS.consentPdf} download={TERMS.consentPdfName} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", padding: "12px 22px", color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 700, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.25)" }}>
                  規約改定の同意書（PDF・A4 1枚）→
                </a>
                <a href={TERMS.agreementPdf} download={TERMS.agreementPdfName} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", padding: "12px 22px", color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 700, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.25)" }}>
                  メンバー加入契約書（第2版・PDF）→
                </a>
              </div>
            </div>

            <article>{renderMarkdown(md)}</article>

            <div className="mt-12 pt-8" style={{ borderTop: "1px solid #e0dcd4", display: "flex", flexWrap: "wrap", gap: 12 }}>
              <Link href="/activity" className="hover:bg-navy hover:text-white transition-colors"
                style={{ display: "inline-flex", alignItems: "center", padding: "12px 24px", border: "1px solid #0b1e3f", color: "#0b1e3f", textDecoration: "none", fontSize: 13.5, fontWeight: 700 }}>
                活動概要 →
              </Link>
              <Link href="/faq" className="hover:bg-navy hover:text-white transition-colors"
                style={{ display: "inline-flex", alignItems: "center", padding: "12px 24px", border: "1px solid #0b1e3f", color: "#0b1e3f", textDecoration: "none", fontSize: 13.5, fontWeight: 700 }}>
                よくある質問 →
              </Link>
              <Link href="/privacy" className="hover:bg-navy hover:text-white transition-colors"
                style={{ display: "inline-flex", alignItems: "center", padding: "12px 24px", border: "1px solid #0b1e3f", color: "#0b1e3f", textDecoration: "none", fontSize: 13.5, fontWeight: 700 }}>
                プライバシーポリシー →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SubFooter />
    </>
  );
}
