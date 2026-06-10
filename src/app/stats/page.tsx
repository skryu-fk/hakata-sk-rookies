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

const MEMBER_PW_KEY = "skr_member_pw";

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

type BattingStat = {
  m: Member; games: number; ab: number; h: number; hr: number; rbi: number; bb: number; so: number;
  hbp: number; sh: number; sb: number; cs: number; sbAttempts: number;
  avg: number; obp: number; slg: number; ops: number; sbPct: number;
};
type PitchingStat = {
  m: Member; appearances: number; ipOuts: number; hits: number; runs: number; er: number;
  so: number; bb: number; hbp: number; era: number; k9: number; whip: number;
};
type CatchingStat = { m: Member; games: number; sba: number; cs: number; rate: number };

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
function gameKey(r: { date: string; opponent: string }): string {
  return `${r.date}|${r.opponent}`;
}

/* ── ページ本体 ───────────────────────────────────────── */
export default function StatsPage() {
  const [pw, setPw] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const saved = (typeof window !== "undefined" && window.localStorage.getItem(MEMBER_PW_KEY)) || "";
    if (!saved) { setChecking(false); return; }
    (async () => {
      try {
        const res = await fetch("/api/member/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: saved }),
        });
        if (res.ok) setPw(saved);
        else window.localStorage.removeItem(MEMBER_PW_KEY);
      } catch { /* ネットワーク失敗時はログイン画面に戻す */ }
      finally { setChecking(false); }
    })();
  }, []);

  if (checking) {
    return (
      <div style={pageBgStyle}>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, letterSpacing: "0.15em" }}>VERIFYING…</p>
      </div>
    );
  }

  if (!pw) return <LoginGate onSuccess={setPw} />;
  return <StatsDashboard pw={pw} onLogout={() => {
    window.localStorage.removeItem(MEMBER_PW_KEY);
    setPw(null);
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
function LoginGate({ onSuccess }: { onSuccess: (pw: string) => void }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!input) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/member/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: input }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        window.localStorage.setItem(MEMBER_PW_KEY, input);
        onSuccess(input);
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
          <input
            type="password"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="メンバー用パスワード"
            autoFocus
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
function aggBatting(members: Member[], rows: BattingRow[]): BattingStat[] {
  return members.filter(m => m.active).map(m => {
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

    return { m, games: rs.length, ab, h, hr, rbi, bb, so, hbp, sh, sb, cs, sbAttempts, avg, obp, slg, ops, sbPct };
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

/* ── ダッシュボード ───────────────────────────────────── */
type Tab = "batting" | "pitching" | "catching";
const TOTAL_SCOPE = "__total__";

function StatsDashboard({ pw, onLogout }: { pw: string; onLogout: () => void }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [batting, setBatting] = useState<BattingRow[]>([]);
  const [pitching, setPitching] = useState<PitchingRow[]>([]);
  const [catching, setCatching] = useState<CatchingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [tab, setTab] = useState<Tab>("batting");
  const [scope, setScope] = useState<string>(TOTAL_SCOPE); // TOTAL_SCOPE or gameKey

  const fetchList = useCallback(async <T,>(sheet: string, mapFn: (r: ListRow) => T): Promise<T[]> => {
    const res = await fetch("/api/member/list", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-member-password": pw },
      body: JSON.stringify({ sheet }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) return [];
    return (data.rows ?? []).map(mapFn);
  }, [pw]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ms, bs, ps, cs] = await Promise.all([
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
      ]);
      setMembers(ms);
      setBatting(bs);
      setPitching(ps);
      setCatching(cs);
      setUpdatedAt(new Date());
    } finally {
      setLoading(false);
    }
  }, [fetchList]);

  useEffect(() => { loadAll(); }, [loadAll]);

  /* ── 試合一覧（打撃・投手・捕手の記録から日付+対戦をユニーク抽出） ── */
  const games = useMemo(() => {
    const map = new Map<string, { key: string; date: string; opponent: string }>();
    [...batting, ...pitching, ...catching].forEach(r => {
      if (!r.date) return;
      const k = gameKey(r);
      if (!map.has(k)) map.set(k, { key: k, date: r.date, opponent: r.opponent });
    });
    return [...map.values()].sort((a, b) => b.date.localeCompare(a.date));
  }, [batting, pitching, catching]);

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

  const battingStats = useMemo(() => aggBatting(members, fBatting), [members, fBatting]);
  const pitchingStats = useMemo(() => aggPitching(members, fPitching), [members, fPitching]);
  const catchingStats = useMemo(() => aggCatching(members, fCatching), [members, fCatching]);

  const scopeLabel = scope === TOTAL_SCOPE
    ? "通算"
    : (() => { const g = games.find(g => g.key === scope); return g ? `${mdLabel(g.date)} ${g.opponent || "試合"}` : "通算"; })();

  return (
    <div className="admin-dark" style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse 90% 40% at 50% -5%, rgba(209,0,36,0.1), transparent), radial-gradient(ellipse 60% 40% at 90% 110%, rgba(212,168,42,0.06), transparent), #070b16",
      color: "#fff",
      position: "relative",
      overflow: "hidden",
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

        .stx-chip { transition: background 0.2s, color 0.2s, border-color 0.2s, transform 0.2s; }
        .stx-chip:hover { transform: translateY(-1px); }

        .stx-card { transition: transform 0.25s cubic-bezier(0.16,1,0.3,1), border-color 0.25s, box-shadow 0.25s; }
        .stx-card:hover { transform: translateY(-3px); border-color: rgba(212,168,42,0.45) !important; box-shadow: 0 12px 36px rgba(0,0,0,0.4); }

        @keyframes stxSpin { to { transform: rotate(360deg); } }
        .stx-spin { animation: stxSpin 0.9s linear infinite; }
      `}</style>

      {/* SKマークの透かし */}
      <Image src="/sk_mark.png" alt="" aria-hidden width={824} height={457}
        className="mark-drift"
        style={{ position: "fixed", right: "-8%", bottom: "-6%", width: "min(54vw, 520px)", height: "auto", opacity: 0.04, pointerEvents: "none", userSelect: "none" }} />

      {/* ── ヘッダー ── */}
      <header style={{ background: "rgba(11,30,63,0.85)", backdropFilter: "blur(8px)", borderBottom: "1px solid rgba(212,168,42,0.35)", position: "sticky", top: 0, zIndex: 20 }}>
        <div className="max-w-[1280px] mx-auto px-5 md:px-8 flex items-center" style={{ height: 60, gap: 14 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
            <Image src="/sk_logo_crop.png" alt="logo" width={42} height={35} className="object-contain" />
            <div style={{ lineHeight: 1.1 }}>
              <div style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 900, fontSize: 13.5 }}>メンバー成績アプリ</div>
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

      {/* ── 種別タブ（打撃/投手/捕手） ── */}
      <div className="max-w-[1280px] mx-auto px-5 md:px-8" style={{ paddingTop: 18 }}>
        <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", padding: 4, gap: 4 }}>
          {([
            ["batting", "⚾ 打撃", battingStats.filter(s => s.ab > 0).length],
            ["pitching", "🔥 投手", pitchingStats.length],
            ["catching", "🧤 捕手", catchingStats.length],
          ] as [Tab, string, number][]).map(([key, label, count]) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  flex: 1,
                  padding: "11px 6px",
                  background: active ? "linear-gradient(135deg, #d4a82a, #f0c75e)" : "transparent",
                  color: active ? "#0a0e1a" : "rgba(255,255,255,0.55)",
                  border: "none",
                  fontFamily: "var(--font-zen),sans-serif",
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "background 0.25s, color 0.25s",
                }}
              >
                {label}<span style={{ marginLeft: 6, fontSize: 10.5, opacity: 0.7, fontFamily: "var(--font-oswald),sans-serif" }}>({count})</span>
              </button>
            );
          })}
        </div>

        {/* ── スコープ切り替え（通算 / 試合別） ── */}
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
      </div>

      {/* ── 本文 ── */}
      <main className="max-w-[1280px] mx-auto px-5 md:px-8" style={{ paddingTop: 14, paddingBottom: 90, position: "relative" }}>
        {loading ? (
          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", padding: 48, fontSize: 13, letterSpacing: "0.15em" }}>LOADING…</p>
        ) : tab === "batting" ? (
          <BattingStatsView key={`b-${scope}`} stats={battingStats} scopeLabel={scopeLabel} isGame={scope !== TOTAL_SCOPE} />
        ) : tab === "pitching" ? (
          <PitchingStatsView key={`p-${scope}`} stats={pitchingStats} scopeLabel={scopeLabel} />
        ) : (
          <CatchingStatsView key={`c-${scope}`} stats={catchingStats} scopeLabel={scopeLabel} />
        )}
      </main>
    </div>
  );
}

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
  background: "rgba(255,255,255,0.025)",
  border: "1px solid rgba(255,255,255,0.08)",
  padding: 20,
  marginBottom: 16,
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
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
      <h3 style={{
        fontFamily: "var(--font-zen),sans-serif",
        fontWeight: 800,
        fontSize: 14,
        letterSpacing: "0.1em",
        color: "#fff",
        borderLeft: "3px solid #d4a82a",
        paddingLeft: 10,
      }}>{children}</h3>
      {sub && <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.25em" }}>{sub}</span>}
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

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td style={{
      padding: "10px",
      whiteSpace: "nowrap",
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
