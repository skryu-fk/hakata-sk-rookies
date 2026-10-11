"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { Game } from "@/data/games";

/**
 * 月別の日程・結果
 *
 * プロ野球の公式サイトにある「日程・結果」の月別一覧を、
 * 博多SKルーキーズ版として作ったもの。年・月で切り替えて、
 * 行を開くとその試合の詳しい内容が出る、という形まで本家に寄せている。
 *
 * 中身は管理画面の「スコアボード」で記録した自分たちの試合データ。
 * 勝敗(分) はその試合を終えた時点での通算成績を出している。
 */

const RED = "#d10024";
const NAVY = "#0b1e3f";

function sum(v: number[]): number {
  return v.reduce((a, b) => a + b, 0);
}

type Outcome = "win" | "lose" | "draw";

function outcomeOf(g: Game): Outcome {
  const h = sum(g.homeScores);
  const a = sum(g.awayScores);
  return h > a ? "win" : h < a ? "lose" : "draw";
}

const OUTCOME_LABEL: Record<Outcome, string> = { win: "勝", lose: "敗", draw: "分" };
const OUTCOME_COLOR: Record<Outcome, string> = { win: RED, lose: "#5b6373", draw: "#8a8a8a" };

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

function weekdayOf(iso: string): string {
  return WEEK[new Date(`${iso}T00:00:00+09:00`).getDay()] ?? "";
}

