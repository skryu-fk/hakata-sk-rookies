/**
 * スコアボード
 *
 * プロ野球の公式サイトにある「試合トップ」のスコアボードを、
 * 博多SKルーキーズ版として作ったもの。見た目は本家に寄せつつ、
 * 中身は管理画面の「スコアボード」で記録した自分たちの試合データ。
 *
 * 試合前（result が null）は「試合開始 ○○:○○」、
 * 試合後は大きくスコアを出す、という本家と同じ出し分けをしている。
 */

import Image from "next/image";
import ScoreboardRefresh from "./ScoreboardRefresh";

export type ScoreboardData = {
  /** ISO date "YYYY-MM-DD" */
  date: string;
  time?: string;
  place?: string;
  /** 自チーム（ホーム＝下段） */
  homeTeam: string;
  /** 相手（ビジター＝上段） */
  awayTeam: string;
  /** 試合前は null */
  result: {
    homeScores: number[];
    awayScores: number[];
    homeHits: number;
    awayHits: number;
    homeErrors: number;
    awayErrors: number;
  } | null;
  /** 中央上に出る小さな見出し。本家でいうリーグ名の位置 */
  label?: string;
  /** 自チームがホームだったか。false なら自チームが上段（先攻）になる */
  isHome?: boolean;
  /** アプリで記録中。true なら「試合中」と回を出す */
  live?: boolean;
  /** ライブ中の回。例 "3回表" */
  inning?: string;
  /** 相手のロゴ（opponents に登録があるときだけ） */
  awayLogo?: string;
};

const GOLD = "#d4a82a";

/** 回の数。9回を基本に、延長したぶんだけ12回まで伸ばす */
function inningCount(d: ScoreboardData): number {
  const played = Math.max(d.result?.homeScores.length ?? 0, d.result?.awayScores.length ?? 0);
  return Math.min(12, Math.max(9, played));
}

function sum(v: number[]): number {
  return v.reduce((a, b) => a + b, 0);
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  const week = ["日", "月", "火", "水", "木", "金", "土"][new Date(`${iso}T00:00:00+09:00`).getDay()] ?? "";
  return `${y}.${m}.${d}（${week}）`;
}

