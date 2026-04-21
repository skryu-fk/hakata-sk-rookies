"use client";

import { useEffect, useRef, useState } from "react";

const X_HANDLE = "SK_rookies_FK";
const X_URL = `https://x.com/${X_HANDLE}`;

declare global {
  interface Window {
    twttr?: { widgets?: { load: (el?: Element | null) => void } };
  }
}

function XIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
      <path d="M18.244 2H21l-6.52 7.45L22.5 22h-6.18l-4.84-6.32L5.91 22H3.15l6.98-7.97L1.5 2h6.34l4.38 5.79L18.244 2z" />
    </svg>
  );
}

/**
 * 公式X（@SK_rookies_FK）のタイムラインを自動で埋め込むセクション。
 * Xに投稿すればサイト側の更新作業は不要（widget が最新を都度取得）。
 */
export default function TweetsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      if (cancelled) return;
      if (window.twttr?.widgets) {
        window.twttr.widgets.load(ref.current);
        setLoaded(true);
      }
    };
    const existing = document.querySelector<HTMLScriptElement>('script[data-x-widget="1"]');
    if (existing) {
      if (window.twttr?.widgets) load();
      else existing.addEventListener("load", load, { once: true });
      return () => { cancelled = true; };
    }
    const script = document.createElement("script");
    script.src = "https://platform.twitter.com/widgets.js";
    script.async = true;
    script.charset = "utf-8";
    script.dataset.xWidget = "1";
    script.onload = load;
    document.body.appendChild(script);
    return () => { cancelled = true; };
  }, []);

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

        <div className="grid gap-8 items-start grid-cols-1 lg:[grid-template-columns:460px_1fr]">
          {/* 左: X公式ウィジェット（自動更新）
              dangerouslySetInnerHTML で外部DOM書き換えをReactの管理外にし、
              widgets.js による差し替えでハイドレーション警告が出ないようにしている。 */}
          <div style={{ background: "#fff", border: "1px solid #e0dcd4", padding: "10px", minHeight: 400, position: "relative" }}>
            {!loaded && (
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#aaa", fontSize: 13, pointerEvents: "none" }}>
                最新の投稿を読み込み中…
              </div>
            )}
            <div
              ref={ref}
              dangerouslySetInnerHTML={{
                __html: `<a class="twitter-timeline" data-height="560" data-theme="light" data-chrome="noheader nofooter transparent" data-tweet-limit="4" data-dnt="true" href="${X_URL}">Tweets by @${X_HANDLE}</a>`,
              }}
            />
          </div>

          {/* 右: フォロー導線・説明 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: "#fff", border: "1px solid #e0dcd4", padding: "24px 26px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 40, height: 40, background: "#0b1e3f", color: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <XIcon size={18} />
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 900, fontSize: 15, color: "#0b1e3f" }}>博多SKルーキーズ</div>
                  <div style={{ fontSize: 12, color: "#8a8a8a", marginTop: 2 }}>@{X_HANDLE}</div>
                </div>
              </div>
              <p style={{ fontSize: 14, color: "#3a3f4a", lineHeight: 1.85, marginBottom: 18 }}>
                活動報告・練習日変更・メンバー募集など、リアルタイムの情報はX（旧Twitter）で発信しています。気になる方はぜひフォローをお願いします。
              </p>
              <a href={X_URL} target="_blank" rel="noopener noreferrer" className="hover:bg-red-2 transition-colors" style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "#0b1e3f", color: "#fff", padding: "12px 22px", textDecoration: "none", fontSize: 13, fontWeight: 700, letterSpacing: "0.1em" }}>
                <XIcon size={14} /> 公式Xをフォローする →
              </a>
            </div>

            <div style={{ background: "#f5f2ec", borderLeft: "4px solid #d10024", padding: "16px 20px", fontSize: 13, color: "#3a3f4a", lineHeight: 1.85 }}>
              タイムラインが表示されない場合は、ブラウザの広告ブロッカーを一時OFFにするか、
              <a href={X_URL} target="_blank" rel="noopener noreferrer" style={{ color: "#d10024", fontWeight: 700, textDecoration: "underline", textDecorationStyle: "dotted", marginLeft: 2 }}>Xで直接見る</a>
              でご確認ください。
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