export default function GameResults({ games, focusDate = "" }: { games: Game[]; focusDate?: string }) {
  // スケジュールから来たときは、その試合の月を開いて、その行を開いた状態にする
  const focused = focusDate ? games.find(g => g.date === focusDate) : undefined;
  /** その試合を終えた時点での通算成績。古い順に数える必要があるので一度だけ作る */
  const recordAt = useMemo(() => {
    const asc = [...games].sort((a, b) => a.date.localeCompare(b.date));
    const map = new Map<string, { w: number; l: number; d: number }>();
    let w = 0, l = 0, d = 0;
    for (const g of asc) {
      // まだ終わっていない試合（開始前・試合中）は戦績に入れない
      if (g.status === "live" || g.status === "scheduled") continue;
      const o = outcomeOf(g);
      if (o === "win") w++; else if (o === "lose") l++; else d++;
      map.set(g.id || g.date, { w, l, d });
    }
    return map;
  }, [games]);

  /** 試合がある年・月だけを選べるようにする */
  const years = useMemo(
    () => [...new Set(games.map(g => g.date.slice(0, 4)))].sort((a, b) => b.localeCompare(a)),
    [games],
  );
  const [year, setYear] = useState(() => focused?.date.slice(0, 4) ?? years[0] ?? String(new Date().getFullYear()));

  const monthsOfYear = useMemo(
    () => [...new Set(games.filter(g => g.date.startsWith(year)).map(g => g.date.slice(5, 7)))]
      .sort((a, b) => b.localeCompare(a)),
    [games, year],
  );
  const [month, setMonth] = useState(() => focused?.date.slice(5, 7) ?? games[0]?.date.slice(5, 7) ?? "");

  // 年を変えたとき、その年に無い月が選ばれたままにならないようにする
  const activeMonth = monthsOfYear.includes(month) ? month : (monthsOfYear[0] ?? "");

  const shown = useMemo(
    () => games.filter(g => g.date.slice(0, 4) === year && g.date.slice(5, 7) === activeMonth),
    [games, year, activeMonth],
  );

  // 本家と同じく、最新の1件だけ開いた状態で出す
  const [open, setOpen] = useState<string | null>(
    focused ? (focused.id || focused.date) : (games[0]?.id || games[0]?.date || null),
  );

  return (
    <div>
      {/* 年月の見出しと切り替え */}
      <div className="flex flex-wrap items-center justify-between gap-4" style={{ marginBottom: 10 }}>
        <h3 style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 900, color: NAVY, fontSize: "clamp(26px,4vw,38px)", lineHeight: 1 }}>
          {year}<span style={{ fontSize: "0.5em", margin: "0 6px 0 2px" }}>年</span>
          {activeMonth ? Number(activeMonth) : "–"}<span style={{ fontSize: "0.5em", marginLeft: 2 }}>月</span>
        </h3>
        <div style={{ display: "flex", gap: 8 }}>
          <Select value={year} onChange={setYear} options={years.map(y => ({ value: y, label: `${y}年` }))} />
          <Select
            value={activeMonth}
            onChange={setMonth}
            options={monthsOfYear.map(m => ({ value: m, label: `${Number(m)}月` }))}
          />
        </div>
      </div>

      <div style={{ borderTop: "1px solid #d8d4cb" }}>
        {shown.length === 0 && (
          <p style={{ padding: "32px 4px", color: "#5b6373", fontSize: 14 }}>
            この月の試合はまだありません。
          </p>
        )}
        {shown.map(g => {
          const key = g.id || g.date;
          const o = outcomeOf(g);
          const rec = recordAt.get(key);
          const isOpen = open === key;
          return (
            <div key={key} style={{ borderBottom: "1px solid #d8d4cb" }}>
              {/* 見出しの行 */}
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : key)}
                className="w-full text-left"
                style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 4px", background: "transparent", border: "none", cursor: "pointer" }}
              >
                <span style={{ width: 34, flexShrink: 0, textAlign: "center" }}>
                  <span style={{ display: "block", fontFamily: "var(--font-oswald),sans-serif", fontSize: 21, fontWeight: 700, color: NAVY, lineHeight: 1 }}>
                    {g.date.slice(8, 10)}
                  </span>
                  <span style={{ display: "block", fontSize: 11, color: "#5b6373", marginTop: 2 }}>
                    {weekdayOf(g.date)}
                  </span>
                </span>
                <Image src="/sk_mark.png" alt="" width={82} height={46} aria-hidden
                  style={{ width: 30, height: "auto", objectFit: "contain", flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    {g.time && (
                      <span style={{ fontSize: 13, color: NAVY, fontWeight: 700 }}>{g.time}開始</span>
                    )}
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: g.status === "live" ? "#d10024" : g.status === "scheduled" ? "#4a6fa5" : OUTCOME_COLOR[o], padding: "2px 8px" }}>
                      {g.status === "live" ? `試合中${g.inning ? ` ${g.inning}` : ""}`
                        : g.status === "scheduled" ? "試合開始前" : "試合終了"}
                    </span>
                    {g.status === "scheduled" ? (
                      <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 15, fontWeight: 700, color: "#4a6fa5" }}>
                        {g.startTime || "時刻未定"}
                      </span>
                    ) : (
                      <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 17, fontWeight: 700, color: NAVY }}>
                        {sum(g.homeScores)}-{sum(g.awayScores)}
                      </span>
                    )}
                    {g.status !== "live" && g.status !== "scheduled" && (
                      <span style={{ fontSize: 12, fontWeight: 700, color: OUTCOME_COLOR[o] }}>
                        {OUTCOME_LABEL[o]}
                      </span>
                    )}
                  </span>
                  <span style={{ display: "block", fontSize: 12.5, color: "#5b6373", marginTop: 3 }}>
                    vs {g.awayTeam}{g.place ? ` ／ ${g.place}` : ""}
                  </span>
                </span>
                <span aria-hidden style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 20, color: "#9a9a9a", flexShrink: 0, width: 20, textAlign: "center" }}>
                  {isOpen ? "−" : "＋"}
                </span>
              </button>

              {/* 開いたときの詳細 */}
              {isOpen && (
                <div className="grid gap-5 grid-cols-1 md:[grid-template-columns:260px_1fr]" style={{ paddingBottom: 22 }}>
                  {/* 結果カード */}
                  <div style={{ background: "#f5f2ec", border: "1px solid #e0dcd4", padding: "18px 16px", textAlign: "center" }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: g.status === "live" ? "#d10024" : g.status === "scheduled" ? "#4a6fa5" : "#5b6373", marginBottom: 12 }}>
                      {g.status === "live" ? "試合中" : g.status === "scheduled" ? "試合開始前" : "試合終了"}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 10 }}>
                      <Image src="/sk_mark.png" alt={g.homeTeam} width={82} height={46}
                        style={{ width: 40, height: "auto", objectFit: "contain" }} />
                      <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: g.status === "scheduled" ? 20 : 30, fontWeight: 700, color: g.status === "scheduled" ? "#4a6fa5" : NAVY, whiteSpace: "nowrap" }}>
                        {g.status === "scheduled"
                          ? (g.startTime || "時刻未定")
                          : <>{sum(g.homeScores)}<span style={{ color: "#b8b2a6", margin: "0 7px" }}>-</span>{sum(g.awayScores)}</>}
                      </span>
                      <span style={{ width: 40, fontSize: 10, fontWeight: 700, color: "#8a8a8a", lineHeight: 1.35 }}>
                        {g.awayTeam}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: "#5b6373", marginBottom: g.tweetUrl ? 14 : 0 }}>
                      {g.place || "球場未登録"}
                    </p>
                    {g.tweetUrl && (
                      <a href={g.tweetUrl} target="_blank" rel="noopener noreferrer"
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: NAVY, color: "#fff", textDecoration: "none", fontSize: 12, fontWeight: 700, padding: "10px 12px" }}>
                        𝕏 当日の投稿を見る
                      </a>
                    )}
                  </div>

                  {/* 内容 */}
                  <dl style={{ margin: 0, fontSize: 13.5 }}>
                    {rec && (
                      <Row label="勝敗（分）">
                        <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 15, color: NAVY, fontWeight: 700 }}>
                          {rec.w}-{rec.l}{rec.d > 0 ? `-${rec.d}` : ""}
                        </span>
                        <span style={{ color: "#8a8a8a", fontSize: 12, marginLeft: 8 }}>この試合を終えた時点</span>
                      </Row>
                    )}
                    {g.starter && (
                      <Row label="先発"><span style={{ color: RED, fontWeight: 700 }}>{g.starter}</span></Row>
                    )}
                    {/* 名前を出さない設定のときは、誰が打ったかではなく本数だけ出す */}
                    {g.homeRuns.length > 0 ? (
                      <Row label="本塁打">
                        <span style={{ display: "inline-flex", flexWrap: "wrap", gap: "4px 14px" }}>
                          {g.homeRuns.map(h => (
                            <span key={h} style={{ color: RED, fontWeight: 700 }}>{h}</span>
                          ))}
                        </span>
                      </Row>
                    ) : g.homeRunCount > 0 ? (
                      <Row label="本塁打">
                        <span style={{ fontFamily: "var(--font-oswald),sans-serif", color: RED, fontWeight: 700, fontSize: 15 }}>
                          {g.homeRunCount}
                        </span>
                        <span style={{ color: RED, fontWeight: 700, marginLeft: 2 }}>本</span>
                      </Row>
                    ) : null}
                    {g.status !== "scheduled" && (
                    <Row label="安打／失策">
                      <span style={{ fontFamily: "var(--font-oswald),sans-serif", color: NAVY }}>
                        {g.homeHits}安 {g.homeErrors}失
                      </span>
                      <span style={{ color: "#8a8a8a", fontSize: 12, marginLeft: 10 }}>
                        相手 {g.awayHits}安 {g.awayErrors}失
                      </span>
                    </Row>
                    )}
                    {g.note && <Row label="メモ"><span style={{ color: "#3a3f4a" }}>{g.note}</span></Row>}
                  </dl>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 14, padding: "9px 0", borderBottom: "1px solid #ece8e0", flexWrap: "wrap" }}>
      <dt style={{ width: 86, flexShrink: 0, fontSize: 12, fontWeight: 700, color: "#5b6373", paddingTop: 2 }}>{label}</dt>
      <dd style={{ margin: 0, flex: 1, minWidth: 180, lineHeight: 1.8 }}>{children}</dd>
    </div>
  );
}

function Select({
  value, onChange, options,
}: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        border: "1px solid #d8d4cb", background: "#fff", color: NAVY,
        fontFamily: "var(--font-zen),sans-serif", fontSize: 13, fontWeight: 700,
        padding: "8px 12px", cursor: "pointer",
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
