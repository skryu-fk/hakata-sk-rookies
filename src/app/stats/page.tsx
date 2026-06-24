/**
 * /stats — 博多SKルーキーズメンバー成績アプリ
 *
 * メンバー専用（MEMBER_PASSWORD ゲート）。
 *   - 通算成績と試合別成績の両方を切り替えて閲覧できる
 *   - 打撃: AVG / OBP / SLG / OPS / HR / RBI / SB / SB%
 *   - 投手: ERA / IP / SO / BB / K/9 / WHIP
 *   - 捕手: 盗塁阻止率 CS%
 *   - ランキング表彰（金/銀/銅）、スタットバー、スタッガー表示などの演出付き
 */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { analyzeForm, type FormResult, type Kind } from "@/lib/poseFormCheck";

const MEMBER_PW_KEY = "skr_member_pw";

/* ── アプリのバージョン / 更新履歴 ────────────────────────── */
const APP_VERSION = "1.3";
type ChangeLogEntry = { version: string; date: string; items: string[] };
const CHANGELOG: ChangeLogEntry[] = [
  {
    version: "1.3",
    date: "2026-06-24",
    items: [
      "🧠 独自開発AI「SKドッパミンAI」を搭載（フォーム診断）",
      "🎥 動画からバッティング/ピッチングを骨格解析→点数・項目別評価・改善点",
      "🖼 構え〜インパクト〜フォロースルーの連続写真（骨格つき）を表示",
      "⚡ 2段階解析で推定スイング/リリース速度を表示（目安）",
      "🌙 暗い映像は明るさを自動補正して解析（精度は控えめ表示）",
      "🔒 動画は端末内だけで解析・外部に送信しません",
    ],
  },
  {
    version: "1.2",
    date: "2026-06-23",
    items: [
      "🙋 練習の参加投票を追加（日程から参加/不参加をタップ → 出欠に直接反映）",
      "📋 スコアラー機能を追加（試合の打撃・投球をその場で記録）",
      "✅ 記録は管理者の承認制（承認されると成績に反映）",
      "✨ UIを全面リニューアル（ネオン・グラス調のv1.2スキン）",
    ],
  },
  {
    version: "1.1",
    date: "2026-06-12",
    items: [
      "🧱 守備成績（刺殺・捕殺・失策・守備率）を追加",
      "📅 練習・試合の日程タブを追加",
      "🔥 予告先発を日程に表示",
      "📊 WAR・wRC+・wOBA を打撃成績に導入",
      "🔔 プッシュ通知に対応（成績更新・予告先発など）",
      "📢 お知らせ欄を新設",
      "🖱 PCでスクロールできない不具合を修正",
    ],
  },
  {
    version: "1.0",
    date: "2026-06-10",
    items: [
      "⚾ メンバー成績アプリ公開",
      "打率・出塁率・長打率・OPS / 防御率 / 盗塁阻止率を表示",
      "通算成績と試合別成績の切り替え",
      "ホーム画面に追加してアプリのように使える",
    ],
  },
];

/* ── 型 ─────────────────────────────────────────────── */
type ListRow = { rowIndex: number; data: string[] };

type Member = {
  id: string;
  name: string;
  nickname: string;
  jerseyNumber: string;
  position: string;
  active: boolean;
};

type BattingRow = {
  date: string;
  opponent: string;
  memberId: string;
  atBats: number; hits: number; doubles: number; triples: number;
  hr: number; rbi: number; bb: number; so: number;
  hbp: number; sh: number; sb: number; cs: number;
};

type PitchingRow = {
  date: string;
  opponent: string;
  memberId: string;
  ipOuts: number; hits: number; runs: number; er: number;
  so: number; bb: number; hbp: number;
};

type CatchingRow = {
  date: string;
  opponent: string;
  memberId: string;
  sba: number; cs: number;
};

type FieldingRow = {
  date: string;
  opponent: string;
  memberId: string;
  po: number; a: number; e: number; // 刺殺 / 捕殺 / 失策
};

type PracticeRow = {
  date: string;
  type: string;     // 球場練習 / キャッチボール / 試合 / 練習試合 / 全体練習
  place: string;
  status: string;   // scheduled / tentative / canceled / 予定 / 未定 / 中止
  time: string;
  note: string;
};

type ProbableRow = {
  date: string;
  opponent: string;
  memberId: string;
  memberName: string;
  note: string;
};

type AnnouncementRow = {
  date: string;
  category: string;  // 先発 / 成績 / アップデート / メンテナンス / お知らせ
  title: string;
  body: string;
};

type ParticipantRow = {
  date: string;
  memberId: string;
  memberName: string;
  note: string;
};

type SettingRow = { key: string; value: string; note: string };
type AttendanceRow = { date: string; memberId: string; memberName: string; status: string; note: string };

type BattingStat = {
  m: Member; games: number; ab: number; h: number; hr: number; rbi: number; bb: number; so: number;
  hbp: number; sh: number; sb: number; cs: number; sbAttempts: number;
  avg: number; obp: number; slg: number; ops: number; sbPct: number;
  pa: number; woba: number; wrcPlus: number; war: number;
};
type PitchingStat = {
  m: Member; appearances: number; ipOuts: number; hits: number; runs: number; er: number;
  so: number; bb: number; hbp: number; era: number; k9: number; whip: number;
};
type CatchingStat = { m: Member; games: number; sba: number; cs: number; rate: number };
type FieldingStat = { m: Member; games: number; po: number; a: number; e: number; chances: number; rate: number };

/* ── ユーティリティ ───────────────────────────────────── */
function num(s: string | undefined): number {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}
function normalizeDate(s: string): string {
  if (!s) return "";
  const cleaned = s.replace(/[./]/g, "-");
  const m = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return s;
}
function fmtAvg(v: number): string {
  if (!Number.isFinite(v) || v === 0) return ".000";
  return v.toFixed(3).replace(/^0/, "");
}
function fmtEra(v: number): string {
  if (!Number.isFinite(v)) return "—";
  return v.toFixed(2);
}
function fmtIp(outs: number): string {
  if (outs === 0) return "0.0";
  return `${Math.floor(outs / 3)}.${outs % 3}`;
}
function fmtPct(v: number): string {
  if (!Number.isFinite(v)) return "—";
  return `${(v * 100).toFixed(1)}%`;
}
function mdLabel(dateStr: string): string {
  const m = dateStr.match(/^\d{4}-(\d{2})-(\d{2})/);
  if (!m) return dateStr;
  return `${Number(m[1])}/${Number(m[2])}`;
}
function todayIsoJst(): string {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}
const WEEKDAY_JP = ["日", "月", "火", "水", "木", "金", "土"];
function weekday(dateStr: string): string {
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "";
  return WEEKDAY_JP[new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getDay()] ?? "";
}
const PRACTICE_COLOR: Record<string, string> = {
  球場練習: "#d10024", キャッチボール: "#d4a82a", 試合: "#4a90e2", 練習試合: "#9b59b6", 全体練習: "#27ae60",
};
function practiceTypeLabel(t: string): string {
  return t === "キャッチボール" ? "公園練習" : t;
}
function practiceStatusLabel(s: string): { label: string; canceled: boolean; tentative: boolean } {
  const t = (s || "").toLowerCase();
  if (t === "canceled" || s === "中止" || t === "cancel") return { label: "中止", canceled: true, tentative: false };
  if (t === "tentative" || s === "未定") return { label: "未定", canceled: false, tentative: true };
  return { label: "予定", canceled: false, tentative: false };
}
function isGameType(t: string): boolean {
  return t === "試合" || t === "練習試合";
}
function gameKey(r: { date: string; opponent: string }): string {
  return `${r.date}|${r.opponent}`;
}

/* ── ページ本体 ───────────────────────────────────────── */
export default function StatsPage() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // 認証は HttpOnly Cookie で行う（パスワードはブラウザに保存しない）。
    // 既存セッションがあるか GET で確認する。
    (async () => {
      try {
        const res = await fetch("/api/member/verify", { method: "GET", cache: "no-store" });
        if (res.ok) setAuthed(true);
      } catch { /* ネットワーク失敗時はログイン画面 */ }
      finally {
        // 旧バージョンが残した平文パスワードがあれば掃除
        try { window.localStorage.removeItem(MEMBER_PW_KEY); } catch {}
        setChecking(false);
      }
    })();
  }, []);

  if (checking) {
    return (
      <div style={pageBgStyle}>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, letterSpacing: "0.15em" }}>VERIFYING…</p>
      </div>
    );
  }

  if (!authed) return <LoginGate onSuccess={() => setAuthed(true)} />;
  return <StatsDashboard onLogout={async () => {
    try { await fetch("/api/member/logout", { method: "POST" }); } catch {}
    setAuthed(false);
  }} />;
}

const pageBgStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(209,0,36,0.12), transparent), #070b16",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

/* ── ログイン画面 ─────────────────────────────────────── */
function LoginGate({ onSuccess }: { onSuccess: () => void }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!input) return;
    setBusy(true);
    setError("");
    try {
      // 成功すると HttpOnly セッション Cookie が発行される（パスワードは保存しない）
      const res = await fetch("/api/member/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: input }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        onSuccess();
      } else if (res.status === 429) {
        setError("試行回数が多すぎます。しばらく待ってからお試しください。");
      } else {
        setError(data?.error || "認証に失敗しました。");
      }
    } catch {
      setError("ネットワークエラーが発生しました。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={pageBgStyle}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            display: "inline-grid", placeItems: "center",
            width: 120, height: 104, margin: "0 auto",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 0 60px rgba(209,0,36,0.18)",
          }}>
            <Image src="/sk_logo_crop.png" alt="logo" width={92} height={76} style={{ objectFit: "contain" }} />
          </div>
          <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 10, color: "#d4a82a", letterSpacing: "0.32em", marginTop: 16 }}>
            HAKATA SK ROOKIES
          </div>
          <div style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 900, fontSize: 17, marginTop: 6, lineHeight: 1.4 }}>
            博多SKルーキーズ<br />メンバー成績アプリ
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 10, letterSpacing: "0.05em" }}>
            チーム共有のパスワードを入力してください
          </div>
        </div>

        <form onSubmit={e => { e.preventDefault(); submit(); }}>
          {/* パスワードマネージャ（iPhoneのキーチェーン/Face ID・Androidの自動入力）に
              認証情報を保存・関連付けさせるためのユーザー名フィールド。
              画面には出さないが display:none にすると無視されるため画面外に固定配置する。 */}
          <input
            type="text"
            name="username"
            autoComplete="username"
            value="博多SKルーキーズ メンバー"
            readOnly
            tabIndex={-1}
            aria-hidden="true"
            style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, border: 0, overflow: "hidden", opacity: 0, pointerEvents: "none" }}
          />
          <input
            type="password"
            name="password"
            id="member-password"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="メンバー用パスワード"
            autoFocus
            autoComplete="current-password"
            style={{
              width: "100%",
              padding: 14,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#fff",
              fontSize: 15,
              letterSpacing: "0.1em",
            }}
          />
          {error && (
            <div style={{ marginTop: 10, color: "#ff6982", fontSize: 12 }}>{error}</div>
          )}
          <button
            type="submit"
            disabled={busy || !input}
            className="btn-sheen"
            style={{
              marginTop: 18,
              width: "100%",
              padding: 14,
              background: busy ? "#666" : "linear-gradient(135deg, #d4a82a, #f0c75e)",
              color: "#0a0e1a",
              border: "none",
              fontFamily: "var(--font-zen),sans-serif",
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: "0.2em",
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "認証中..." : "成績を見る →"}
          </button>
        </form>

        {/* ホーム画面に追加する手順 — アプリのように使えるようにする案内 */}
        <div style={{ marginTop: 26, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", padding: "16px 16px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 16 }}>📱</span>
            <span style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 800, fontSize: 12, letterSpacing: "0.08em", color: "#d4a82a" }}>
              ホーム画面に追加すると便利
            </span>
          </div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, margin: "0 0 12px" }}>
            このページをホーム画面に追加すると、アプリのように1タップで開けます。
          </p>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: "#fff", letterSpacing: "0.06em", marginBottom: 5 }}>
               iPhone（Safari）の場合
            </div>
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: "rgba(255,255,255,0.6)", lineHeight: 1.7 }}>
              <li>下の <strong style={{ color: "#fff" }}>共有ボタン</strong>（□に↑のマーク）を開く</li>
              <li><strong style={{ color: "#fff" }}>「ホーム画面に追加」</strong>をタップ</li>
              <li>右上の「追加」を押せば完了</li>
            </ol>
          </div>

          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: "#fff", letterSpacing: "0.06em", marginBottom: 5 }}>
               Android（Chrome）の場合
            </div>
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: "rgba(255,255,255,0.6)", lineHeight: 1.7 }}>
              <li>右上の <strong style={{ color: "#fff" }}>「⋮」メニュー</strong>を開く</li>
              <li><strong style={{ color: "#fff" }}>「ホーム画面に追加」</strong>を選ぶ</li>
              <li>名前を確認して「追加」をタップ</li>
            </ol>
          </div>

          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, margin: "12px 0 0" }}>
            ※ 追加後は「博多SKルーキーズメンバー成績アプリ」としてホーム画面に並びます。
          </p>
        </div>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Link href="/" style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>
            ← トップサイトへ戻る
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── 集計ヘルパ ───────────────────────────────────────── */
// wOBA 係数（FanGraphs 近年の値に準拠）
const WOBA = { bb: 0.69, hbp: 0.72, b1: 0.89, b2: 1.27, b3: 1.62, hr: 2.10 };
const WOBA_SCALE = 1.157;
const RUNS_PER_WIN = 10;

function aggBatting(members: Member[], rows: BattingRow[]): BattingStat[] {
  const base = members.filter(m => m.active).map(m => {
    const rs = rows.filter(b => b.memberId === m.id);
    const ab = rs.reduce((s, b) => s + b.atBats, 0);
    const h = rs.reduce((s, b) => s + b.hits, 0);
    const dbl = rs.reduce((s, b) => s + b.doubles, 0);
    const tpl = rs.reduce((s, b) => s + b.triples, 0);
    const hr = rs.reduce((s, b) => s + b.hr, 0);
    const rbi = rs.reduce((s, b) => s + b.rbi, 0);
    const bb = rs.reduce((s, b) => s + b.bb, 0);
    const so = rs.reduce((s, b) => s + b.so, 0);
    const hbp = rs.reduce((s, b) => s + b.hbp, 0);
    const sh = rs.reduce((s, b) => s + b.sh, 0);
    const sb = rs.reduce((s, b) => s + b.sb, 0);
    const cs = rs.reduce((s, b) => s + b.cs, 0);

    const singles = Math.max(0, h - dbl - tpl - hr);
    const totalBases = singles + dbl * 2 + tpl * 3 + hr * 4;
    const avg = ab > 0 ? h / ab : 0;
    const obp = (ab + bb + hbp) > 0 ? (h + bb + hbp) / (ab + bb + hbp) : 0;
    const slg = ab > 0 ? totalBases / ab : 0;
    const ops = obp + slg;
    const sbAttempts = sb + cs;
    const sbPct = sbAttempts > 0 ? sb / sbAttempts : 0;

    // wOBA（犠飛は未集計のため分母から除外）
    const pa = ab + bb + hbp;
    const wobaNum = WOBA.bb * bb + WOBA.hbp * hbp + WOBA.b1 * singles + WOBA.b2 * dbl + WOBA.b3 * tpl + WOBA.hr * hr;
    const woba = pa > 0 ? wobaNum / pa : 0;

    return { m, games: rs.length, ab, h, hr, rbi, bb, so, hbp, sh, sb, cs, sbAttempts, avg, obp, slg, ops, sbPct, pa, woba, wobaNum };
  });

  // チーム平均 wOBA（=「リーグ平均」の代わり）を算出し、wRC+ / 簡易WAR を求める
  const teamWobaNum = base.reduce((s, x) => s + x.wobaNum, 0);
  const teamPa = base.reduce((s, x) => s + x.pa, 0);
  const lgWoba = teamPa > 0 ? teamWobaNum / teamPa : 0;

  return base.map(s => {
    // wRC+：チーム平均を100とした相対打撃指標
    const wrcPlus = lgWoba > 0 && s.pa > 0 ? Math.round((s.woba / lgWoba) * 100) : 0;
    // 簡易WAR：打撃のみ。チーム平均比の打撃貢献(wRAA) + 出場分の控え選手比補正 を勝利換算
    const wRAA = lgWoba > 0 ? ((s.woba - lgWoba) / WOBA_SCALE) * s.pa : 0;
    const war = s.pa > 0 ? (wRAA + 0.0333 * s.pa) / RUNS_PER_WIN : 0;
    return { ...s, wrcPlus, war };
  });
}

function aggPitching(members: Member[], rows: PitchingRow[]): PitchingStat[] {
  return members.filter(m => m.active).map(m => {
    const rs = rows.filter(p => p.memberId === m.id);
    if (rs.length === 0) return null;
    const ipOuts = rs.reduce((s, p) => s + p.ipOuts, 0);
    const hits = rs.reduce((s, p) => s + p.hits, 0);
    const runs = rs.reduce((s, p) => s + p.runs, 0);
    const er = rs.reduce((s, p) => s + p.er, 0);
    const so = rs.reduce((s, p) => s + p.so, 0);
    const bb = rs.reduce((s, p) => s + p.bb, 0);
    const hbp = rs.reduce((s, p) => s + p.hbp, 0);
    const era = ipOuts > 0 ? (er * 27) / ipOuts : NaN;
    const k9 = ipOuts > 0 ? (so * 27) / ipOuts : NaN;
    const whip = ipOuts > 0 ? (bb + hits) / (ipOuts / 3) : NaN;
    return { m, appearances: rs.length, ipOuts, hits, runs, er, so, bb, hbp, era, k9, whip };
  }).filter((x): x is PitchingStat => x !== null);
}

function aggCatching(members: Member[], rows: CatchingRow[]): CatchingStat[] {
  return members.filter(m => m.active).map(m => {
    const rs = rows.filter(c => c.memberId === m.id);
    if (rs.length === 0) return null;
    const sba = rs.reduce((s, c) => s + c.sba, 0);
    const cs = rs.reduce((s, c) => s + c.cs, 0);
    const rate = sba > 0 ? cs / sba : 0;
    return { m, games: rs.length, sba, cs, rate };
  }).filter((x): x is CatchingStat => x !== null);
}

