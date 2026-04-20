"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

const TEAM_NAME_JP = "博多SKルーキーズ";
const TEAM_NAME_EN  = "HAKATA SK ROOKIES";
const X_URL   = "https://x.com/SK_rookies_FK";
const FOUNDED = "2026";

/* ── Baseball diamond SVG ─────────────────────────────── */
function BaseballDiamond() {
  const size = 700;
  const cx = size / 2, cy = size / 2, r = size * 0.42;
  const pts   = [[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]];
  const poly  = pts.map(p => p.join(",")).join(" ");
  const ri    = r * 0.48;
  const inner = [[cx, cy - ri],[cx + ri, cy],[cx, cy + ri],[cx - ri, cy]].map(p => p.join(",")).join(" ");
  const perim = r * 4 * Math.SQRT2;

  return (
    <svg viewBox={`0 0 ${size} ${size}`}
      className="absolute pointer-events-none select-none"
      style={{ right: "-5%", top: "50%", transform: "translateY(-50%)", width: "clamp(360px,55vw,700px)", height: "clamp(360px,55vw,700px)" }}
      aria-hidden>
      <defs>
        <radialGradient id="dg" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="rgba(209,0,36,0.15)" />
          <stop offset="100%" stopColor="rgba(209,0,36,0)" />
        </radialGradient>
      </defs>
      <polygon points={poly} fill="url(#dg)" />
      <polygon points={poly} fill="none"
        stroke="rgba(255,255,255,0.12)" strokeWidth="2"
        strokeDasharray={perim} strokeDashoffset={perim}
        className="diamond-outer" />
      <polygon points={inner} fill="none"
        stroke="rgba(209,0,36,0.25)" strokeWidth="1.5"
        strokeDasharray={perim * 0.48} strokeDashoffset={perim * 0.48}
        className="diamond-inner" />
      {pts.map((p, i) => (
        <rect key={i} x={p[0] - 6} y={p[1] - 6} width={12} height={12}
          fill={i === 2 ? "rgba(255,255,255,0.2)" : "rgba(209,0,36,0.3)"}
          transform={`rotate(45 ${p[0]} ${p[1]})`}
          style={{ animation: `heroFadeIn 0.4s ease ${1.5 + i * 0.15}s both` }} />
      ))}
      <line x1={cx} y1={cy + r} x2={cx - r * 1.8} y2={cy - r * 0.6} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      <line x1={cx} y1={cy + r} x2={cx + r * 1.8} y2={cy - r * 0.6} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
    </svg>
  );
}

/* ── Stitch divider ───────────────────────────────────── */
function StitchDivider() {
  return (
    <svg viewBox="0 0 1200 24" preserveAspectRatio="none"
      style={{ width: "100%", height: 20, display: "block" }} aria-hidden>
      {Array.from({ length: 30 }, (_, i) => {
        const x = 20 + i * 40;
        return (
          <g key={i}>
            <path d={`M${x},6 Q${x + 8},12 ${x + 16},6`} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round"
              style={{ animation: `stitch 0.5s ease ${i * 0.03}s both` }} />
            <path d={`M${x},18 Q${x + 8},12 ${x + 16},18`} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round"
              style={{ animation: `stitch 0.5s ease ${i * 0.03 + 0.1}s both` }} />
          </g>
        );
      })}
    </svg>
  );
}

/* ── Stat ─────────────────────────────────────────────── */
function HeroStat({ children, unit, label }: { children: React.ReactNode; unit?: string; label: string }) {
  return (
    <div className="text-center px-6 border-r border-white/10">
      <div className="font-display font-bold text-gold leading-none" style={{ fontSize: "clamp(28px,4vw,44px)" }}>
        {children}
        {unit && <span className="text-white/50 ml-1" style={{ fontSize: "0.42em" }}>{unit}</span>}
      </div>
      <div className="font-display text-white/40 mt-1.5 tracking-[0.3em] uppercase" style={{ fontSize: 10 }}>{label}</div>
    </div>
  );
}