export default function Scoreboard({ data }: { data: ScoreboardData }) {
  const innings = inningCount(data);
  const r = data.result;
  // ビジターが先攻＝上段、ホームが後攻＝下段。野球のスコアボードの約束。
  const weAreHome = data.isHome !== false;
  const homeTotal = r ? sum(r.homeScores) : 0;
  const awayTotal = r ? sum(r.awayScores) : 0;

  return (
    <div>
      {/* タブ */}
      <div style={{ display: "flex", alignItems: "flex-end" }}>
        <span style={{ background: GOLD, color: "#0b1e3f", fontFamily: "var(--font-zen),sans-serif", fontWeight: 900, fontSize: 14, letterSpacing: "0.1em", padding: "13px 40px" }}>
          試合トップ
        </span>
      </div>
      <div style={{ height: 3, background: GOLD, marginBottom: 18 }} />

      {/* 本体 */}
      <div style={{ background: "#141414", padding: "26px 20px 30px", position: "relative" }}>
        {/* 更新ボタンはパネルの右上に置く（チーム枠と重ならないように外に出している） */}
        <div className="sb-refresh">
          <ScoreboardRefresh />
        </div>

        {/* 上段：ホーム / 状況 / ビジター */}
        <div style={{ maxWidth: 820, margin: "0 auto", paddingTop: 10 }}>
          <div className="grid items-start" style={{ gridTemplateColumns: "1fr minmax(0,1.3fr) 1fr", gap: 10 }}>
            {/* 左の枠。ホームのチームを出す（自分たちがビジターなら相手） */}
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "#fff", fontSize: 13, fontWeight: 700, marginBottom: 12 }}>ホーム</p>
              {weAreHome
                ? <TeamBox name={data.homeTeam} ourLogo />
                : <TeamBox name={data.awayTeam} logoUrl={data.awayLogo} />}
            </div>

            {/* 中央 */}
            <div style={{ textAlign: "center", paddingTop: 2 }}>
              <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 12.5, marginBottom: 14 }}>
                {data.label ?? formatDate(data.date)}
              </p>
              {r ? (
                <>
                  <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontWeight: 700, color: "#fff", fontSize: "clamp(34px,6vw,52px)", lineHeight: 1 }}>
                    {/* 左の枠＝ホーム、右の枠＝ビジターの順に合わせる */}
                    {weAreHome ? homeTotal : awayTotal}
                    <span style={{ color: "rgba(255,255,255,0.4)", margin: "0 12px" }}>-</span>
                    {weAreHome ? awayTotal : homeTotal}
                  </p>
                  {data.live ? (
                    <p style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "#ff4d4d", fontSize: 15, fontWeight: 700, marginTop: 10 }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#ff4d4d", display: "inline-block" }} />
                      試合中{data.inning ? ` ${data.inning}` : ""}
                    </p>
                  ) : (
                    <p style={{ color: GOLD, fontSize: 15, fontWeight: 700, marginTop: 10 }}>試合終了</p>
                  )}
                </>
              ) : (
                <>
                  <p style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 900, color: "#fff", fontSize: "clamp(26px,4.4vw,40px)", lineHeight: 1.2 }}>
                    試合開始
                  </p>
                  <p style={{ fontFamily: "var(--font-oswald),sans-serif", color: "#fff", fontSize: "clamp(18px,2.6vw,26px)", marginTop: 4 }}>
                    {data.time || "時刻未定"}
                  </p>
                </>
              )}
            </div>

            {/* 右の枠。ビジターのチームを出す */}
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "#fff", fontSize: 13, fontWeight: 700, marginBottom: 12 }}>ビジター</p>
              {weAreHome
                ? <TeamBox name={data.awayTeam} logoUrl={data.awayLogo} />
                : <TeamBox name={data.homeTeam} ourLogo />}
            </div>
          </div>

          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 18 }}>
            {data.place || "球場調整中"}
          </p>
        </div>

        {/* 回別スコア */}
        <div style={{ overflowX: "auto", marginTop: 22 }}>
          <table style={{ borderCollapse: "collapse", margin: "0 auto", minWidth: 520, width: "100%", maxWidth: 840 }}>
            <thead>
              <tr>
                <th style={{ ...cell, width: 62, background: "#000" }} />
                {Array.from({ length: innings }, (_, i) => (
                  <th key={i} style={{ ...cell, ...headCell }}>{i + 1}</th>
                ))}
                <th style={{ ...cell, ...headCell, background: "#8a8a8a", color: "#fff" }}>R</th>
                <th style={{ ...cell, ...headCell }}>H</th>
                <th style={{ ...cell, ...headCell }}>E</th>
              </tr>
            </thead>
            <tbody>
              {/* 先攻（ビジター）が上、後攻（ホーム）が下 */}
              {(weAreHome
                ? [
                    { key: "away", label: data.awayTeam, scores: r?.awayScores ?? [], runs: r ? awayTotal : 0, hits: r?.awayHits ?? 0, errors: r?.awayErrors ?? 0, ours: false },
                    { key: "home", label: data.homeTeam, scores: r?.homeScores ?? [], runs: r ? homeTotal : 0, hits: r?.homeHits ?? 0, errors: r?.homeErrors ?? 0, ours: true },
                  ]
                : [
                    { key: "home", label: data.homeTeam, scores: r?.homeScores ?? [], runs: r ? homeTotal : 0, hits: r?.homeHits ?? 0, errors: r?.homeErrors ?? 0, ours: true },
                    { key: "away", label: data.awayTeam, scores: r?.awayScores ?? [], runs: r ? awayTotal : 0, hits: r?.awayHits ?? 0, errors: r?.awayErrors ?? 0, ours: false },
                  ]
              ).map(row => (
                <ScoreRow
                  key={row.key}
                  label={row.label}
                  scores={row.scores}
                  innings={innings}
                  runs={row.runs}
                  hits={row.hits}
                  errors={row.errors}
                  ourLogo={row.ours}
                  logoUrl={row.ours ? undefined : data.awayLogo}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── チーム枠 ─────────────────────────────────────────── */
function TeamBox({ name, ourLogo = false, logoUrl }: { name: string; ourLogo?: boolean; logoUrl?: string }) {
  return (
    <div style={{ background: "#fff", width: "100%", maxWidth: 160, aspectRatio: "1 / 0.82", margin: "0 auto", display: "grid", placeItems: "center", padding: 10 }}>
      {ourLogo ? (
        <Image src="/sk_logo_crop.png" alt={name} width={160} height={132}
          style={{ width: "88%", height: "auto", objectFit: "contain" }} />
      ) : logoUrl ? (
        // 管理画面でアップロードしたロゴ。外部URLのため next/image は使わない
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={name} style={{ width: "88%", height: "88%", objectFit: "contain" }} />
      ) : (
        <span style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 900, color: "#0b1e3f", fontSize: 14, lineHeight: 1.45, wordBreak: "break-word" }}>
          {name}
        </span>
      )}
    </div>
  );
}

/* ── スコアの行 ───────────────────────────────────────── */
function ScoreRow({
  label, scores, innings, runs, hits, errors, ourLogo = false, logoUrl,
}: {
  label: string; scores: number[]; innings: number;
  runs: number; hits: number; errors: number; ourLogo?: boolean; logoUrl?: string;
}) {
  return (
    <tr>
      <th style={{ ...cell, background: "#fff", padding: 0, height: 54 }}>
        {ourLogo ? (
          <Image src="/sk_mark.png" alt={label} width={82} height={46}
            style={{ width: 42, height: "auto", margin: "0 auto", objectFit: "contain" }} />
        ) : logoUrl ? (
          // 管理画面でアップロードしたロゴ。外部URLのため next/image は使わない
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={label} style={{ width: 42, height: 40, margin: "0 auto", objectFit: "contain", display: "block" }} />
        ) : (
          <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 9, color: "#9a9a9a", letterSpacing: "0.06em", lineHeight: 1.3, display: "block" }}>
            NO<br />IMAGE
          </span>
        )}
      </th>
      {Array.from({ length: innings }, (_, i) => (
        <td key={i} style={{ ...cell, ...dataCell, background: i % 2 === 0 ? "#4a4a4a" : "#000" }}>
          {scores[i] !== undefined ? scores[i] : ""}
        </td>
      ))}
      <td style={{ ...cell, ...dataCell, background: "#8a8a8a", color: "#fff", fontSize: 17 }}>{runs}</td>
      <td style={{ ...cell, ...dataCell, background: "#000" }}>{hits}</td>
      <td style={{ ...cell, ...dataCell, background: "#000" }}>{errors}</td>
    </tr>
  );
}

/* ── セルの基本スタイル ───────────────────────────────── */
const cell: React.CSSProperties = {
  border: "1px solid #fff",
  textAlign: "center",
  verticalAlign: "middle",
  padding: 0,
};

const headCell: React.CSSProperties = {
  background: "#000",
  color: "#fff",
  fontFamily: "var(--font-oswald),sans-serif",
  fontSize: 13,
  fontWeight: 700,
  height: 30,
  minWidth: 34,
};

const dataCell: React.CSSProperties = {
  color: "#fff",
  fontFamily: "var(--font-oswald),sans-serif",
  fontSize: 15,
  fontWeight: 700,
  height: 54,
  minWidth: 34,
};
