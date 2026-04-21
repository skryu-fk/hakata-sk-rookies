import Image from "next/image";
import Link from "next/link";
import HeroSection from "@/components/HeroSection";
import FaqSection  from "@/components/FaqSection";
import ScrollReveal from "@/components/ScrollReveal";
import RecruitForm  from "@/components/RecruitForm";
import TweetsSection from "@/components/TweetsSection";
import MobileMenu    from "@/components/MobileMenu";
import PracticeCalendar from "@/components/PracticeCalendar";
import { getNews, CATEGORY_STYLES, type NewsItem } from "@/data/news";
import { blogPosts } from "@/data/blog";
import { getPractices, PRACTICE_TYPE_COLOR, type Practice } from "@/data/practices";

/** Googleスプレッドシート（ISR）由来のデータは5分で再検証 */
export const revalidate = 300;

const JIMOTY_URL = "https://jmty.jp/fukuoka/com-spo/article-1okvug";
const LABOLA_URL = "https://labola.jp/recruit/show/AZ2l6St6f3L-ncVW9EwL";

const TEAM_NAME_JP = "博多SKルーキーズ";
const TEAM_NAME_EN  = "HAKATA SK ROOKIES";
const X_URL         = "https://x.com/SK_rookies_FK";
const FOUNDED       = "2026";
const MEMBER_COUNT  = Number(process.env.NEXT_PUBLIC_MEMBER_COUNT ?? 3);

/* ── shared inline styles ─────────────────────────────── */
const S = {
  eyebrow: { fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, letterSpacing: "0.45em", color: "#d10024", textTransform: "uppercase" as const, marginBottom: 10 },
  redBar:  { width: 44, height: 4, background: "#d10024", marginTop: 14, borderRadius: 2 },
};

/* ── XIcon ────────────────────────────────────────────── */
function XIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
      <path d="M18.244 2H21l-6.52 7.45L22.5 22h-6.18l-4.84-6.32L5.91 22H3.15l6.98-7.97L1.5 2h6.34l4.38 5.79L18.244 2z"/>
    </svg>
  );
}

/* ── SectionTitle ─────────────────────────────────────── */
function SectionTitle({ jp, en, light = false }: { jp: string; en: string; light?: boolean }) {
  return (
    <div className="mb-14 reveal" style={{ position: "relative" }}>
      <div className="section-ghost" style={{ fontSize: "clamp(72px,12vw,140px)", color: light ? "rgba(255,255,255,0.04)" : "rgba(11,30,63,0.05)", marginBottom: -18, paddingLeft: 2 }}>
        {en.toUpperCase()}
      </div>
      <div>
        <p style={S.eyebrow}>{en}</p>
        <h2 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: "clamp(26px,3.5vw,42px)", fontWeight: 900, color: light ? "#fff" : "#0b1e3f", lineHeight: 1.1 }}>{jp}</h2>
        <div style={S.redBar} />
      </div>
    </div>
  );
}

