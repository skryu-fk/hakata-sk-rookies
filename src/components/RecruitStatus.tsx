/**
 * 募集の状況を伝える表示
 *
 * 「いま誰を募集しているのか」は、見に来た人が一番知りたいこと。
 * 選手は休止・マネージャーは募集中、という状態をあいまいに書くと
 * 「結局どっちなの？」になるので、必ず2つ並べて別々に書いている。
 *
 *   - RecruitStatusBar   … ヒーローの直下に出す募集状況ボード（必ず通る位置）
 *   - RecruitStatusStrip … 下層ページのヘッダー直下に出す1行
 *   - RecruitStatusPanel … 選手の募集を休止している理由・再開の案内
 *
 * 文言と状況は src/data/recruit.ts に集約。
 */

import Link from "next/link";
import {
  MANAGER_OPEN,
  RECRUIT_OPEN,
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
        {MANAGER_OPEN ? (
          <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.82)", lineHeight: 1.6 }}>
            <strong style={{ color: "#ffd45e" }}>マネージャー募集中</strong>
            <span style={{ opacity: 0.6 }}>（選手の募集は休止しています）</span>
          </span>
        ) : (
          <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.82)", lineHeight: 1.6 }}>
            現在、新規選手の募集は休止しています。
          </span>
        )}
        <Link href={MANAGER_OPEN ? "/#manager" : "/#recruit"} className="hover:underline" style={{ fontSize: 12.5, color: "#ffd45e", fontWeight: 700, textDecoration: "none" }}>
          くわしく →
        </Link>
      </div>
    </div>
  );
}

/* ── ヒーロー直下の募集状況ボード ─────────────────────── */
/**
 * スクロール連動の表示アニメーション（.reveal）は意図的に付けていない。
 * 読み込み直後から確実に見えていてほしい内容のため。
 */
export function RecruitStatusBar() {
  return (
    <section
      id="recruit-status"
      aria-label="募集状況"
      style={{ background: "#0b1e3f", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="max-w-[1280px] mx-auto px-5 md:px-8" style={{ paddingTop: 28, paddingBottom: 28 }}>
        <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 10.5, letterSpacing: "0.38em", color: "#d4a82a", marginBottom: 16 }}>
          RECRUITMENT STATUS — 募集状況
        </p>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {/* 募集中のもの（マネージャー） */}
          {MANAGER_OPEN && (
            <div style={{ background: "rgba(212,168,42,0.09)", border: "1px solid rgba(212,168,42,0.45)", padding: "22px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ffd45e", flexShrink: 0 }} />
                <span style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: "clamp(18px,2.2vw,23px)", fontWeight: 900, color: "#fff" }}>
                  マネージャー
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#0b1e3f", background: "#ffd45e", padding: "3px 10px", marginLeft: "auto" }}>
                  募集中
                </span>
              </div>
              <p style={{ fontSize: 13.5, lineHeight: 1.9, color: "rgba(255,255,255,0.78)", marginBottom: 14 }}>
                撮影・イベント企画・選手データの管理をお願いします。野球の経験は不要、
                <strong style={{ color: "#ffd45e" }}>月会費・入会費はいただきません</strong>。
              </p>
              <Link
                href="/#manager"
                className="hover:bg-[#ffd45e] hover:text-[#0b1e3f] transition-colors"
                style={{ display: "inline-flex", alignItems: "center", padding: "10px 20px", border: "1px solid #ffd45e", color: "#ffd45e", textDecoration: "none", fontSize: 13, fontWeight: 700 }}
              >
                マネージャー募集をみる →
              </Link>
            </div>
          )}

          {/* 休止中のもの（選手） */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.12)", padding: "22px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.3)", flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: "clamp(18px,2.2vw,23px)", fontWeight: 900, color: "rgba(255,255,255,0.72)" }}>
                選手（プレイヤー）
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.28)", padding: "2px 10px", marginLeft: "auto" }}>
                {RECRUIT_OPEN ? "募集中" : "休止中"}
              </span>
            </div>
            <p style={{ fontSize: 13.5, lineHeight: 1.9, color: "rgba(255,255,255,0.55)", marginBottom: 14 }}>
              {RECRUIT_PAUSED_SINCE}より、受け入れ体制を整えるため新規選手の募集と体験参加の受付を休止しています。お申し込み済みの方はこれまでどおり対応します。
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <a href="#recruit" className="hover:text-white transition-colors" style={{ display: "inline-flex", alignItems: "center", color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>
                くわしい説明を読む →
              </a>
              <a href={X_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" style={{ display: "inline-flex", alignItems: "center", color: "rgba(255,255,255,0.4)", textDecoration: "none", fontSize: 13 }}>
                再開のお知らせを受け取る（𝕏）→
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── 選手の募集を休止していることの説明 ───────────────── */
export function RecruitStatusPanel() {
  return (
    <div className="reveal" style={{ background: "#f5f2ec", border: "1px solid #e0dcd4", borderTop: "4px solid #d10024", marginBottom: 48 }}>
      <div className="grid gap-0 grid-cols-1 lg:[grid-template-columns:1fr_340px]">
        {/* 休止のご案内 */}
        <div style={{ padding: "34px 32px" }}>
          <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 10.5, letterSpacing: "0.38em", color: "#d10024", marginBottom: 12 }}>
            PLAYER — PAUSED
          </p>
          <h3 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: "clamp(21px,2.7vw,29px)", fontWeight: 900, color: "#0b1e3f", lineHeight: 1.4, marginBottom: 20 }}>
            選手（プレイヤー）の募集は、<br />
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
            こちらは<br />受け付けています。
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
