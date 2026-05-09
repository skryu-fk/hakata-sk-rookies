import Image from "next/image";
import { getTweets } from "@/data/tweets";

const X_HANDLE = "SK_rookies_FK";
const X_URL = `https://x.com/${X_HANDLE}`;
const TEAM_NAME_JP = "博多SKルーキーズ";

function XIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
      <path d="M18.244 2H21l-6.52 7.45L22.5 22h-6.18l-4.84-6.32L5.91 22H3.15l6.98-7.97L1.5 2h6.34l4.38 5.79L18.244 2z" />
    </svg>
  );
}

function formatDate(iso: string) {
  // "2026-05-08" → "5月8日"
  const m = iso.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return iso;
  return `${Number(m[2])}月${Number(m[3])}日`;
}

/**
 * 公式Xの投稿を**キュレート式**で表示するセクション。
 * Twitter公式ウィジェットは表示不安定なので、Sheets運用の独自カードに統一。
 * Server Component なので JS なしで描画され、ハイドレーション不要。
 */
export default async function TweetsSection() {
  const items = (await getTweets()).slice(0, 6);

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

        <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-10">
          {items.map((t, i) => {
            const Wrapper: React.ElementType = t.url ? "a" : "div";
            const wrapperProps = t.url
              ? { href: t.url, target: "_blank", rel: "noopener noreferrer" }
              : {};
            return (
              <Wrapper
                key={i}
                {...wrapperProps}
                className="reveal tweet-card"
                style={{
                  background: "#fff",
                  border: "1px solid #e0dcd4",
                  padding: "18px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  textDecoration: "none",
                  color: "inherit",
                  cursor: t.url ? "pointer" : "default",
                  minHeight: 180,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 38, height: 38, background: "#0b1e3f", display: "grid", placeItems: "center", flexShrink: 0, position: "relative", overflow: "hidden" }}>
                    <Image src="/logo.png" alt={TEAM_NAME_JP} width={32} height={32} className="object-contain" style={{ filter: "brightness(1.1)" }} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 900, fontSize: 13, color: "#0b1e3f", lineHeight: 1.2 }}>{TEAM_NAME_JP}</div>
                    <div style={{ fontSize: 11, color: "#8a8a8a", marginTop: 2 }}>@{X_HANDLE} · {formatDate(t.date)}</div>
                  </div>
                  <span style={{ color: "#0b1e3f", flexShrink: 0 }} aria-hidden>
                    <XIcon size={14} />
                  </span>
                </div>
                <p style={{ fontSize: 13.5, color: "#1f2734", lineHeight: 1.85, whiteSpace: "pre-wrap", flex: 1 }}>
                  {t.text}
                </p>
                {t.url && (
                  <div style={{ fontSize: 11, color: "#d10024", fontWeight: 700, letterSpacing: "0.08em" }}>Xで開く →</div>
                )}
              </Wrapper>
            );
          })}
        </div>

        <div className="reveal" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between", padding: "20px 24px", background: "#fff", border: "1px solid #e0dcd4" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, background: "#0b1e3f", color: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <XIcon size={16} />
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 900, fontSize: 14, color: "#0b1e3f" }}>リアルタイムは公式Xで</div>
              <div style={{ fontSize: 12, color: "#5b6373", marginTop: 2 }}>練習日変更・募集情報・活動報告は最速でXに投稿しています。</div>
            </div>
          </div>
          <a href={X_URL} target="_blank" rel="noopener noreferrer" className="hover:bg-red-2 transition-colors" style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "#d10024", color: "#fff", padding: "12px 22px", textDecoration: "none", fontSize: 13, fontWeight: 700, letterSpacing: "0.1em" }}>
            <XIcon size={14} /> @{X_HANDLE} をフォロー →
          </a>
        </div>
      </div>
    </section>
  );
}