/* ── TopBar ───────────────────────────────────────────── */
function TopBar() {
  return (
    <div style={{ background: "#060f20", color: "rgba(255,255,255,0.55)", fontSize: 11, letterSpacing: "0.12em" }}>
      <div className="max-w-[1280px] mx-auto px-8 flex items-center justify-between" style={{ height: 34 }}>
        <span style={{ fontFamily: "var(--font-oswald),sans-serif", letterSpacing: "0.2em" }}>福岡市拠点 — 草野球チーム — EST. {FOUNDED}</span>
        <div className="hidden md:flex items-center gap-5">
          <a href={X_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1.5" style={{ color: "inherit", textDecoration: "none" }}>
            <XIcon size={11} /> 公式X
          </a>
          <span style={{ opacity: 0.2 }}>|</span>
          <a href="#contact" className="hover:text-white transition-colors" style={{ color: "inherit", textDecoration: "none" }}>お問い合わせ</a>
        </div>
      </div>
    </div>
  );
}

/* ── Header ───────────────────────────────────────────── */
function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white" style={{ borderBottom: "3px solid #d10024", boxShadow: "0 1px 0 #e0dcd4" }}>
      <div className="max-w-[1280px] mx-auto px-8 flex items-stretch" style={{ height: 68 }}>
        <Link href="#top" className="flex items-center gap-3 flex-shrink-0 pr-6" style={{ textDecoration: "none", borderRight: "1px solid #f0ece6" }}>
          <Image src="/logo.png" alt={TEAM_NAME_JP} width={48} height={48} className="object-contain" priority />
          <div style={{ lineHeight: 1 }}>
            <div style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 900, fontSize: 16, color: "#0b1e3f", letterSpacing: "0.04em" }}>{TEAM_NAME_JP}</div>
            <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 10, color: "#aaa", letterSpacing: "0.3em", marginTop: 3, textTransform: "uppercase" }}>{TEAM_NAME_EN}</div>
          </div>
        </Link>
        <nav className="ml-auto hidden lg:flex items-stretch h-full">
          {([["#news","お知らせ"],["/blog","ブログ"],["#about","チーム紹介"],["#activity","活動概要"],["#recruit","メンバー募集"],["#support","支援"],["#faq","FAQ"]] as [string,string][]).map(([href,label]) => (
            <a key={href} href={href} className="nav-link">{label}</a>
          ))}
          <a href="#contact" className="nav-link-cta">お問い合わせ</a>
        </nav>
        <div className="lg:hidden ml-auto flex items-stretch">
          <a href="#recruit" className="bg-red text-white flex items-center px-4 font-bold text-sm tracking-wide" style={{ textDecoration: "none" }}>募集</a>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}

/* ── NewsSection ──────────────────────────────────────── */
function NewsSection({ news }: { news: NewsItem[] }) {
  return (
    <section id="news" className="bg-white border-b border-line-2">
      <div className="max-w-[1280px] mx-auto px-5 md:px-8 py-14 md:py-24">
        <SectionTitle jp="お知らせ" en="News" />
        <div>
          {news.map((n, i) => {
            const cs = CATEGORY_STYLES[n.category] as string;
            return (
              <div key={i} className="news-row flex flex-wrap md:grid md:items-center gap-x-6 gap-y-2 px-2 md:px-4 py-4 md:py-5 border-t border-line-2 md:[grid-template-columns:160px_88px_1fr]">
                <span className="order-1" style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 15, color: "#0b1e3f", letterSpacing: "0.06em" }}>{n.date}</span>
                <span className={`order-2 inline-block text-xs font-bold tracking-wider px-2.5 py-1 ${cs}`}>{n.category}</span>
                <span className="order-3 basis-full md:basis-auto font-bold text-ink text-[15px] leading-snug">{n.title}</span>
              </div>
            );
          })}
          <div className="border-t border-line-2" />
        </div>
      </div>
    </section>
  );
}

/* ── BlogPreview ──────────────────────────────────────── */
function BlogPreview() {
  const latest = blogPosts.slice(0, 3);
  if (latest.length === 0) return null;
  return (
    <section id="blog" className="bg-base border-b border-line">
      <div className="max-w-[1280px] mx-auto px-5 md:px-8 py-14 md:py-24">
        <SectionTitle jp="ブログ・コラム" en="Blog" />
        <p className="reveal text-[#5b6373] mb-10 text-[15px] leading-[1.9] max-w-xl" style={{ marginTop: -28 }}>
          チームの考え方、福岡市で草野球を始めたい方向けのお役立ち情報、活動報告など。
        </p>
        <div className="grid gap-5 grid-cols-1 md:grid-cols-3">
          {latest.map((p, i) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="reveal block bg-white border border-line-2 hover:border-red hover:-translate-y-1 hover:shadow-lg transition-all" data-delay={String(i * 120)}
              style={{ textDecoration: "none", padding: "26px 24px", display: "flex", flexDirection: "column", gap: 12, minHeight: 220 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 12, color: "#0b1e3f", letterSpacing: "0.08em" }}>{p.date}</span>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", background: "#d10024", color: "#fff", padding: "3px 9px" }}>{p.category}</span>
              </div>
              <h3 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: 16, fontWeight: 900, color: "#0b1e3f", lineHeight: 1.45 }}>{p.title}</h3>
              <p style={{ fontSize: 13, color: "#5b6373", lineHeight: 1.85, flex: 1 }}>{p.excerpt}</p>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#d10024", letterSpacing: "0.08em" }}>続きを読む →</span>
            </Link>
          ))}
        </div>
        <div className="reveal mt-10 text-center">
          <Link href="/blog" className="hover:bg-red-2 transition-colors" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#0b1e3f", color: "#fff", padding: "12px 28px", textDecoration: "none", fontSize: 13, fontWeight: 700, letterSpacing: "0.1em" }}>
            すべての記事を見る →
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── ScheduleSection ──────────────────────────────────── */
const WEEKDAY_JP = ["日", "月", "火", "水", "木", "金", "土"];
const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  scheduled: { label: "予定", bg: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)" },
  tentative: { label: "未定",  bg: "rgba(212,168,42,0.15)",   color: "#d4a82a" },
  canceled:  { label: "中止",  bg: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" },
};

