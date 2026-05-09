"use client";

/**
 * Xタイムラインの自動埋め込み（widgets.js）。
 *
 * widgets.js は Twitter/X 公式のスクリプトで、Xにポストすればこの埋め込みも自動更新される。
 * ただし以下の事情で「表示されない」ケースがある:
 *   - 広告ブロッカー（uBlock Origin / AdBlock など）が platform.twitter.com を遮断
 *   - 一部ブラウザのトラッキング防止機能が widgets.js を遮断
 *   - X側の一時的なレートリミット
 *
 * そのため、8秒以内に表示されなかったら curated（手動キュレート＝tweetsシート）を fallback として表示する。
 * これでXに投稿すれば普段は自動反映、ダメなときはシートからのカード表示でカバーされる。
 */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Tweet } from "@/data/tweets";

const TEAM_NAME_JP = "博多SKルーキーズ";

declare global {
  interface Window {
    twttr?: {
      widgets?: {
        load?: (el?: Element | null) => void;
        createTimeline?: (
          source: { sourceType: string; screenName: string },
          target: HTMLElement,
          opts?: Record<string, unknown>
        ) => Promise<unknown | null>;
      };
      ready?: (cb: (twttr: unknown) => void) => void;
    };
  }
}

function XIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
      <path d="M18.244 2H21l-6.52 7.45L22.5 22h-6.18l-4.84-6.32L5.91 22H3.15l6.98-7.97L1.5 2h6.34l4.38 5.79L18.244 2z" />
    </svg>
  );
}

function formatDate(iso: string) {
  const m = iso.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return iso;
  return `${Number(m[2])}月${Number(m[3])}日`;
}

function CuratedFallback({ tweets, handle }: { tweets: Tweet[]; handle: string }) {
  if (tweets.length === 0) {
    return (
      <div style={{ padding: "48px 24px", textAlign: "center", background: "#fff", border: "1px solid #e0dcd4" }}>
        <p style={{ fontSize: 13, color: "#5b6373", lineHeight: 1.85 }}>
          Xタイムラインが読み込めませんでした。<br />
          広告ブロッカーをOFFにするか、下のフォローボタンから直接Xでご確認ください。
        </p>
      </div>
    );
  }
  return (
    <div className="grid gap-5 grid-cols-1 md:grid-cols-2 mb-2">
      {tweets.slice(0, 4).map((t, i) => {
        const Wrapper: React.ElementType = t.url ? "a" : "div";
        const wrapperProps = t.url ? { href: t.url, target: "_blank", rel: "noopener noreferrer" } : {};
        return (
          <Wrapper
            key={i}
            {...wrapperProps}
            className="tweet-card"
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
              minHeight: 160,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 38, height: 38, background: "#0b1e3f", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <Image src="/logo.png" alt={TEAM_NAME_JP} width={32} height={32} className="object-contain" style={{ filter: "brightness(1.1)" }} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 900, fontSize: 13, color: "#0b1e3f", lineHeight: 1.2 }}>{TEAM_NAME_JP}</div>
                <div style={{ fontSize: 11, color: "#8a8a8a", marginTop: 2 }}>@{handle} · {formatDate(t.date)}</div>
              </div>
              <span style={{ color: "#0b1e3f", flexShrink: 0 }} aria-hidden>
                <XIcon size={14} />
              </span>
            </div>
            <p style={{ fontSize: 13.5, color: "#1f2734", lineHeight: 1.85, whiteSpace: "pre-wrap", flex: 1 }}>{t.text}</p>
            {t.url && <div style={{ fontSize: 11, color: "#d10024", fontWeight: 700, letterSpacing: "0.08em" }}>Xで開く →</div>}
          </Wrapper>
        );
      })}
    </div>
  );
}

export default function TwitterTimelineEmbed({
  handle,
  fallback,
}: {
  handle: string;
  fallback: Tweet[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"loading" | "ok" | "failed">("loading");

  useEffect(() => {
    let cancelled = false;
    let pollId: ReturnType<typeof setInterval> | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const tryCreate = (): boolean => {
      if (cancelled) return true;
      if (!containerRef.current) return false;
      const w = window.twttr;
      if (!w?.widgets?.createTimeline) return false;

      // 連続呼び出し防止: 既に iframe が入っているなら ok 扱い
      if (containerRef.current.querySelector("iframe")) {
        setPhase("ok");
        return true;
      }

      w.widgets
        .createTimeline(
          { sourceType: "profile", screenName: handle },
          containerRef.current,
          {
            tweetLimit: 5,
            theme: "light",
            chrome: "noheader nofooter noborders transparent",
            dnt: true,
            height: 720,
          }
        )
        .then(widget => {
          if (cancelled) return;
          if (widget) setPhase("ok");
          else setPhase("failed");
        })
        .catch(() => {
          if (!cancelled) setPhase("failed");
        });

      return true;
    };

    // スクリプト読み込み（既に存在すれば再利用）
    let scriptEl = document.querySelector<HTMLScriptElement>('script[data-twitter-wjs="1"]');
    if (!scriptEl) {
      scriptEl = document.createElement("script");
      scriptEl.src = "https://platform.twitter.com/widgets.js";
      scriptEl.async = true;
      scriptEl.charset = "utf-8";
      scriptEl.dataset.twitterWjs = "1";
      scriptEl.onerror = () => {
        if (!cancelled) setPhase("failed");
      };
      document.body.appendChild(scriptEl);
    }

    // widgets が ready になるまで 250ms 間隔でポーリング
    if (!tryCreate()) {
      pollId = setInterval(() => {
        if (cancelled) return;
        if (tryCreate() && pollId) {
          clearInterval(pollId);
          pollId = null;
        }
      }, 250);
    }

    // 8秒で諦めて fallback 表示
    timeoutId = setTimeout(() => {
      if (cancelled) return;
      setPhase(prev => (prev === "loading" ? "failed" : prev));
    }, 8000);

    return () => {
      cancelled = true;
      if (pollId) clearInterval(pollId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [handle]);

  if (phase === "failed") {
    return <CuratedFallback tweets={fallback} handle={handle} />;
  }

  return (
    <div style={{ position: "relative", minHeight: 360, background: "#fff", border: "1px solid #e0dcd4", padding: 8 }}>
      {phase === "loading" && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#aaa", fontSize: 13, pointerEvents: "none" }}>
          最新の投稿を読み込み中…
        </div>
      )}
      <div ref={containerRef} />
    </div>
  );
}