/* ── Hero section ─────────────────────────────────────── */
export default function HeroSection({ memberCount }: { memberCount: number }) {
  const counterRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = counterRef.current;
    if (!el) return;
    let start: number | null = null;
    const duration = 1200;
    const step = (ts: number) => {
      if (!start) start = ts;
      const t = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      el.textContent = String(Math.round(ease * memberCount));
      if (t < 1) requestAnimationFrame(step);
    };
    const timer = setTimeout(() => requestAnimationFrame(step), 1400);
    return () => clearTimeout(timer);
  }, [memberCount]);

  return (
    <>
      {/* ── Hero ── */}
      <section id="top" className="relative bg-navy text-white overflow-hidden flex flex-col" style={{ minHeight: "100vh" }}>
        {/* Field grid */}
        <div className="field-grid absolute inset-0" />
        {/* Red left bar */}
        <div className="absolute left-0 top-0 bottom-0 w-2" style={{ background: "linear-gradient(180deg,#d10024,#a80019)" }} />
        {/* Radial glow */}
        <div className="absolute pointer-events-none" style={{ top: "-10%", right: "20%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(209,0,36,0.12) 0%, transparent 65%)" }} />
        {/* Diamond */}
        <BaseballDiamond />

        {/* Content */}
        <div className="max-w-[1280px] mx-auto px-8 flex-1 flex items-center relative" style={{ paddingTop: 96, paddingBottom: 80, width: "100%" }}>
          <div className="grid gap-10 w-full items-center" style={{ gridTemplateColumns: "1fr auto" }}>

            {/* Left */}
            <div style={{ maxWidth: 680 }}>
              {/* Badge */}
              <div className="hero-badge inline-flex items-center gap-3 bg-red font-display text-xs tracking-[0.4em] uppercase mb-9" style={{ padding: "9px 18px" }}>
                <span className="w-2 h-2 rounded-full bg-white" style={{ animation: "heroPulse 1.8s ease-in-out infinite" }} />
                MEMBER WANTED — メンバー募集中
              </div>

              {/* Headline */}
              <h1 className="font-display font-bold leading-[0.95] tracking-tight mb-8" style={{ fontSize: "clamp(56px,9vw,116px)" }}>
                <span className="block hero-line-1">野球で、</span>
                <span className="block hero-line-2"><span className="text-gold">福岡</span>を、</span>
                <span className="block hero-line-3">熱くする。</span>
              </h1>

              {/* Sub */}
              <div className="hero-sub">
                <div className="font-sans font-black tracking-wide mb-1" style={{ fontSize: "clamp(17px,2vw,22px)" }}>{TEAM_NAME_JP}</div>
                <div className="font-display text-white/38 tracking-[0.28em] mb-9" style={{ fontSize: 11 }}>{TEAM_NAME_EN} — FUKUOKA SANDLOT BASEBALL CLUB</div>
                <p className="text-white/72 leading-[1.9] mb-10" style={{ fontSize: "clamp(14px,1.4vw,17px)", maxWidth: 500 }}>
                  代表も初心者。10代から40代まで、年齢も経験も関係なく、野球を全力で楽しむ仲間を募集中。バットを握ったことがなくても大歓迎です。
                </p>
              </div>

              {/* CTAs */}
              <div className="hero-btns flex flex-wrap gap-3 mb-14">
                <HeroBtn href="#recruit" primary>メンバーに応募する →</HeroBtn>
                <HeroBtn href="#about">チームを知る</HeroBtn>
              </div>

              {/* Stats */}
              <div className="hero-stats flex border-t border-white/8 pt-7">
                <HeroStat unit="名" label="Current Members">
                  <span ref={counterRef}>0</span>
                </HeroStat>
                <HeroStat label="Founded">{FOUNDED}</HeroStat>
                <HeroStat label="Base City">福岡市</HeroStat>
              </div>
            </div>

            {/* Right: logo */}
            <div className="hero-logo hidden md:flex flex-col items-center gap-4">
              <div className="logo-float relative">
                <div className="absolute inset-[-24px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(209,0,36,0.15) 0%, transparent 70%)", animation: "diamondPulse 3s ease-in-out infinite" }} />
                <Image src="/logo.png" alt={TEAM_NAME_JP} width={300} height={300}
                  className="relative object-contain drop-shadow-2xl"
                  style={{ width: "clamp(200px,20vw,300px)", height: "clamp(200px,20vw,300px)" }}
                  priority />
              </div>
              <div className="font-display text-white/30 border border-white/12 tracking-[0.4em] text-[11px]" style={{ padding: "6px 18px" }}>
                EST. {FOUNDED}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/6 py-3.5 relative">
          <div className="max-w-[1280px] mx-auto px-8 flex justify-end items-center gap-5">
            <a href={X_URL} target="_blank" rel="noopener noreferrer"
              className="text-white/35 hover:text-white font-display tracking-[0.15em] text-xs flex items-center gap-1.5 transition-colors" style={{ textDecoration: "none" }}>
              𝕏 @SK_rookies_FK
            </a>
            <span className="w-px h-4 bg-white/12" />
            <a href="#news" className="text-white/35 hover:text-white font-display tracking-[0.15em] text-xs transition-colors" style={{ textDecoration: "none" }}>
              SCROLL ↓
            </a>
          </div>
        </div>
      </section>

      {/* ── Ticker ── */}
      <div className="bg-red text-white overflow-hidden relative" style={{ borderTop: "3px solid #a80019", paddingTop: 8, paddingBottom: 6 }}>
        <StitchDivider />
        <div className="ticker-track mt-1">
          {[...Array(3)].flatMap(() =>
            ["メンバー募集中","初心者大歓迎","道具・防具のご支援歓迎","福岡市拠点","経験者も歓迎",`EST. ${FOUNDED}`,"HAKATA SK ROOKIES"]
          ).map((t, i) => (
            <span key={i} className="font-display tracking-[0.25em] uppercase inline-flex items-center" style={{ fontSize: 14, padding: "0 32px" }}>
              {t}<span className="ml-8 opacity-40 text-xs">⬥</span>
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

/* ── CTA buttons ──────────────────────────────────────── */
function HeroBtn({ href, children, primary = false }: { href: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <a href={href} style={{
      display: "inline-flex", alignItems: "center", padding: "15px 32px",
      background: primary ? "#d10024" : "transparent",
      color: "#fff",
      border: primary ? "2px solid transparent" : "2px solid rgba(255,255,255,0.3)",
      textDecoration: "none",
      fontFamily: "var(--font-zen), sans-serif", fontSize: 15, fontWeight: 700, letterSpacing: "0.1em",
      transition: "all 0.2s",
    }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLAnchorElement;
        if (primary) { el.style.background = "#a80019"; el.style.boxShadow = "0 10px 40px rgba(209,0,36,0.4)"; }
        else          { el.style.borderColor = "#fff"; }
        el.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLAnchorElement;
        if (primary) { el.style.background = "#d10024"; el.style.boxShadow = "none"; }
        else          { el.style.borderColor = "rgba(255,255,255,0.3)"; }
        el.style.transform = "none";
      }}>
      {children}
    </a>
  );
}