function UpcomingPractices({ practices }: { practices: Practice[] }) {
  // 文字列比較でJST由来のズレを回避（YYYY-MM-DDはISO昇順=日付昇順）
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const todayISO = jst.toISOString().slice(0, 10);
  const upcoming = [...practices]
    .filter(p => p.date >= todayISO)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  return (
    <div className="reveal" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
      <div style={{ background: "rgba(255,255,255,0.06)", padding: "14px 20px", display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <span style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 700, color: "#fff", fontSize: 13, letterSpacing: "0.12em" }}>近日の練習</span>
        <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.3em" }}>UPCOMING</span>
      </div>
      {upcoming.length === 0 ? (
        <div style={{ padding: "56px 24px", textAlign: "center" }}>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, lineHeight: 1.8 }}>次の練習日は調整中です。<br />決まり次第こちらに掲載します。</p>
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {upcoming.map((p) => {
            const d = new Date(p.date + "T00:00:00");
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            const wd = WEEKDAY_JP[d.getDay()];
            const st = STATUS_STYLE[p.status];
            const dotColor = p.status === "canceled" ? "rgba(255,255,255,0.25)" : PRACTICE_TYPE_COLOR[p.type];
            return (
              <li key={p.date + p.place} style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "flex-start", gap: 14, opacity: p.status === "canceled" ? 0.55 : 1 }}>
                <div style={{ minWidth: 54, textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 22, color: "#fff", lineHeight: 1 }}>{mm}.{dd}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4, letterSpacing: "0.05em" }}>{wd}曜日</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
                    <span style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 700, color: "#fff", fontSize: 14 }}>{p.type === "キャッチボール" ? "公園練習" : p.type}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", background: st.bg, color: st.color, padding: "2px 8px" }}>{st.label}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginBottom: p.note ? 4 : 0 }}>
                    📍 {p.place}{p.time ? ` / ${p.time}` : ""}
                  </div>
                  {p.note && (
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>※ {p.note}</div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>見学希望はX DMまたは<a href="#contact" style={{ color: "#d4a82a", textDecoration: "underline" }}>お問い合わせ</a>から。</p>
      </div>
    </div>
  );
}

