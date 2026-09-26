"use client";

import { useEffect, useState } from "react";

/**
 * スマホ用のメニュー。
 *
 * 白い面に細い罫線で項目を並べるだけにしている。
 * 番号・矢印・色分けといった飾りは置かず、行そのものを押しやすくする。
 */
const MENU: [string, string][] = [
  ["#about", "チーム紹介"],
  ["#activity", "活動概要"],
  ["#schedule", "日程"],
  ["#news", "お知らせ"],
  ["#app", "公式アプリ"],
  ["#vision", "目標"],
  ["#recruit", "メンバー募集"],
  ["#support", "支援のお願い"],
  ["#sponsors", "公式スポンサー"],
  ["#faq", "よくある質問"],
  ["/uniform", "ユニフォーム"],
  ["/blog", "ブログ"],
  ["#contact", "お問い合わせ"],
];

const X_URL = "https://x.com/SK_rookies_FK";
const IG_URL = "https://www.instagram.com/hakata_sk_rookies/";
const LINE_URL = "https://line.me/ti/g/-buBk3SbuY";

export default function MobileMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const bar: React.CSSProperties = {
    width: 18, height: 1.5, background: "var(--ink)", borderRadius: 2,
    transition: "transform .3s var(--ease-out), opacity .2s ease",
    transformOrigin: "center",
  };

  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label={open ? "メニューを閉じる" : "メニューを開く"}
        aria-expanded={open}
        className="lg:hidden flex flex-col items-center justify-center"
        style={{
          gap: 5, width: 34, height: 34, background: "transparent", border: "none",
          cursor: "pointer", position: "relative", zIndex: 1100, padding: 0,
        }}
      >
        <span style={{ ...bar, transform: open ? "translateY(6.5px) rotate(45deg)" : "none" }} />
        <span style={{ ...bar, opacity: open ? 0 : 1 }} />
        <span style={{ ...bar, transform: open ? "translateY(-6.5px) rotate(-45deg)" : "none" }} />
      </button>

      {/* 背面の覆い */}
      <div
        className="fixed inset-0 lg:hidden"
        onClick={() => setOpen(false)}
        aria-hidden
        style={{
          zIndex: 990, background: "rgba(0,0,0,0.25)",
          opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
          transition: "opacity .3s ease",
        }}
      />

      {/* 引き出しメニュー */}
      <div
        className="fixed top-0 right-0 bottom-0 lg:hidden"
        aria-hidden={!open}
        style={{
          zIndex: 1000, width: "min(86vw, 380px)", background: "#fff",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform .42s cubic-bezier(0.22,1,0.36,1)",
          overflowY: "auto", display: "flex", flexDirection: "column",
          borderLeft: "1px solid var(--hair)",
        }}
      >
        <div style={{ height: 52, flexShrink: 0 }} />

        <nav style={{ padding: "0 22px", display: "flex", flexDirection: "column" }}>
          {MENU.map(([h, l], i) => (
            <a
              key={h}
              href={h}
              onClick={() => setOpen(false)}
              style={{
                padding: "15px 0",
                borderTop: i === 0 ? "none" : "1px solid var(--hair)",
                color: "var(--ink)", textDecoration: "none",
                fontSize: 17, letterSpacing: "-0.01em",
              }}
            >
              {l}
            </a>
          ))}
        </nav>

        <div style={{ padding: "24px 22px 10px" }}>
          <a
            href="#contact"
            onClick={() => setOpen(false)}
            className="cta"
            style={{ width: "100%" }}
          >
            メンバーに応募する
          </a>
        </div>

        <div style={{ padding: "14px 22px 34px", display: "flex", flexDirection: "column", gap: 12 }}>
          {[["公式X", X_URL], ["Instagram", IG_URL], ["グループLINE", LINE_URL]].map(([l, u]) => (
            <a key={l} href={u} target="_blank" rel="noopener noreferrer" className="link-more" style={{ fontSize: 15 }}>
              {l}
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
