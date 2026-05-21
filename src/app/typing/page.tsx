import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import TypingGame from "./TypingGame";

const TEAM_NAME_JP = "博多SKルーキーズ";
const TEAM_NAME_EN = "HAKATA SK ROOKIES";

export const metadata: Metadata = {
  title: "野球用語タイピング | ミニゲーム | 博多SKルーキーズ",
  description:
    "30秒チャレンジ。野球用語を学びながらタイピング速度を競うミニゲーム。福岡の草野球チーム 博多SKルーキーズが提供。",
  alternates: { canonical: "/typing" },
};

export default function TypingPage() {
  return (
    <>
      <header className="sticky top-0 z-50 bg-white" style={{ borderBottom: "3px solid #d10024", boxShadow: "0 1px 0 #e0dcd4" }}>
        <div className="max-w-[1280px] mx-auto px-5 md:px-8 flex items-stretch" style={{ height: 68 }}>
          <Link href="/" className="flex items-center gap-3 flex-shrink-0 pr-4 md:pr-6" style={{ textDecoration: "none", borderRight: "1px solid #f0ece6" }}>
            <Image src="/logo.png" alt={TEAM_NAME_JP} width={48} height={48} className="object-contain" priority />
            <div style={{ lineHeight: 1 }}>
              <div style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 900, fontSize: 16, color: "#0b1e3f", letterSpacing: "0.04em" }}>{TEAM_NAME_JP}</div>
              <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 10, color: "#aaa", letterSpacing: "0.3em", marginTop: 3 }}>{TEAM_NAME_EN}</div>
            </div>
          </Link>
          <Link href="/" className="ml-auto flex items-center font-bold text-[13px] text-navy hover:text-red transition-colors" style={{ textDecoration: "none" }}>
            ← トップへ戻る
          </Link>
        </div>
      </header>

      <main>
        <div className="bg-navy text-white relative overflow-hidden" style={{ borderBottom: "4px solid #d10024" }}>
          <div className="field-grid absolute inset-0" />
          <div className="max-w-[820px] mx-auto px-5 md:px-8 py-12 md:py-16 relative">
            <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d4a82a", letterSpacing: "0.4em", marginBottom: 10 }}>MINI GAME — TYPING</p>
            <h1 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: "clamp(24px,3.4vw,36px)", fontWeight: 900, lineHeight: 1.35 }}>
              野球用語タイピング
            </h1>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", marginTop: 14, lineHeight: 1.9 }}>
              30秒のチャレンジ。画面に表示される<strong style={{ color: "#fff" }}>野球用語（日本語）</strong>を、
              下に出る<strong style={{ color: "#d4a82a" }}>ローマ字</strong>を見ながらタイピングしてください。寿司打スタイルの学習＆タイピングゲーム。
            </p>
          </div>
        </div>

        <div className="bg-base">
          <div className="max-w-[820px] mx-auto px-5 md:px-8 py-10 md:py-14">
            <TypingGame />
          </div>
        </div>

        <section className="bg-white border-t border-line-2">
          <div className="max-w-[820px] mx-auto px-5 md:px-8 py-10">
            <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d10024", letterSpacing: "0.4em", marginBottom: 10 }}>HOW TO PLAY</p>
            <h2 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: 18, fontWeight: 900, color: "#0b1e3f", marginBottom: 14 }}>
              遊び方
            </h2>
            <ol style={{ fontSize: 14, color: "#3a3f4a", lineHeight: 1.95, paddingLeft: 22, margin: 0 }}>
              <li>「スタート」を押すと <strong>30秒</strong> のカウントダウンが始まります。</li>
              <li>画面に <strong>野球用語の日本語</strong>（例：レフト）が大きく表示され、その下に <strong>ローマ字</strong>（例：refuto）が出ます。</li>
              <li>そのローマ字を <strong>IME OFF のまま半角英字</strong> で打ってください。「ー」は母音を2回（カーブ→<code>kaabu</code>）、「っ」は次の子音を2回（ピッチャー→<code>picchaa</code>）。</li>
              <li>正解すると次のお題に進みます。Enterキーは不要。</li>
              <li>スキップしたい時は <kbd style={{ background: "#e0dcd4", padding: "2px 8px", borderRadius: 4, fontSize: 12 }}>Tab</kbd> キー（スマホはボタン）。</li>
              <li>終了後にスコア・正解率・各お題の所要秒数が一覧表示されます。自己ベストはブラウザに保存。</li>
              <li>スマホ・タブレットでは <strong>4択クイズモード</strong> がデフォルトで、設定で <strong>オンスクリーン鍵盤タイピング</strong> にも切り替え可能です。</li>
            </ol>
          </div>
        </section>
      </main>

      <footer style={{ background: "#060f20", color: "#fff" }}>
        <div style={{ height: 4, background: "linear-gradient(90deg,#d10024,#a80019 50%,#d10024)" }} />
        <div className="max-w-[1280px] mx-auto px-5 md:px-8 py-8 text-center text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>
          © {new Date().getFullYear()} {TEAM_NAME_JP} / {TEAM_NAME_EN}
        </div>
      </footer>
    </>
  );
}