function ScheduleSection({ practices }: { practices: Practice[] }) {
  return (
    <section id="schedule" className="bg-navy text-white relative overflow-hidden" style={{ borderBottom: "4px solid #d10024" }}>
      <div className="field-grid absolute inset-0" />
      <div className="max-w-[1280px] mx-auto px-5 md:px-8 py-14 md:py-24 relative">
        <SectionTitle jp="スケジュール" en="Schedule" light />
        <p className="reveal" style={{ color: "rgba(255,255,255,0.65)", fontSize: 14, lineHeight: 1.9, marginTop: -28, marginBottom: 36, maxWidth: 680 }}>
          キャッチボール中心の公園練習は週1〜2回、野球場を借りてのノック・バッティング練習は月3〜4回を予定しています。平日夜・週末どちらも活動あり。毎回参加できなくても問題ありません。
        </p>

        <div className="grid gap-6 mb-10 grid-cols-1 lg:[grid-template-columns:1fr_380px]">
          <PracticeCalendar practices={practices} />
          <UpcomingPractices practices={practices} />
        </div>

        {/* Match notice */}
        <div className="reveal" style={{ background: "rgba(209,0,36,0.08)", border: "1px solid rgba(209,0,36,0.2)", padding: "28px 28px" }}>
          <div className="grid gap-5 items-start grid-cols-1 md:[grid-template-columns:1fr_auto] md:items-center">
            <div>
              <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d4a82a", letterSpacing: "0.4em", marginBottom: 10 }}>MATCH — COMING SOON</p>
              <h3 style={{ fontFamily: "var(--font-zen),sans-serif", color: "#fff", fontSize: "clamp(17px,2.2vw,22px)", fontWeight: 900, lineHeight: 1.4, marginBottom: 8 }}>対戦相手募集は準備中です。</h3>
              <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, lineHeight: 1.8 }}>現在はメンバー集めと道具・防具の準備に専念中。人数が集まり装備が整ったタイミングで、他チーム様との練習試合もお願いしていく予定です。戦績：<span style={{ fontFamily: "var(--font-oswald),sans-serif", color: "rgba(255,255,255,0.85)" }}>0勝 0敗 0分</span></p>
            </div>
            <a href="#recruit" className="bg-red hover:bg-red-2 transition-colors" style={{ display: "inline-flex", alignItems: "center", padding: "12px 24px", color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", whiteSpace: "nowrap" }}>
              メンバー応募はこちら →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── AboutSection ─────────────────────────────────────── */
const STORIES = [
  { no: "01", head: "みんなで教え合う", body: "代表自身も野球初心者。経験者・未経験者がフラットに教え合うスタイルです。「分からない」を気軽に言える空気を大切に。経験者の加入も大歓迎。" },
  { no: "02", head: "全力で楽しむ",     body: "勝ち負けより、まず楽しむこと。声を出して、笑って、汗をかく。それが、俺たちのスタイル。" },
  { no: "03", head: "フラットな空気",   body: "10代から40代までごちゃ混ぜ。年齢も職業も関係なく、グラウンドの上ではみんな対等。" },
];

function AboutSection() {
  return (
    <section id="about" className="bg-white border-b border-line-2">
      <div className="max-w-[1280px] mx-auto px-5 md:px-8 py-14 md:py-24">
        <SectionTitle jp="チーム紹介" en="About" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {STORIES.map((s, i) => (
            <div key={s.no} className="about-card reveal" data-delay={String(i * 120)}
              style={{ padding: "36px 28px", background: "#f9f6f2", border: "1px solid #e4e0d8", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", right: 10, top: 8, fontFamily: "var(--font-oswald),sans-serif", fontSize: 80, fontWeight: 700, color: "rgba(11,30,63,0.05)", lineHeight: 1, userSelect: "none" }}>{s.no}</div>
              <div style={{ width: 4, height: 44, background: "#d10024", marginBottom: 20 }} />
              <p style={S.eyebrow}>POINT {s.no}</p>
              <h3 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: 20, fontWeight: 900, color: "#0b1e3f", marginBottom: 12, lineHeight: 1.3 }}>{s.head}</h3>
              <p style={{ fontSize: 14, color: "rgba(19,25,34,0.68)", lineHeight: 1.9 }}>{s.body}</p>
            </div>
          ))}
        </div>
        {/* Founder */}
        <div className="reveal grid overflow-hidden grid-cols-1 md:[grid-template-columns:200px_1fr]" style={{ background: "#0b1e3f" }}>
          <div style={{ background: "rgba(209,0,36,0.08)", display: "flex", alignItems: "center", justifyContent: "center", padding: 36, borderRight: "1px solid rgba(255,255,255,0.06)" }}>
            <Image src="/logo.png" alt="logo" width={130} height={130} className="object-contain" />
          </div>
          <div className="px-6 py-8 md:px-12 md:py-10">
            <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d4a82a", letterSpacing: "0.4em", marginBottom: 14 }}>代表からのメッセージ</p>
            <p style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: "clamp(16px,2vw,21px)", fontWeight: 700, color: "#fff", lineHeight: 1.6, marginBottom: 14 }}>「未経験だし…」「下手だし…」は気にしないでOK。</p>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.9 }}>代表は19歳。普段はボートレーサーを目指して修行中で、野球も初心者からのスタートです。チームを立ち上げたばかりで、メンバーみんなで作っていくフェーズ。経験者の方は、一緒に教える側として加わってくれると嬉しいです。まずは気軽に応募・質問してください。</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── ActivitySection ──────────────────────────────────── */
