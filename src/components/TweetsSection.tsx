import { getTweets } from "@/data/tweets";
import TwitterTimelineEmbed from "./TwitterTimelineEmbed";

const X_HANDLE = "SK_rookies_FK";
const X_URL = `https://x.com/${X_HANDLE}`;

function XIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
      <path d="M18.244 2H21l-6.52 7.45L22.5 22h-6.18l-4.84-6.32L5.91 22H3.15l6.98-7.97L1.5 2h6.34l4.38 5.79L18.244 2z" />
    </svg>
  );
}

/**
 * 公式X(@SK_rookies_FK)のタイムラインセクション。
 * widgets.js の埋め込みを基本に、表示されない場合は tweets シートのキュレーションにフォールバック。
 */
export default async function TweetsSection() {
  const fallbackTweets = await getTweets();

  return (
    <section id="tweets" className="bg-base border-b border-line">
      <div className="max-w-[1280px] mx-auto px-5 md:px-8 py-14 md:py-24">
        <div className="mb-10 reveal" style={{ position: "relative" }}>
          <div className="section-ghost" style={{ fontSize: "clamp(72px,12vw,140px)", color: "rgba(11,30,63,0.05)", marginBottom: -18, paddingLeft: 2 }}>TWEETS</div>
          <div>
            <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, letterSpacing: "0.45em", color: "#d10024", textTransform: "uppercase", marginBottom: 10 }}>TWEETS</p>
            <h2 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: "clamp(26px,3.5vw,42px)", fontWeight: 900, color: "#0b1e3f", lineHeight: 1.1 }}>公式Xの最新投稿</h2>
            <div style={{ width: 44, height: 4, background: "#d10024", marginTop: 14, borderRadius: 2 }} />
          </div>
        </div>

        <div className="grid gap-6 items-start grid-cols-1 lg:[grid-template-columns:1fr_320px]">
          {/* 左: Xタイムライン本体 */}
          <div>
            <TwitterTimelineEmbed handle={X_HANDLE} fallback={fallbackTweets} />
          </div>

          {/* 右: フォロー導線 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#fff", border: "1px solid #e0dcd4", padding: "22px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 38, height: 38, background: "#0b1e3f", color: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <XIcon size={16} />
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 900, fontSize: 14, color: "#0b1e3f" }}>博多SKルーキーズ</div>
                  <div style={{ fontSize: 12, color: "#8a8a8a", marginTop: 2 }}>@{X_HANDLE}</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: "#3a3f4a", lineHeight: 1.85, marginBottom: 16 }}>
                練習日変更・募集情報・活動報告は最速でXに投稿しています。
              </p>
              <a href={X_URL} target="_blank" rel="noopener noreferrer" className="hover:bg-red-2 transition-colors" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#d10024", color: "#fff", padding: "10px 18px", textDecoration: "none", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em" }}>
                <XIcon size={12} /> フォロー →
              </a>
            </div>
            <div style={{ background: "#f5f2ec", borderLeft: "4px solid #d10024", padding: "14px 18px", fontSize: 12, color: "#3a3f4a", lineHeight: 1.85 }}>
              <strong style={{ color: "#0b1e3f" }}>表示されない場合</strong><br />
              広告ブロッカーを一時OFFにするか、
              <a href={X_URL} target="_blank" rel="noopener noreferrer" style={{ color: "#d10024", fontWeight: 700, textDecoration: "underline", textDecorationStyle: "dotted", marginLeft: 2 }}>Xで直接ご確認</a>
              ください。
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
