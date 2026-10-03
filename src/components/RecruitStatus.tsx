/**
 * メンバー募集の状況を伝える表示
 *
 * 「募集を休止している」ことは、応募しようとした方が無駄足を踏まないための
 * 一番大事な情報。お知らせ欄に1行あるだけでは下に流れて気づかれないので、
 *   - RecruitStatusBar  … ヒーローの直下に出す帯（サイトを開いた人が必ず通る位置）
 *   - RecruitStatusPanel … 募集セクション本体の説明（理由・申込済みの方・再開の案内）
 * の2か所で、はっきり書いている。
 *
 * 文言と状況は src/data/recruit.ts に集約。募集を再開するときは
 * RECRUIT_OPEN を true にすれば、この2つは自動で表示されなくなる。
 */

import Link from "next/link";
import {
  RECRUIT_BADGE_EN,
  RECRUIT_PAUSED_SINCE,
  RECRUIT_PAUSE_PENDING,
  RECRUIT_PAUSE_REASON,
  RECRUIT_PAUSE_RESUME,
  RECRUIT_STILL_OPEN,
} from "@/data/recruit";

const X_URL = "https://x.com/SK_rookies_FK";

/* ── 下層ページ用の細い帯 ─────────────────────────────── */
/**
 * ブログやお知らせのページを検索から直接開いた人にも伝わるように、
 * ヘッダーのすぐ下に1行だけ置く。トップページには、もっと大きい
 * RecruitStatusBar を出すのでこちらは使わない。
 */
export function RecruitStatusStrip() {
  return (
    <div style={{ background: "#0b1e3f", borderBottom: "1px solid rgba(212,168,42,0.35)" }}>
      <div
        className="max-w-[1280px] mx-auto px-5 md:px-8"
        style={{ paddingTop: 9, paddingBottom: 9, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}
      >
        <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 9.5, letterSpacing: "0.26em", color: "#0b1e3f", background: "#d4a82a", padding: "3px 7px", fontWeight: 700 }}>
          NOTICE
        </span>
        <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.82)", lineHeight: 1.6 }}>
          現在、新規メンバーの募集は休止しています。
        </span>
        <Link href="/#recruit" className="hover:underline" style={{ fontSize: 12.5, color: "#ffd45e", fontWeight: 700, textDecoration: "none" }}>
          くわしく →
        </Link>
      </div>
    </div>
  );
}

/* ── ヒーロー直下の帯 ─────────────────────────────────── */
/**
 * スクロール連動の表示アニメーション（.reveal）は意図的に付けていない。
 * 読み込み直後から確実に見えていてほしい内容のため。
 */
export function RecruitStatusBar() {
  return (
    <section
      id="recruit-status"
      aria-label="メンバー募集の状況"
      style={{ background: "#0b1e3f", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="max-w-[1280px] mx-auto px-5 md:px-8" style={{ paddingTop: 28, paddingBottom: 28 }}>
        <div style={{ borderLeft: "4px solid #d4a82a", paddingLeft: 20 }}>
          <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 10.5, letterSpacing: "0.38em", color: "#d4a82a", marginBottom: 11 }}>
            IMPORTANT — 重要なお知らせ
          </p>
          <h2 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: "clamp(19px,2.6vw,27px)", fontWeight: 900, color: "#fff", lineHeight: 1.45, marginBottom: 12 }}>
            現在、新規メンバーの募集を<span style={{ color: "#ffd45e" }}>休止</span>しています。
          </h2>
          <p style={{ fontSize: 13.5, lineHeight: 1.95, color: "rgba(255,255,255,0.68)", maxWidth: 780, marginBottom: 16 }}>
            {RECRUIT_PAUSED_SINCE}より、{RECRUIT_PAUSE_REASON}
            {RECRUIT_PAUSE_PENDING}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <a
              href="#recruit"
              className="hover:bg-white/10 transition-colors"
              style={{ display: "inline-flex", alignItems: "center", padding: "10px 20px", border: "1px solid rgba(255,255,255,0.28)", color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 700 }}
            >
              くわしい説明を読む →
            </a>
            <a
              href={X_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
              style={{ display: "inline-flex", alignItems: "center", padding: "10px 4px", color: "rgba(255,255,255,0.55)", textDecoration: "none", fontSize: 13 }}
            >
              再開のお知らせを受け取る（𝕏をフォロー）→
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── 募集セクション本体の説明 ─────────────────────────── */
export function RecruitStatusPanel() {
  return (
    <div className="reveal" style={{ background: "#f5f2ec", border: "1px solid #e0dcd4", borderTop: "4px solid #d10024", marginBottom: 48 }}>
      <div className="grid gap-0 grid-cols-1 lg:[grid-template-columns:1fr_340px]">
        {/* 休止のご案内 */}
        <div style={{ padding: "34px 32px" }}>
          <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 10.5, letterSpacing: "0.38em", color: "#d10024", marginBottom: 12 }}>
            {RECRUIT_BADGE_EN}
          </p>
          <h3 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: "clamp(21px,2.7vw,29px)", fontWeight: 900, color: "#0b1e3f", lineHeight: 1.4, marginBottom: 20 }}>
            新規メンバーの募集は、<br />
            現在休止しています。
          </h3>
          <dl style={{ margin: 0 }}>
            {[
              ["休止している期間", `${RECRUIT_PAUSED_SINCE} 〜 当面の間`],
              ["理由", RECRUIT_PAUSE_REASON],
              ["お申し込み済みの方", RECRUIT_PAUSE_PENDING],
              ["再開について", RECRUIT_PAUSE_RESUME],
            ].map(([label, text]) => (
              <div key={label} style={{ borderTop: "1px solid #e0dcd4", paddingTop: 14, paddingBottom: 14 }}>
                <dt style={{ fontSize: 11.5, fontWeight: 700, color: "#d10024", letterSpacing: "0.08em", marginBottom: 6 }}>{label}</dt>
                <dd style={{ margin: 0, fontSize: 13.5, lineHeight: 1.95, color: "#3a3f4a" }}>{text}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* 休止中でも受け付けているもの */}
        <div style={{ background: "#0b1e3f", padding: "34px 30px" }}>
          <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 10.5, letterSpacing: "0.38em", color: "#d4a82a", marginBottom: 12 }}>
            STILL OPEN
          </p>
          <h4 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: 17, fontWeight: 900, color: "#fff", lineHeight: 1.5, marginBottom: 20 }}>
            休止中も、こちらは<br />受け付けています。
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 15, marginBottom: 26 }}>
            {RECRUIT_STILL_OPEN.map(item => (
              <div key={item.title}>
                <p style={{ fontSize: 13.5, fontWeight: 700, color: "#fff", marginBottom: 3 }}>{item.title}</p>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>{item.note}</p>
              </div>
            ))}
          </div>
          <a
            href="#contact"
            className="bg-red hover:bg-red-2 transition-colors"
            style={{ display: "flex", justifyContent: "center", padding: "13px 24px", color: "#fff", textDecoration: "none", fontSize: 13.5, fontWeight: 700, letterSpacing: "0.08em" }}
          >
            お問い合わせへ →
          </a>
        </div>
      </div>
    </div>
  );
}