const ACTIVITY = [
  { label: "活動エリア", main: "福岡市内のグラウンド",      sub: "市内および近郊の野球場・河川敷を中心に活動予定。" },
  { label: "ホーム球場", main: "山王公園野球場（予定）",    sub: "正式なホーム契約は結んでいませんが、博多区の山王公園野球場をメインに使わせていただく予定です。空き状況によっては市内の別グラウンドでも活動します。" },
  { label: "活動頻度",   main: "週 1〜2回 ＋ 月 3〜4回",    sub: "公園でのキャッチボール練習が週1〜2回、野球場を借りてのノック・バッティング練習が月3〜4回。平日夜・週末どちらも活動あり。参加は出れる時だけでOK。" },
  { label: "練習内容",   main: "基礎練習 + 試合形式",       sub: "キャッチボール・打撃・走塁の基本から、紅白戦・他チームとの練習試合まで。" },
  { label: "費用",       main: "月額 ¥500 + 都度 数百円",   sub: "チーム運営費として月額500円。加えて活動ごとにグラウンド代を割り勘で数百円いただきます。" },
  { label: "装備",       main: "グローブ持参推奨",           sub: "チーム共通の防具はまだ揃っていません。可能な範囲でグローブだけでもご用意ください。バット・ボールはチーム側で準備します。" },
];

