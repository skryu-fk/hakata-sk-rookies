import Image from "next/image";
import Link from "next/link";

/**
 * ヒーロー。
 *
 * Apple のトップのように、伝えることを絞って中央に置く。
 * バッジ・光るドット・粒子・グラデーション背景は置かない。
 * 見てほしいのは「チーム名」「何をする人を探しているか」「応募ボタン」の3つだけ。
 */
const TEAM_NAME_JP = "博多SKルーキーズ";


export default function HeroSection({ memberCount }: { memberCount: number }) {
  return (
    <section style={{ background: "#fff", paddingTop: "clamp(56px, 9vw, 104px)", paddingBottom: "clamp(40px, 6vw, 72px)" }}>
      <div className="sec-in center">
        <Image
          src="/sk_logo_crop.png"
          alt={TEAM_NAME_JP}
          width={132}
          height={108}
          priority
          className="object-contain"
          style={{ margin: "0 auto 26px", width: "clamp(78px, 11vw, 112px)", height: "auto" }}
        />

        <h1 className="t-display">
          野球を、<br />はじめよう。
        </h1>

        <p className="t-sub" style={{ marginTop: 22, maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
          福岡市の草野球チーム。代表も初心者です。
          バットを握ったことがなくても歓迎します。
        </p>

        <div className="cta-row center" style={{ marginTop: 34, justifyContent: "center" }}>
          <a href="#contact" className="cta">メンバーに応募する</a>
          <a href="#about" className="link-more">チームのことを知る</a>
        </div>
      </div>

      {/* チームの現在地。数字だけを淡々と置く */}
      <div className="sec-in" style={{ marginTop: "clamp(48px, 7vw, 84px)" }}>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          borderTop: "1px solid var(--hair)", borderBottom: "1px solid var(--hair)",
        }}>
          {[
            [String(memberCount), "メンバー"],
            ["2026", "設立"],
            ["福岡市", "活動拠点"],
          ].map(([v, l], i) => (
            <div key={l} style={{
              padding: "22px 8px", textAlign: "center",
              borderLeft: i === 0 ? "none" : "1px solid var(--hair)",
            }}>
              <div style={{
                fontFamily: "var(--font-oswald),sans-serif",
                fontSize: "clamp(24px, 3.4vw, 34px)", fontWeight: 500,
                color: "var(--ink)", lineHeight: 1,
              }}>
                {v}
              </div>
              <div className="t-caption" style={{ marginTop: 7 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 募集中であることは、飾らずに一行で伝える */}
      <div className="sec-in center" style={{ marginTop: 22 }}>
        <p className="t-caption">
          10代〜40代のメンバーを募集中です。見学だけでも大丈夫です。{" "}
          <Link href="/uniform" className="link-more" style={{ fontSize: 13 }}>ユニフォーム</Link>
        </p>
      </div>
    </section>
  );
}
