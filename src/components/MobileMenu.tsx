"use client";

import { useEffect, useState } from "react";

const MENU: [string, string][] = [
  ["#news", "お知らせ"],
  ["/blog", "ブログ"],
  ["#about", "チーム紹介"],
  ["#activity", "活動概要"],
  ["#recruit", "メンバー募集"],
  ["#support", "支援"],
  ["#faq", "FAQ"],
  ["#contact", "お問い合わせ"],
];

const X_URL = "https://x.com/SK_rookies_FK";
const JIMOTY_URL = "https://jmty.jp/fukuoka/com-spo/article-1okvug";
const LABOLA_URL = "https://labola.jp/recruit/show/AZ2l6St6f3L-ncVW9EwL";

export default function MobileMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="メニューを開く"
        className="lg:hidden flex flex-col justify-center items-center gap-[5px] h-full"
        style={{ width: 56, background: "#0b1e3f", border: "none", cursor: "pointer" }}>
        <span style={{ width: 22, height: 2, background: "#fff" }} />
        <span style={{ width: 22, height: 2, background: "#fff" }} />
        <span style={{ width: 22, height: 2, background: "#fff" }} />
      </button>

      {open && (
        <div className="fixed inset-0 lg:hidden" style={{ zIndex: 1000, background: "#0b1e3f", display: "flex", flexDirection: "column", overflowY: "auto" }}>
          {/* Top bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d4a82a", letterSpacing: "0.4em" }}>MENU</div>
            <button
              onClick={() => setOpen(false)}
              aria-label="メニューを閉じる"
              style={{ width: 40, height: 40, background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", fontSize: 18, cursor: "pointer", display: "grid", placeItems: "center" }}>
              ✕
            </button>
          </div>

          {/* Nav */}
          <nav style={{ padding: "8px 24px", display: "flex", flexDirection: "column" }}>
            {MENU.map(([h, l], i) => (
              <a
                key={h}
                href={h}
                onClick={() => setOpen(false)}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 0", borderBottom: i < MENU.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none", color: "#fff", textDecoration: "none", fontFamily: "var(--font-zen),sans-serif", fontWeight: 700, fontSize: 18 }}>
                <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 12, color: "#d4a82a", letterSpacing: "0.15em", minWidth: 24 }}>{String(i + 1).padStart(2, "0")}</span>
                <span style={{ flex: 1 }}>{l}</span>
                <span style={{ color: "#d10024", fontSize: 16 }}>→</span>
              </a>
            ))}
          </nav>

          {/* CTA */}
          <div style={{ padding: "20px 24px 12px" }}>
            <a
              href="#contact"
              onClick={() => setOpen(false)}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", background: "#d10024", color: "#fff", textDecoration: "none", fontFamily: "var(--font-zen),sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: "0.12em" }}>
              メンバーに応募する →
            </a>
          </div>

          {/* External links */}
          <div style={{ padding: "16px 24px 32px", display: "flex", flexWrap: "wrap", gap: 8 }}>
            <a href={X_URL} target="_blank" rel="noopener noreferrer"
              style={{ flex: "1 1 45%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 14px", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: 12 }}>
              公式X
            </a>
            <a href={JIMOTY_URL} target="_blank" rel="noopener noreferrer"
              style={{ flex: "1 1 45%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 14px", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: 12 }}>
              ジモティー
            </a>
            <a href={LABOLA_URL} target="_blank" rel="noopener noreferrer"
              style={{ flex: "1 1 100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 14px", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: 12 }}>
              Labola
            </a>
          </div>
        </div>
      )}
    </>
  );
}
