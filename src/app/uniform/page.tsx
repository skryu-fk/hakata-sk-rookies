import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

const TEAM_NAME_JP = "博多SKルーキーズ";
const TEAM_NAME_EN = "HAKATA SK ROOKIES";

export const metadata: Metadata = {
  title: "ユニフォーム紹介 | 博多SKルーキーズ",
  description:
    "博多SKルーキーズ 1stユニフォームの紹介。ジャージ・キャップ・パンツのデザインと販売情報、スポンサー様向けロゴ掲出募集について。",
  alternates: { canonical: "/uniform" },
  openGraph: {
    title: "ユニフォーム紹介 | 博多SKルーキーズ",
    description: "HAKATA SK ROOKIES 1st UNIFORM — ジャージ・キャップ・パンツのデザインと販売情報。",
    images: ["/uniform/poster.png"],
  },
};

export default function UniformPage() {
  return (
    <>
      {/* Header */}
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
        {/* Hero — poster image */}
        <section className="bg-navy text-white relative overflow-hidden" style={{ borderBottom: "4px solid #d10024" }}>
          <div className="field-grid absolute inset-0" />
          <div className="max-w-[1280px] mx-auto px-5 md:px-8 py-12 md:py-16 relative">
            <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d4a82a", letterSpacing: "0.4em", marginBottom: 10 }}>HAKATA SK ROOKIES _1st</p>
            <h1 style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: "clamp(40px,7vw,80px)", fontWeight: 700, lineHeight: 1, letterSpacing: "0.02em" }}>
              UNIFORM
            </h1>
            <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: "clamp(20px,3vw,32px)", fontWeight: 400, lineHeight: 1.1, color: "rgba(255,255,255,0.85)", marginTop: 4 }}>
              INTRODUCTION
            </p>
            <div style={{ width: 60, height: 3, background: "#d10024", margin: "16px 0 18px" }} />
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 1.95, maxWidth: 620 }}>
              勝利への情熱と、仲間との絆を胸に。<br />
              博多から、次のステージへ。<br />
              ひとつの想いを、最高の瞬間へ。
            </p>
          </div>
        </section>

        {/* Poster image */}
        <section className="bg-base border-b border-line">
          <div className="max-w-[1180px] mx-auto px-5 md:px-8 py-10 md:py-14">
            <div style={{ background: "#0b1e3f", border: "1px solid rgba(255,255,255,0.1)", padding: 0, overflow: "hidden" }}>
              <Image
                src="/uniform/poster.png"
                alt="博多SKルーキーズ 1stユニフォーム紹介ポスター"
                width={1240}
                height={1240}
                className="w-full h-auto"
                priority
              />
            </div>
            <p style={{ fontSize: 11, color: "#8a8a8a", textAlign: "right", marginTop: 8 }}>
              ※ 画像はイメージです。実物の仕上がりとは多少異なる場合があります。
            </p>
          </div>
        </section>

        {/* Jersey flat */}
        <section className="bg-white border-b border-line-2">
          <div className="max-w-[1180px] mx-auto px-5 md:px-8 py-12 md:py-16">
            <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d10024", letterSpacing: "0.4em", marginBottom: 10 }}>JERSEY — FRONT & BACK</p>
            <h2 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: "clamp(22px,3vw,32px)", fontWeight: 900, color: "#0b1e3f", lineHeight: 1.2, marginBottom: 24 }}>
              ジャージ詳細
            </h2>
            <div style={{ border: "1px solid #e0dcd4", padding: 18, background: "#fefcfa" }}>
              <Image
                src="/uniform/jersey-flat.png"
                alt="博多SKルーキーズ ジャージ前面・背面"
                width={1500}
                height={1000}
                className="w-full h-auto"
              />
            </div>
            <p style={{ fontSize: 11, color: "#8a8a8a", textAlign: "right", marginTop: 8 }}>
              ※ 画像はイメージです。生地・色味は実物と多少異なる場合があります。
            </p>
            <ul className="mt-8 grid gap-3 grid-cols-1 md:grid-cols-2" style={{ listStyle: "none", padding: 0 }}>
              {[
                ["フロント", "ピンストライプ＋胸の SK ROOKIES ロゴ。袖はブラック×ジオメトリック模様。"],
                ["バック", "ピンストライプ＋背番号（黒×オレンジ縁＋ピンク影）＋名前。"],
                ["カラー", "WHITE / BLACK / PINK / ORANGE の4色構成。"],
                ["素材", "メッシュ素材で通気性◎。夏場の試合でも快適。"],
              ].map(([label, desc]) => (
                <li key={label} style={{ padding: "12px 16px", background: "#f5f2ec", borderLeft: "4px solid #d10024" }}>
                  <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d10024", letterSpacing: "0.3em", marginBottom: 4 }}>{label}</p>
                  <p style={{ fontSize: 13, color: "#3a3f4a", lineHeight: 1.85 }}>{desc}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Pricing */}
        <section className="bg-base border-b border-line">
          <div className="max-w-[1180px] mx-auto px-5 md:px-8 py-12 md:py-16">
            <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d10024", letterSpacing: "0.4em", marginBottom: 10 }}>PRICING</p>
            <h2 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: "clamp(22px,3vw,32px)", fontWeight: 900, color: "#0b1e3f", lineHeight: 1.2, marginBottom: 24 }}>
              販売情報
            </h2>

            <div className="grid gap-5 grid-cols-1 md:grid-cols-2">
              {/* Jersey */}
              <div style={{ background: "#fff", border: "1px solid #e0dcd4", padding: "28px 26px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d10024", letterSpacing: "0.3em" }}>JERSEY</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#0b1e3f", background: "rgba(11,30,63,0.08)", padding: "3px 8px", letterSpacing: "0.06em" }}>受付中</span>
                </div>
                <h3 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: 20, fontWeight: 900, color: "#0b1e3f", marginBottom: 10 }}>
                  ジャージ（ユニフォーム）
                </h3>
                <p style={{ fontSize: 13, color: "#5b6373", lineHeight: 1.85, marginBottom: 16 }}>
                  上記デザインの1stユニフォーム。背番号・選手名のオーダー対応。
                </p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 36, fontWeight: 700, color: "#d10024" }}>¥6,000</span>
                  <span style={{ fontSize: 12, color: "#8a8a8a" }}>/ 着</span>
                </div>
                <p style={{ fontSize: 11, color: "#8a8a8a" }}>
                  ※ 名前・背番号込み。サイズによる追加料金なし。
                </p>
              </div>

              {/* Cap + Pants */}
              <div style={{ background: "#fff", border: "1px solid #e0dcd4", padding: "28px 26px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d4a82a", letterSpacing: "0.3em" }}>CAP + PANTS</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#d4a82a", background: "rgba(212,168,42,0.12)", padding: "3px 8px", letterSpacing: "0.06em" }}>6月下旬予定</span>
                </div>
                <h3 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: 20, fontWeight: 900, color: "#0b1e3f", marginBottom: 10 }}>
                  キャップ ＆ パンツ（セット）
                </h3>
                <p style={{ fontSize: 13, color: "#5b6373", lineHeight: 1.85, marginBottom: 16 }}>
                  ブラックベースのキャップと、サイドラインの入った白パンツのセット。
                </p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 36, fontWeight: 700, color: "#d4a82a" }}>¥5,500</span>
                  <span style={{ fontSize: 12, color: "#8a8a8a" }}>/ セット</span>
                </div>
                <p style={{ fontSize: 11, color: "#8a8a8a" }}>
                  ※ 2026年6月下旬から注文受付開始予定。
                </p>
              </div>
            </div>

            {/* Notes */}
            <div className="mt-6" style={{ background: "#fff", borderLeft: "4px solid #d10024", padding: "16px 22px" }}>
              <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 10, color: "#d10024", letterSpacing: "0.3em", marginBottom: 8 }}>NOTE</p>
              <ul style={{ fontSize: 13, color: "#3a3f4a", lineHeight: 1.95, margin: 0, paddingLeft: 18 }}>
                <li>ユニフォームの<strong>購入は強制ではありません</strong>。希望者のみの注文制です。</li>
                <li>掲載している<strong>画像はすべてイメージ</strong>です。実物の生地感・色味・仕上がりは多少異なる場合があります。</li>
                <li>注文・サイズの相談は<Link href="/#contact" style={{ color: "#d10024", fontWeight: 700, textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 3 }}>お問い合わせフォーム</Link>または公式LINEからお願いします。</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Sponsor */}
        <section className="bg-navy text-white relative overflow-hidden" style={{ borderTop: "4px solid #d10024", borderBottom: "4px solid #d10024" }}>
          <div className="field-grid absolute inset-0" />
          <div className="max-w-[1180px] mx-auto px-5 md:px-8 py-12 md:py-16 relative">
            <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d4a82a", letterSpacing: "0.4em", marginBottom: 10 }}>SPONSOR — LOGO ON UNIFORM</p>
            <h2 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: "clamp(22px,3vw,32px)", fontWeight: 900, lineHeight: 1.25, marginBottom: 14 }}>
              スポンサー様募集
            </h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 1.95, maxWidth: 720, marginBottom: 24 }}>
              ユニフォームに貴店・貴社のロゴを掲出いただけるスポンサー様を募集しています。
              地域の応援団として、選手と一緒にグラウンドへ立ちませんか。
            </p>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-3 mb-8">
              {[
                ["募集期間", "2026年6月〜12月"],
                ["料金", "¥10,000 / 年"],
                ["掲載期間", "1年間（ユニフォーム使用期間中）"],
              ].map(([label, val]) => (
                <div key={label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", padding: "18px 20px" }}>
                  <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 10, color: "#d4a82a", letterSpacing: "0.3em", marginBottom: 8 }}>{label}</p>
                  <p style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: 22, fontWeight: 900, color: "#fff", lineHeight: 1.2 }}>{val}</p>
                </div>
              ))}
            </div>

            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", padding: "20px 24px" }}>
              <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 10, color: "#d4a82a", letterSpacing: "0.3em", marginBottom: 10 }}>INCLUDED</p>
              <ul style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 1.9, margin: 0, paddingLeft: 18 }}>
                <li>ユニフォームへのロゴ掲出（位置はご相談）</li>
                <li>公式サイトのスポンサー欄にロゴ＆リンク掲載</li>
                <li>公式X・Instagramでのご紹介投稿</li>
                <li>活動報告・試合レポート内での感謝紹介</li>
              </ul>
            </div>

            <div className="mt-8" style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <Link href="/#contact" className="hover:bg-red-2 transition-colors" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#d10024", color: "#fff", padding: "14px 28px", textDecoration: "none", fontFamily: "var(--font-zen),sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: "0.12em" }}>
                スポンサーのご相談はこちら →
              </Link>
              <Link href="/#support" className="hover:border-white/60 transition-colors" style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid rgba(255,255,255,0.3)", color: "#fff", padding: "14px 28px", textDecoration: "none", fontFamily: "var(--font-zen),sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: "0.12em" }}>
                支援メニューを見る
              </Link>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="bg-base">
          <div className="max-w-[820px] mx-auto px-5 md:px-8 py-14 text-center">
            <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d10024", letterSpacing: "0.45em", marginBottom: 12 }}>OUR STYLE, OUR TEAM</p>
            <h2 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: "clamp(20px,2.6vw,28px)", fontWeight: 900, color: "#0b1e3f", lineHeight: 1.5, marginBottom: 24 }}>
              ひとつのユニフォームに想いを込めて、<br />最高の瞬間を共に。
            </h2>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/#contact" className="bg-red hover:bg-red-2 transition-colors" style={{ display: "inline-flex", alignItems: "center", padding: "14px 28px", color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 700, letterSpacing: "0.12em" }}>
                ユニフォーム注文・相談 →
              </Link>
              <Link href="/" className="hover:border-navy transition-colors" style={{ display: "inline-flex", alignItems: "center", padding: "14px 28px", border: "1px solid #d8d4cb", color: "#0b1e3f", textDecoration: "none", fontSize: 14, fontWeight: 700, letterSpacing: "0.12em" }}>
                トップへ戻る
              </Link>
            </div>
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
