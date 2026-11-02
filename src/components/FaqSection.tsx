"use client";

import Link from "next/link";
import { useState } from "react";
import { MANAGER_OPEN, RECRUIT_OPEN } from "@/data/recruit";
import { FAQS, type Faq } from "@/data/faq";

const X_URL = "https://x.com/SK_rookies_FK";

/**
 * よくある質問
 *
 *   <FaqSection />         … ホーム用。home: true の質問だけを出し、/faq へ誘導する
 *   <FaqSection full />    … /faq 用。全部出す
 *
 * 質問そのものは src/data/faq.ts にある。
 */
export default function FaqSection({ full = false }: { full?: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  const items: Faq[] = full ? FAQS : FAQS.filter(f => f.home);

  return (
    <section id="faq" className="bg-base border-b border-line">
      <div className="max-w-[1280px] mx-auto px-5 md:px-8 py-14 md:py-24">
        {/* Section title */}
        <div className="mb-10 reveal">
          <p className="font-display text-[11px] tracking-[0.45em] text-red uppercase mb-2.5">FAQ</p>
          <h2 className="font-sans font-black text-navy" style={{ fontSize: "clamp(26px,3.5vw,42px)" }}>よくある質問</h2>
          <div className="w-11 h-1 bg-red mt-3.5 rounded-sm" />
        </div>

        <p className="reveal text-muted text-[15px] leading-relaxed mb-9 max-w-lg">
          他に気になることは
          <a href="/#contact" className="text-red font-bold underline decoration-dotted underline-offset-4">お問い合わせフォーム</a>か
          <a href={X_URL} target="_blank" rel="noopener noreferrer" className="text-red font-bold underline decoration-dotted underline-offset-4">X（@SK_rookies_FK）</a>
          までお気軽にどうぞ。
        </p>

        {/* 入団・費用・見学などの回答は「選手を募集している前提」で書かれているため、
            全文を並べる /faq では一度まとめてお断りしておく。
            ホームはページ上部の募集状況ボードで同じことを伝えているので出さない。 */}
        {full && !RECRUIT_OPEN && (
          <div className="reveal mb-8 text-[13.5px] leading-[1.95]" style={{ background: "#f5f2ec", borderLeft: "4px solid #d10024", padding: "16px 20px", color: "#3a3f4a", maxWidth: 760 }}>
            <p className="font-bold text-navy mb-1">
              {MANAGER_OPEN ? "マネージャーは募集中／選手の募集は休止中です" : "現在、新規メンバーの募集は休止しています"}
            </p>
            入団・費用・道具・見学などについての以下の回答は、<strong>選手</strong>として参加する場合のもので、募集を再開したときのご案内です。いまはお受付ができませんので、ご了承ください。
          </div>
        )}

        <div style={{ borderTop: "2px solid #0b1e3f" }}>
          {items.map((f, i) => (
            <div key={f.q} className="reveal border-b border-line" style={{ animationDelay: `${i * 40}ms` }}>
              {/* Question row */}
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-start gap-5 text-left transition-colors"
                style={{
                  padding: "20px 16px",
                  background: open === i ? "rgba(209,0,36,0.03)" : "transparent",
                  border: "none", cursor: "pointer",
                }}>
                {/* Q badge */}
                <div style={{
                  width: 42, height: 42, flexShrink: 0,
                  background: open === i ? "#d10024" : "#0b1e3f",
                  display: "grid", placeItems: "center",
                  fontFamily: "var(--font-oswald), sans-serif",
                  fontSize: 13, color: "#fff", letterSpacing: "0.05em",
                  transition: "background 0.2s",
                }}>
                  Q{String(i + 1).padStart(2, "0")}
                </div>
                {/* Text */}
                <span className="flex-1 font-sans font-bold pt-2.5 leading-snug transition-colors"
                  style={{ fontSize: "clamp(14px,1.5vw,17px)", color: open === i ? "#d10024" : "#0b1e3f" }}>
                  {f.q}
                </span>
                {/* Toggle */}
                <div style={{
                  width: 30, height: 30, flexShrink: 0, marginTop: 6,
                  border: `2px solid ${open === i ? "#d10024" : "#d8d4cb"}`,
                  borderRadius: "50%", display: "grid", placeItems: "center",
                  color: open === i ? "#d10024" : "#aaa",
                  fontSize: 18, fontWeight: 700,
                  transform: open === i ? "rotate(45deg)" : "none",
                  transition: "all 0.25s cubic-bezier(0.2,0.8,0.2,1)",
                }}>+</div>
              </button>
              {/* Answer
                  以前は max-height で開閉していたが、長い回答（リーグ・募集休止）が
                  途中で切れていた。grid の 0fr→1fr なら中身の高さを問わない。 */}
              <div style={{
                display: "grid",
                gridTemplateRows: open === i ? "1fr" : "0fr",
                transition: "grid-template-rows 0.35s cubic-bezier(0.4,0,0.2,1)",
              }}>
                <div style={{ overflow: "hidden" }}>
                  <div className="pb-7 pl-4 pr-4 pt-2 md:pl-[78px]">
                    <p className="text-[15px] leading-[1.95]" style={{ color: "#3a3f4a", borderLeft: "3px solid rgba(209,0,36,0.2)", paddingLeft: 16 }}>
                      {f.a}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ホームでは厳選した質問だけ。残りは /faq へ */}
        {!full && (
          <div className="reveal mt-9 text-center">
            <p style={{ fontSize: 12, color: "#8a8a8a", marginBottom: 14 }}>
              よく聞かれる {items.length} 件を表示しています（全 {FAQS.length} 件）
            </p>
            <Link href="/faq" className="hover:bg-red-2 transition-colors"
              style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "#0b1e3f", color: "#fff", padding: "12px 28px", textDecoration: "none", fontFamily: "var(--font-zen),sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: "0.12em" }}>
              よくある質問をすべて見る →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