function ActivitySection() {
  return (
    <section id="activity" className="bg-base border-b border-line">
      <div className="max-w-[1280px] mx-auto px-5 md:px-8 py-14 md:py-24">
        <SectionTitle jp="活動概要" en="Activity" />
        <div style={{ border: "1px solid #e0dcd4", overflow: "hidden" }}>
          {ACTIVITY.map((row, i) => (
            <div key={row.label} className="activity-row reveal grid grid-cols-1 md:[grid-template-columns:220px_1fr]" data-delay={String(i * 80)}
              style={{ borderBottom: i < ACTIVITY.length - 1 ? "1px solid #e0dcd4" : "none" }}>
              <div className="activity-label flex items-center px-5 md:px-7 py-4 md:py-6" style={{ background: "#0b1e3f", borderLeft: "4px solid #d10024" }}>
                <span style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 700, fontSize: 15, color: "#fff", letterSpacing: "0.06em" }}>{row.label}</span>
              </div>
              <div className="activity-body px-5 md:px-8 py-5 md:py-6" style={{ background: "#fefcfa" }}>
                <p style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: "clamp(16px,2vw,22px)", fontWeight: 900, color: "#0b1e3f", marginBottom: 6 }}>{row.main}</p>
                <p style={{ fontSize: 13, color: "#5b6373", lineHeight: 1.8 }}>{row.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── RecruitSection ───────────────────────────────────── */
const TARGETS = [
  "野球をやってみたい初心者（代表も初心者）",
  "経験者も大歓迎（一緒に教え合える人）",
  "10代〜40代までの男女",
  "福岡市内・近郊に通える人",
  "とにかく元気で、声を出せる人",
  "学生も社会人も、ブランクある人もOK",
];

function RecruitSection() {
  return (
    <section id="recruit" className="bg-white border-b border-line-2 relative overflow-hidden">
      <div style={{ position: "absolute", left: -40, bottom: -60, fontFamily: "var(--font-oswald),sans-serif", fontWeight: 700, fontSize: 500, lineHeight: 1, color: "rgba(11,30,63,0.025)", userSelect: "none", pointerEvents: "none" }}>R</div>
      <div className="max-w-[1280px] mx-auto px-5 md:px-8 py-14 md:py-24">
        <SectionTitle jp="メンバー募集" en="Recruit" />
        <div className="grid gap-10 md:gap-12 items-start grid-cols-1 md:[grid-template-columns:1fr_380px]">
          <div>
            <p className="reveal font-black text-navy mb-6" style={{ fontSize: 19 }}>こんな人を、待っています。</p>
            <div>
              {TARGETS.map((item, i) => (
                <div key={item} className="recruit-row reveal flex items-center gap-5 py-4 px-2 border-b border-line-2" data-delay={String(i * 80)}>
                  <span className="recruit-num font-display font-bold transition-colors" style={{ fontSize: 24, color: "rgba(11,30,63,0.18)", width: 40, flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                  <span className="font-bold text-ink text-[15px] leading-snug flex-1">{item}</span>
                  <span className="recruit-arrow text-red text-lg opacity-0 transition-opacity">→</span>
                </div>
              ))}
            </div>
          </div>
          <div className="reveal sticky" style={{ background: "#f5f2ec", border: "1px solid #e0dcd4", padding: "36px 32px", top: 100 }}>
            <p style={S.eyebrow}>APPLY NOW</p>
            <h3 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: "clamp(20px,2.5vw,26px)", fontWeight: 900, color: "#0b1e3f", lineHeight: 1.3, marginBottom: 28, marginTop: 8 }}>応募はかんたん<br />3ステップ。</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 32 }}>
              {[["1","フォームから連絡","下のフォーム or X DM で応募ください。"],["2","代表から返信","3日以内に詳細をお返しします。"],["3","グラウンドへ","次回の活動に参加してみてください！"]].map(([n,t,d]) => (
                <div key={n} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <div style={{ width: 34, height: 34, background: "#0b1e3f", color: "#fff", display: "grid", placeItems: "center", fontFamily: "var(--font-oswald),sans-serif", fontSize: 17, flexShrink: 0 }}>{n}</div>
                  <div><p style={{ fontWeight: 700, color: "#0b1e3f", fontSize: 14, marginBottom: 2 }}>{t}</p><p style={{ fontSize: 13, color: "#5b6373" }}>{d}</p></div>
                </div>
              ))}
            </div>
            <a href="#contact" className="bg-red hover:bg-red-2 transition-colors" style={{ display: "flex", justifyContent: "center", padding: "14px 28px", color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 700, letterSpacing: "0.1em" }}>
              応募フォームへ →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── SupportSection ───────────────────────────────────── */
function SupportSection() {
  const cards = [
    { eyebrow: "SPONSOR",   eyeColor: "#d10024", title: "スポンサー募集中", body: "福岡の地域店舗・個人スポンサー様を募集しています。ユニフォームへのロゴ掲出、サイト・Xでの紹介、試合当日のPRなど、予算感に合わせてご相談可能です。", items: ["サイトにロゴ＆リンク掲出","公式X（@SK_rookies_FK）で紹介","ユニフォーム・備品へのロゴ掲出（相談）","活動報告での感謝紹介"], red: true },
    { eyebrow: "EQUIPMENT", eyeColor: "#d4a82a", title: "道具のお裾分け歓迎", body: "もしご自宅に使っていないボール・バット・ベース・防具などがあれば、チームに譲っていただけると大変助かります。「ちょうど処分しようと思ってた」くらいの気軽さで大丈夫です。", items: ["軟式ボール（使用済みでもOK）","バット（子ども用〜大人用まで）","ベース・塁間マーカー","ヘルメット・キャッチャー防具","古くなったグローブ（練習用に）"], red: false },
  ];
  return (
    <section id="support" className="bg-navy text-white relative overflow-hidden">
      <div className="field-grid absolute inset-0" />
      <div className="max-w-[1280px] mx-auto px-5 md:px-8 py-14 md:py-24 relative">
        <SectionTitle jp="支援のお願い" en="Support" light />
        <p className="reveal text-white/60 mb-12 text-[15px] leading-[1.9] max-w-lg" style={{ marginTop: -28 }}>立ち上がったばかりのチームです。道具や活動資金、応援の輪、どんな形でも支えていただけると大変助かります。</p>
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
          {cards.map((c, i) => (
            <div key={c.title} className="support-card reveal" data-delay={String(i * 160)}
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)", padding: "36px 32px" }}>
              <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: c.eyeColor, letterSpacing: "0.4em", marginBottom: 14 }}>{c.eyebrow}</p>
              <h3 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: "clamp(18px,2vw,24px)", fontWeight: 900, color: "#fff", marginBottom: 16, lineHeight: 1.3 }}>{c.title}</h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.9, marginBottom: 20 }}>{c.body}</p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column", gap: 8 }}>
                {c.items.map(item => <li key={item} style={{ display: "flex", gap: 10, fontSize: 13, color: "rgba(255,255,255,0.65)" }}><span style={{ color: c.eyeColor, flexShrink: 0 }}>⬥</span>{item}</li>)}
              </ul>
              <a href="#contact" className={c.red ? "bg-red hover:bg-red-2 transition-colors" : "bg-transparent border border-white/30 hover:border-white/70 transition-colors"} style={{ display: "inline-flex", alignItems: "center", padding: "12px 24px", color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 700, letterSpacing: "0.1em" }}>
                {c.red ? "スポンサーのご相談はこちら →" : "道具支援のご相談はこちら →"}
              </a>
            </div>
          ))}
        </div>
        <p className="reveal text-center text-white/35 text-sm mt-10">ご支援いただいた方はサイト・Xで感謝とともにご紹介させていただきます</p>
      </div>
    </section>
  );
}

