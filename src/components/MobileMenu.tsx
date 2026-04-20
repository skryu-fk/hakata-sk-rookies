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
    document.body.style.overflow = open ? "hidden" : "";
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

  const barBase: React.CSSProperties = {
    width: 22,
    height: 2,
    background: "#fff",
    transition: "transform 0.3s cubic-bezier(0.2,0.8,0.2,1), opacity 0.2s ease",
    transformOrigin: "center",
  };

  return (
    <>
      {/* Hamburger / X toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "メニューを閉じる" : "メニューを開く"}
        aria-expanded={open}
        className="lg:hidden flex flex-col justify-center items-center gap-[5px] h-full"
        style={{ width: 56, background: "#0b1e3f", border: "none", cursor: "pointer", position: "relative", zIndex: 1100 }}>
        <span style={{ ...barBase, transform: open ? "translateY(7px) rotate(45deg)" : "none" }} />
        <span style={{ ...barBase, opacity: open ? 0 : 1 }} />
        <span style={{ ...barBase, transform: open ? "translateY(-7px) rotate(-45deg)" : "none" }} />
      </button>

      {/* Backdrop fade */}
      <div
        className="fixed inset-0 lg:hidden"
        onClick={() => setOpen(false)}
        aria-hidden
        style={{
          zIndex: 990,
          background: "rgba(0,0,0,0.5)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.3s ease",
        }}
      />

      {/* Sliding menu */}
      <div
        className="fixed top-0 right-0 bottom-0 lg:hidden"
        aria-hidden={!open}
        style={{
          zIndex: 1000,
          width: "min(88vw, 400px)",
          background: "#0b1e3f",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.4s cubic-bezier(0.22,1,0.36,1)",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          boxShadow: open ? "-20px 0 60px rgba(0,0,0,0.4)" : "none",
        }}>
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{
            fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d4a82a", letterSpacing: "0.4em",
            opacity: open ? 1 : 0,
            transform: open ? "translateY(0)" : "translateY(-8px)",
            transition: `opacity 0.3s ease ${open ? 0.2 : 0}s, transform 0.3s ease ${open ? 0.2 : 0}s`,
          }}>MENU</div>
          <div style={{ width: 40, height: 40 }} />
        </div>

        {/* Nav */}
        <nav style={{ padding: "8px 24px", display: "flex", flexDirection: "column" }}>
          {MENU.map(([h, l], i) => (
            <a
              key={h}
              href={h}
              onClick={() => setOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "17px 0",
                borderBottom: i < MENU.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none",
                color: "#fff",
                textDecoration: "none",
                fontFamily: "var(--font-zen),sans-serif",
                fontWeight: 700,
                fontSize: 17,
                opacity: open ? 1 : 0,
                transform: open ? "translateX(0)" : "translateX(24px)",
                transition: `opacity 0.4s ease ${open ? 0.15 + i * 0.045 : 0}s, transform 0.4s cubic-bezier(0.22,1,0.36,1) ${open ? 0.15 + i * 0.045 : 0}s`,
              }}>
              <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 12, color: "#d4a82a", letterSpacing: "0.15em", minWidth: 24 }}>{String(i + 1).padStart(2, "0")}</span>
              <span style={{ flex: 1 }}>{l}</span>
              <span style={{ color: "#d10024", fontSize: 16 }}>→</span>
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div style={{
          padding: "20px 24px 12px",
          opacity: open ? 1 : 0,
          transform: open ? "translateY(0)" : "translateY(16px)",
          transition: `opacity 0.4s ease ${open ? 0.55 : 0}s, transform 0.4s cubic-bezier(0.22,1,0.36,1) ${open ? 0.55 : 0}s`,
        }}>
          <a
            href="#contact"
            onClick={() => setOpen(false)}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", background: "#d10024", color: "#fff", textDecoration: "none", fontFamily: "var(--font-zen),sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: "0.12em", boxShadow: "0 8px 24px rgba(209,0,36,0.3)" }}>
            メンバーに応募する →
          </a>
        </div>

        {/* External */}
        <div style={{
          padding: "16px 24px 32px",
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          opacity: open ? 1 : 0,
          transform: open ? "translateY(0)" : "translateY(16px)",
          transition: `opacity 0.4s ease ${open ? 0.65 : 0}s, transform 0.4s cubic-bezier(0.22,1,0.36,1) ${open ? 0.65 : 0}s`,
        }}>
          <a href={X_URL} target="_blank" rel="noopener noreferrer" style={{ flex: "1 1 45%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 14px", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: 12 }}>
            公式X
          </a>
          <a href={JIMOTY_URL} target="_blank" rel="noopener noreferrer" style={{ flex: "1 1 45%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 14px", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: 12 }}>
            ジモティー
          </a>
          <a href={LABOLA_URL} target="_blank" rel="noopener noreferrer" style={{ flex: "1 1 100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 14px", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: 12 }}>
            Labola
          </a>
        </div>
      </div>
    </>
  );
}
