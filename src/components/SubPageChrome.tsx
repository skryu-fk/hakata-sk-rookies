/**
 * 下層ページの共通の枠（ヘッダー・見出し帯・フッター）
 *
 * 下層ページはどれも同じヘッダーとフッターを各ファイルに書き写していて、
 * ロゴや著作権表示を直すたびに全部のページを触る必要があった。
 * 新しいページはここを使う。既存のページも、触るついでに置き換えていく。
 */
import Image from "next/image";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";

const TEAM_NAME_JP = "博多SKルーキーズ";
const TEAM_NAME_EN = "HAKATA SK ROOKIES";

export function SubHeader() {
  return (
    <>
    {/* .reveal の要素は opacity:0 で始まり、これが付ける visible で現れる。
        入れ忘れるとページの中身がまるごと見えないままになるので、
        下層ページ共通のヘッダーに同梱しておく。 */}
    <ScrollReveal />
    <header className="sticky top-0 z-50 bg-white" style={{ borderBottom: "3px solid #d10024", boxShadow: "0 1px 0 #e0dcd4" }}>
      <div className="max-w-[1280px] mx-auto px-5 md:px-8 flex items-stretch" style={{ height: 68 }}>
        <Link href="/" className="flex items-center gap-3 flex-shrink-0 pr-4 md:pr-6" style={{ textDecoration: "none", borderRight: "1px solid #f0ece6" }}>
          <Image src="/sk_logo_crop.png" alt="" width={44} height={36} className="object-contain" priority />
          <div style={{ lineHeight: 1, display: "flex", flexDirection: "column", gap: 5 }}>
            <Image src="/hksk_logo_crop.png" alt={TEAM_NAME_JP} width={192} height={24} className="object-contain" style={{ width: "clamp(140px, 22vw, 192px)", height: "auto" }} />
            <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 9, color: "#aaa", letterSpacing: "0.3em" }}>{TEAM_NAME_EN}</div>
          </div>
        </Link>
        <Link href="/" className="ml-auto flex items-center font-bold text-[13px] text-navy hover:text-red transition-colors" style={{ textDecoration: "none" }}>
          ← トップへ戻る
        </Link>
      </div>
    </header>
    </>
  );
}

/** ページ冒頭の濃紺の帯。英字の大見出しと、日本語の説明を1つだけ置く */
export function SubHero({ en, sub, jp, lead }: { en: string; sub?: string; jp: string; lead?: string }) {
  return (
    <section className="bg-navy text-white relative overflow-hidden" style={{ borderBottom: "4px solid #d10024" }}>
      <div className="field-grid absolute inset-0" />
      <div className="max-w-[1280px] mx-auto px-5 md:px-8 py-12 md:py-16 relative">
        <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d4a82a", letterSpacing: "0.4em", marginBottom: 10 }}>{TEAM_NAME_EN}</p>
        {/* 大きな英字は飾り。読み上げと検索エンジンには日本語の見出しを渡したいので、
            h1 の中に両方入れて、英字のほうを aria-hidden にしている。 */}
        <h1 style={{ margin: 0 }}>
          <span aria-hidden style={{ display: "block", fontFamily: "var(--font-oswald),sans-serif", fontSize: "clamp(40px,7vw,80px)", fontWeight: 700, lineHeight: 1, letterSpacing: "0.02em" }}>
            {en}
          </span>
          {sub && (
            <span aria-hidden style={{ display: "block", fontFamily: "var(--font-oswald),sans-serif", fontSize: "clamp(20px,3vw,32px)", fontWeight: 400, lineHeight: 1.1, color: "rgba(255,255,255,0.85)", marginTop: 4 }}>
              {sub}
            </span>
          )}
          <span aria-hidden style={{ display: "block", width: 60, height: 3, background: "#d10024", margin: "16px 0 14px" }} />
          <span style={{ display: "block", fontFamily: "var(--font-zen),sans-serif", fontSize: "clamp(18px,2.4vw,24px)", fontWeight: 900, color: "#fff" }}>{jp}</span>
        </h1>
        {lead && (
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.72)", lineHeight: 1.95, maxWidth: 680, marginTop: 12 }}>{lead}</p>
        )}
      </div>
    </section>
  );
}

export function SubFooter() {
  return (
    <footer style={{ background: "#060f20", color: "#fff" }}>
      <div style={{ height: 4, background: "linear-gradient(90deg,#d10024,#a80019 50%,#d10024)" }} />
      <div className="max-w-[1280px] mx-auto px-5 md:px-8 py-8 text-center text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>
        © {new Date().getFullYear()} {TEAM_NAME_JP} / {TEAM_NAME_EN}
      </div>
    </footer>
  );
}