function aggFielding(members: Member[], rows: FieldingRow[]): FieldingStat[] {
  return members.filter(m => m.active).map(m => {
    const rs = rows.filter(f => f.memberId === m.id);
    if (rs.length === 0) return null;
    const po = rs.reduce((s, f) => s + f.po, 0);
    const a = rs.reduce((s, f) => s + f.a, 0);
    const e = rs.reduce((s, f) => s + f.e, 0);
    const chances = po + a + e;
    // 守備率 = (刺殺 + 捕殺) / (刺殺 + 捕殺 + 失策)
    const rate = chances > 0 ? (po + a) / chances : 0;
    return { m, games: rs.length, po, a, e, chances, rate };
  }).filter((x): x is FieldingStat => x !== null);
}

/* ── ダッシュボード ───────────────────────────────────── */
type Tab = "news" | "batting" | "pitching" | "catching" | "fielding" | "schedule" | "form";
const TOTAL_SCOPE = "__total__";

function StatsDashboard({ onLogout }: { onLogout: () => void }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [batting, setBatting] = useState<BattingRow[]>([]);
  const [pitching, setPitching] = useState<PitchingRow[]>([]);
  const [catching, setCatching] = useState<CatchingRow[]>([]);
  const [fielding, setFielding] = useState<FieldingRow[]>([]);
  const [practices, setPractices] = useState<PracticeRow[]>([]);
  const [probables, setProbables] = useState<ProbableRow[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [maintenance, setMaintenance] = useState<{ on: boolean; message: string }>({ on: false, message: "" });
  const [me, setMe] = useState<string>("");  // 自分の memberId（localStorage 記憶）
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [tab, setTab] = useState<Tab>("news");
  const [scope, setScope] = useState<string>(TOTAL_SCOPE); // TOTAL_SCOPE or gameKey

  const fetchList = useCallback(async <T,>(sheet: string, mapFn: (r: ListRow) => T): Promise<T[]> => {
    // 認証は Cookie（同一オリジンの fetch で自動送信）。パスワードは送らない。
    const res = await fetch("/api/member/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sheet }),
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) return [];
    return (data.rows ?? []).map(mapFn);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ms, bs, ps, cs, fs, prs, pbs, ans, parts, setts, atts] = await Promise.all([
        fetchList<Member>("members", r => ({
          id: r.data[0] ?? "",
          name: r.data[1] ?? "",
          nickname: r.data[2] ?? "",
          jerseyNumber: r.data[3] ?? "",
          position: r.data[4] ?? "",
          active: (r.data[6] ?? "TRUE").toString().toUpperCase() !== "FALSE",
        })),
        fetchList<BattingRow>("batting", r => ({
          date: normalizeDate(r.data[0] ?? ""),
          memberId: r.data[1] ?? "",
          opponent: r.data[3] ?? "",
          atBats: num(r.data[4]),
          hits: num(r.data[5]),
          doubles: num(r.data[6]),
          triples: num(r.data[7]),
          hr: num(r.data[8]),
          rbi: num(r.data[9]),
          bb: num(r.data[10]),
          so: num(r.data[11]),
          hbp: num(r.data[12]),
          sh: num(r.data[13]),
          sb: num(r.data[14]),
          cs: num(r.data[15]),
        })),
        fetchList<PitchingRow>("pitching", r => ({
          date: normalizeDate(r.data[0] ?? ""),
          memberId: r.data[1] ?? "",
          opponent: r.data[3] ?? "",
          ipOuts: num(r.data[4]),
          hits: num(r.data[5]),
          runs: num(r.data[6]),
          er: num(r.data[7]),
          so: num(r.data[8]),
          bb: num(r.data[9]),
          hbp: num(r.data[10]),
        })),
        fetchList<CatchingRow>("catching", r => ({
          date: normalizeDate(r.data[0] ?? ""),
          memberId: r.data[1] ?? "",
          opponent: r.data[3] ?? "",
          sba: num(r.data[4]),
          cs: num(r.data[5]),
        })),
        fetchList<FieldingRow>("fielding", r => ({
          date: normalizeDate(r.data[0] ?? ""),
          memberId: r.data[1] ?? "",
          opponent: r.data[3] ?? "",
          po: num(r.data[4]),
          a: num(r.data[5]),
          e: num(r.data[6]),
        })),
        fetchList<PracticeRow>("practices", r => ({
          date: normalizeDate(r.data[0] ?? ""),
          type: r.data[1] ?? "",
          place: r.data[2] ?? "",
          status: r.data[3] ?? "",
          time: r.data[4] ?? "",
          note: r.data[5] ?? "",
        })),
        fetchList<ProbableRow>("probables", r => ({
          date: normalizeDate(r.data[0] ?? ""),
          opponent: r.data[1] ?? "",
          memberId: r.data[2] ?? "",
          memberName: r.data[3] ?? "",
          note: r.data[4] ?? "",
        })),
        fetchList<AnnouncementRow>("announcements", r => ({
          date: normalizeDate(r.data[0] ?? ""),
          category: r.data[1] ?? "お知らせ",
          title: r.data[2] ?? "",
          body: r.data[3] ?? "",
        })),
        fetchList<ParticipantRow>("participants", r => ({
          date: normalizeDate(r.data[0] ?? ""),
          memberId: r.data[1] ?? "",
          memberName: r.data[2] ?? "",
          note: r.data[3] ?? "",
        })),
        fetchList<SettingRow>("settings", r => ({
          key: r.data[0] ?? "",
          value: r.data[1] ?? "",
          note: r.data[2] ?? "",
        })),
        fetchList<AttendanceRow>("attendance", r => ({
          date: normalizeDate(r.data[0] ?? ""),
          memberId: r.data[1] ?? "",
          memberName: r.data[2] ?? "",
          status: r.data[3] ?? "",
          note: r.data[4] ?? "",
        })),
      ]);
      setMembers(ms);
      setBatting(bs);
      setPitching(ps);
      setCatching(cs);
      setFielding(fs);
      setPractices(prs);
      setProbables(pbs);
      setAnnouncements(ans);
      setParticipants(parts);
      setAttendance(atts);
      const mt = setts.find(s => s.key === "maintenance");
      setMaintenance({ on: mt?.value === "on", message: mt?.note ?? "" });
      setUpdatedAt(new Date());
    } finally {
      setLoading(false);
    }
  }, [fetchList]);

  useEffect(() => { loadAll(); }, [loadAll]);

  /* ── 試合一覧（各成績の記録から日付+対戦をユニーク抽出） ── */
  const games = useMemo(() => {
    const map = new Map<string, { key: string; date: string; opponent: string }>();
    [...batting, ...pitching, ...catching, ...fielding].forEach(r => {
      if (!r.date) return;
      const k = gameKey(r);
      if (!map.has(k)) map.set(k, { key: k, date: r.date, opponent: r.opponent });
    });
    return [...map.values()].sort((a, b) => b.date.localeCompare(a.date));
  }, [batting, pitching, catching, fielding]);

  // スコープが消えた（データ更新等）場合は通算に戻す
  useEffect(() => {
    if (scope !== TOTAL_SCOPE && !games.some(g => g.key === scope)) setScope(TOTAL_SCOPE);
  }, [games, scope]);

  /* ── スコープでフィルタした成績 ── */
  const fBatting = useMemo(
    () => scope === TOTAL_SCOPE ? batting : batting.filter(r => gameKey(r) === scope),
    [batting, scope]);
  const fPitching = useMemo(
    () => scope === TOTAL_SCOPE ? pitching : pitching.filter(r => gameKey(r) === scope),
    [pitching, scope]);
  const fCatching = useMemo(
    () => scope === TOTAL_SCOPE ? catching : catching.filter(r => gameKey(r) === scope),
    [catching, scope]);
  const fFielding = useMemo(
    () => scope === TOTAL_SCOPE ? fielding : fielding.filter(r => gameKey(r) === scope),
    [fielding, scope]);

  const battingStats = useMemo(() => aggBatting(members, fBatting), [members, fBatting]);
  const pitchingStats = useMemo(() => aggPitching(members, fPitching), [members, fPitching]);
  const catchingStats = useMemo(() => aggCatching(members, fCatching), [members, fCatching]);
  const fieldingStats = useMemo(() => aggFielding(members, fFielding), [members, fFielding]);

  /* ── 日程（今日以降の練習・試合） ── */
  const upcoming = useMemo(() => {
    const today = todayIsoJst();
    return [...practices]
      .filter(p => p.date && p.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [practices]);
  const pastGames = useMemo(() => {
    const today = todayIsoJst();
    return [...practices]
      .filter(p => p.date && p.date < today && isGameType(p.type))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 6);
  }, [practices]);
  // 予告先発を日付で引けるように
  const probableByDate = useMemo(() => {
    const m = new Map<string, ProbableRow>();
    probables.forEach(p => { if (p.date) m.set(p.date, p); });
    return m;
  }, [probables]);
  // 練習の参加予定メンバーを日付で引けるように
  const participantsByDate = useMemo(() => {
    const m = new Map<string, ParticipantRow[]>();
    participants.forEach(p => {
      if (!p.date) return;
      if (!m.has(p.date)) m.set(p.date, []);
      m.get(p.date)!.push(p);
    });
    return m;
  }, [participants]);
  const membersById = useMemo(() => {
    const m = new Map<string, Member>();
    members.forEach(mm => m.set(mm.id, mm));
    return m;
  }, [members]);
  // 出欠（投票）を日付で引けるように
  const attendanceByDate = useMemo(() => {
    const m = new Map<string, AttendanceRow[]>();
    attendance.forEach(a => {
      if (!a.date) return;
      if (!m.has(a.date)) m.set(a.date, []);
      m.get(a.date)!.push(a);
    });
    return m;
  }, [attendance]);
  const scheduleCount = upcoming.length;

  // 自分（memberId）の記憶
  useEffect(() => {
    try { setMe(window.localStorage.getItem("skr_me") || ""); } catch {}
  }, []);
  const pickMe = useCallback((id: string) => {
    setMe(id);
    try { window.localStorage.setItem("skr_me", id); } catch {}
  }, []);
  // 練習参加投票
  const vote = useCallback(async (date: string, status: "出席" | "欠席") => {
    if (!me) return false;
    const res = await fetch("/api/member/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, memberId: me, status }),
    }).then(r => r.json()).catch(() => null);
    if (res?.ok) { await loadAll(); return true; }
    return false;
  }, [me, loadAll]);

  const scopeLabel = scope === TOTAL_SCOPE
    ? "通算"
    : (() => { const g = games.find(g => g.key === scope); return g ? `${mdLabel(g.date)} ${g.opponent || "試合"}` : "通算"; })();

  return (
    <div className="admin-dark" style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse 90% 40% at 50% -5%, rgba(209,0,36,0.1), transparent), radial-gradient(ellipse 60% 40% at 90% 110%, rgba(212,168,42,0.06), transparent), #070b16",
      color: "#fff",
      position: "relative",
      // overflow は指定しない。ダッシュボードを覆う overflow:hidden は
      // body スクロール時にホイールを妨げる原因になっていた。横方向の
      // はみ出し（透かし）はグローバルCSSの body { overflow-x:hidden } と
      // 透かし自体の position:fixed で処理されるため、ここでは不要。
    }}>
      {/* 演出スタイル（このページ専用） */}
      <style>{`
        @keyframes stxRowIn {
          from { opacity: 0; transform: translateY(16px); }
        }
        .stx-row { animation: stxRowIn 0.55s cubic-bezier(0.16,1,0.3,1) both; }

        @keyframes stxGrow { from { transform: scaleX(0); } }
        .stx-bar {
          display: block; width: 100%; max-width: 72px; height: 3px;
          background: rgba(255,255,255,0.08); margin-top: 4px; overflow: hidden;
        }
        .stx-bar > span {
          display: block; height: 100%; transform-origin: left center;
          animation: stxGrow 0.9s cubic-bezier(0.16,1,0.3,1) both;
        }

        @keyframes stxGold {
          0%, 100% { box-shadow: 0 0 0 0 rgba(212,168,42,0.5); }
          60%      { box-shadow: 0 0 0 7px rgba(212,168,42,0); }
        }
        .stx-rank-1 { animation: stxGold 2.4s ease-out infinite; }

        .stx-chip { border-radius: 10px; transition: background 0.2s, color 0.2s, border-color 0.2s, transform 0.2s, box-shadow 0.2s; }
        .stx-chip:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(0,0,0,0.3); }

        .stx-card { border-radius: 12px; transition: transform 0.25s cubic-bezier(0.16,1,0.3,1), border-color 0.25s, box-shadow 0.25s; }
        .stx-card:hover { transform: translateY(-3px); border-color: rgba(212,168,42,0.45) !important; box-shadow: 0 14px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(212,168,42,0.15); }

        @keyframes stxSpin { to { transform: rotate(360deg); } }
        .stx-spin { animation: stxSpin 0.9s linear infinite; }

        @keyframes stxDetailIn { from { opacity: 0; transform: translateY(16px) scale(0.98); } }
        .stx-detail { animation: stxDetailIn 0.42s cubic-bezier(0.16,1,0.3,1) both; }
        .stx-tap { transition: background 0.2s, transform 0.2s cubic-bezier(0.16,1,0.3,1); cursor: pointer; }
        .stx-tap:hover { background: rgba(255,255,255,0.05); transform: translateX(4px); }
        .stx-tap:active { transform: scale(0.99); }

        /* ── v1.2 近未来スキン：背景FX ── */
        .stx-fx { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
        .stx-fx::before {
          content: ""; position: absolute; inset: -40%;
          background-image:
            linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
          background-size: 46px 46px;
          -webkit-mask-image: radial-gradient(ellipse 55% 45% at 50% 28%, #000 25%, transparent 72%);
                  mask-image: radial-gradient(ellipse 55% 45% at 50% 28%, #000 25%, transparent 72%);
          animation: stxGridDrift 26s linear infinite;
        }
        @keyframes stxGridDrift { to { transform: translate(46px, 46px); } }
        .stx-fx::after {
          content: ""; position: absolute; inset: 0;
          background:
            radial-gradient(38% 30% at 14% 18%, rgba(212,168,42,0.12), transparent 70%),
            radial-gradient(42% 34% at 86% 82%, rgba(209,0,36,0.11), transparent 70%);
          animation: stxAurora 18s ease-in-out infinite alternate;
        }
        @keyframes stxAurora {
          from { transform: translate3d(-2%, -1%, 0) scale(1); }
          to   { transform: translate3d(3%, 2%, 0) scale(1.12); }
        }
        /* スキャンライン（極薄） */
        .stx-scan { position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background: repeating-linear-gradient(0deg, rgba(255,255,255,0.018) 0 1px, transparent 1px 4px);
          mix-blend-mode: overlay; opacity: 0.5; }

        /* グラス強調ヘッダー下の流れる光 */
        @keyframes stxScanX { from { transform: translateX(-120%); } to { transform: translateX(120%); } }
        .stx-headline { position: relative; overflow: hidden; }
        .stx-headline::after {
          content: ""; position: absolute; left: 0; bottom: 0; height: 1px; width: 38%;
          background: linear-gradient(90deg, transparent, rgba(212,168,42,0.9), transparent);
          animation: stxScanX 5.5s ease-in-out infinite;
        }

        /* ボタン/チップの光沢スイープ */
        .stx-sheen { position: relative; overflow: hidden; }
        .stx-sheen::before {
          content: ""; position: absolute; top: 0; left: 0; width: 60%; height: 100%;
          background: linear-gradient(105deg, transparent, rgba(255,255,255,0.35), transparent);
          transform: translateX(-160%); transition: transform 0.6s ease;
        }
        .stx-sheen:hover::before { transform: translateX(230%); }

        @media (prefers-reduced-motion: reduce) {
          .stx-fx::before, .stx-fx::after, .stx-headline::after { animation: none; }
        }
      `}</style>

      {/* v1.2 背景FX（グリッド＋オーロラ＋スキャンライン） */}
      <div className="stx-fx" aria-hidden />
      <div className="stx-scan" aria-hidden />

      {/* SKマークの透かし */}
      <Image src="/sk_mark.png" alt="" aria-hidden width={824} height={457}
        className="mark-drift"
        style={{ position: "fixed", right: "-8%", bottom: "-6%", width: "min(54vw, 520px)", height: "auto", opacity: 0.04, pointerEvents: "none", userSelect: "none" }} />

      {/* ── メンテナンス中ポップアップ（全画面・管理者がONにすると表示） ── */}
      {maintenance.on && !loading && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(209,0,36,0.18), transparent), rgba(7,11,22,0.96)",
            backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}
        >
          <div className="stx-detail" style={{ width: "100%", maxWidth: 420, textAlign: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,168,42,0.4)", padding: "34px 26px", boxShadow: "0 24px 70px rgba(0,0,0,0.6)" }}>
            <div style={{ fontSize: 46, lineHeight: 1 }}>🛠</div>
            <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d4a82a", letterSpacing: "0.32em", marginTop: 14 }}>UNDER MAINTENANCE</div>
            <h2 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: 22, fontWeight: 900, marginTop: 8 }}>ただいまメンテナンス中です</h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.9, marginTop: 12, whiteSpace: "pre-line" }}>
              {maintenance.message || "成績アプリは一時的にご利用いただけません。\nしばらく経ってから開き直してください。"}
            </p>
            <button
              onClick={loadAll}
              className="btn-sheen"
              style={{ marginTop: 22, padding: "12px 26px", background: "linear-gradient(135deg, #d4a82a, #f0c75e)", color: "#0a0e1a", border: "none", fontFamily: "var(--font-zen),sans-serif", fontSize: 13, fontWeight: 800, letterSpacing: "0.1em", cursor: "pointer" }}
            >
              🔄 再読み込み
            </button>
            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.35)", marginTop: 14 }}>HAKATA SK ROOKIES</div>
          </div>
        </div>
      )}

      {/* ── ヘッダー ── */}
      <header className="stx-headline" style={{ background: "linear-gradient(180deg, rgba(11,30,63,0.92), rgba(11,30,63,0.78))", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", borderBottom: "1px solid rgba(212,168,42,0.35)", boxShadow: "0 1px 0 rgba(212,168,42,0.12), 0 10px 30px rgba(0,0,0,0.4)", position: "sticky", top: 0, zIndex: 20 }}>
        <div className="max-w-[1280px] mx-auto px-5 md:px-8 flex items-center" style={{ height: 60, gap: 14 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
            <Image src="/sk_logo_crop.png" alt="logo" width={42} height={35} className="object-contain" />
            <div style={{ lineHeight: 1.1 }}>
              <div style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 900, fontSize: 13.5, display: "flex", alignItems: "center", gap: 6 }}>
                メンバー成績アプリ
                <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 9, fontWeight: 700, color: "#0a0e1a", background: "linear-gradient(135deg, #f3d176, #d4a82a)", padding: "2px 7px", borderRadius: 999, letterSpacing: "0.05em", boxShadow: "0 0 12px rgba(212,168,42,0.55)" }}>v{APP_VERSION}</span>
              </div>
              <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 8.5, color: "#d4a82a", letterSpacing: "0.3em", marginTop: 2 }}>HAKATA SK ROOKIES</div>
            </div>
          </Link>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            {updatedAt && !loading && (
              <span className="hidden sm:inline" style={{ fontSize: 9.5, color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                更新 {String(updatedAt.getHours()).padStart(2, "0")}:{String(updatedAt.getMinutes()).padStart(2, "0")}
              </span>
            )}
            <button
              onClick={loadAll}
              disabled={loading}
              aria-label="データを更新"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "7px 13px",
                background: "linear-gradient(135deg, rgba(212,168,42,0.18), rgba(212,168,42,0.08))",
                border: "1px solid rgba(212,168,42,0.45)",
                color: "#d4a82a",
                fontSize: 11, fontWeight: 700,
                cursor: loading ? "wait" : "pointer",
                letterSpacing: "0.06em",
                opacity: loading ? 0.6 : 1,
              }}
            >
              <span className={loading ? "stx-spin" : undefined} style={{ display: "inline-block", fontSize: 13, lineHeight: 1 }}>⟳</span>
              {loading ? "更新中…" : "更新"}
            </button>
            <button
              onClick={onLogout}
              style={{ padding: "7px 13px", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.8)", fontSize: 11, cursor: "pointer", letterSpacing: "0.06em" }}
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* ── 通知バー ── */}
      <div className="max-w-[1280px] mx-auto px-5 md:px-8" style={{ paddingTop: 14, position: "relative", zIndex: 1 }}>
        <NotifyBar />
      </div>

      {/* ── 種別タブ ── */}
      <div className="max-w-[1280px] mx-auto px-5 md:px-8" style={{ paddingTop: 12, position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: 5, gap: 4, overflowX: "auto", WebkitOverflowScrolling: "touch", backdropFilter: "blur(7px)", WebkitBackdropFilter: "blur(7px)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)" }}>
          {([
            ["news", "📢 お知らせ", announcements.length],
            ["batting", "⚾ 打撃", battingStats.filter(s => s.ab > 0).length],
            ["pitching", "🔥 投手", pitchingStats.length],
            ["catching", "🧤 捕手", catchingStats.length],
            ["fielding", "🧱 守備", fieldingStats.length],
            ["schedule", "📅 日程", scheduleCount],
            ["form", "🧠 SKドッパミンAI", -1],
          ] as [Tab, string, number][]).map(([key, label, count]) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className="stx-sheen"
                style={{
                  flex: "1 0 auto",
                  minWidth: 78,
                  padding: "11px 10px",
                  borderRadius: 10,
                  background: active ? "linear-gradient(135deg, #d4a82a, #f0c75e)" : "transparent",
                  color: active ? "#0a0e1a" : "rgba(255,255,255,0.6)",
                  border: "none",
                  fontFamily: "var(--font-zen),sans-serif",
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "background 0.25s, color 0.25s, box-shadow 0.25s",
                  boxShadow: active ? "0 4px 18px rgba(212,168,42,0.45)" : "none",
                }}
              >
                {label}{count >= 0 && <span style={{ marginLeft: 5, fontSize: 10.5, opacity: 0.7, fontFamily: "var(--font-oswald),sans-serif" }}>({count})</span>}
              </button>
            );
          })}
        </div>

        {/* ── スコープ切り替え（通算 / 試合別）— 成績タブのみ表示 ── */}
        {tab !== "schedule" && tab !== "news" && tab !== "form" && (
          <div style={{ display: "flex", gap: 8, marginTop: 12, overflowX: "auto", paddingBottom: 6, WebkitOverflowScrolling: "touch" }}>
            <ScopeChip active={scope === TOTAL_SCOPE} onClick={() => setScope(TOTAL_SCOPE)} primary>
              通算
            </ScopeChip>
            {games.map(g => (
              <ScopeChip key={g.key} active={scope === g.key} onClick={() => setScope(g.key)}>
                <span style={{ fontFamily: "var(--font-oswald),sans-serif", marginRight: 5 }}>{mdLabel(g.date)}</span>
                {g.opponent || "試合"}
              </ScopeChip>
            ))}
            {games.length === 0 && !loading && (
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", alignSelf: "center", whiteSpace: "nowrap" }}>
                試合記録が増えるとここから試合別成績を見られます
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── 本文 ── */}
      <main className="max-w-[1280px] mx-auto px-5 md:px-8" style={{ paddingTop: 14, paddingBottom: 90, position: "relative" }}>
        {loading ? (
          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", padding: 48, fontSize: 13, letterSpacing: "0.15em" }}>LOADING…</p>
        ) : tab === "news" ? (
          <NewsView announcements={announcements} />
        ) : tab === "batting" ? (
          <BattingStatsView key={`b-${scope}`} stats={battingStats} scopeLabel={scopeLabel} isGame={scope !== TOTAL_SCOPE} />
        ) : tab === "pitching" ? (
          <PitchingStatsView key={`p-${scope}`} stats={pitchingStats} scopeLabel={scopeLabel} />
        ) : tab === "catching" ? (
          <CatchingStatsView key={`c-${scope}`} stats={catchingStats} scopeLabel={scopeLabel} />
        ) : tab === "fielding" ? (
          <FieldingStatsView key={`f-${scope}`} stats={fieldingStats} scopeLabel={scopeLabel} />
        ) : tab === "form" ? (
          <FormCheckView />
        ) : (
          <ScheduleView upcoming={upcoming} pastGames={pastGames} probableByDate={probableByDate} participantsByDate={participantsByDate} membersById={membersById} attendanceByDate={attendanceByDate} members={members} me={me} onPickMe={pickMe} onVote={vote} />
        )}
      </main>
    </div>
  );
}

/* ── フォームチェック（端末内AI解析） ────────────────────── */
function FormCheckView() {
  const [kind, setKind] = useState<Kind>("batting");
  const [phase, setPhase] = useState<"idle" | "analyzing" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<FormResult | null>(null);
  const [errMsg, setErrMsg] = useState("");
  const [kfIndex, setKfIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setPhase("analyzing"); setProgress(0); setResult(null); setErrMsg(""); setKfIndex(0);
    try {
      const r = await analyzeForm(f, kind, p => setProgress(p));
      setResult(r); setPhase("done");
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : "解析に失敗しました。もう一度お試しください。");
      setPhase("error");
    }
  }
  function reset() { setPhase("idle"); setResult(null); setProgress(0); setErrMsg(""); }

  const scoreColor = (s: number) => (s >= 74 ? "#67e088" : s >= 56 ? "#d4a82a" : "#ff6982");
  const grade = (s: number) => (s >= 85 ? "S" : s >= 72 ? "A" : s >= 60 ? "B" : s >= 48 ? "C" : "D");

  const kindLabel = kind === "batting" ? "バッティング" : "ピッチング";

  return (
    <div className="stx-detail">
      {/* ブランドヘッダー */}
      <section style={{ ...cardStyle, textAlign: "center", overflow: "hidden", position: "relative" }} className="stx-headline">
        <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 10, color: "#d4a82a", letterSpacing: "0.34em", marginBottom: 6 }}>博多SKルーキーズ 独自開発AI</div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 30, filter: "drop-shadow(0 0 12px rgba(212,168,42,0.6))" }}>🧠</span>
          <span style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 900, fontSize: 27, background: "linear-gradient(135deg,#f3d176,#d4a82a 55%,#ff8a5a)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", letterSpacing: "0.02em" }}>SKドッパミンAI</span>
        </div>
        <div style={{ display: "inline-flex", gap: 6, marginBottom: 12, flexWrap: "wrap", justifyContent: "center" }}>
          {["⚡スピード解析", "🔒端末内解析", "📈フォーム診断"].map(t => (
            <span key={t} style={{ fontSize: 10, fontWeight: 700, color: "#d4a82a", background: "rgba(212,168,42,0.12)", border: "1px solid rgba(212,168,42,0.3)", borderRadius: 999, padding: "3px 9px" }}>{t}</span>
          ))}
        </div>
        <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.72)", lineHeight: 1.9, margin: "0 auto", maxWidth: 460 }}>
          自分の<strong style={{ color: "#fff" }}>{kindLabel}フォームの動画</strong>を選ぶと、<strong style={{ color: "#d4a82a" }}>SKドッパミンAI</strong>が骨格を解析して<strong style={{ color: "#d4a82a" }}>点数・改善点・推定スピード</strong>を診断します。
          動画は<strong style={{ color: "#67e088" }}>あなたの端末の中だけ</strong>で処理され、外部には一切送られません。
          <span style={{ color: "rgba(255,255,255,0.45)" }}>（結果は目安です）</span>
        </p>
      </section>

      {/* 種別切替 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {([["batting", "⚾ バッティング"], ["pitching", "🔥 ピッチング"]] as const).map(([k, lbl]) => (
          <button key={k} onClick={() => { setKind(k); reset(); }} className="stx-chip"
            style={{ flex: 1, padding: "12px", cursor: "pointer", fontFamily: "var(--font-zen),sans-serif", fontWeight: 800, fontSize: 14, color: kind === k ? "#0a0e1a" : "#fff", background: kind === k ? "linear-gradient(135deg,#d4a82a,#f0cf6a)" : "rgba(255,255,255,0.06)", border: "1px solid " + (kind === k ? "transparent" : "rgba(255,255,255,0.15)"), boxShadow: kind === k ? "0 4px 16px rgba(212,168,42,0.4)" : "none" }}>
            {lbl}
          </button>
        ))}
      </div>

      <input ref={inputRef} type="file" accept="video/*" onChange={onPick} style={{ display: "none" }} />

      {(phase === "idle" || phase === "error") && (
        <section style={{ ...cardStyle, textAlign: "center" }}>
          {errMsg && (
            <div style={{ marginBottom: 14, padding: "12px 14px", background: "rgba(209,0,36,0.12)", border: "1px solid rgba(209,0,36,0.4)", color: "#ff6982", fontSize: 13, lineHeight: 1.7, borderRadius: 10 }}>{errMsg}</div>
          )}
          <div style={{ fontSize: 44, marginBottom: 8 }}>🎥</div>
          <button onClick={() => inputRef.current?.click()} className="stx-sheen"
            style={{ padding: "15px 30px", cursor: "pointer", fontFamily: "var(--font-zen),sans-serif", fontWeight: 900, fontSize: 16, color: "#0a0e1a", background: "linear-gradient(135deg,#d4a82a,#f0cf6a)", border: "none", borderRadius: 12, boxShadow: "0 6px 22px rgba(212,168,42,0.45)" }}>
            📹 {kindLabel}動画を選ぶ
          </button>
          <div style={{ marginTop: 20, textAlign: "left", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#d4a82a", letterSpacing: "0.1em", marginBottom: 8 }}>📌 撮影のコツ</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "rgba(255,255,255,0.7)", lineHeight: 1.9 }}>
              <li><strong style={{ color: "#fff" }}>横から</strong>・全身が画面に収まるように撮る</li>
              <li>明るい場所で、背景はシンプルだと精度UP</li>
              <li>1〜数秒の短い動画でOK（長すぎると時間がかかります）</li>
              <li>スイング/投球の全体が1回入っていれば十分</li>
            </ul>
          </div>
        </section>
      )}

      {phase === "analyzing" && (
        <section style={{ ...cardStyle, textAlign: "center", padding: "40px 24px" }}>
          <div className="stx-spin" style={{ width: 44, height: 44, margin: "0 auto 18px", border: "3px solid rgba(212,168,42,0.25)", borderTopColor: "#d4a82a", borderRadius: "50%" }} />
          <div style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 800, fontSize: 15, marginBottom: 6 }}>
            SKドッパミンAIが{progress < 0.12 ? "起動中…" : progress < 0.95 ? "骨格を解析中…" : "診断をまとめています…"}
          </div>
          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.45)", marginBottom: 16 }}>端末内で処理しています（動画は外部に送られません）</div>
          <div style={{ height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.round(progress * 100)}%`, background: "linear-gradient(90deg,#d4a82a,#f0cf6a)", transition: "width 0.25s", boxShadow: "0 0 10px rgba(212,168,42,0.7)" }} />
          </div>
          <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 12, color: "#d4a82a", marginTop: 8 }}>{Math.round(progress * 100)}%</div>
        </section>
      )}

      {phase === "done" && result && (
        <>
          {/* 精度に関する注意（暗い映像・コマ少 など） */}
          {result.notes.length > 0 && (
            <div style={{ ...cardStyle, background: "rgba(212,168,42,0.08)", border: "1px solid rgba(212,168,42,0.4)", padding: "14px 16px" }}>
              {result.notes.map((n, i) => (
                <p key={i} style={{ fontSize: 12.5, color: "#f0cf6a", lineHeight: 1.7, margin: i ? "6px 0 0" : 0 }}>{n}</p>
              ))}
            </div>
          )}

          {/* 総合スコア + 推定スピード */}
          <section style={{ ...cardStyle }}>
            <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 10, color: "#d4a82a", letterSpacing: "0.28em", textAlign: "center", marginBottom: 12 }}>SKドッパミンAI 診断結果{result.lowLight ? "（暗いため精度低め）" : ""}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", justifyContent: "center" }}>
              {/* リングゲージ */}
              <div style={{ position: "relative", width: 130, height: 130, flexShrink: 0 }}>
                <svg viewBox="0 0 120 120" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                  <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                  <circle cx="60" cy="60" r="52" fill="none" stroke={scoreColor(result.overall)} strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 52} strokeDashoffset={2 * Math.PI * 52 * (1 - result.overall / 100)}
                    style={{ filter: `drop-shadow(0 0 6px ${scoreColor(result.overall)})`, transition: "stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)" }} />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 40, fontWeight: 700, lineHeight: 1, color: "#fff" }}>{result.overall}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em" }}>/ 100</div>
                </div>
                <div style={{ position: "absolute", top: -6, right: -6, width: 34, height: 34, borderRadius: "50%", background: scoreColor(result.overall), color: "#0a0e1a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-oswald),sans-serif", fontWeight: 700, fontSize: 18, boxShadow: `0 0 14px ${scoreColor(result.overall)}` }}>{grade(result.overall)}</div>
              </div>
              {/* 推定スピード */}
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.1em", marginBottom: 2 }}>{result.speedLabel}</div>
                <div>
                  <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 46, fontWeight: 700, color: "#d4a82a", textShadow: "0 0 18px rgba(212,168,42,0.5)" }}>{result.speedKmh.toFixed(0)}</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginLeft: 4 }}>km/h</span>
                </div>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>手の速さ {result.handSpeedKmh.toFixed(0)} km/h ・ 目安値</div>
              </div>
            </div>
          </section>

          {/* キーフレーム連続写真（構え〜フォロースルー） */}
          {result.keyframes.length > 0 && (() => {
            const sel = result.keyframes[Math.min(kfIndex, result.keyframes.length - 1)];
            return (
              <section style={{ ...cardStyle, padding: 14 }}>
                <H sub="KEY FRAMES">フォーム連続写真</H>
                {/* メイン表示 */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sel.dataUrl} alt={sel.label} style={{ width: "100%", maxWidth: 320, display: "block", margin: "0 auto", borderRadius: 10, border: "1px solid rgba(212,168,42,0.4)" }} />
                <div style={{ textAlign: "center", marginTop: 8, fontFamily: "var(--font-zen),sans-serif", fontWeight: 800, fontSize: 14, color: "#d4a82a" }}>
                  {sel.label}<span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginLeft: 8 }}>{kfIndex + 1}/{result.keyframes.length}</span>
                </div>
                {/* サムネイル切替（横スクロール） */}
                <div style={{ display: "flex", gap: 8, overflowX: "auto", marginTop: 12, paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
                  {result.keyframes.map((k, i) => (
                    <button key={i} onClick={() => setKfIndex(i)}
                      style={{ flex: "0 0 auto", width: 66, cursor: "pointer", padding: 0, background: "transparent", border: "2px solid " + (i === kfIndex ? "#d4a82a" : "rgba(255,255,255,0.15)"), borderRadius: 8, overflow: "hidden" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={k.dataUrl} alt={k.label} style={{ width: "100%", display: "block" }} />
                      <div style={{ fontSize: 9, fontWeight: 700, color: i === kfIndex ? "#0a0e1a" : "rgba(255,255,255,0.6)", background: i === kfIndex ? "#d4a82a" : "transparent", padding: "3px 2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k.label}</div>
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", textAlign: "center", marginTop: 8 }}>サムネイルをタップで各フェーズの骨格を確認できます</p>
              </section>
            );
          })()}

          {/* 指標バー */}
          <section style={{ ...cardStyle }}>
            <H sub="DETAIL">項目別スコア</H>
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              {result.metrics.map(m => (
                <div key={m.key}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{m.label}</span>
                    <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 15, fontWeight: 700, color: scoreColor(m.score) }}>{m.score}</span>
                  </div>
                  <div style={{ height: 7, background: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${m.score}%`, background: scoreColor(m.score), borderRadius: 999, boxShadow: `0 0 8px ${scoreColor(m.score)}`, transition: "width 0.7s cubic-bezier(0.16,1,0.3,1)" }} />
                  </div>
                  <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)", marginTop: 4, lineHeight: 1.6 }}>{m.comment}</div>
                </div>
              ))}
            </div>
          </section>

          {/* 良かった点 */}
          {result.strengths.length > 0 && (
            <section style={{ ...cardStyle, border: "1px solid rgba(103,224,136,0.3)" }}>
              <H sub="GOOD">👍 良かった点</H>
              <ul style={{ margin: 0, paddingLeft: 4, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                {result.strengths.map((t, i) => (
                  <li key={i} style={{ display: "flex", gap: 9, fontSize: 13, color: "rgba(255,255,255,0.88)", lineHeight: 1.7 }}>
                    <span style={{ color: "#67e088", flexShrink: 0 }}>◎</span><span>{t}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 改善ポイント */}
          <section style={{ ...cardStyle, border: "1px solid rgba(212,168,42,0.3)" }}>
            <H sub="ADVICE">🎯 もっと良くするには</H>
            <ul style={{ margin: 0, paddingLeft: 4, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
              {result.tips.map((t, i) => (
                <li key={i} style={{ display: "flex", gap: 9, fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.8 }}>
                  <span style={{ color: "#d4a82a", flexShrink: 0, fontWeight: 800 }}>{i + 1}.</span><span>{t}</span>
                </li>
              ))}
            </ul>
          </section>

          <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.38)", textAlign: "center", marginBottom: 12, lineHeight: 1.6 }}>
            SKドッパミンAI ・ {result.framesAnalyzed}フレーム解析 ・ 推定のため誤差があります
          </div>
          <button onClick={() => inputRef.current?.click()} className="stx-sheen"
            style={{ width: "100%", padding: "14px", cursor: "pointer", fontFamily: "var(--font-zen),sans-serif", fontWeight: 800, fontSize: 15, color: "#0a0e1a", background: "linear-gradient(135deg,#d4a82a,#f0cf6a)", border: "none", borderRadius: 12 }}>
            🔄 別の動画でもう一度
          </button>
        </>
      )}
    </div>
  );
}

/* ── 通知のオン/オフ バー ───────────────────────────────── */
function NotifyBar() {
  const [state, setState] = useState<"idle" | "on" | "working" | "denied" | "unsupported">("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    import("@/lib/push-client").then(async ({ pushSupported, getExistingSubscription }) => {
      if (!pushSupported()) { setState("unsupported"); return; }
      const existing = await getExistingSubscription();
      if (existing && Notification.permission === "granted") setState("on");
    });
  }, []);

  async function enable() {
    setState("working");
    setMsg("");
    const { subscribePush } = await import("@/lib/push-client");
    const label = (typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 50) : "");
    const r = await subscribePush(label);
    if (r === "ok") { setState("on"); setMsg("通知をオンにしました🔔"); }
    else if (r === "denied") { setState("denied"); setMsg("ブラウザの設定で通知がブロックされています。"); }
    else if (r === "unsupported") { setState("unsupported"); }
    else { setState("idle"); setMsg("登録に失敗しました。もう一度お試しください。"); }
  }

  if (state === "unsupported") {
    return (
      <div style={notifyBarStyle}>
        <span style={{ fontSize: 16 }}>🔔</span>
        <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
          この端末/ブラウザは通知に非対応です。iPhoneは<strong style={{ color: "#d4a82a" }}>ホーム画面に追加</strong>してから開くと通知が使えます。
        </span>
      </div>
    );
  }

  return (
    <div style={notifyBarStyle}>
      <span style={{ fontSize: 16 }}>{state === "on" ? "🔔" : "🔕"}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: state === "on" ? "#67e088" : "#fff" }}>
          {state === "on" ? "通知オン" : "成績の更新・予告先発をプッシュ通知で受け取る"}
        </div>
        {msg && <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{msg}</div>}
      </div>
      {state !== "on" && (
        <button
          onClick={enable}
          disabled={state === "working"}
          style={{
            flexShrink: 0,
            padding: "7px 14px",
            background: state === "working" ? "#555" : "linear-gradient(135deg, #d4a82a, #f0c75e)",
            color: "#0a0e1a", border: "none",
            fontFamily: "var(--font-zen),sans-serif", fontSize: 12, fontWeight: 800,
            cursor: state === "working" ? "wait" : "pointer", letterSpacing: "0.06em",
          }}
        >
          {state === "working" ? "登録中…" : "通知をオンにする"}
        </button>
      )}
    </div>
  );
}

const notifyBarStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 12,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(212,168,42,0.25)",
  padding: "10px 14px",
};

function ScopeChip({ children, active, onClick, primary }: { children: React.ReactNode; active: boolean; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="stx-chip"
      style={{
        flexShrink: 0,
        padding: "7px 14px",
        background: active ? (primary ? "#d10024" : "#d4a82a") : "rgba(255,255,255,0.04)",
        color: active ? (primary ? "#fff" : "#0a0e1a") : "rgba(255,255,255,0.6)",
        border: `1px solid ${active ? "transparent" : "rgba(255,255,255,0.14)"}`,
        fontFamily: "var(--font-zen),sans-serif",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.05em",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

/* ── お知らせ カテゴリ色 ──────────────────────────────── */
const ANN_CATEGORY: Record<string, { color: string; bg: string }> = {
  先発: { color: "#c08fe0", bg: "rgba(155,89,182,0.15)" },
  成績: { color: "#67e088", bg: "rgba(103,224,136,0.13)" },
  アップデート: { color: "#8fc4ff", bg: "rgba(143,196,255,0.13)" },
  メンテナンス: { color: "#ffb84a", bg: "rgba(255,184,74,0.13)" },
  お知らせ: { color: "#d4a82a", bg: "rgba(212,168,42,0.13)" },
};
function annStyle(cat: string) {
  return ANN_CATEGORY[cat] ?? ANN_CATEGORY["お知らせ"];
}
function fmtAnnDate(d: string): string {
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return d;
  return `${m[1]}.${m[2]}.${m[3]}`;
}

/* ── お知らせビュー ───────────────────────────────────── */
function NewsView({ announcements }: { announcements: AnnouncementRow[] }) {
  const [showAll, setShowAll] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);

  const sorted = useMemo(
    () => [...announcements].filter(a => a.title).sort((a, b) => b.date.localeCompare(a.date)),
    [announcements]
  );
  const RECENT = 5;
  const shown = showAll ? sorted : sorted.slice(0, RECENT);
  const hasMore = sorted.length > RECENT;

  return (
    <div>
      {/* バージョン / 更新情報 */}
      <section className="stx-row" style={{ ...cardStyle, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d4a82a", letterSpacing: "0.25em" }}>APP VERSION</span>
          <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 26, fontWeight: 700, color: "#fff", lineHeight: 1 }}>v{APP_VERSION}</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>最新の状態です</span>
          <button
            onClick={() => setShowChangelog(v => !v)}
            className="stx-chip"
            style={{ marginLeft: "auto", padding: "6px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: "#d4a82a", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
          >
            {showChangelog ? "更新内容を閉じる" : "更新内容を見る →"}
          </button>
        </div>
        {showChangelog && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
            {CHANGELOG.map(c => (
              <div key={c.version} style={{ borderLeft: "3px solid #d4a82a", paddingLeft: 14 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 17, fontWeight: 700, color: "#d4a82a" }}>v{c.version}</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{fmtAnnDate(c.date)}</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: 4, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                  {c.items.map((it, i) => (
                    <li key={i} style={{ fontSize: 12.5, color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* お知らせ一覧 */}
      <section className="stx-row" style={{ ...cardStyle, animationDelay: "80ms" }}>
        <H sub="NEWS">お知らせ</H>
        {sorted.length === 0 ? (
          <p style={emptyMsg}>お知らせはまだありません。<br />成績更新・予告先発などをここでお知らせします。</p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {shown.map((a, i) => {
              const cs = annStyle(a.category);
              return (
                <li key={a.date + a.title + i} className="stx-row" style={{ padding: "14px 4px", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.06)", animationDelay: `${100 + i * 50}ms` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{fmtAnnDate(a.date)}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: cs.color, background: cs.bg, padding: "2px 9px" }}>{a.category}</span>
                  </div>
                  <div style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 800, fontSize: 15, lineHeight: 1.4, marginBottom: a.body ? 4 : 0 }}>{a.title}</div>
                  {a.body && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{a.body}</div>}
                </li>
              );
            })}
          </ul>
        )}
        {hasMore && (
          <div style={{ textAlign: "center", marginTop: 14 }}>
            <button
              onClick={() => setShowAll(v => !v)}
              style={{ padding: "10px 24px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: "#d4a82a", fontFamily: "var(--font-zen),sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", cursor: "pointer" }}
            >
              {showAll ? "直近5件だけ表示" : `これ以前のお知らせを見る（全${sorted.length}件）→`}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

/* ── カウントアップ数字 ───────────────────────────────── */
function CountUp({ value, fmt, duration = 900 }: { value: number; fmt: (n: number) => string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let start: number | null = null;
    let raf = 0;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const t = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      el.textContent = fmt(value * ease);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // fmt は再生成されても出力が変わらない想定なので依存に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);
  return <span ref={ref}>{fmt(0)}</span>;
}

/* ── ランクバッジ ─────────────────────────────────────── */
function RankBadge({ rank }: { rank: number }) {
  const styles: Record<number, { bg: string; color: string }> = {
    1: { bg: "linear-gradient(135deg, #f0c75e, #d4a82a)", color: "#0a0e1a" },
    2: { bg: "linear-gradient(135deg, #d9dee6, #9aa4b2)", color: "#0a0e1a" },
    3: { bg: "linear-gradient(135deg, #d49a6a, #a06b3e)", color: "#0a0e1a" },
  };
  const s = styles[rank];
  return (
    <span
      className={rank === 1 ? "stx-rank-1" : undefined}
      style={{
        display: "inline-grid",
        placeItems: "center",
        width: 26, height: 26,
        borderRadius: "50%",
        background: s ? s.bg : "transparent",
        border: s ? "none" : "1px solid rgba(255,255,255,0.15)",
        color: s ? s.color : "rgba(255,255,255,0.5)",
        fontFamily: "var(--font-oswald),sans-serif",
        fontSize: 12.5,
        fontWeight: 700,
      }}
    >
      {rank}
    </span>
  );
}

/* ── スタットバー ─────────────────────────────────────── */
function StatBar({ ratio, color, delay = 0 }: { ratio: number; color: string; delay?: number }) {
  const w = Math.max(0.02, Math.min(1, ratio));
  return (
    <span className="stx-bar">
      <span style={{ background: color, transform: `scaleX(${w})`, animationDelay: `${delay}ms` }} />
    </span>
  );
}

/* ── 共通 UI ─────────────────────────────────────────── */
const cardStyle: React.CSSProperties = {
  background: "linear-gradient(158deg, rgba(255,255,255,0.05), rgba(255,255,255,0.012))",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 14,
  padding: 20,
  marginBottom: 16,
  backdropFilter: "blur(7px)",
  WebkitBackdropFilter: "blur(7px)",
  boxShadow: "0 12px 34px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.07)",
  position: "relative",
};
const tableStyle: React.CSSProperties = {
  width: "100%",
  fontSize: 13,
  borderCollapse: "collapse",
};
const emptyMsg: React.CSSProperties = {
  color: "rgba(255,255,255,0.5)",
  fontSize: 13,
  textAlign: "center",
  padding: 32,
  lineHeight: 1.8,
};

function H({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
      <h3 style={{
        display: "flex", alignItems: "center", gap: 9,
        fontFamily: "var(--font-zen),sans-serif",
        fontWeight: 800,
        fontSize: 14,
        letterSpacing: "0.1em",
        color: "#fff",
        textShadow: "0 0 18px rgba(212,168,42,0.25)",
      }}>
        <span aria-hidden style={{ width: 4, height: 16, borderRadius: 3, background: "linear-gradient(180deg, #f3d176, #d4a82a)", boxShadow: "0 0 10px rgba(212,168,42,0.75)" }} />
        {children}
      </h3>
      {sub && <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 10, color: "rgba(212,168,42,0.55)", letterSpacing: "0.25em" }}>{sub}</span>}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{
      padding: "8px 10px",
      textAlign: "left",
      color: "rgba(255,255,255,0.55)",
      fontFamily: "var(--font-zen),sans-serif",
      fontWeight: 700,
      fontSize: 10,
      letterSpacing: "0.12em",
      borderBottom: "1px solid rgba(255,255,255,0.1)",
      whiteSpace: "nowrap",
    }}>{children}</th>
  );
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <td style={{
      padding: "10px",
      whiteSpace: "nowrap",
      ...style,
    }}>{children}</td>
  );
}

function BigNum({ children, hl }: { children: React.ReactNode; hl?: boolean }) {
  return (
    <span style={{
      fontFamily: "var(--font-oswald),sans-serif",
      fontWeight: 700,
      fontSize: 15,
      color: hl ? "#d4a82a" : "#fff",
    }}>{children}</span>
  );
}

function SummaryCell({ label, value, fmt, accent }: { label: string; value: number; fmt: (n: number) => string; accent?: boolean }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", padding: "12px 14px", borderTop: accent ? "2px solid #d4a82a" : "2px solid rgba(255,255,255,0.12)" }}>
      <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.5)", letterSpacing: "0.16em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 24, fontWeight: 700, color: accent ? "#d4a82a" : "#fff", lineHeight: 1 }}>
        <CountUp value={value} fmt={fmt} />
      </div>
    </div>
  );
}

/* ── 打撃ビュー ───────────────────────────────────────── */
function BattingStatsView({ stats, scopeLabel, isGame }: { stats: BattingStat[]; scopeLabel: string; isGame: boolean }) {
  const active = stats.filter(s => s.ab > 0 || s.bb > 0 || s.hbp > 0);
  const ranked = [...active].sort((a, b) => b.ops - a.ops);

  // チーム合計（サマリ用）
  const teamAb = active.reduce((s, x) => s + x.ab, 0);
  const teamH = active.reduce((s, x) => s + x.h, 0);
  const teamHr = active.reduce((s, x) => s + x.hr, 0);
  const teamRbi = active.reduce((s, x) => s + x.rbi, 0);
  const teamSb = active.reduce((s, x) => s + x.sb, 0);
  const teamAvg = teamAb > 0 ? teamH / teamAb : 0;

  return (
    <div>
      {/* サマリ */}
      <section className="stx-row" style={{ ...cardStyle, padding: 16 }}>
        <H sub="TEAM SUMMARY">{scopeLabel}成績 — 打撃</H>
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))" }}>
          <SummaryCell label="チーム打率" value={teamAvg} fmt={fmtAvg} accent />
          <SummaryCell label="安打" value={teamH} fmt={n => String(Math.round(n))} />
          <SummaryCell label="本塁打" value={teamHr} fmt={n => String(Math.round(n))} />
          <SummaryCell label="打点" value={teamRbi} fmt={n => String(Math.round(n))} />
          <SummaryCell label="盗塁" value={teamSb} fmt={n => String(Math.round(n))} />
        </div>
      </section>

      {/* ランキングテーブル */}
      <section className="stx-row" style={{ ...cardStyle, animationDelay: "80ms" }}>
        <H sub="OPS RANKING">打撃成績（OPS順）</H>
        {ranked.length === 0 ? (
          <p style={emptyMsg}>{isGame ? "この試合の打席記録はありません。" : "まだ打席記録がありません。"}</p>
        ) : (
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>選手</Th>
                  <Th>試合</Th>
                  <Th>打席</Th>
                  <Th>安打</Th>
                  <Th>HR</Th>
                  <Th>打点</Th>
                  <Th>盗塁</Th>
                  <Th>打率</Th>
                  <Th>出塁率</Th>
                  <Th>長打率</Th>
                  <Th>OPS</Th>
                  <Th>wOBA</Th>
                  <Th>wRC+</Th>
                  <Th>WAR</Th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((s, i) => (
                  <tr key={s.m.id} className="stx-row" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", animationDelay: `${120 + i * 60}ms`, background: i === 0 ? "rgba(212,168,42,0.05)" : "transparent" }}>
                    <Td><RankBadge rank={i + 1} /></Td>
                    <Td>
                      <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 12, color: "#d4a82a", marginRight: 7 }}>#{s.m.jerseyNumber || "—"}</span>
                      <strong>{s.m.name}</strong>
                      {s.m.nickname && <span style={{ marginLeft: 6, color: "rgba(255,255,255,0.4)", fontSize: 11 }}>({s.m.nickname})</span>}
                    </Td>
                    <Td>{s.games}</Td>
                    <Td>{s.ab}</Td>
                    <Td><span style={{ color: "#d4a82a", fontWeight: 700 }}>{s.h}</span></Td>
                    <Td><span style={{ color: s.hr > 0 ? "#ff6982" : undefined, fontWeight: s.hr > 0 ? 700 : 400 }}>{s.hr}</span></Td>
                    <Td>{s.rbi}</Td>
                    <Td>{s.sb}{s.sbAttempts > 0 && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginLeft: 4 }}>({fmtPct(s.sbPct)})</span>}</Td>
                    <Td>
                      <BigNum>{fmtAvg(s.avg)}</BigNum>
                      <StatBar ratio={s.avg / 0.5} color="#67e088" delay={200 + i * 60} />
                    </Td>
                    <Td>{fmtAvg(s.obp)}</Td>
                    <Td>{fmtAvg(s.slg)}</Td>
                    <Td>
                      <BigNum hl>{fmtAvg(s.ops)}</BigNum>
                      <StatBar ratio={s.ops / 1.5} color="#d4a82a" delay={260 + i * 60} />
                    </Td>
                    <Td>{s.pa > 0 ? fmtAvg(s.woba) : "—"}</Td>
                    <Td><span style={{ fontFamily: "var(--font-oswald),sans-serif", fontWeight: 700, color: s.wrcPlus >= 100 ? "#67e088" : "#fff" }}>{s.pa > 0 ? s.wrcPlus : "—"}</span></Td>
                    <Td><span style={{ fontFamily: "var(--font-oswald),sans-serif", fontWeight: 700, color: s.war >= 0 ? "#d4a82a" : "#ff6982" }}>{s.pa > 0 ? s.war.toFixed(1) : "—"}</span></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", marginTop: 10, lineHeight: 1.7 }}>
          <strong style={{ color: "rgba(255,255,255,0.6)" }}>wOBA</strong>＝出塁の質を打率の物差しで表した総合打撃指標。
          <strong style={{ color: "rgba(255,255,255,0.6)" }}> wRC+</strong>＝チーム平均を100とした得点創出力（100超で平均以上）。
          <strong style={{ color: "rgba(255,255,255,0.6)" }}> WAR</strong>＝チームにどれだけ勝利を上積みしたかの目安（打撃のみの簡易版）。
          ※ いずれも本チーム内での相対評価・参考値です。打席数が少ないと数値が大きく振れます。
        </p>
      </section>

      {/* 個人カード */}
      {ranked.length > 0 && (
        <section className="stx-row" style={{ ...cardStyle, animationDelay: "180ms" }}>
          <H sub="PLAYER CARDS">個人カード</H>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))" }}>
            {ranked.map((s, i) => (
              <div key={s.m.id} className="stx-card stx-row" style={{ background: "rgba(255,255,255,0.03)", padding: 16, border: "1px solid rgba(255,255,255,0.07)", animationDelay: `${240 + i * 70}ms`, position: "relative", overflow: "hidden" }}>
                {i < 3 && (
                  <span style={{ position: "absolute", top: 10, right: 12 }}><RankBadge rank={i + 1} /></span>
                )}
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontFamily: "var(--font-oswald),sans-serif", color: "#d4a82a", fontSize: 22 }}>#{s.m.jerseyNumber || "—"}</span>
                  <span style={{ fontWeight: 800, fontSize: 16 }}>{s.m.name}</span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}>{s.m.position || "—"}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 12 }}>
                  <Meter label="打率" text={fmtAvg(s.avg)} ratio={s.avg / 0.5} color="#67e088" delay={i * 70} />
                  <Meter label="出塁率" text={fmtAvg(s.obp)} ratio={s.obp / 0.6} color="#8fc4ff" delay={i * 70 + 60} />
                  <Meter label="長打率" text={fmtAvg(s.slg)} ratio={s.slg / 0.9} color="#f28899" delay={i * 70 + 120} />
                  <Meter label="OPS" text={fmtAvg(s.ops)} ratio={s.ops / 1.5} color="#d4a82a" delay={i * 70 + 180} bold />
                </div>
                {/* セイバー指標 */}
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <div style={{ flex: 1, textAlign: "center", background: "rgba(212,168,42,0.08)", border: "1px solid rgba(212,168,42,0.2)", padding: "6px 4px" }}>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em" }}>wRC+</div>
                    <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 18, fontWeight: 700, color: s.wrcPlus >= 100 ? "#67e088" : "#fff" }}>{s.pa > 0 ? s.wrcPlus : "—"}</div>
                  </div>
                  <div style={{ flex: 1, textAlign: "center", background: "rgba(212,168,42,0.08)", border: "1px solid rgba(212,168,42,0.2)", padding: "6px 4px" }}>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em" }}>WAR</div>
                    <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 18, fontWeight: 700, color: "#d4a82a" }}>{s.pa > 0 ? s.war.toFixed(1) : "—"}</div>
                  </div>
                  <div style={{ flex: 1, textAlign: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", padding: "6px 4px" }}>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em" }}>wOBA</div>
                    <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 18, fontWeight: 700, color: "#fff" }}>{s.pa > 0 ? fmtAvg(s.woba) : "—"}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 12, fontSize: 11, color: "rgba(255,255,255,0.55)", flexWrap: "wrap" }}>
                  <span>HR <strong style={{ color: "#fff" }}>{s.hr}</strong></span>
                  <span>打点 <strong style={{ color: "#fff" }}>{s.rbi}</strong></span>
                  <span>盗塁 <strong style={{ color: "#fff" }}>{s.sb}</strong>{s.sbAttempts > 0 && `（${fmtPct(s.sbPct)}）`}</span>
                  <span>四球 <strong style={{ color: "#fff" }}>{s.bb}</strong></span>
                  <span>三振 <strong style={{ color: "#fff" }}>{s.so}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Meter({ label, text, ratio, color, delay = 0, bold }: { label: string; text: string; ratio: number; color: string; delay?: number; bold?: boolean }) {
  const w = Math.max(0.02, Math.min(1, ratio));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "52px 1fr 52px", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em" }}>{label}</span>
      <span className="stx-bar" style={{ maxWidth: "none", height: 5 }}>
        <span style={{ background: `linear-gradient(90deg, ${color}, ${color}cc)`, transform: `scaleX(${w})`, animationDelay: `${delay + 250}ms` }} />
      </span>
      <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: bold ? 15 : 13, fontWeight: 700, color: bold ? "#d4a82a" : "#fff", textAlign: "right" }}>{text}</span>
    </div>
  );
}

/* ── 投手ビュー ───────────────────────────────────────── */
function PitchingStatsView({ stats, scopeLabel }: { stats: PitchingStat[]; scopeLabel: string }) {
  const ranked = [...stats].sort((a, b) => (Number.isFinite(a.era) ? a.era : 999) - (Number.isFinite(b.era) ? b.era : 999));
  const teamOuts = stats.reduce((s, x) => s + x.ipOuts, 0);
  const teamEr = stats.reduce((s, x) => s + x.er, 0);
  const teamSo = stats.reduce((s, x) => s + x.so, 0);
  const teamEra = teamOuts > 0 ? (teamEr * 27) / teamOuts : 0;

  return (
    <div>
      <section className="stx-row" style={{ ...cardStyle, padding: 16 }}>
        <H sub="TEAM SUMMARY">{scopeLabel}成績 — 投手</H>
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))" }}>
          <SummaryCell label="チーム防御率" value={teamEra} fmt={fmtEra} accent />
          <SummaryCell label="投球回" value={teamOuts} fmt={n => fmtIp(Math.round(n))} />
          <SummaryCell label="奪三振" value={teamSo} fmt={n => String(Math.round(n))} />
        </div>
      </section>

      <section className="stx-row" style={{ ...cardStyle, animationDelay: "80ms" }}>
        <H sub="ERA RANKING">投手成績（防御率順）</H>
        {ranked.length === 0 ? (
          <p style={emptyMsg}>投手記録がありません。</p>
        ) : (
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>投手</Th>
                  <Th>登板</Th>
                  <Th>投球回</Th>
                  <Th>奪三振</Th>
                  <Th>与四球</Th>
                  <Th>被安打</Th>
                  <Th>失点</Th>
                  <Th>自責</Th>
                  <Th>K/9</Th>
                  <Th>WHIP</Th>
                  <Th>防御率</Th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((s, i) => (
                  <tr key={s.m.id} className="stx-row" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", animationDelay: `${120 + i * 60}ms`, background: i === 0 ? "rgba(212,168,42,0.05)" : "transparent" }}>
                    <Td><RankBadge rank={i + 1} /></Td>
                    <Td>
                      <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 12, color: "#d4a82a", marginRight: 7 }}>#{s.m.jerseyNumber || "—"}</span>
                      <strong>{s.m.name}</strong>
                    </Td>
                    <Td>{s.appearances}</Td>
                    <Td><span style={{ fontFamily: "var(--font-oswald),sans-serif" }}>{fmtIp(s.ipOuts)}</span></Td>
                    <Td>
                      <span style={{ color: "#67e088", fontWeight: 700 }}>{s.so}</span>
                      <StatBar ratio={Number.isFinite(s.k9) ? s.k9 / 15 : 0} color="#67e088" delay={200 + i * 60} />
                    </Td>
                    <Td>{s.bb}</Td>
                    <Td>{s.hits}</Td>
                    <Td>{s.runs}</Td>
                    <Td>{s.er}</Td>
                    <Td>{Number.isFinite(s.k9) ? s.k9.toFixed(2) : "—"}</Td>
                    <Td>{Number.isFinite(s.whip) ? s.whip.toFixed(2) : "—"}</Td>
                    <Td><BigNum hl>{fmtEra(s.era)}</BigNum></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/* ── 捕手ビュー ───────────────────────────────────────── */
function CatchingStatsView({ stats, scopeLabel }: { stats: CatchingStat[]; scopeLabel: string }) {
  const ranked = [...stats].sort((a, b) => b.rate - a.rate);
  return (
    <div>
      <section className="stx-row" style={cardStyle}>
        <H sub="CS% RANKING">{scopeLabel}成績 — 捕手（盗塁阻止率順）</H>
        {ranked.length === 0 ? (
          <p style={emptyMsg}>捕手記録がありません。</p>
        ) : (
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>捕手</Th>
                  <Th>試合</Th>
                  <Th>盗塁試行</Th>
                  <Th>阻止</Th>
                  <Th>盗塁阻止率</Th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((s, i) => (
                  <tr key={s.m.id} className="stx-row" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", animationDelay: `${100 + i * 60}ms`, background: i === 0 ? "rgba(212,168,42,0.05)" : "transparent" }}>
                    <Td><RankBadge rank={i + 1} /></Td>
                    <Td>
                      <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 12, color: "#d4a82a", marginRight: 7 }}>#{s.m.jerseyNumber || "—"}</span>
                      <strong>{s.m.name}</strong>
                    </Td>
                    <Td>{s.games}</Td>
                    <Td>{s.sba}</Td>
                    <Td><span style={{ color: "#67e088", fontWeight: 700 }}>{s.cs}</span></Td>
                    <Td>
                      <BigNum hl>{fmtPct(s.rate)}</BigNum>
                      <StatBar ratio={s.rate} color="#d4a82a" delay={200 + i * 60} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/* ── 守備ビュー ───────────────────────────────────────── */
function FieldingStatsView({ stats, scopeLabel }: { stats: FieldingStat[]; scopeLabel: string }) {
  const ranked = [...stats].sort((a, b) => b.rate - a.rate || b.chances - a.chances);
  const teamPo = stats.reduce((s, x) => s + x.po, 0);
  const teamA = stats.reduce((s, x) => s + x.a, 0);
  const teamE = stats.reduce((s, x) => s + x.e, 0);
  const teamCh = teamPo + teamA + teamE;
  const teamRate = teamCh > 0 ? (teamPo + teamA) / teamCh : 0;

  return (
    <div>
      <section className="stx-row" style={{ ...cardStyle, padding: 16 }}>
        <H sub="TEAM SUMMARY">{scopeLabel}成績 — 守備</H>
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))" }}>
          <SummaryCell label="チーム守備率" value={teamRate} fmt={fmtAvg} accent />
          <SummaryCell label="刺殺" value={teamPo} fmt={n => String(Math.round(n))} />
          <SummaryCell label="捕殺" value={teamA} fmt={n => String(Math.round(n))} />
          <SummaryCell label="失策" value={teamE} fmt={n => String(Math.round(n))} />
        </div>
      </section>

      <section className="stx-row" style={{ ...cardStyle, animationDelay: "80ms" }}>
        <H sub="FIELDING %">守備成績（守備率順）</H>
        {ranked.length === 0 ? (
          <p style={emptyMsg}>守備記録がありません。</p>
        ) : (
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>選手</Th>
                  <Th>試合</Th>
                  <Th>刺殺</Th>
                  <Th>捕殺</Th>
                  <Th>失策</Th>
                  <Th>守備機会</Th>
                  <Th>守備率</Th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((s, i) => (
                  <tr key={s.m.id} className="stx-row" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", animationDelay: `${100 + i * 60}ms`, background: i === 0 ? "rgba(212,168,42,0.05)" : "transparent" }}>
                    <Td><RankBadge rank={i + 1} /></Td>
                    <Td>
                      <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 12, color: "#d4a82a", marginRight: 7 }}>#{s.m.jerseyNumber || "—"}</span>
                      <strong>{s.m.name}</strong>
                    </Td>
                    <Td>{s.games}</Td>
                    <Td><span style={{ color: "#67e088", fontWeight: 700 }}>{s.po}</span></Td>
                    <Td><span style={{ color: "#8fc4ff", fontWeight: 700 }}>{s.a}</span></Td>
                    <Td><span style={{ color: s.e > 0 ? "#ff6982" : undefined, fontWeight: s.e > 0 ? 700 : 400 }}>{s.e}</span></Td>
                    <Td>{s.chances}</Td>
                    <Td>
                      <BigNum hl>{fmtAvg(s.rate)}</BigNum>
                      <StatBar ratio={s.rate} color="#d4a82a" delay={200 + i * 60} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", marginTop: 10, lineHeight: 1.6 }}>
          守備率 =（刺殺＋捕殺）÷（刺殺＋捕殺＋失策）。刺殺(PO)はアウトを直接取った数、捕殺(A)は送球などで補助した数です。
        </p>
      </section>
    </div>
  );
}

/* ── 日程ビュー（練習・試合 + 予告先発） ──────────────────── */
function ScheduleView({ upcoming, pastGames, probableByDate, participantsByDate, membersById, attendanceByDate, members, me, onPickMe, onVote }: {
  upcoming: PracticeRow[];
  pastGames: PracticeRow[];
  probableByDate: Map<string, ProbableRow>;
  participantsByDate: Map<string, ParticipantRow[]>;
  membersById: Map<string, Member>;
  attendanceByDate: Map<string, AttendanceRow[]>;
  members: Member[];
  me: string;
  onPickMe: (id: string) => void;
  onVote: (date: string, status: "出席" | "欠席") => Promise<boolean>;
}) {
  const [selected, setSelected] = useState<PracticeRow | null>(null);

  // 練習をタップ → 参加メンバー詳細へ（閉じると一覧に戻る）
  if (selected) {
    return (
      <ParticipantDetail
        practice={selected}
        participants={participantsByDate.get(selected.date) ?? []}
        attendance={attendanceByDate.get(selected.date) ?? []}
        membersById={membersById}
        members={members}
        me={me}
        onPickMe={onPickMe}
        onVote={onVote}
        probable={isGameType(selected.type) ? probableByDate.get(selected.date) : undefined}
        onClose={() => setSelected(null)}
      />
    );
  }

  const next = upcoming[0];
  const rest = upcoming.slice(1);
  // 「参加」票数（出席投票）を優先、無ければ事前登録数
  const countFor = (d: string) => {
    const yes = (attendanceByDate.get(d) ?? []).filter(a => a.status === "出席").length;
    return yes > 0 ? yes : (participantsByDate.get(d)?.length ?? 0);
  };

  return (
    <div>
      {/* 次回 */}
      {next ? (
        <section className="stx-row" style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
          {(() => {
            const st = practiceStatusLabel(next.status);
            const color = st.canceled ? "rgba(255,255,255,0.3)" : (PRACTICE_COLOR[next.type] ?? "#d4a82a");
            const prob = isGameType(next.type) ? probableByDate.get(next.date) : undefined;
            const cnt = countFor(next.date);
            return (
              <div
                className="stx-tap"
                onClick={() => setSelected(next)}
                role="button"
                tabIndex={0}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(next); } }}
                style={{ borderLeft: `4px solid ${color}`, padding: "18px 18px 16px", background: "linear-gradient(135deg, rgba(212,168,42,0.06), rgba(209,0,36,0.04))", position: "relative", opacity: st.canceled ? 0.6 : 1 }}
              >
                <span className="stx-rank-1" style={{ position: "absolute", top: -1, right: 12, fontFamily: "var(--font-oswald),sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.3em", background: "#d4a82a", color: "#0a0e1a", padding: "3px 12px" }}>NEXT</span>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ textAlign: "center", flexShrink: 0 }}>
                    <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 32, fontWeight: 700, lineHeight: 1 }}>{mdLabel(next.date)}</div>
                    <div style={{ fontSize: 11, color: "#d4a82a", marginTop: 5, letterSpacing: "0.15em", fontWeight: 700 }}>{weekday(next.date)}曜日</div>
                  </div>
                  <div style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,0.12)" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: color }} />
                      <span style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 900, fontSize: 16 }}>{practiceTypeLabel(next.type)}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", background: st.canceled ? "rgba(255,255,255,0.08)" : st.tentative ? "rgba(212,168,42,0.15)" : "rgba(255,255,255,0.08)", color: st.canceled ? "rgba(255,255,255,0.5)" : st.tentative ? "#d4a82a" : "rgba(255,255,255,0.85)", padding: "2px 8px" }}>{st.label}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}>📍 {next.place}</div>
                    {next.time && <div style={{ fontSize: 12, color: "#d4a82a", marginTop: 3, fontFamily: "var(--font-oswald),sans-serif", letterSpacing: "0.08em" }}>🕐 {next.time}</div>}
                    {next.note && <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginTop: 5 }}>※ {next.note}</div>}
                  </div>
                </div>
                {/* 予告先発 */}
                {isGameType(next.type) && (
                  <div style={{ marginTop: 14, background: "rgba(155,89,182,0.1)", border: "1px solid rgba(155,89,182,0.4)", padding: "10px 14px" }}>
                    <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 10, color: "#c08fe0", letterSpacing: "0.25em", marginBottom: 5 }}>PROBABLE PITCHER ／ 予告先発</div>
                    {prob && prob.memberName ? (
                      <div>
                        <span style={{ fontSize: 17, fontWeight: 900 }}>⚾ {prob.memberName}</span>
                        {prob.opponent && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginLeft: 10 }}>vs {prob.opponent}</span>}
                        {prob.note && <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>{prob.note}</div>}
                      </div>
                    ) : (
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>未発表（決まり次第お知らせします）</span>
                    )}
                  </div>
                )}
                {/* 参加予定 → タップ誘導 */}
                <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  <span style={{ fontSize: 12.5, color: cnt > 0 ? "#67e088" : "rgba(255,255,255,0.5)" }}>
                    👥 参加予定 <strong style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 15 }}>{cnt}</strong> 人
                  </span>
                  <span style={{ fontSize: 11.5, color: "#d4a82a", fontWeight: 700 }}>タップで参加メンバー →</span>
                </div>
              </div>
            );
          })()}
        </section>
      ) : (
        <section className="stx-row" style={cardStyle}>
          <p style={emptyMsg}>今後の予定はまだ登録されていません。<br />決まり次第ここに表示されます。</p>
        </section>
      )}

      {/* これ以降の予定 */}
      {rest.length > 0 && (
        <section className="stx-row" style={{ ...cardStyle, animationDelay: "80ms" }}>
          <H sub="UPCOMING">今後の予定</H>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {rest.map((p, i) => {
              const st = practiceStatusLabel(p.status);
              const color = st.canceled ? "rgba(255,255,255,0.3)" : (PRACTICE_COLOR[p.type] ?? "#d4a82a");
              const prob = isGameType(p.type) ? probableByDate.get(p.date) : undefined;
              const cnt = countFor(p.date);
              return (
                <li
                  key={p.date + p.place + i}
                  className="stx-row stx-tap"
                  onClick={() => setSelected(p)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(p); } }}
                  style={{ display: "flex", gap: 14, padding: "12px 8px 12px 12px", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.05)", borderLeft: `3px solid ${color}`, opacity: st.canceled ? 0.55 : 1, animationDelay: `${120 + i * 50}ms` }}
                >
                  <div style={{ minWidth: 50, textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 18, lineHeight: 1 }}>{mdLabel(p.date)}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 3 }}>{weekday(p.date)}曜日</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 700, fontSize: 13.5 }}>{practiceTypeLabel(p.type)}</span>
                      <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", background: st.tentative ? "rgba(212,168,42,0.15)" : "rgba(255,255,255,0.07)", color: st.tentative ? "#d4a82a" : "rgba(255,255,255,0.55)", padding: "2px 7px" }}>{st.label}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.75)" }}>📍 {p.place}{p.time ? ` / ${p.time}` : ""}</div>
                    {prob && prob.memberName && (
                      <div style={{ fontSize: 11.5, color: "#c08fe0", marginTop: 3 }}>⚾ 予告先発: <strong style={{ color: "#fff" }}>{prob.memberName}</strong></div>
                    )}
                    {p.note && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>※ {p.note}</div>}
                  </div>
                  <div style={{ alignSelf: "center", textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 11.5, color: cnt > 0 ? "#67e088" : "rgba(255,255,255,0.4)" }}>👥 {cnt}</div>
                    <div style={{ fontSize: 16, color: "rgba(255,255,255,0.35)", lineHeight: 1 }}>›</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* 最近の試合 */}
      {pastGames.length > 0 && (
        <section className="stx-row" style={{ ...cardStyle, animationDelay: "140ms" }}>
          <H sub="RECENT GAMES">最近の試合</H>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {pastGames.map((p, i) => {
              const color = PRACTICE_COLOR[p.type] ?? "#9b59b6";
              const cnt = countFor(p.date);
              return (
                <li
                  key={p.date + p.place + i}
                  className="stx-tap"
                  onClick={() => setSelected(p)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(p); } }}
                  style={{ display: "flex", gap: 12, padding: "10px 8px 10px 4px", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.05)" }}
                >
                  <div style={{ minWidth: 50, textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 16, color: "rgba(255,255,255,0.8)", lineHeight: 1 }}>{mdLabel(p.date)}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>{weekday(p.date)}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
                      <span style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 700, fontSize: 13 }}>{practiceTypeLabel(p.type)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>📍 {p.place}</div>
                  </div>
                  <div style={{ alignSelf: "center", textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 11.5, color: cnt > 0 ? "#67e088" : "rgba(255,255,255,0.4)" }}>👥 {cnt}</div>
                    <div style={{ fontSize: 16, color: "rgba(255,255,255,0.35)", lineHeight: 1 }}>›</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ── 参加メンバー詳細（練習タップで表示・閉じると一覧へ） ──────── */
function ParticipantDetail({ practice, participants, attendance, membersById, members, me, onPickMe, onVote, probable, onClose }: {
  practice: PracticeRow;
  participants: ParticipantRow[];
  attendance: AttendanceRow[];
  membersById: Map<string, Member>;
  members: Member[];
  me: string;
  onPickMe: (id: string) => void;
  onVote: (date: string, status: "出席" | "欠席") => Promise<boolean>;
  probable?: ProbableRow;
  onClose: () => void;
}) {
  const st = practiceStatusLabel(practice.status);
  const color = st.canceled ? "rgba(255,255,255,0.3)" : (PRACTICE_COLOR[practice.type] ?? "#d4a82a");
  const [voting, setVoting] = useState<"" | "出席" | "欠席">("");
  const [changeMe, setChangeMe] = useState(false);
  const [scoring, setScoring] = useState(false);
  const isGame = isGameType(practice.type);

  if (scoring) {
    return (
      <Scorer
        date={practice.date}
        defaultOpponent={probable?.opponent || practice.note || ""}
        members={members}
        membersById={membersById}
        onClose={() => setScoring(false)}
      />
    );
  }

  const myVote = attendance.find(a => a.memberId === me)?.status ?? "";
  const yes = attendance.filter(a => a.status === "出席");
  const no = attendance.filter(a => a.status === "欠席");
  const byJersey = <T extends { memberId: string }>(arr: T[]): T[] => [...arr].sort((a, b) =>
    (Number(membersById.get(a.memberId)?.jerseyNumber) || 999) - (Number(membersById.get(b.memberId)?.jerseyNumber) || 999));

  async function doVote(status: "出席" | "欠席") {
    if (!me || voting) return;
    setVoting(status);
    await onVote(practice.date, status);
    setVoting("");
  }

  const meMember = membersById.get(me);

  return (
    <div className="stx-detail">
      {/* 戻る/閉じる */}
      <button
        onClick={onClose}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", marginBottom: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontFamily: "var(--font-zen),sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
      >
        ← 日程一覧に戻る
      </button>

      {/* 練習ヘッダー */}
      <section style={{ ...cardStyle, padding: 0, overflow: "hidden", marginBottom: 14 }}>
        <div style={{ borderLeft: `4px solid ${color}`, padding: "16px 18px", background: "linear-gradient(135deg, rgba(212,168,42,0.06), rgba(209,0,36,0.04))" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ textAlign: "center", flexShrink: 0 }}>
              <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{mdLabel(practice.date)}</div>
              <div style={{ fontSize: 10.5, color: "#d4a82a", marginTop: 4, fontWeight: 700 }}>{weekday(practice.date)}曜日</div>
            </div>
            <div style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,0.12)" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                <span style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 900, fontSize: 15 }}>{practiceTypeLabel(practice.type)}</span>
                <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.8)", padding: "2px 7px" }}>{st.label}</span>
              </div>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.8)" }}>📍 {practice.place}{practice.time ? ` / ${practice.time}` : ""}</div>
              {probable && probable.memberName && (
                <div style={{ fontSize: 11.5, color: "#c08fe0", marginTop: 3 }}>⚾ 予告先発: <strong style={{ color: "#fff" }}>{probable.memberName}</strong></div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* スコアをつける（試合のみ・承認制） */}
      {isGame && (
        <button
          onClick={() => setScoring(true)}
          style={{ width: "100%", padding: "14px", marginBottom: 14, cursor: "pointer", fontFamily: "var(--font-zen),sans-serif", fontWeight: 800, fontSize: 15, color: "#0a0e1a", background: "linear-gradient(135deg,#d4a82a,#f0cf6a)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          📋 スコアをつける
          <span style={{ fontSize: 10.5, fontWeight: 700, opacity: 0.75 }}>（記録 → 管理者の承認で反映）</span>
        </button>
      )}

      {/* あなたの出欠（投票） */}
      <section style={{ ...cardStyle, marginBottom: 14, border: "1px solid rgba(212,168,42,0.3)" }}>
        <H sub="YOUR RSVP">参加投票</H>
        {(!me || changeMe) ? (
          <div>
            <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 6 }}>あなたの名前を選んでください</label>
            <select
              value={me}
              onChange={e => { onPickMe(e.target.value); setChangeMe(false); }}
              className="admin-dark"
              style={{ width: "100%", padding: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: 14 }}
            >
              <option value="">— 選んでください —</option>
              {members.filter(m => m.active).map(m => (
                <option key={m.id} value={m.id}>#{m.jerseyNumber || "—"} {m.name}</option>
              ))}
            </select>
            <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>※ この端末に記憶されます（次回から選択不要）。</p>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>あなた：</span>
              <strong style={{ fontSize: 14 }}>#{meMember?.jerseyNumber || "—"} {meMember?.name || "（不明）"}</strong>
              <button onClick={() => setChangeMe(true)} style={{ marginLeft: "auto", fontSize: 11, color: "#d4a82a", background: "transparent", border: "1px solid rgba(212,168,42,0.4)", padding: "3px 10px", cursor: "pointer" }}>変更</button>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => doVote("出席")}
                disabled={!!voting}
                style={{ flex: 1, padding: "14px", cursor: voting ? "wait" : "pointer", fontFamily: "var(--font-zen),sans-serif", fontWeight: 800, fontSize: 15, color: myVote === "出席" ? "#0a0e1a" : "#67e088", background: myVote === "出席" ? "linear-gradient(135deg,#67e088,#9ff0b3)" : "rgba(103,224,136,0.12)", border: myVote === "出席" ? "none" : "1px solid rgba(103,224,136,0.4)" }}
              >
                {voting === "出席" ? "送信中…" : "⭕ 参加する"}
              </button>
              <button
                onClick={() => doVote("欠席")}
                disabled={!!voting}
                style={{ flex: 1, padding: "14px", cursor: voting ? "wait" : "pointer", fontFamily: "var(--font-zen),sans-serif", fontWeight: 800, fontSize: 15, color: myVote === "欠席" ? "#fff" : "#ff6982", background: myVote === "欠席" ? "linear-gradient(135deg,#d10024,#ff4d6a)" : "rgba(209,0,36,0.1)", border: myVote === "欠席" ? "none" : "1px solid rgba(209,0,36,0.4)" }}
              >
                {voting === "欠席" ? "送信中…" : "❌ 不参加"}
              </button>
            </div>
            {myVote && <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", marginTop: 8, textAlign: "center" }}>現在の回答：<strong style={{ color: myVote === "出席" ? "#67e088" : "#ff6982" }}>{myVote === "出席" ? "参加" : "不参加"}</strong>（押し直しで変更できます）</p>}
          </div>
        )}
      </section>

      {/* 参加 / 不参加 一覧（投票結果＝管理者の出欠と同じ） */}
      <section style={cardStyle}>
        <H sub="ATTENDING">参加 {yes.length}人 ／ 不参加 {no.length}人</H>
        {yes.length === 0 && no.length === 0 ? (
          <p style={emptyMsg}>まだ投票がありません。<br />上のボタンから参加/不参加を回答してください。</p>
        ) : (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#67e088", letterSpacing: "0.1em", margin: "4px 0 6px" }}>⭕ 参加（{yes.length}）</div>
            <ul style={{ listStyle: "none", margin: "0 0 14px", padding: 0 }}>
              {byJersey(yes).map((a, i) => {
                const m = membersById.get(a.memberId);
                return (
                  <li key={a.memberId + i} className="stx-row" style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 4px", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.05)", animationDelay: `${i * 35}ms` }}>
                    <span style={{ flexShrink: 0, width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: "50%", background: "rgba(103,224,136,0.12)", border: "1px solid rgba(103,224,136,0.35)", fontFamily: "var(--font-oswald),sans-serif", fontSize: 13, fontWeight: 700, color: "#67e088" }}>{m?.jerseyNumber || "—"}</span>
                    <span style={{ fontWeight: 700, fontSize: 13.5 }}>{m?.name || a.memberName}{m?.nickname && <span style={{ marginLeft: 6, color: "rgba(255,255,255,0.4)", fontSize: 11 }}>({m.nickname})</span>}</span>
                  </li>
                );
              })}
            </ul>
            {no.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#ff6982", letterSpacing: "0.1em", margin: "0 0 6px" }}>❌ 不参加（{no.length}）</div>
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {byJersey(no).map((a, i) => {
                    const m = membersById.get(a.memberId);
                    return (
                      <li key={a.memberId + i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 4px", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.05)", opacity: 0.7 }}>
                        <span style={{ flexShrink: 0, width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: "50%", background: "rgba(255,255,255,0.05)", fontFamily: "var(--font-oswald),sans-serif", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>{m?.jerseyNumber || "—"}</span>
                        <span style={{ fontWeight: 600, fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{m?.name || a.memberName}</span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </>
        )}
        {participants.length > 0 && (
          <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.35)", marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            事前登録（管理者）: {participants.length}人
          </p>
        )}
      </section>
    </div>
  );
}

/* ── スコアラー（試合のスコアを記録 → 承認待ちに送る） ──────── */
type BLine = { atBats: number; hits: number; doubles: number; triples: number; hr: number; rbi: number; bb: number; so: number; hbp: number; sh: number; sb: number; cs: number };
type PUI = { inn: number; outs: number; hits: number; runs: number; er: number; so: number; bb: number; hbp: number };
const emptyB = (): BLine => ({ atBats: 0, hits: 0, doubles: 0, triples: 0, hr: 0, rbi: 0, bb: 0, so: 0, hbp: 0, sh: 0, sb: 0, cs: 0 });
const emptyP = (): PUI => ({ inn: 0, outs: 0, hits: 0, runs: 0, er: 0, so: 0, bb: 0, hbp: 0 });

const BAT_ACTIONS: { key: string; label: string; deltas: Partial<BLine>; tone: string }[] = [
  { key: "1b", label: "単打", deltas: { atBats: 1, hits: 1 }, tone: "#67e088" },
  { key: "2b", label: "二塁打", deltas: { atBats: 1, hits: 1, doubles: 1 }, tone: "#67e088" },
  { key: "3b", label: "三塁打", deltas: { atBats: 1, hits: 1, triples: 1 }, tone: "#67e088" },
  { key: "hr", label: "本塁打", deltas: { atBats: 1, hits: 1, hr: 1 }, tone: "#d4a82a" },
  { key: "bb", label: "四球", deltas: { bb: 1 }, tone: "#7fb3ff" },
  { key: "hbp", label: "死球", deltas: { hbp: 1 }, tone: "#7fb3ff" },
  { key: "so", label: "三振", deltas: { atBats: 1, so: 1 }, tone: "#ff6982" },
  { key: "out", label: "凡退", deltas: { atBats: 1 }, tone: "rgba(255,255,255,0.6)" },
  { key: "sh", label: "犠打", deltas: { sh: 1 }, tone: "#7fb3ff" },
];
const BAT_MODS: { key: string; label: string; deltas: Partial<BLine>; tone: string }[] = [
  { key: "rbi", label: "打点 +1", deltas: { rbi: 1 }, tone: "#d4a82a" },
  { key: "sb", label: "盗塁 +1", deltas: { sb: 1 }, tone: "#67e088" },
  { key: "cs", label: "盗塁死 +1", deltas: { cs: 1 }, tone: "#ff6982" },
];

/* ── ライブ記録：試合状況（回・表裏・アウト・カウント・走者・得点） ── */
type RunnerSlot = { id: string; name: string } | null;
type Bases = { b1: RunnerSlot; b2: RunnerSlot; b3: RunnerSlot };
type Live = {
  inning: number; half: "top" | "bottom";
  outs: number; balls: number; strikes: number;
  bases: Bases; ourScore: number; oppScore: number;
};
const emptyBases = (): Bases => ({ b1: null, b2: null, b3: null });
const initLive = (): Live => ({ inning: 1, half: "top", outs: 0, balls: 0, strikes: 0, bases: emptyBases(), ourScore: 0, oppScore: 0 });
const occCount = (b: Bases) => (b.b1 ? 1 : 0) + (b.b2 ? 1 : 0) + (b.b3 ? 1 : 0);
const inningLabel = (l: Live) => `${l.inning}回${l.half === "top" ? "表" : "裏"}`;
const oppRunner = (): RunnerSlot => ({ id: "o" + Math.random().toString(36).slice(2, 7), name: "走者" });

// 走者を n 塁進める（打者は含まない）。戻り値：新ベースと得点数
function advanceRunners(bases: Bases, n: number): { bases: Bases; runs: number } {
  const occ: { base: number; r: RunnerSlot }[] = [];
  if (bases.b3) occ.push({ base: 3, r: bases.b3 });
  if (bases.b2) occ.push({ base: 2, r: bases.b2 });
  if (bases.b1) occ.push({ base: 1, r: bases.b1 });
  const nb = emptyBases(); let runs = 0;
  for (const o of occ) {
    const dest = o.base + n;
    if (dest >= 4) runs++;
    else if (dest === 3) nb.b3 = o.r;
    else if (dest === 2) nb.b2 = o.r;
    else nb.b1 = o.r;
  }
  return { bases: nb, runs };
}
// 四死球の押し出し：詰まっている走者だけ進める
function forcePush(bases: Bases, batter: RunnerSlot): { bases: Bases; runs: number } {
  const nb: Bases = { ...bases }; let runs = 0;
  if (!nb.b1) nb.b1 = batter;
  else if (!nb.b2) { nb.b2 = nb.b1; nb.b1 = batter; }
  else if (!nb.b3) { nb.b3 = nb.b2; nb.b2 = nb.b1; nb.b1 = batter; }
  else { runs = 1; nb.b3 = nb.b2; nb.b2 = nb.b1; nb.b1 = batter; }
  return { bases: nb, runs };
}
// アウトを加算し、3アウトで攻守交代（回・表裏を進めベース/カウントを空に）
function liveAddOuts(prev: Live, add: number): Live {
  const outs = prev.outs + add;
  if (outs < 3) return { ...prev, outs, balls: 0, strikes: 0 };
  const toBottom = prev.half === "top";
  return { ...prev, outs: 0, balls: 0, strikes: 0, bases: emptyBases(), half: toBottom ? "bottom" : "top", inning: toBottom ? prev.inning : prev.inning + 1 };
}

function LiveDots({ label, n, max, color }: { label: string; n: number; max: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 12, color: "rgba(255,255,255,0.55)", width: 12 }}>{label}</span>
      <div style={{ display: "flex", gap: 5 }}>
        {Array.from({ length: max }).map((_, i) => (
          <span key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: i < n ? color : "rgba(255,255,255,0.12)", boxShadow: i < n ? `0 0 9px ${color}` : "none", transition: "background .15s, box-shadow .15s" }} />
        ))}
      </div>
    </div>
  );
}
function BaseDiamond({ bases }: { bases: Bases }) {
  const sq = (occ: boolean): React.CSSProperties => ({
    position: "absolute", width: 32, height: 32, transform: "translate(-50%,-50%) rotate(45deg)",
    background: occ ? "linear-gradient(135deg,#f0cf6a,#d4a82a)" : "rgba(255,255,255,0.06)",
    border: "1px solid " + (occ ? "#f0cf6a" : "rgba(255,255,255,0.2)"),
    boxShadow: occ ? "0 0 16px rgba(212,168,42,0.65)" : "none", transition: "background .2s, box-shadow .2s",
  });
  const lbl = (occ: boolean): React.CSSProperties => ({ position: "absolute", transform: "translate(-50%,-50%)", fontSize: 9, fontWeight: 800, color: occ ? "#0a0e1a" : "rgba(255,255,255,0.5)", zIndex: 1, fontFamily: "var(--font-oswald),sans-serif" });
  return (
    <div style={{ position: "relative", width: 150, height: 118, margin: "12px auto 2px" }}>
      <div style={{ ...sq(!!bases.b2), left: "50%", top: "26%" }} />
      <div style={{ ...sq(!!bases.b3), left: "20%", top: "60%" }} />
      <div style={{ ...sq(!!bases.b1), left: "80%", top: "60%" }} />
      <div style={{ position: "absolute", left: "50%", top: "92%", transform: "translate(-50%,-50%)", width: 15, height: 15, background: "rgba(255,255,255,0.45)", clipPath: "polygon(50% 0,100% 38%,82% 100%,18% 100%,0 38%)" }} />
      <span style={{ ...lbl(!!bases.b2), left: "50%", top: "26%" }}>2</span>
      <span style={{ ...lbl(!!bases.b3), left: "20%", top: "60%" }}>3</span>
      <span style={{ ...lbl(!!bases.b1), left: "80%", top: "60%" }}>1</span>
    </div>
  );
}

function Scorer({ date, defaultOpponent, members, membersById, onClose }: {
  date: string;
  defaultOpponent: string;
  members: Member[];
  membersById: Map<string, Member>;
  onClose: () => void;
}) {
  const active = useMemo(() =>
    [...members].filter(m => m.active).sort((a, b) => (Number(a.jerseyNumber) || 999) - (Number(b.jerseyNumber) || 999)),
    [members]);
  const [opponent, setOpponent] = useState(defaultOpponent);
  const [tab, setTab] = useState<"bat" | "pitch">("bat");
  const [batter, setBatter] = useState("");
  const [batLines, setBatLines] = useState<Record<string, BLine>>({});
  const [events, setEvents] = useState<{ memberId: string; deltas: Partial<BLine> }[]>([]);
  const [pitcher, setPitcher] = useState("");
  const [pitchLines, setPitchLines] = useState<Record<string, PUI>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  // ── ライブ記録モード ──
  const [mode, setMode] = useState<"live" | "simple">("live");
  const [live, setLive] = useState<Live>(initLive);
  const [weBatHalf, setWeBatHalf] = useState<"top" | "bottom">("bottom"); // 自チームが攻撃する回（既定：裏＝ホーム）
  const [feed, setFeed] = useState<string[]>([]);
  const histRef = useRef<{ live: Live; batLines: Record<string, BLine>; pitchLines: Record<string, PUI>; batter: string; pitcher: string; feed: string[] }[]>([]);
  const [histLen, setHistLen] = useState(0);
  const ourTurn = live.half === weBatHalf;

  function snap() {
    histRef.current.push(JSON.parse(JSON.stringify({ live, batLines, pitchLines, batter, pitcher, feed })));
    if (histRef.current.length > 60) histRef.current.shift();
    setHistLen(histRef.current.length);
  }
  function undoLive() {
    const s = histRef.current.pop();
    setHistLen(histRef.current.length);
    if (!s) return;
    setLive(s.live); setBatLines(s.batLines); setPitchLines(s.pitchLines); setBatter(s.batter); setPitcher(s.pitcher); setFeed(s.feed);
  }
  const pushFeed = (t: string) => setFeed(f => [t, ...f].slice(0, 8));

  function addBatStat(id: string, deltas: Partial<BLine>) {
    setBatLines(prev => {
      const cur = prev[id] ?? emptyB(); const next = { ...cur };
      (Object.keys(deltas) as (keyof BLine)[]).forEach(k => { next[k] = (next[k] || 0) + (deltas[k] || 0); });
      return { ...prev, [id]: next };
    });
  }
  function addPitchStat(id: string, deltas: Partial<PUI>) {
    setPitchLines(prev => {
      const cur = prev[id] ?? emptyP(); const next = { ...cur };
      (Object.keys(deltas) as (keyof PUI)[]).forEach(k => { next[k] = (next[k] || 0) + (deltas[k] || 0); });
      return { ...prev, [id]: next };
    });
  }
  function addPitchOut(id: string, n = 1) {
    setPitchLines(prev => {
      const cur = prev[id] ?? emptyP(); let inn = cur.inn, outs = cur.outs + n;
      while (outs >= 3) { inn++; outs -= 3; }
      return { ...prev, [id]: { ...cur, inn, outs } };
    });
  }

  // ── 自チーム攻撃 ──
  function ourHit(baseReached: 1 | 2 | 3 | 4, label: string) {
    if (!batter) { setErr("打者を選んでください。"); return; }
    setErr(""); snap();
    const runner: RunnerSlot = { id: batter, name: membersById.get(batter)?.name || "" };
    let runs = 0; let bases: Bases;
    if (baseReached === 4) { runs = occCount(live.bases) + 1; bases = emptyBases(); }
    else {
      const adv = advanceRunners(live.bases, baseReached); runs = adv.runs; bases = adv.bases;
      if (baseReached === 1) bases.b1 = runner; else if (baseReached === 2) bases.b2 = runner; else bases.b3 = runner;
    }
    const deltas: Partial<BLine> = { atBats: 1, hits: 1 };
    if (baseReached === 2) deltas.doubles = 1; else if (baseReached === 3) deltas.triples = 1; else if (baseReached === 4) deltas.hr = 1;
    if (runs > 0) deltas.rbi = runs;
    addBatStat(batter, deltas);
    setLive(prev => ({ ...prev, bases, ourScore: prev.ourScore + runs, balls: 0, strikes: 0 }));
    pushFeed(`${inningLabel(live)} ${runner.name} ${label}${runs ? `・${runs}点` : ""}`);
  }
  function ourOut(kind: "so" | "go" | "fo" | "sh") {
    if (!batter) { setErr("打者を選んでください。"); return; }
    setErr(""); snap();
    const deltas: Partial<BLine> = kind === "so" ? { atBats: 1, so: 1 } : kind === "sh" ? { sh: 1 } : { atBats: 1 };
    addBatStat(batter, deltas);
    setLive(prev => liveAddOuts(prev, 1));
    const name = membersById.get(batter)?.name || "";
    pushFeed(`${inningLabel(live)} ${name} ${kind === "so" ? "三振" : kind === "sh" ? "犠打" : kind === "go" ? "ゴロ" : "フライ"}`);
  }
  function ourWalk(hbp = false) {
    if (!batter) { setErr("打者を選んでください。"); return; }
    setErr(""); snap();
    const runner: RunnerSlot = { id: batter, name: membersById.get(batter)?.name || "" };
    const { bases, runs } = forcePush(live.bases, runner);
    const deltas: Partial<BLine> = hbp ? { hbp: 1 } : { bb: 1 };
    if (runs > 0) deltas.rbi = runs;
    addBatStat(batter, deltas);
    setLive(prev => ({ ...prev, bases, ourScore: prev.ourScore + runs, balls: 0, strikes: 0 }));
    pushFeed(`${inningLabel(live)} ${runner.name} ${hbp ? "死球" : "四球"}`);
  }
  function ourReachError() {
    if (!batter) { setErr("打者を選んでください。"); return; }
    setErr(""); snap();
    const runner: RunnerSlot = { id: batter, name: membersById.get(batter)?.name || "" };
    const adv = advanceRunners(live.bases, 1); const bases = adv.bases; bases.b1 = runner;
    addBatStat(batter, { atBats: 1 });
    setLive(prev => ({ ...prev, bases, ourScore: prev.ourScore + adv.runs, balls: 0, strikes: 0 }));
    pushFeed(`${inningLabel(live)} ${runner.name} 失策出塁`);
  }
  function ourBall() { if (live.balls + 1 >= 4) { ourWalk(false); return; } snap(); setLive(p => ({ ...p, balls: p.balls + 1 })); }
  function ourStrike() { if (live.strikes + 1 >= 3) { ourOut("so"); return; } snap(); setLive(p => ({ ...p, strikes: p.strikes + 1 })); }
  function ourFoul() { if (live.strikes >= 2) return; snap(); setLive(p => ({ ...p, strikes: p.strikes + 1 })); }

  // ── 守備（相手攻撃・自チーム投手） ──
  function oppHit(baseReached: 1 | 2 | 3 | 4, label: string) {
    if (!pitcher) { setErr("投手を選んでください。"); return; }
    setErr(""); snap();
    addPitchStat(pitcher, { hits: 1 });
    let runs = 0; let bases: Bases;
    if (baseReached === 4) { runs = occCount(live.bases) + 1; bases = emptyBases(); }
    else {
      const adv = advanceRunners(live.bases, baseReached); runs = adv.runs; bases = adv.bases;
      const r = oppRunner();
      if (baseReached === 1) bases.b1 = r; else if (baseReached === 2) bases.b2 = r; else bases.b3 = r;
    }
    if (runs > 0) addPitchStat(pitcher, { runs, er: runs });
    setLive(prev => ({ ...prev, bases, oppScore: prev.oppScore + runs, balls: 0, strikes: 0 }));
    pushFeed(`${inningLabel(live)} 相手 ${label}${runs ? `・${runs}失点` : ""}`);
  }
  function oppOut(kind: "go" | "fo") {
    if (!pitcher) { setErr("投手を選んでください。"); return; }
    setErr(""); snap(); addPitchOut(pitcher, 1);
    setLive(prev => liveAddOuts(prev, 1));
    pushFeed(`${inningLabel(live)} 相手 ${kind === "go" ? "ゴロ" : "フライ"}アウト`);
  }
  function oppStrikeout() {
    if (!pitcher) { setErr("投手を選んでください。"); return; }
    setErr(""); snap(); addPitchStat(pitcher, { so: 1 }); addPitchOut(pitcher, 1);
    setLive(prev => liveAddOuts(prev, 1));
    pushFeed(`${inningLabel(live)} 奪三振`);
  }
  function oppWalk(hbp = false) {
    if (!pitcher) { setErr("投手を選んでください。"); return; }
    setErr(""); snap(); addPitchStat(pitcher, hbp ? { hbp: 1 } : { bb: 1 });
    const { bases, runs } = forcePush(live.bases, oppRunner());
    if (runs > 0) addPitchStat(pitcher, { runs, er: runs });
    setLive(prev => ({ ...prev, bases, oppScore: prev.oppScore + runs, balls: 0, strikes: 0 }));
    pushFeed(`${inningLabel(live)} ${hbp ? "与死球" : "与四球"}`);
  }
  function oppRun() {
    if (!pitcher) { setErr("投手を選んでください。"); return; }
    setErr(""); snap(); addPitchStat(pitcher, { runs: 1, er: 1 });
    setLive(prev => ({ ...prev, oppScore: prev.oppScore + 1 }));
    pushFeed(`${inningLabel(live)} 失点 +1`);
  }
  function oppError() {
    setErr(""); snap();
    const adv = advanceRunners(live.bases, 1); const bases = adv.bases; bases.b1 = oppRunner();
    setLive(prev => ({ ...prev, bases, oppScore: prev.oppScore + adv.runs, balls: 0, strikes: 0 }));
    pushFeed(`${inningLabel(live)} 失策で出塁`);
  }
  function defBall() { if (live.balls + 1 >= 4) { oppWalk(false); return; } snap(); setLive(p => ({ ...p, balls: p.balls + 1 })); }
  function defStrike() { if (live.strikes + 1 >= 3) { oppStrikeout(); return; } snap(); setLive(p => ({ ...p, strikes: p.strikes + 1 })); }
  function defFoul() { if (live.strikes >= 2) return; snap(); setLive(p => ({ ...p, strikes: p.strikes + 1 })); }

  // ── 走者操作（進塁/生還/盗塁/走塁死） ──
  function runnerOp(base: "b1" | "b2" | "b3", op: "adv" | "steal" | "out") {
    const r = live.bases[base]; if (!r) return;
    setErr(""); snap();
    if (ourTurn && op === "steal") addBatStat(r.id, { sb: 1 });
    if (ourTurn && op === "out") addBatStat(r.id, { cs: 1 });
    if (!ourTurn && op === "out" && pitcher) addPitchOut(pitcher, 1);
    setLive(prev => {
      const bases = { ...prev.bases }; bases[base] = null;
      if (op === "out") return liveAddOuts({ ...prev, bases }, 1);
      const to = base === "b1" ? "b2" : base === "b2" ? "b3" : null;
      let scoreRun = 0;
      if (to === null) scoreRun = 1; else bases[to] = r;
      return ourTurn
        ? { ...prev, bases, ourScore: prev.ourScore + scoreRun }
        : { ...prev, bases, oppScore: prev.oppScore + scoreRun };
    });
    pushFeed(`${inningLabel(live)} ${r.name} ${op === "steal" ? "盗塁" : op === "out" ? "走塁死" : base === "b3" ? "生還" : "進塁"}`);
  }
  function manualChange() {
    snap();
    setLive(prev => { const toBottom = prev.half === "top"; return { ...prev, outs: 0, balls: 0, strikes: 0, bases: emptyBases(), half: toBottom ? "bottom" : "top", inning: toBottom ? prev.inning : prev.inning + 1 }; });
    pushFeed("攻守交代");
  }

  function applyBat(deltas: Partial<BLine>) {
    if (!batter) { setErr("先に打者を選んでください。"); return; }
    setErr("");
    setBatLines(prev => {
      const cur = prev[batter] ?? emptyB();
      const next = { ...cur };
      (Object.keys(deltas) as (keyof BLine)[]).forEach(k => { next[k] = (next[k] || 0) + (deltas[k] || 0); });
      return { ...prev, [batter]: next };
    });
    setEvents(e => [...e, { memberId: batter, deltas }]);
  }
  function undo() {
    setEvents(e => {
      if (!e.length) return e;
      const last = e[e.length - 1];
      setBatLines(prev => {
        const cur = prev[last.memberId] ?? emptyB();
        const next = { ...cur };
        (Object.keys(last.deltas) as (keyof BLine)[]).forEach(k => { next[k] = (next[k] || 0) - (last.deltas[k] || 0); });
        return { ...prev, [last.memberId]: next };
      });
      return e.slice(0, -1);
    });
  }
  function setPitchField(id: string, field: keyof PUI, value: number) {
    setPitchLines(prev => ({ ...prev, [id]: { ...(prev[id] ?? emptyP()), [field]: Math.max(0, Math.floor(value) || 0) } }));
  }

  const batRows = active.filter(m => batLines[m.id] && Object.values(batLines[m.id]).some(v => v > 0));
  const pitchRows = active.filter(m => {
    const p = pitchLines[m.id];
    return p && Object.values(p).some(v => v > 0);
  });
  const totalRecords = batRows.length + pitchRows.length;

  function post(kind: "batting" | "pitching", memberId: string, data: Record<string, number>) {
    return fetch("/api/member/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, date, opponent, memberId, memberName: membersById.get(memberId)?.name || "", data }),
    }).then(r => r.json()).then(r => !!r?.ok).catch(() => false);
  }
  async function submit() {
    if (submitting) return;
    setErr("");
    const tasks: Promise<boolean>[] = [];
    batRows.forEach(m => tasks.push(post("batting", m.id, batLines[m.id])));
    pitchRows.forEach(m => {
      const p = pitchLines[m.id];
      tasks.push(post("pitching", m.id, { ipOuts: p.inn * 3 + p.outs, hits: p.hits, runs: p.runs, er: p.er, so: p.so, bb: p.bb, hbp: p.hbp }));
    });
    if (!tasks.length) { setErr("記録がありません。打撃か投球を入力してください。"); return; }
    setSubmitting(true);
    const results = await Promise.all(tasks);
    setSubmitting(false);
    if (results.every(Boolean)) setDone(true);
    else setErr("一部の送信に失敗しました。通信環境を確認して、もう一度お試しください。");
  }

  if (done) {
    return (
      <div className="stx-detail" style={{ ...cardStyle, textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📨</div>
        <div style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 900, fontSize: 18, marginBottom: 8 }}>承認待ちに送信しました</div>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.7 }}>
          管理者が内容を確認して承認すると、成績に反映されます。<br />（承認まで成績ランキングには表示されません）
        </p>
        <button onClick={onClose} style={{ marginTop: 20, padding: "12px 28px", background: "linear-gradient(135deg,#d4a82a,#f0cf6a)", color: "#0a0e1a", border: "none", fontFamily: "var(--font-zen),sans-serif", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>日程に戻る</button>
      </div>
    );
  }

  const cur = batter ? (batLines[batter] ?? emptyB()) : null;
  const curP = pitcher ? (pitchLines[pitcher] ?? emptyP()) : null;
  const numInput: React.CSSProperties = { width: "100%", padding: "8px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: 16, textAlign: "center", fontFamily: "var(--font-oswald),sans-serif" };

  return (
    <div className="stx-detail">
      <button onClick={onClose} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", marginBottom: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontFamily: "var(--font-zen),sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
        ← 日程に戻る
      </button>

      {/* ヘッダー：日付・対戦相手 */}
      <section style={{ ...cardStyle, marginBottom: 14 }}>
        <H sub="SCORER">スコア記録 — {mdLabel(date)}</H>
        <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 6 }}>対戦相手</label>
        <input value={opponent} onChange={e => setOpponent(e.target.value)} placeholder="例）福岡ベアーズ" className="admin-dark"
          style={{ width: "100%", padding: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: 14 }} />
      </section>

      {/* ライブ記録 / かんたん集計 モード切替 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {([["live", "🎙 ライブ記録"], ["simple", "✍️ かんたん集計"]] as const).map(([k, lbl]) => (
          <button key={k} onClick={() => setMode(k)} className="stx-chip"
            style={{ flex: 1, padding: "11px", cursor: "pointer", fontFamily: "var(--font-zen),sans-serif", fontWeight: 800, fontSize: 13.5, color: mode === k ? "#0a0e1a" : "#fff", background: mode === k ? "linear-gradient(135deg,#d4a82a,#f0cf6a)" : "rgba(255,255,255,0.06)", border: "1px solid " + (mode === k ? "transparent" : "rgba(255,255,255,0.15)"), boxShadow: mode === k ? "0 4px 16px rgba(212,168,42,0.4)" : "none" }}>
            {lbl}
          </button>
        ))}
      </div>

      {mode === "live" && (() => {
        const liveBtn = (onClick: () => void, label: string, tone: string, big = false): React.ReactNode => (
          <button onClick={onClick} key={label}
            style={{ padding: big ? "14px 4px" : "11px 4px", cursor: "pointer", fontFamily: "var(--font-zen),sans-serif", fontWeight: 800, fontSize: big ? 14 : 12.5, color: tone, background: "rgba(255,255,255,0.05)", border: "1px solid " + tone + "55", borderRadius: 9 }}>
            {label}
          </button>
        );
        return (
        <>
          {/* スコアボード */}
          <section style={{ ...cardStyle, marginBottom: 14, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              {([["自", live.ourScore, ourTurn], ["相手", live.oppScore, !ourTurn]] as const).map(([lab, sc, act], idx) => (
                <div key={idx} style={{ textAlign: "center", flex: 1, opacity: act ? 1 : 0.55 }}>
                  <div style={{ fontSize: 11, color: act ? "#d4a82a" : "rgba(255,255,255,0.5)", fontWeight: 700, letterSpacing: "0.1em" }}>{lab}{act ? " ●攻撃" : ""}</div>
                  <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 38, fontWeight: 700, lineHeight: 1, color: "#fff", textShadow: act ? "0 0 18px rgba(212,168,42,0.5)" : "none" }}>{sc}</div>
                </div>
              ))}
              <div style={{ textAlign: "center", flex: 1.1, borderLeft: "1px solid rgba(255,255,255,0.08)", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 22, fontWeight: 700, color: "#d4a82a" }}>{live.inning}</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>{live.half === "top" ? "回 表" : "回 裏"}</div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
              <LiveDots label="O" n={live.outs} max={2} color="#ff6982" />
              <LiveDots label="B" n={live.balls} max={3} color="#67e088" />
              <LiveDots label="S" n={live.strikes} max={2} color="#d4a82a" />
            </div>
            <BaseDiamond bases={live.bases} />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={manualChange} className="stx-chip" style={{ flex: 1, padding: "10px", cursor: "pointer", fontWeight: 800, fontSize: 13, color: "#fff", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)", fontFamily: "var(--font-zen),sans-serif" }}>▶ 攻守交代</button>
              <button onClick={undoLive} disabled={!histLen} style={{ flex: 1, padding: "10px", cursor: histLen ? "pointer" : "default", fontWeight: 800, fontSize: 13, color: histLen ? "#d4a82a" : "rgba(255,255,255,0.3)", background: "transparent", border: "1px solid " + (histLen ? "rgba(212,168,42,0.4)" : "rgba(255,255,255,0.1)"), borderRadius: 9, fontFamily: "var(--font-zen),sans-serif" }}>↩︎ 1つ戻す</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, justifyContent: "center", fontSize: 11.5, color: "rgba(255,255,255,0.55)" }}>
              <span>自チームの攻撃：</span>
              {([["top", "表"], ["bottom", "裏"]] as const).map(([h, l]) => (
                <button key={h} onClick={() => setWeBatHalf(h)} style={{ padding: "4px 12px", cursor: "pointer", borderRadius: 7, fontWeight: 800, fontSize: 12, color: weBatHalf === h ? "#0a0e1a" : "#fff", background: weBatHalf === h ? "#d4a82a" : "rgba(255,255,255,0.06)", border: "1px solid " + (weBatHalf === h ? "transparent" : "rgba(255,255,255,0.15)") }}>{l}</button>
              ))}
            </div>
          </section>

          {/* 走者操作 */}
          {occCount(live.bases) > 0 && (
            <section style={{ ...cardStyle, marginBottom: 14 }}>
              <H sub="RUNNERS">走者</H>
              {(["b3", "b2", "b1"] as const).filter(b => live.bases[b]).map(b => {
                const r = live.bases[b]!; const bn = b === "b1" ? "一塁" : b === "b2" ? "二塁" : "三塁";
                return (
                  <div key={b} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}><span style={{ color: "#d4a82a" }}>{bn}</span>　{r.name}</span>
                    <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                      <button onClick={() => runnerOp(b, "adv")} style={{ padding: "6px 11px", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#67e088", background: "rgba(255,255,255,0.04)", border: "1px solid #67e08855", borderRadius: 7 }}>{b === "b3" ? "生還" : "進塁"}</button>
                      {ourTurn && <button onClick={() => runnerOp(b, "steal")} style={{ padding: "6px 11px", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#d4a82a", background: "rgba(255,255,255,0.04)", border: "1px solid #d4a82a55", borderRadius: 7 }}>盗塁</button>}
                      <button onClick={() => runnerOp(b, "out")} style={{ padding: "6px 11px", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#ff6982", background: "rgba(255,255,255,0.04)", border: "1px solid #ff698255", borderRadius: 7 }}>アウト</button>
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          {/* 攻撃／守備 入力 */}
          {ourTurn ? (
            <section style={{ ...cardStyle, marginBottom: 14 }}>
              <H sub="OUR BATTING">打者を選ぶ（自チーム攻撃）</H>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>
                {active.map(m => {
                  const on = batter === m.id;
                  return (
                    <button key={m.id} onClick={() => setBatter(m.id)} className="stx-chip"
                      style={{ padding: "7px 11px", cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: on ? "#0a0e1a" : "#fff", background: on ? "#d4a82a" : "rgba(255,255,255,0.06)", border: "1px solid " + (on ? "transparent" : "rgba(255,255,255,0.15)") }}>
                      #{m.jerseyNumber || "—"} {m.name}
                    </button>
                  );
                })}
              </div>
              {batter ? (
                <>
                  <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.7)", marginBottom: 8, fontWeight: 700 }}>打席：{membersById.get(batter)?.name}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                    {liveBtn(() => ourHit(1, "単打"), "単打", "#67e088", true)}
                    {liveBtn(() => ourHit(2, "二塁打"), "二塁打", "#67e088", true)}
                    {liveBtn(() => ourHit(3, "三塁打"), "三塁打", "#67e088", true)}
                    {liveBtn(() => ourHit(4, "本塁打"), "本塁打", "#d4a82a", true)}
                    {liveBtn(() => ourWalk(false), "四球", "#7fb3ff", true)}
                    {liveBtn(() => ourWalk(true), "死球", "#7fb3ff", true)}
                    {liveBtn(() => ourOut("so"), "三振", "#ff6982", true)}
                    {liveBtn(() => ourOut("go"), "ゴロ", "rgba(255,255,255,0.65)", true)}
                    {liveBtn(() => ourOut("fo"), "フライ", "rgba(255,255,255,0.65)", true)}
                    {liveBtn(() => ourOut("sh"), "犠打", "#7fb3ff", true)}
                    {liveBtn(() => ourReachError(), "失策出塁", "rgba(255,255,255,0.65)", true)}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 8 }}>
                    {liveBtn(ourBall, "ボール", "#67e088")}
                    {liveBtn(ourStrike, "ストライク", "#d4a82a")}
                    {liveBtn(ourFoul, "ファウル", "rgba(255,255,255,0.6)")}
                  </div>
                </>
              ) : <p style={emptyMsg}>打者を選ぶと結果ボタンが出ます。</p>}
            </section>
          ) : (
            <section style={{ ...cardStyle, marginBottom: 14 }}>
              <H sub="OUR PITCHING">投手を選ぶ（守備中）</H>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>
                {active.map(m => {
                  const on = pitcher === m.id;
                  return (
                    <button key={m.id} onClick={() => setPitcher(m.id)} className="stx-chip"
                      style={{ padding: "7px 11px", cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: on ? "#0a0e1a" : "#fff", background: on ? "#d4a82a" : "rgba(255,255,255,0.06)", border: "1px solid " + (on ? "transparent" : "rgba(255,255,255,0.15)") }}>
                      #{m.jerseyNumber || "—"} {m.name}
                    </button>
                  );
                })}
              </div>
              {pitcher ? (
                <>
                  <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.7)", marginBottom: 8, fontWeight: 700 }}>投手：{membersById.get(pitcher)?.name}（相手の打席）</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                    {liveBtn(() => oppStrikeout(), "奪三振", "#67e088", true)}
                    {liveBtn(() => oppOut("go"), "ゴロアウト", "rgba(255,255,255,0.65)", true)}
                    {liveBtn(() => oppOut("fo"), "フライアウト", "rgba(255,255,255,0.65)", true)}
                    {liveBtn(() => oppHit(1, "被安打"), "被安打", "#ff6982", true)}
                    {liveBtn(() => oppHit(2, "被二塁打"), "被二塁打", "#ff6982", true)}
                    {liveBtn(() => oppHit(4, "被本塁打"), "被本塁打", "#ff6982", true)}
                    {liveBtn(() => oppWalk(false), "与四球", "#7fb3ff", true)}
                    {liveBtn(() => oppWalk(true), "与死球", "#7fb3ff", true)}
                    {liveBtn(() => oppRun(), "失点 +1", "#ff6982", true)}
                    {liveBtn(() => oppError(), "失策で出塁", "rgba(255,255,255,0.65)", true)}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 8 }}>
                    {liveBtn(defBall, "ボール", "#67e088")}
                    {liveBtn(defStrike, "ストライク", "#d4a82a")}
                    {liveBtn(defFoul, "ファウル", "rgba(255,255,255,0.6)")}
                  </div>
                </>
              ) : <p style={emptyMsg}>投手を選ぶと結果ボタンが出ます。</p>}
            </section>
          )}

          {/* 実況ログ */}
          {feed.length > 0 && (
            <section style={{ ...cardStyle, marginBottom: 14 }}>
              <H sub="LOG">実況</H>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 12.5, color: "rgba(255,255,255,0.7)" }}>
                {feed.map((t, i) => (
                  <li key={i} style={{ padding: "5px 0", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.06)", opacity: 1 - i * 0.08 }}>{t}</li>
                ))}
              </ul>
            </section>
          )}
        </>
        );
      })()}

      {mode === "simple" && (
      <>
      {/* 打撃 / 投球 切替 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {([["bat", "🏏 打撃"], ["pitch", "⚾ 投球"]] as const).map(([k, lbl]) => (
          <button key={k} onClick={() => setTab(k)} className="stx-chip"
            style={{ flex: 1, padding: "10px", cursor: "pointer", fontFamily: "var(--font-zen),sans-serif", fontWeight: 800, fontSize: 14, color: tab === k ? "#0a0e1a" : "#fff", background: tab === k ? "linear-gradient(135deg,#d4a82a,#f0cf6a)" : "rgba(255,255,255,0.06)", border: "1px solid " + (tab === k ? "transparent" : "rgba(255,255,255,0.15)") }}>
            {lbl}
          </button>
        ))}
      </div>

      {tab === "bat" && (
        <>
          {/* 打者選択 */}
          <section style={{ ...cardStyle, marginBottom: 14 }}>
            <H sub="BATTER">打者を選ぶ</H>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {active.map(m => {
                const on = batter === m.id;
                const has = batLines[m.id] && Object.values(batLines[m.id]).some(v => v > 0);
                return (
                  <button key={m.id} onClick={() => setBatter(m.id)} className="stx-chip"
                    style={{ padding: "7px 11px", cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: on ? "#0a0e1a" : "#fff", background: on ? "#d4a82a" : has ? "rgba(212,168,42,0.18)" : "rgba(255,255,255,0.06)", border: "1px solid " + (on ? "transparent" : has ? "rgba(212,168,42,0.4)" : "rgba(255,255,255,0.15)") }}>
                    #{m.jerseyNumber || "—"} {m.name}{has && !on ? " ✓" : ""}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 打席結果ボタン */}
          {batter ? (
            <section style={{ ...cardStyle, marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <H sub="RESULT">{membersById.get(batter)?.name} の打席結果</H>
                <button onClick={undo} disabled={!events.length} style={{ fontSize: 11.5, color: events.length ? "#d4a82a" : "rgba(255,255,255,0.3)", background: "transparent", border: "1px solid " + (events.length ? "rgba(212,168,42,0.4)" : "rgba(255,255,255,0.1)"), padding: "5px 11px", cursor: events.length ? "pointer" : "default" }}>↩︎ 1つ戻す</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {BAT_ACTIONS.map(a => (
                  <button key={a.key} onClick={() => applyBat(a.deltas)}
                    style={{ padding: "13px 4px", cursor: "pointer", fontFamily: "var(--font-zen),sans-serif", fontWeight: 800, fontSize: 14, color: a.tone, background: "rgba(255,255,255,0.05)", border: "1px solid " + a.tone + "55" }}>
                    {a.label}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {BAT_MODS.map(a => (
                  <button key={a.key} onClick={() => applyBat(a.deltas)}
                    style={{ flex: 1, padding: "10px 4px", cursor: "pointer", fontFamily: "var(--font-zen),sans-serif", fontWeight: 700, fontSize: 12.5, color: a.tone, background: "rgba(255,255,255,0.03)", border: "1px dashed " + a.tone + "55" }}>
                    {a.label}
                  </button>
                ))}
              </div>
              {cur && (
                <div style={{ marginTop: 12, fontSize: 12, color: "rgba(255,255,255,0.7)", textAlign: "center" }}>
                  今の集計：{cur.atBats}打数 {cur.hits}安打{cur.hr ? ` 本${cur.hr}` : ""}{cur.rbi ? ` 点${cur.rbi}` : ""}{cur.bb ? ` 四${cur.bb}` : ""}{cur.so ? ` 振${cur.so}` : ""}
                </div>
              )}
            </section>
          ) : (
            <p style={{ ...emptyMsg, marginBottom: 14 }}>上から打者を選ぶと結果ボタンが出ます。</p>
          )}

          {/* 集計プレビュー */}
          {batRows.length > 0 && (
            <section style={{ ...cardStyle, marginBottom: 14 }}>
              <H sub="PREVIEW">打撃 集計（{batRows.length}人）</H>
              <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                <table style={tableStyle}>
                  <thead><tr><Th>選手</Th><Th>打数</Th><Th>安</Th><Th>本</Th><Th>点</Th><Th>四</Th><Th>振</Th><Th>盗</Th></tr></thead>
                  <tbody>
                    {batRows.map(m => { const l = batLines[m.id]; return (
                      <tr key={m.id}>
                        <Td style={{ textAlign: "left", fontWeight: 700 }}>{m.name}</Td>
                        <Td>{l.atBats}</Td><Td>{l.hits}</Td><Td>{l.hr}</Td><Td>{l.rbi}</Td><Td>{l.bb + l.hbp}</Td><Td>{l.so}</Td><Td>{l.sb}</Td>
                      </tr>
                    ); })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      {tab === "pitch" && (
        <>
          <section style={{ ...cardStyle, marginBottom: 14 }}>
            <H sub="PITCHER">投手を選ぶ</H>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {active.map(m => {
                const on = pitcher === m.id;
                const has = pitchRows.some(p => p.id === m.id);
                return (
                  <button key={m.id} onClick={() => setPitcher(m.id)} className="stx-chip"
                    style={{ padding: "7px 11px", cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: on ? "#0a0e1a" : "#fff", background: on ? "#d4a82a" : has ? "rgba(212,168,42,0.18)" : "rgba(255,255,255,0.06)", border: "1px solid " + (on ? "transparent" : has ? "rgba(212,168,42,0.4)" : "rgba(255,255,255,0.15)") }}>
                    #{m.jerseyNumber || "—"} {m.name}{has && !on ? " ✓" : ""}
                  </button>
                );
              })}
            </div>
          </section>

          {pitcher && curP ? (
            <section style={{ ...cardStyle, marginBottom: 14 }}>
              <H sub="PITCHING LINE">{membersById.get(pitcher)?.name} の投球</H>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>投球回</label>
                  <input type="number" inputMode="numeric" min={0} value={curP.inn || ""} onChange={e => setPitchField(pitcher, "inn", Number(e.target.value))} style={numInput} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>+アウト(0〜2)</label>
                  <input type="number" inputMode="numeric" min={0} max={2} value={curP.outs || ""} onChange={e => setPitchField(pitcher, "outs", Math.min(2, Number(e.target.value)))} style={numInput} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                {([["hits", "被安打"], ["runs", "失点"], ["er", "自責点"], ["so", "奪三振"], ["bb", "与四球"], ["hbp", "与死球"]] as const).map(([f, lbl]) => (
                  <div key={f}>
                    <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>{lbl}</label>
                    <input type="number" inputMode="numeric" min={0} value={curP[f] || ""} onChange={e => setPitchField(pitcher, f, Number(e.target.value))} style={numInput} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,0.6)", textAlign: "center" }}>
                {curP.inn}回{curP.outs ? `${curP.outs}/3` : ""} 投球
              </div>
            </section>
          ) : (
            <p style={{ ...emptyMsg, marginBottom: 14 }}>上から投手を選ぶと入力欄が出ます。</p>
          )}

          {pitchRows.length > 0 && (
            <section style={{ ...cardStyle, marginBottom: 14 }}>
              <H sub="PREVIEW">投球 集計（{pitchRows.length}人）</H>
              <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                <table style={tableStyle}>
                  <thead><tr><Th>選手</Th><Th>回</Th><Th>安</Th><Th>失</Th><Th>責</Th><Th>奪三</Th><Th>四</Th></tr></thead>
                  <tbody>
                    {pitchRows.map(m => { const p = pitchLines[m.id]; return (
                      <tr key={m.id}>
                        <Td style={{ textAlign: "left", fontWeight: 700 }}>{m.name}</Td>
                        <Td>{p.inn}{p.outs ? `.${p.outs}` : ""}</Td><Td>{p.hits}</Td><Td>{p.runs}</Td><Td>{p.er}</Td><Td>{p.so}</Td><Td>{p.bb}</Td>
                      </tr>
                    ); })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
      </>
      )}

      {/* ライブモードの集計プレビュー */}
      {mode === "live" && batRows.length > 0 && (
        <section style={{ ...cardStyle, marginBottom: 14 }}>
          <H sub="BATTING">打撃 集計（{batRows.length}人）</H>
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table style={tableStyle}>
              <thead><tr><Th>選手</Th><Th>打数</Th><Th>安</Th><Th>本</Th><Th>点</Th><Th>四死</Th><Th>振</Th><Th>盗</Th></tr></thead>
              <tbody>
                {batRows.map(m => { const l = batLines[m.id]; return (
                  <tr key={m.id}>
                    <Td style={{ textAlign: "left", fontWeight: 700 }}>{m.name}</Td>
                    <Td>{l.atBats}</Td><Td>{l.hits}</Td><Td>{l.hr}</Td><Td>{l.rbi}</Td><Td>{l.bb + l.hbp}</Td><Td>{l.so}</Td><Td>{l.sb}</Td>
                  </tr>
                ); })}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {mode === "live" && pitchRows.length > 0 && (
        <section style={{ ...cardStyle, marginBottom: 14 }}>
          <H sub="PITCHING">投球 集計（{pitchRows.length}人）</H>
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table style={tableStyle}>
              <thead><tr><Th>選手</Th><Th>回</Th><Th>安</Th><Th>失</Th><Th>責</Th><Th>奪三</Th><Th>四</Th></tr></thead>
              <tbody>
                {pitchRows.map(m => { const p = pitchLines[m.id]; return (
                  <tr key={m.id}>
                    <Td style={{ textAlign: "left", fontWeight: 700 }}>{m.name}</Td>
                    <Td>{p.inn}{p.outs ? `.${p.outs}` : ""}</Td><Td>{p.hits}</Td><Td>{p.runs}</Td><Td>{p.er}</Td><Td>{p.so}</Td><Td>{p.bb}</Td>
                  </tr>
                ); })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 送信 */}
      {err && <p style={{ color: "#ff6982", fontSize: 13, textAlign: "center", marginBottom: 10 }}>{err}</p>}
      <button onClick={submit} disabled={submitting || totalRecords === 0}
        style={{ width: "100%", padding: "16px", cursor: submitting || totalRecords === 0 ? "default" : "pointer", fontFamily: "var(--font-zen),sans-serif", fontWeight: 900, fontSize: 16, color: totalRecords === 0 ? "rgba(255,255,255,0.4)" : "#0a0e1a", background: totalRecords === 0 ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg,#d4a82a,#f0cf6a)", border: "none" }}>
        {submitting ? "送信中…" : totalRecords === 0 ? "記録を入力してください" : `📨 ${totalRecords}件を承認待ちに送信`}
      </button>
      <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", textAlign: "center", marginTop: 8, lineHeight: 1.6 }}>
        送信後、管理者が承認すると成績に反映されます。<br />承認前は管理者が内容を編集できます。
      </p>
    </div>
  );
}
