import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Scoreboard, { type ScoreboardData } from "@/components/Scoreboard";
import GameResults from "@/components/GameResults";
import { RecruitStatusStrip } from "@/components/RecruitStatus";
import { RECRUIT_OPEN } from "@/data/recruit";
import { getGames, record } from "@/data/games";
import { getPractices } from "@/data/practices";

const TEAM_NAME_JP = "博多SKルーキーズ";
const TEAM_NAME_EN = "HAKATA SK ROOKIES";

// シート由来データなので 5 分の ISR で再検証
export const revalidate = 300;

export const metadata: Metadata = {
  title: "試合結果・日程 | 博多SKルーキーズ",
  description:
    "福岡市の草野球チーム『博多SKルーキーズ』の試合結果と日程。回ごとのスコアボード、月別の戦績、通算成績を掲載しています。",
  alternates: { canonical: "/games" },
};

/** 日本時間の今日（YYYY-MM-DD） */
function todayJst(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default async function GamesPage() {
  const [games, practices] = await Promise.all([getGames(), getPractices()]);
  const r = record(games);

  // 次の試合が決まっていればそれを、無ければ直近の試合結果をスコアボードに出す
  const today = todayJst();
  const next = practices
    .filter(p => (p.type === "試合" || p.type === "練習試合") && p.date >= today && p.status !== "canceled")
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const latest = games[0];

  const board: ScoreboardData | null = next
    ? {
        date: next.date,
        time: next.time?.split(/[〜~-]/)[0]?.trim(),
        place: next.place,
        homeTeam: TEAM_NAME_JP,
        awayTeam: "対戦相手",
        result: null,
        label: `${next.type}・次の試合`,
      }
    : latest
      ? {
          date: latest.date,
          time: latest.time,
          place: latest.place,
          homeTeam: latest.homeTeam,
          awayTeam: latest.awayTeam,
          result: {
            homeScores: latest.homeScores,
            awayScores: latest.awayScores,
            homeHits: latest.homeHits,
            awayHits: latest.awayHits,
            homeErrors: latest.homeErrors,
            awayErrors: latest.awayErrors,
          },
        }
      : null;

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white" style={{ borderBottom: "3px solid #d10024", boxShadow: "0 1px 0 #e0dcd4" }}>
        <div className="max-w-[1280px] mx-auto px-5 md:px-8 flex items-stretch" style={{ height: 68 }}>
          <Link href="/" className="flex items-center gap-3 flex-shrink-0 pr-4 md:pr-6" style={{ textDecoration: "none", borderRight: "1px solid #f0ece6" }}>
            <Image src="/sk_logo_crop.png" alt="" width={44} height={36} className="object-contain" priority />
            <div style={{ lineHeight: 1, display: "flex", flexDirection: "column", gap: 5 }}>
              <Image src="/hksk_logo_crop.png" alt={TEAM_NAME_JP} width={192} height={24} className="object-contain" style={{ width: "clamp(140px, 22vw, 192px)", height: "auto" }} />
              <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 9, color: "#aaa", letterSpacing: "0.3em" }}>{TEAM_NAME_EN}</div>
            </div>
          </Link>
          <Link href="/" className="ml-auto flex items-center font-bold text-[13px] text-navy hover:text-red transition-colors" style={{ textDecoration: "none" }}>
            ← トップへ戻る
          </Link>
        </div>
      </header>
      {!RECRUIT_OPEN && <RecruitStatusStrip />}

      <main className="bg-white">
        {/* Hero */}
        <section className="bg-navy text-white relative overflow-hidden" style={{ borderBottom: "4px solid #d10024" }}>
          <div className="field-grid absolute inset-0" />
          <div className="max-w-[1080px] mx-auto px-5 md:px-8 py-12 md:py-16 relative">
            <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d10024", letterSpacing: "0.45em", marginBottom: 10 }}>GAMES</p>
            <h1 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: "clamp(28px,4vw,42px)", fontWeight: 900, lineHeight: 1.2 }}>
              試合結果・日程
            </h1>
            <p className="mt-5 text-white/65 text-[14px] leading-[1.9] max-w-2xl">
              回ごとのスコアと、月別の戦績です。記録した試合がそのまま反映されます。
            </p>
            <div style={{ display: "flex", gap: 26, marginTop: 24, flexWrap: "wrap" }}>
              <Stat label="WIN" value={r.win} color="#d4a82a" />
              <Stat label="LOSE" value={r.lose} />
              <Stat label="DRAW" value={r.draw} />
              <Stat label="GAMES" value={games.length} />
            </div>
          </div>
        </section>

        {/* スコアボード */}
        <section className="max-w-[1080px] mx-auto px-5 md:px-8" style={{ paddingTop: 40, paddingBottom: 40 }}>
          {board ? (
            <Scoreboard data={board} />
          ) : (
            <p style={{ color: "#5b6373", fontSize: 14, lineHeight: 1.9 }}>
              まだ試合を記録していません。管理画面の「スコアボード」で試合を記録すると、ここに出ます。
            </p>
          )}
        </section>

        {/* 月別の日程・結果 */}
        {games.length > 0 && (
          <section className="max-w-[1080px] mx-auto px-5 md:px-8" style={{ paddingBottom: 70 }}>
            <GameResults games={games} />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer style={{ background: "#060f20", color: "rgba(255,255,255,0.45)" }}>
        <div style={{ height: 4, background: "linear-gradient(90deg,#d10024,#a80019 50%,#d10024)" }} />
        <div className="max-w-[1280px] mx-auto px-5 md:px-8 flex flex-wrap items-center gap-5" style={{ paddingTop: 26, paddingBottom: 26, fontSize: 12.5 }}>
          <Link href="/" style={{ color: "#fff", fontWeight: 700, textDecoration: "none" }}>← トップへ戻る</Link>
          <span style={{ opacity: 0.3 }}>|</span>
          <Link href="/news" style={{ color: "inherit", textDecoration: "none" }}>お知らせ</Link>
          <Link href="/blog" style={{ color: "inherit", textDecoration: "none" }}>ブログ</Link>
          <span className="ml-auto" style={{ fontFamily: "var(--font-oswald),sans-serif", letterSpacing: "0.2em", fontSize: 11 }}>
            © {new Date().getFullYear()} {TEAM_NAME_EN}
          </span>
        </div>
      </footer>
    </>
  );
}

function Stat({ label, value, color = "#fff" }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 30, fontWeight: 700, color, lineHeight: 1 }}>{value}</p>
      <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 10, letterSpacing: "0.3em", color: "rgba(255,255,255,0.4)", marginTop: 6 }}>{label}</p>
    </div>
  );
}
