/**
 * /stats — メンバー閲覧用 成績ページ
 *
 * 公開ホームページとは別に、選手しか見られないようパスワードゲート (MEMBER_PASSWORD) を入れる。
 * 自動計算する指標:
 *   打撃: AVG / OBP / SLG / OPS / HR / RBI / SB / SB%
 *   投手: ERA / IP / SO / BB / K/9 / WHIP
 *   捕手: 盗塁阻止率 CS%
 */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";

const MEMBER_PW_KEY = "skr_member_pw";

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
  memberId: string;
  atBats: number;
  hits: number;
  doubles: number;
  triples: number;
  hr: number;
  rbi: number;
  bb: number;
  so: number;
  hbp: number;
  sh: number;
  sb: number;
  cs: number;
};

type PitchingRow = {
  memberId: string;
  ipOuts: number;
  hits: number;
  runs: number;
  er: number;
  so: number;
  bb: number;
  hbp: number;
};

type CatchingRow = {
  memberId: string;
  sba: number;
  cs: number;
};

// 計算済み統計の型
type BattingStat = {
  m: Member; games: number; ab: number; h: number; hr: number; rbi: number; bb: number; so: number;
  hbp: number; sh: number; sb: number; cs: number; sbAttempts: number;
  avg: number; obp: number; slg: number; ops: number; sbPct: number;
};
type PitchingStat = {
  m: Member; appearances: number; ipOuts: number; hits: number; runs: number; er: number;
  so: number; bb: number; hbp: number; era: number; k9: number; whip: number;
};
type CatchingStat = { m: Member; games: number; sba: number; cs: number; rate: number; };