/* ── ContactSection ───────────────────────────────────── */
function ContactSection() {
  return (
    <section id="contact" className="bg-white border-b border-line-2">
      <div className="max-w-[1280px] mx-auto px-5 md:px-8 py-14 md:py-24">
        <SectionTitle jp="お問い合わせ" en="Contact" />
        <div className="grid gap-10 items-start grid-cols-1 md:[grid-template-columns:300px_1fr]">
          <div>
            <p className="reveal text-[14px] leading-[1.9] mb-5" style={{ color: "#3a3f4a" }}>
              下記フォームから、応募・質問・<a href="#support" className="text-red font-bold">スポンサー</a>・<a href="#support" className="text-red font-bold">道具の支援</a>などを受け付けています。3日以内に返信します。
            </p>
            <div className="reveal mb-4 text-[13px] leading-[1.8]" style={{ background: "#f5f2ec", borderLeft: "4px solid #d10024", padding: "16px 20px", color: "#3a3f4a" }}>
              <p className="font-bold text-navy mb-1">お気軽にどうぞ</p>
              女性はプレイヤーでもマネージャーでも歓迎。代表は19歳ですが年齢差はまったく気にしていません。
            </div>
            {[["SNS", <a key="x" href={X_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-bold text-navy hover:text-red transition-colors text-[15px]" style={{ textDecoration: "none" }}><XIcon size={14}/> @SK_rookies_FK</a>, "最新情報・活動報告はXで発信中。"],
              ["JIMOTY", <a key="j" href={JIMOTY_URL} target="_blank" rel="noopener noreferrer" className="font-bold text-navy hover:text-red transition-colors text-[15px]" style={{ textDecoration: "none" }}>ジモティーの募集ページ →</a>, "地域コミュニティでも募集中。"],
              ["LABOLA", <a key="l" href={LABOLA_URL} target="_blank" rel="noopener noreferrer" className="font-bold text-navy hover:text-red transition-colors text-[15px]" style={{ textDecoration: "none" }}>Labolaの募集ページ →</a>, "草野球マッチングサイトでも募集中。"],
              ["RESPONSE", <p key="r" className="font-bold text-navy text-[15px]">原則3日以内に返信</p>, "返信が遅い場合はDMください。"]
            ].map(([eyebrow, content, sub]) => (
              <div key={String(eyebrow)} className="reveal mb-3" style={{ background: "#f5f2ec", border: "1px solid #e0dcd4", padding: "16px 20px" }}>
                <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 10, color: "#d10024", letterSpacing: "0.4em", marginBottom: 10 }}>{eyebrow}</p>
                {content}
                <p className="text-[12px] text-muted mt-1.5">{sub}</p>
              </div>
            ))}
          </div>
          <div className="reveal reveal-right"><RecruitForm /></div>
        </div>
      </div>
    </section>
  );
}

