import { tweets } from "@/data/tweets";

const X_URL = "https://x.com/SK_rookies_FK";
const X_HANDLE = "@SK_rookies_FK";

function XIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
      <path d="M18.244 2H21l-6.52 7.45L22.5 22h-6.18l-4.84-6.32L5.91 22H3.15l6.98-7.97L1.5 2h6.34l4.38 5.79L18.244 2z" />
    </svg>
  );
}

function linkify(text: string) {
  const parts = text.split(/(https?:\/\/\S+)/g);
  return parts.map((p, i) =>
    /^https?:\/\//.test(p) ? (
      <a key={i} href={p} target="_blank" rel="noopener noreferrer" style={{ color: "#d10024", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 3, wordBreak: "break-all" }}>
        {p}
      </a>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

export default function TweetsSection() {
  return (
    <section id="tweets" className="bg-base border-b border-line">
      <div className="max-w-[1280px] mx-auto px-5 md:px-8 py-14 md:py-24">
        <div className="mb-10 reveal" style={{ position: "relative" }}>
          <div className="section-ghost" style={{ fontSize: "clamp(72px,12vw,140px)", color: "rgba(11,30,63,0.05)", marginBottom: -18, paddingLeft: 2 }}>
            TWEETS
          </div>
          <div>
            <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, letterSpacing: "0.45em", color: "#d10024", textTransform: "uppercase", marginBottom: 10 }}>TWEETS</p>
            <h2 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: "clamp(26px,3.5vw,42px)", fontWeight: 900, color: "#0b1e3f", lineHeight: 1.1 }}>公式Xの最新投稿</h2>
            <div style={{ width: 44, height: 4, background: "#d10024", marginTop: 14, borderRadius: 2 }} />
          </div>
        </div>

        <div className="grid gap-5 grid-cols-1 md:grid-cols-3">
          {tweets.map((t, i) => (
            <article key={i} className="reveal" data-delay={String(i * 100)}
              style={{ background: "#fff", border: "1px solid #e0dcd4", padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, background: "#0b1e3f", color: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <XIcon size={16} />
                </div>
                <div style={{ lineHeight: 1.2 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#0b1e3f" }}>博多SKルーキーズ</div>
                  <div style={{ fontSize: 11, color: "#8a8a8a", marginTop: 2 }}>{X_HANDLE}</div>
                </div>
                <div style={{ marginLeft: "auto", fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#aaa", letterSpacing: "0.1em" }}>{t.date}</div>
              </div>
              <p style={{ fontSize: 14, color: "#3a3f4a", lineHeight: 1.85, whiteSpace: "pre-wrap", flex: 1 }}>{linkify(t.text)}</p>
              {t.url && (
                <a href={t.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#5b6373", textDecoration: "none", borderTop: "1px solid #f0ece6", paddingTop: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  Xで見る <span style={{ color: "#d10024" }}>→</span>
                </a>
              )}
            </article>
          ))}
        </div>

        <div className="mt-10 text-center">
          <a href={X_URL} target="_blank" rel="noopener noreferrer"
            className="hover:bg-red-2 transition-colors"
            style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "#0b1e3f", color: "#fff", padding: "14px 28px", textDecoration: "none", fontSize: 13, fontWeight: 700, letterSpacing: "0.1em" }}>
            <XIcon size={14} /> 公式Xをフォローする →
          </a>
        </div>
      </div>
    </section>
  );
}