function num(s: string | undefined): number {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
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

export default function StatsPage() {
  const [pw, setPw] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // localStorage から復元 → サーバ検証
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
  background: "#0a0e1a",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

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
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Image src="/logo.png" alt="logo" width={64} height={64} style={{ objectFit: "contain", margin: "0 auto" }} />
          <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 10, color: "#d4a82a", letterSpacing: "0.32em", marginTop: 14 }}>
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
            style={{
              marginTop: 18,
              width: "100%",
              padding: 14,
              background: busy ? "#666" : "#d4a82a",
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

function StatsDashboard({ pw, onLogout }: { pw: string; onLogout: () => void }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [batting, setBatting] = useState<BattingRow[]>([]);
  const [pitching, setPitching] = useState<PitchingRow[]>([]);
  const [catching, setCatching] = useState<CatchingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"batting" | "pitching" | "catching">("batting");

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
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
          memberId: r.data[1] ?? "",
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
          memberId: r.data[1] ?? "",
          ipOuts: num(r.data[4]),
          hits: num(r.data[5]),
          runs: num(r.data[6]),
          er: num(r.data[7]),
          so: num(r.data[8]),
          bb: num(r.data[9]),
          hbp: num(r.data[10]),
        })),
        fetchList<CatchingRow>("catching", r => ({
          memberId: r.data[1] ?? "",
          sba: num(r.data[4]),
          cs: num(r.data[5]),
        })),
      ]);
      if (cancelled) return;
      setMembers(ms);
      setBatting(bs);
      setPitching(ps);
      setCatching(cs);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [fetchList]);

  // ── 計算済み打撃成績 ──
  const battingStats = useMemo(() => {
    return members.filter(m => m.active).map(m => {
      const rows = batting.filter(b => b.memberId === m.id);
      const ab = rows.reduce((s, b) => s + b.atBats, 0);
      const h = rows.reduce((s, b) => s + b.hits, 0);
      const dbl = rows.reduce((s, b) => s + b.doubles, 0);
      const tpl = rows.reduce((s, b) => s + b.triples, 0);
      const hr = rows.reduce((s, b) => s + b.hr, 0);
      const rbi = rows.reduce((s, b) => s + b.rbi, 0);
      const bb = rows.reduce((s, b) => s + b.bb, 0);
      const so = rows.reduce((s, b) => s + b.so, 0);
      const hbp = rows.reduce((s, b) => s + b.hbp, 0);
      const sh = rows.reduce((s, b) => s + b.sh, 0);
      const sb = rows.reduce((s, b) => s + b.sb, 0);
      const cs = rows.reduce((s, b) => s + b.cs, 0);

      // 単打数（安打 - 長打）
      const singles = Math.max(0, h - dbl - tpl - hr);
      const totalBases = singles + dbl * 2 + tpl * 3 + hr * 4;
      const avg = ab > 0 ? h / ab : 0;
      // OBP = (H + BB + HBP) / (AB + BB + HBP + SF) — SF は犠飛で別管理が必要だが現状未収集なので 0
      const obp = (ab + bb + hbp) > 0 ? (h + bb + hbp) / (ab + bb + hbp) : 0;
      const slg = ab > 0 ? totalBases / ab : 0;
      const ops = obp + slg;
      const sbAttempts = sb + cs;
      const sbPct = sbAttempts > 0 ? sb / sbAttempts : 0;

      return { m, games: rows.length, ab, h, hr, rbi, bb, so, hbp, sh, sb, cs, sbAttempts, avg, obp, slg, ops, sbPct };
    });
  }, [members, batting]);

  // ── 投手成績 ──
  const pitchingStats = useMemo(() => {
    return members.filter(m => m.active).map(m => {
      const rows = pitching.filter(p => p.memberId === m.id);
      if (rows.length === 0) return null;
      const ipOuts = rows.reduce((s, p) => s + p.ipOuts, 0);
      const hits = rows.reduce((s, p) => s + p.hits, 0);
      const runs = rows.reduce((s, p) => s + p.runs, 0);
      const er = rows.reduce((s, p) => s + p.er, 0);
      const so = rows.reduce((s, p) => s + p.so, 0);
      const bb = rows.reduce((s, p) => s + p.bb, 0);
      const hbp = rows.reduce((s, p) => s + p.hbp, 0);
      // ERA = (ER × 27) / outs
      const era = ipOuts > 0 ? (er * 27) / ipOuts : NaN;
      // K/9 = (SO × 27) / outs
      const k9 = ipOuts > 0 ? (so * 27) / ipOuts : NaN;
      // WHIP = (BB + H) / IP, IP は分数イニング（outs/3）
      const whip = ipOuts > 0 ? (bb + hits) / (ipOuts / 3) : NaN;
      return { m, appearances: rows.length, ipOuts, hits, runs, er, so, bb, hbp, era, k9, whip };
    }).filter((x): x is PitchingStat => x !== null);
  }, [members, pitching]);

  // ── 捕手成績 ──
  const catchingStats = useMemo(() => {
    return members.filter(m => m.active).map(m => {
      const rows = catching.filter(c => c.memberId === m.id);
      if (rows.length === 0) return null;
      const sba = rows.reduce((s, c) => s + c.sba, 0);
      const cs = rows.reduce((s, c) => s + c.cs, 0);
      const rate = sba > 0 ? cs / sba : 0;
      return { m, games: rows.length, sba, cs, rate };
    }).filter((x): x is CatchingStat => x !== null);
  }, [members, catching]);

  return (
    <div className="admin-dark" style={{ minHeight: "100vh", background: "#0a0e1a", color: "#fff" }}>
      <header style={{ background: "#0b1e3f", borderBottom: "3px solid #d4a82a" }}>
        <div className="max-w-[1280px] mx-auto px-5 md:px-8 flex items-center" style={{ height: 64, gap: 16 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
            <Image src="/logo.png" alt="logo" width={36} height={36} className="object-contain" />
            <div style={{ lineHeight: 1.1 }}>
              <div style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 900, fontSize: 14 }}>メンバー成績アプリ</div>
              <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 9, color: "#d4a82a", letterSpacing: "0.3em", marginTop: 2 }}>HAKATA SK ROOKIES</div>
            </div>
          </Link>
          <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em" }}>
            メンバー閲覧
          </span>
          <button
            onClick={onLogout}
            style={{ padding: "8px 14px", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", fontSize: 12, cursor: "pointer", letterSpacing: "0.06em" }}
          >
            ログアウト
          </button>
        </div>
      </header>

      <div style={{ background: "#131a2c", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="max-w-[1280px] mx-auto px-2 md:px-8 flex" style={{ overflowX: "auto" }}>
          {([
            ["batting", "打撃", battingStats.filter(s => s.ab > 0).length],
            ["pitching", "投手", pitchingStats.length],
            ["catching", "捕手", catchingStats.length],
          ] as const).map(([key, label, count]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                padding: "14px 18px",
                background: tab === key ? "rgba(212,168,42,0.04)" : "transparent",
                color: tab === key ? "#d4a82a" : "rgba(255,255,255,0.55)",
                border: "none",
                borderBottom: tab === key ? "2px solid #d4a82a" : "2px solid transparent",
                fontFamily: "var(--font-zen),sans-serif",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.08em",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {label}<span style={{ marginLeft: 6, fontSize: 11, color: "rgba(255,255,255,0.45)" }}>({count})</span>
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-[1280px] mx-auto px-5 md:px-8" style={{ paddingTop: 24, paddingBottom: 80 }}>
        {loading ? (
          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", padding: 40, fontSize: 13, letterSpacing: "0.15em" }}>LOADING…</p>
        ) : tab === "batting" ? (
          <BattingStatsView stats={battingStats} />
        ) : tab === "pitching" ? (
          <PitchingStatsView stats={pitchingStats} />
        ) : (
          <CatchingStatsView stats={catchingStats} />
        )}
      </main>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.025)",
  border: "1px solid rgba(255,255,255,0.08)",
  padding: 20,
  marginBottom: 16,
};

function BattingStatsView({ stats }: { stats: BattingStat[] }) {
  const active = stats.filter(s => s.ab > 0);
  const ranked = [...active].sort((a, b) => b.ops - a.ops);

  return (
    <div>
      <section style={cardStyle}>
        <H>打撃成績（OPS順）</H>
        {ranked.length === 0 ? (
          <p style={emptyMsg}>まだ打席記録がありません。</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>選手</Th>
                  <Th>試合</Th>
                  <Th>打席</Th>
                  <Th>安打</Th>
                  <Th>本塁打</Th>
                  <Th>打点</Th>
                  <Th>盗塁</Th>
                  <Th>盗塁成功率</Th>
                  <Th>打率</Th>
                  <Th>出塁率</Th>
                  <Th>長打率</Th>
                  <Th>OPS</Th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((s, i) => (
                  <tr key={s.m.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <Td><span style={{ color: "#d4a82a", fontFamily: "var(--font-oswald),sans-serif" }}>{i + 1}</span></Td>
                    <Td>
                      <strong>{s.m.name}</strong>
                      {s.m.nickname && <span style={{ marginLeft: 6, color: "rgba(255,255,255,0.4)", fontSize: 11 }}>({s.m.nickname})</span>}
                    </Td>
                    <Td>{s.games}</Td>
                    <Td>{s.ab}</Td>
                    <Td><span style={{ color: "#d4a82a", fontWeight: 700 }}>{s.h}</span></Td>
                    <Td><span style={{ color: s.hr > 0 ? "#ff6982" : undefined, fontWeight: s.hr > 0 ? 700 : 400 }}>{s.hr}</span></Td>
                    <Td>{s.rbi}</Td>
                    <Td>{s.sb}</Td>
                    <Td>{s.sbAttempts > 0 ? fmtPct(s.sbPct) : "—"}</Td>
                    <Td><BigNum>{fmtAvg(s.avg)}</BigNum></Td>
                    <Td>{fmtAvg(s.obp)}</Td>
                    <Td>{fmtAvg(s.slg)}</Td>
                    <Td><BigNum hl>{fmtAvg(s.ops)}</BigNum></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={cardStyle}>
        <H>個人カード</H>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          {ranked.map(s => (
            <div key={s.m.id} style={{ background: "rgba(255,255,255,0.03)", padding: 16, border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontFamily: "var(--font-oswald),sans-serif", color: "#d4a82a", fontSize: 22 }}>#{s.m.jerseyNumber || "—"}</span>
                <span style={{ fontWeight: 800, fontSize: 16 }}>{s.m.name}</span>
                <span style={{ marginLeft: "auto", fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}>{s.m.position || "—"}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <Mini label="打率" v={fmtAvg(s.avg)} highlight />
                <Mini label="本塁打" v={String(s.hr)} />
                <Mini label="打点" v={String(s.rbi)} />
                <Mini label="出塁率" v={fmtAvg(s.obp)} />
                <Mini label="長打率" v={fmtAvg(s.slg)} />
                <Mini label="OPS" v={fmtAvg(s.ops)} highlight />
                <Mini label="盗塁" v={String(s.sb)} />
                <Mini label="盗塁成功率" v={s.sbAttempts > 0 ? fmtPct(s.sbPct) : "—"} />
                <Mini label="三振" v={String(s.so)} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function PitchingStatsView({ stats }: { stats: PitchingStat[] }) {
  const ranked = [...stats].sort((a, b) => (Number.isFinite(a.era) ? a.era : 999) - (Number.isFinite(b.era) ? b.era : 999));
  return (
    <section style={cardStyle}>
      <H>投手成績（ERA順）</H>
      {ranked.length === 0 ? (
        <p style={emptyMsg}>まだ投手記録がありません。</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
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
                <tr key={s.m.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <Td><span style={{ color: "#d4a82a", fontFamily: "var(--font-oswald),sans-serif" }}>{i + 1}</span></Td>
                  <Td><strong>{s.m.name}</strong></Td>
                  <Td>{s.appearances}</Td>
                  <Td>{fmtIp(s.ipOuts)}</Td>
                  <Td><span style={{ color: "#67e088", fontWeight: 700 }}>{s.so}</span></Td>
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
  );
}

function CatchingStatsView({ stats }: { stats: CatchingStat[] }) {
  const ranked = [...stats].sort((a, b) => b.rate - a.rate);
  return (
    <section style={cardStyle}>
      <H>捕手成績（盗塁阻止率順）</H>
      {ranked.length === 0 ? (
        <p style={emptyMsg}>まだ捕手記録がありません。</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
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
                <tr key={s.m.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <Td><span style={{ color: "#d4a82a", fontFamily: "var(--font-oswald),sans-serif" }}>{i + 1}</span></Td>
                  <Td><strong>{s.m.name}</strong></Td>
                  <Td>{s.games}</Td>
                  <Td>{s.sba}</Td>
                  <Td>{s.cs}</Td>
                  <Td><BigNum hl>{fmtPct(s.rate)}</BigNum></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ── UI ヘルパ ──
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
};

function H({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{
      fontFamily: "var(--font-zen),sans-serif",
      fontWeight: 800,
      fontSize: 14,
      letterSpacing: "0.1em",
      marginBottom: 14,
      color: "#fff",
      borderLeft: "3px solid #d4a82a",
      paddingLeft: 10,
    }}>{children}</h3>
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

function Mini({ label, v, highlight }: { label: string; v: string; highlight?: boolean }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      padding: "8px 10px",
      borderLeft: highlight ? "2px solid #d4a82a" : "2px solid transparent",
    }}>
      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
      <div style={{
        fontFamily: "var(--font-oswald),sans-serif",
        fontSize: 17,
        fontWeight: 700,
        color: highlight ? "#d4a82a" : "#fff",
        lineHeight: 1.2,
        marginTop: 2,
      }}>{v}</div>
    </div>
  );
}