/* ── Footer ───────────────────────────────────────────── */
function Footer() {
  return (
    <footer style={{ background: "#060f20", color: "#fff" }}>
      <div style={{ height: 4, background: "linear-gradient(90deg,#d10024,#a80019 50%,#d10024)" }} />
      <div className="max-w-[1280px] mx-auto px-5 md:px-8" style={{ paddingTop: 48, paddingBottom: 32 }}>
        <div className="grid gap-10 md:gap-12 pb-10 grid-cols-1 md:[grid-template-columns:1fr_160px_220px]" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <div className="flex items-center gap-4 mb-4">
              <Image src="/logo.png" alt={TEAM_NAME_JP} width={54} height={54} className="object-contain" />
              <div>
                <p style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 900, fontSize: 16, letterSpacing: "0.04em" }}>{TEAM_NAME_JP}</p>
                <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.3em", marginTop: 3 }}>{TEAM_NAME_EN}</p>
              </div>
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.85, maxWidth: 340 }}>福岡市を拠点に活動する、初心者中心の草野球チーム。一緒に野球を楽しむ仲間を募集中です。</p>
          </div>
          <div>
            <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d4a82a", letterSpacing: "0.4em", marginBottom: 20 }}>MENU</p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {[["#news","お知らせ"],["/blog","ブログ"],["#about","チーム紹介"],["#activity","活動概要"],["#recruit","メンバー募集"],["#contact","お問い合わせ"]].map(([h,l]) => (
                <li key={h}><a href={h} className="hover:text-red transition-colors text-[13px]" style={{ color: "rgba(255,255,255,0.45)", textDecoration: "none" }}>{l}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d4a82a", letterSpacing: "0.4em", marginBottom: 20 }}>TEAM INFO</p>
            <dl style={{ display: "flex", flexDirection: "column", gap: 10, margin: 0 }}>
              {[["拠点","福岡市"],["本拠地","山王公園野球場（予定）"],["設立",`${FOUNDED}年`],["代表","柏木 海斗（19歳 / ボートレーサー志望）"],["対象","10代〜40代 / 初心者中心"]].map(([l,v]) => (
                <div key={l} style={{ display: "flex", gap: 12 }}>
                  <dt style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", width: 38, flexShrink: 0 }}>{l}</dt>
                  <dd style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>{v}</dd>
                </div>
              ))}
            </dl>
            <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 8 }}>
              <a href={X_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white hover:border-white/50 transition-all" style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid rgba(255,255,255,0.15)", padding: "8px 14px", color: "rgba(255,255,255,0.5)", textDecoration: "none", fontSize: 12 }}>
                <XIcon size={12} /> 公式X
              </a>
              <a href={JIMOTY_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white hover:border-white/50 transition-all" style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid rgba(255,255,255,0.15)", padding: "8px 14px", color: "rgba(255,255,255,0.5)", textDecoration: "none", fontSize: 12 }}>
                ジモティー
              </a>
              <a href={LABOLA_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white hover:border-white/50 transition-all" style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid rgba(255,255,255,0.15)", padding: "8px 14px", color: "rgba(255,255,255,0.5)", textDecoration: "none", fontSize: 12 }}>
                Labola
              </a>
            </div>
          </div>
        </div>
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 pt-6 text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>
          <span>© {new Date().getFullYear()} {TEAM_NAME_JP} / {TEAM_NAME_EN}. All rights reserved.</span>
          <span style={{ fontFamily: "var(--font-oswald),sans-serif", letterSpacing: "0.3em" }}>FUKUOKA — EST. {FOUNDED}</span>
        </div>
      </div>
    </footer>
  );
}

/* ── Page ─────────────────────────────────────────────── */
export default async function Home() {
  const [news, practices] = await Promise.all([getNews(), getPractices()]);
  return (
    <>
      <ScrollReveal />
      <TopBar />
      <Header />
      <main>
        <HeroSection memberCount={MEMBER_COUNT} />
        <NewsSection news={news} />
        <TweetsSection />
        <ScheduleSection practices={practices} />
        <AboutSection />
        <ActivitySection />
        <RecruitSection />
        <SupportSection />
        <FaqSection />
        <BlogPreview />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
