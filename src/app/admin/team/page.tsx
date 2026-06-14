"use client";

/**
 * /admin/team — チーム運営管理ダッシュボード（管理者専用）
 *
 * 機能:
 *   1) メンバー名簿  : 名前・ニックネーム・背番号・ポジション・加入日のCRUD
 *   2) 出欠確認      : 練習日ごとに各メンバーの出欠を記録
 *   3) 打席記録      : 試合ごとの打席記録を入力（自動で打率を計算）
 *   4) 統計          : 打率・出席率を全メンバー分まとめて表示
 *
 * セキュリティ:
 *   - ページ表示前にパスワード認証（POST /api/admin/verify）
 *   - 認証後の各 API 呼び出しは x-admin-password ヘッダで毎回認可
 *   - パスワードはコンポーネント state のみに保持。ページ離脱で消える。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type Tab = "members" | "attendance" | "lineup" | "scoreboard" | "batting" | "pitching" | "catching" | "fielding" | "probables" | "payments" | "stats" | "notify";

type ListRow = { rowIndex: number; data: string[] };

type Member = {
  id: string;
  name: string;
  nickname: string;
  jerseyNumber: string;
  position: string;
  joinedDate: string;
  active: boolean;
  _row?: number;
};

type AttendanceRow = {
  date: string;
  memberId: string;
  memberName: string;
  status: string;
  note: string;
  _row: number;
};

type BattingRow = {
  date: string;
  memberId: string;
  memberName: string;
  opponent: string;
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
  _row: number;
};

type PitchingRow = {
  date: string;
  memberId: string;
  memberName: string;
  opponent: string;
  ipOuts: number;  // 投球回をアウト数で記録（6 outs = 2.0回）
  hits: number;
  runs: number;
  er: number;      // 自責点
  so: number;      // 奪三振
  bb: number;      // 与四球
  hbp: number;     // 与死球
  _row: number;
};

type CatchingRow = {
  date: string;
  memberId: string;
  memberName: string;
  opponent: string;
  sba: number;     // 盗塁試行された数
  cs: number;      // 盗塁阻止数
  _row: number;
};

type FieldingRow = {
  date: string;
  memberId: string;
  memberName: string;
  opponent: string;
  po: number;      // 刺殺
  a: number;       // 捕殺
  e: number;       // 失策
  _row: number;
};

type ProbableRow = {
  date: string;
  opponent: string;
  memberId: string;
  memberName: string;
  note: string;
  _row: number;
};

type AnnouncementRow = {
  date: string;
  category: string;
  title: string;
  body: string;
  _row: number;
};

type LineupRow = {
  id: string;
  date: string;
  team: string;
  order: number;
  memberId: string;
  memberName: string;
  position: string;
  _row: number;
};

type GameRow = {
  id: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScores: number[];  // inning-by-inning
  awayScores: number[];
  homeHits: number;
  awayHits: number;
  homeErrors: number;
  awayErrors: number;
  winner: string;
  note: string;
  _row: number;
};

type PaymentRow = {
  id: string;
  date: string;
  memberId: string;
  memberName: string;
  amount: number;
  note: string;
  _row: number;
};

type PracticeRow = {
  date: string;
  type: string;
  place: string;
  status: string;
  time: string;
  note: string;
  _row: number;
};

type ParticipantRow = {
  date: string;
  memberId: string;
  memberName: string;
  note: string;
  _row: number;
};

const POSITIONS = ["投手", "捕手", "一塁手", "二塁手", "三塁手", "遊撃手", "左翼手", "中堅手", "右翼手", "指名打者", "未定"] as const;
const ATTENDANCE_STATUSES = ["出席", "欠席", "遅刻", "未定"] as const;

// ────────────────────────────────────────────────────────
// ユーティリティ
// ────────────────────────────────────────────────────────
function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function genId(prefix = "m"): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
function num(s: string | undefined): number {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}
function avg3(v: number): string {
  // 打率を 0.123 形式で
  if (!Number.isFinite(v)) return ".000";
  return v.toFixed(3).replace(/^0/, "");
}

const WEEKDAY_JP = ["日", "月", "火", "水", "木", "金", "土"];

/**
 * 様々なフォーマットの日付文字列を "YYYY-MM-DD" に正規化する。
 * 受理する形式:
 *   - "2026-05-29" / "2026-5-29"
 *   - "2026/05/29" / "2026.05.29"
 *   - JS Date.toString() 形式（"Fri May 29 2026 00:00:00 GMT+0900 (Japan Standard Time)"）
 *     — Apps Script が Sheets の Date セルを String() した時に出るやつ
 * パースできない値は元のまま返す。
 */
function normalizeDate(s: string): string {
  if (!s) return "";
  // 既に YYYY-MM-DD っぽい
  const cleaned = s.replace(/[./]/g, "-");
  const m = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  }
  // JS Date.toString() 系のフォーマットを Date 経由でパース
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  }
  return s; // 諦め
}

/** "2026-05-29" → "2026/5/29（金）" 形式で表示。 */
function formatDateJp(dateStr: string): string {
  if (!dateStr) return "";
  const normalized = normalizeDate(dateStr);
  const m = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return dateStr;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (isNaN(dt.getTime())) return dateStr;
  return `${y}/${mo}/${d}（${WEEKDAY_JP[dt.getDay()]}）`;
}

/** 短縮形 "5/29(金)" */
function formatDateShort(dateStr: string): string {
  if (!dateStr) return "";
  const normalized = normalizeDate(dateStr);
  const m = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return dateStr;
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Number(m[1]), mo - 1, d);
  if (isNaN(dt.getTime())) return dateStr;
  return `${mo}/${d}(${WEEKDAY_JP[dt.getDay()]})`;
}

// ────────────────────────────────────────────────────────
// メインコンポーネント
// ────────────────────────────────────────────────────────
export default function TeamAdminPage() {
  // ── 認証 ──
  const [authPw, setAuthPw] = useState("");          // 入力中
  const [verifiedPw, setVerifiedPw] = useState("");  // 認証済みパスワード
  const [authError, setAuthError] = useState("");
  const [verifying, setVerifying] = useState(false);

  async function verify() {
    setVerifying(true);
    setAuthError("");
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: authPw }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        setVerifiedPw(authPw);
        setAuthPw("");
      } else {
        setAuthError(data?.error ?? "パスワードが違います。");
      }
    } catch {
      setAuthError("ネットワークエラーが発生しました。");
    } finally {
      setVerifying(false);
    }
  }

  function logout() {
    setVerifiedPw("");
    setAuthPw("");
  }

  if (!verifiedPw) {
    return <LoginGate
      pw={authPw}
      onChange={setAuthPw}
      onSubmit={verify}
      verifying={verifying}
      error={authError}
    />;
  }

  return <Dashboard pw={verifiedPw} onLogout={logout} />;
}

// ────────────────────────────────────────────────────────
// パスワード入力画面
// ────────────────────────────────────────────────────────
function LoginGate({
  pw, onChange, onSubmit, verifying, error,
}: {
  pw: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  verifying: boolean;
  error: string;
}) {
  return (
    <div className="admin-dark" style={{
      minHeight: "100vh",
      background:
        "radial-gradient(ellipse at top, rgba(209,0,36,0.12), transparent 50%), " +
        "radial-gradient(ellipse at bottom, rgba(212,168,42,0.06), transparent 50%), " +
        "#0a0e1a",
      display: "grid",
      placeItems: "center",
      padding: "20px",
    }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Image src="/sk_logo_crop.png" alt="logo" width={96} height={79} className="object-contain mx-auto" />
          <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d4a82a", letterSpacing: "0.4em", marginTop: 12 }}>
            ADMIN — TEAM CONSOLE
          </p>
          <h1 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: 22, fontWeight: 900, color: "#fff", marginTop: 6 }}>
            チーム管理コンソール
          </h1>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 8, lineHeight: 1.8 }}>
            メンバー名簿・背番号・打席記録・出欠管理。<br />
            管理者専用ページです。
          </p>
        </div>
        <form
          onSubmit={e => { e.preventDefault(); onSubmit(); }}
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "28px 24px" }}
        >
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.65)", letterSpacing: "0.18em", marginBottom: 10 }}>
            PASSWORD
          </label>
          <input
            type="password"
            value={pw}
            onChange={e => onChange(e.target.value)}
            autoFocus
            autoComplete="current-password"
            placeholder="管理者パスワード"
            style={{
              width: "100%",
              padding: "13px 16px",
              fontSize: 15,
              fontFamily: "var(--font-zen),sans-serif",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#fff",
              outline: "none",
            }}
          />
          {error && (
            <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(209,0,36,0.1)", border: "1px solid rgba(209,0,36,0.3)", color: "#ff6982", fontSize: 13 }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={verifying || !pw}
            style={{
              marginTop: 18,
              width: "100%",
              padding: 14,
              background: verifying ? "#666" : "#d10024",
              color: "#fff",
              border: "none",
              fontFamily: "var(--font-zen),sans-serif",
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: "0.2em",
              cursor: verifying ? "not-allowed" : "pointer",
            }}
          >
            {verifying ? "認証中..." : "ログイン →"}
          </button>
        </form>
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Link href="/" style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>
            ← トップサイトへ戻る
          </Link>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// 認証後のダッシュボード
// ────────────────────────────────────────────────────────
function Dashboard({ pw, onLogout }: { pw: string; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("members");
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [batting, setBatting] = useState<BattingRow[]>([]);
  const [lineups, setLineups] = useState<LineupRow[]>([]);
  const [games, setGames] = useState<GameRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [practices, setPractices] = useState<PracticeRow[]>([]);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [pitching, setPitching] = useState<PitchingRow[]>([]);
  const [catching, setCatching] = useState<CatchingRow[]>([]);
  const [fielding, setFielding] = useState<FieldingRow[]>([]);
  const [probables, setProbables] = useState<ProbableRow[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);  // 書き込み中フラグ（ボタン disable / ローダー表示用）
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(ok: boolean, text: string) {
    setToast({ ok, text });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  // ── 共通 API 呼び出し ──
  // list 系（読み取り）は loading flag のみ、append/update/delete（書き込み）は saving を立てる。
  // 連続して呼ばれる可能性があるので Symbol で参照カウントせず、各呼び出しの try/finally で確実に下げる。
  const writingCount = useRef(0);
  const api = useCallback(async <T,>(path: string, body: Record<string, unknown>): Promise<T | null> => {
    const isWrite = path !== "/api/admin/list" && path !== "/api/admin/verify";
    if (isWrite) {
      writingCount.current += 1;
      setSaving(true);
    }
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": pw },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        showToast(false, data?.error ?? "リクエストに失敗しました。");
        return null;
      }
      return data as T;
    } catch {
      showToast(false, "ネットワークエラーが発生しました。");
      return null;
    } finally {
      if (isWrite) {
        writingCount.current = Math.max(0, writingCount.current - 1);
        if (writingCount.current === 0) setSaving(false);
      }
    }
  }, [pw]);

  const setLoadingFor = (key: string, v: boolean) =>
    setLoading(prev => ({ ...prev, [key]: v }));

  // ── 取得 ──
  const loadMembers = useCallback(async () => {
    setLoadingFor("members", true);
    const data = await api<{ ok: true; rows: ListRow[] }>("/api/admin/list", { sheet: "members" });
    setLoadingFor("members", false);
    if (!data) return;
    const parsed = (data.rows ?? []).map(r => ({
      id: r.data[0] ?? "",
      name: r.data[1] ?? "",
      nickname: r.data[2] ?? "",
      jerseyNumber: r.data[3] ?? "",
      position: r.data[4] ?? "",
      joinedDate: normalizeDate(r.data[5] ?? ""),
      active: (r.data[6] ?? "TRUE").toString().toUpperCase() !== "FALSE",
      _row: r.rowIndex,
    } as Member));
    setMembers(parsed);
  }, [api]);

  const loadAttendance = useCallback(async () => {
    setLoadingFor("attendance", true);
    const data = await api<{ ok: true; rows: ListRow[] }>("/api/admin/list", { sheet: "attendance" });
    setLoadingFor("attendance", false);
    if (!data) return;
    setAttendance((data.rows ?? []).map(r => ({
      date: normalizeDate(r.data[0] ?? ""),
      memberId: r.data[1] ?? "",
      memberName: r.data[2] ?? "",
      status: r.data[3] ?? "",
      note: r.data[4] ?? "",
      _row: r.rowIndex,
    })));
  }, [api]);

  const loadBatting = useCallback(async () => {
    setLoadingFor("batting", true);
    const data = await api<{ ok: true; rows: ListRow[] }>("/api/admin/list", { sheet: "batting" });
    setLoadingFor("batting", false);
    if (!data) return;
    setBatting((data.rows ?? []).map(r => ({
      date: normalizeDate(r.data[0] ?? ""),
      memberId: r.data[1] ?? "",
      memberName: r.data[2] ?? "",
      opponent: r.data[3] ?? "",
      atBats: num(r.data[4]),
      hits: num(r.data[5]),
      doubles: num(r.data[6]),
      triples: num(r.data[7]),
      hr: num(r.data[8]),
      rbi: num(r.data[9]),
      bb: num(r.data[10]),
      so: num(r.data[11]),
      // 拡張フィールド（既存シートに列がなければ 0）
      hbp: num(r.data[12]),
      sh: num(r.data[13]),
      sb: num(r.data[14]),
      cs: num(r.data[15]),
      _row: r.rowIndex,
    })));
  }, [api]);

  const loadPitching = useCallback(async () => {
    setLoadingFor("pitching", true);
    const data = await api<{ ok: true; rows: ListRow[] }>("/api/admin/list", { sheet: "pitching" });
    setLoadingFor("pitching", false);
    if (!data) return;
    setPitching((data.rows ?? []).map(r => ({
      date: normalizeDate(r.data[0] ?? ""),
      memberId: r.data[1] ?? "",
      memberName: r.data[2] ?? "",
      opponent: r.data[3] ?? "",
      ipOuts: num(r.data[4]),
      hits: num(r.data[5]),
      runs: num(r.data[6]),
      er: num(r.data[7]),
      so: num(r.data[8]),
      bb: num(r.data[9]),
      hbp: num(r.data[10]),
      _row: r.rowIndex,
    })));
  }, [api]);

  const loadCatching = useCallback(async () => {
    setLoadingFor("catching", true);
    const data = await api<{ ok: true; rows: ListRow[] }>("/api/admin/list", { sheet: "catching" });
    setLoadingFor("catching", false);
    if (!data) return;
    setCatching((data.rows ?? []).map(r => ({
      date: normalizeDate(r.data[0] ?? ""),
      memberId: r.data[1] ?? "",
      memberName: r.data[2] ?? "",
      opponent: r.data[3] ?? "",
      sba: num(r.data[4]),
      cs: num(r.data[5]),
      _row: r.rowIndex,
    })));
  }, [api]);

  const loadFielding = useCallback(async () => {
    setLoadingFor("fielding", true);
    const data = await api<{ ok: true; rows: ListRow[] }>("/api/admin/list", { sheet: "fielding" });
    setLoadingFor("fielding", false);
    if (!data) return;
    setFielding((data.rows ?? []).map(r => ({
      date: normalizeDate(r.data[0] ?? ""),
      memberId: r.data[1] ?? "",
      memberName: r.data[2] ?? "",
      opponent: r.data[3] ?? "",
      po: num(r.data[4]),
      a: num(r.data[5]),
      e: num(r.data[6]),
      _row: r.rowIndex,
    })));
  }, [api]);

  const loadProbables = useCallback(async () => {
    setLoadingFor("probables", true);
    const data = await api<{ ok: true; rows: ListRow[] }>("/api/admin/list", { sheet: "probables" });
    setLoadingFor("probables", false);
    if (!data) return;
    setProbables((data.rows ?? []).map(r => ({
      date: normalizeDate(r.data[0] ?? ""),
      opponent: r.data[1] ?? "",
      memberId: r.data[2] ?? "",
      memberName: r.data[3] ?? "",
      note: r.data[4] ?? "",
      _row: r.rowIndex,
    })));
  }, [api]);

  const loadAnnouncements = useCallback(async () => {
    setLoadingFor("announcements", true);
    const data = await api<{ ok: true; rows: ListRow[] }>("/api/admin/list", { sheet: "announcements" });
    setLoadingFor("announcements", false);
    if (!data) return;
    setAnnouncements((data.rows ?? []).map(r => ({
      date: normalizeDate(r.data[0] ?? ""),
      category: r.data[1] ?? "お知らせ",
      title: r.data[2] ?? "",
      body: r.data[3] ?? "",
      _row: r.rowIndex,
    })));
  }, [api]);

  const loadLineups = useCallback(async () => {
    setLoadingFor("lineups", true);
    const data = await api<{ ok: true; rows: ListRow[] }>("/api/admin/list", { sheet: "lineups" });
    setLoadingFor("lineups", false);
    if (!data) return;
    setLineups((data.rows ?? []).map(r => ({
      id: r.data[0] ?? "",
      date: normalizeDate(r.data[1] ?? ""),
      team: r.data[2] ?? "",
      order: num(r.data[3]),
      memberId: r.data[4] ?? "",
      memberName: r.data[5] ?? "",
      position: r.data[6] ?? "",
      _row: r.rowIndex,
    })));
  }, [api]);

  const loadGames = useCallback(async () => {
    setLoadingFor("games", true);
    const data = await api<{ ok: true; rows: ListRow[] }>("/api/admin/list", { sheet: "games" });
    setLoadingFor("games", false);
    if (!data) return;
    setGames((data.rows ?? []).map(r => ({
      id: r.data[0] ?? "",
      date: normalizeDate(r.data[1] ?? ""),
      homeTeam: r.data[2] ?? "",
      awayTeam: r.data[3] ?? "",
      homeScores: (r.data[4] ?? "").split(",").map(num).filter((_, i, arr) => i < arr.length),
      awayScores: (r.data[5] ?? "").split(",").map(num).filter((_, i, arr) => i < arr.length),
      homeHits: num(r.data[6]),
      awayHits: num(r.data[7]),
      homeErrors: num(r.data[8]),
      awayErrors: num(r.data[9]),
      winner: r.data[10] ?? "",
      note: r.data[11] ?? "",
      _row: r.rowIndex,
    })));
  }, [api]);

  const loadPayments = useCallback(async () => {
    setLoadingFor("payments", true);
    const data = await api<{ ok: true; rows: ListRow[] }>("/api/admin/list", { sheet: "payments" });
    setLoadingFor("payments", false);
    if (!data) return;
    setPayments((data.rows ?? []).map(r => ({
      id: r.data[0] ?? "",
      date: normalizeDate(r.data[1] ?? ""),
      memberId: r.data[2] ?? "",
      memberName: r.data[3] ?? "",
      amount: num(r.data[4]),
      note: r.data[5] ?? "",
      _row: r.rowIndex,
    })));
  }, [api]);

  const loadPractices = useCallback(async () => {
    setLoadingFor("practices", true);
    const data = await api<{ ok: true; rows: ListRow[] }>("/api/admin/list", { sheet: "practices" });
    setLoadingFor("practices", false);
    if (!data) return;
    setPractices((data.rows ?? []).map(r => ({
      date: normalizeDate(r.data[0] ?? ""),
      type: r.data[1] ?? "",
      place: r.data[2] ?? "",
      status: r.data[3] ?? "",
      time: r.data[4] ?? "",
      note: r.data[5] ?? "",
      _row: r.rowIndex,
    })));
  }, [api]);

  const loadParticipants = useCallback(async () => {
    setLoadingFor("participants", true);
    const data = await api<{ ok: true; rows: ListRow[] }>("/api/admin/list", { sheet: "participants" });
    setLoadingFor("participants", false);
    if (!data) return;
    setParticipants((data.rows ?? []).map(r => ({
      date: normalizeDate(r.data[0] ?? ""),
      memberId: r.data[1] ?? "",
      memberName: r.data[2] ?? "",
      note: r.data[3] ?? "",
      _row: r.rowIndex,
    })));
  }, [api]);

  // 初回ロード
  useEffect(() => { loadMembers(); }, [loadMembers]);
  useEffect(() => {
    if (tab === "attendance") {
      if (attendance.length === 0) loadAttendance();
      if (practices.length === 0) loadPractices();
      if (participants.length === 0) loadParticipants();
    }
  }, [tab, attendance.length, practices.length, participants.length, loadAttendance, loadPractices, loadParticipants]);
  useEffect(() => { if (tab === "batting" && batting.length === 0) loadBatting(); }, [tab, batting.length, loadBatting]);
  useEffect(() => { if (tab === "pitching" && pitching.length === 0) loadPitching(); }, [tab, pitching.length, loadPitching]);
  useEffect(() => { if (tab === "catching" && catching.length === 0) loadCatching(); }, [tab, catching.length, loadCatching]);
  useEffect(() => { if (tab === "fielding" && fielding.length === 0) loadFielding(); }, [tab, fielding.length, loadFielding]);
  useEffect(() => { if (tab === "notify" && announcements.length === 0) loadAnnouncements(); }, [tab, announcements.length, loadAnnouncements]);
  useEffect(() => {
    if (tab === "probables") {
      if (probables.length === 0) loadProbables();
      if (practices.length === 0) loadPractices();
    }
  }, [tab, probables.length, practices.length, loadProbables, loadPractices]);
  useEffect(() => { if (tab === "lineup" && lineups.length === 0) loadLineups(); }, [tab, lineups.length, loadLineups]);
  useEffect(() => { if (tab === "scoreboard" && games.length === 0) loadGames(); }, [tab, games.length, loadGames]);
  useEffect(() => { if (tab === "payments" && payments.length === 0) loadPayments(); }, [tab, payments.length, loadPayments]);
  useEffect(() => {
    if (tab === "stats") {
      if (attendance.length === 0) loadAttendance();
      if (batting.length === 0) loadBatting();
      if (pitching.length === 0) loadPitching();
      if (catching.length === 0) loadCatching();
    }
  }, [tab, attendance.length, batting.length, pitching.length, catching.length, loadAttendance, loadBatting, loadPitching, loadCatching]);

  // ── レンダリング ──
  return (
    <div className="admin-dark" style={{ minHeight: "100vh", background: "#0a0e1a", color: "#fff" }}>
      {/* Top bar */}
      <header style={{ background: "#0b1e3f", borderBottom: "3px solid #d10024" }}>
        <div className="max-w-[1280px] mx-auto px-5 md:px-8 flex items-center" style={{ height: 64, gap: 16 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
            <Image src="/sk_logo_crop.png" alt="logo" width={44} height={36} className="object-contain" />
            <div style={{ lineHeight: 1.1 }}>
              <div style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 900, fontSize: 14 }}>博多SKルーキーズ</div>
              <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 9, color: "#d4a82a", letterSpacing: "0.3em", marginTop: 2 }}>TEAM CONSOLE</div>
            </div>
          </Link>
          <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em" }}>
            管理者専用ページ
          </span>
          <button
            onClick={onLogout}
            style={{ padding: "8px 14px", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", fontSize: 12, cursor: "pointer", letterSpacing: "0.06em" }}
          >
            ログアウト
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ background: "#131a2c", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="max-w-[1280px] mx-auto px-2 md:px-8 flex" style={{ overflowX: "auto" }}>
          {([
            ["members", "名簿", members.length],
            ["attendance", "練習出欠", attendance.length],
            ["lineup", "スタメン", lineups.length],
            ["scoreboard", "スコアボード", games.length],
            ["batting", "打席記録", batting.length],
            ["pitching", "投手記録", pitching.length],
            ["catching", "捕手記録", catching.length],
            ["fielding", "守備記録", fielding.length],
            ["probables", "予告先発", probables.length],
            ["payments", "集金", payments.length],
            ["stats", "統計", undefined],
            ["notify", "🔔通知", undefined],
          ] as [Tab, string, number | undefined][]).map(([key, label, count]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                padding: "14px 18px",
                background: tab === key ? "rgba(255,204,74,0.04)" : "transparent",
                color: tab === key ? "#d4a82a" : "rgba(255,255,255,0.55)",
                border: "none",
                borderBottom: tab === key ? "2px solid #d10024" : "2px solid transparent",
                fontFamily: "var(--font-zen),sans-serif",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.08em",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {label}{count !== undefined && <span style={{ marginLeft: 6, fontSize: 11, color: "rgba(255,255,255,0.45)" }}>({count})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <main className="max-w-[1280px] mx-auto px-5 md:px-8" style={{ paddingTop: 24, paddingBottom: 80 }}>
        {tab === "members" && (
          <MembersTab
            members={members}
            loading={!!loading.members}
            api={api}
            reload={loadMembers}
            showToast={showToast}
          />
        )}
        {tab === "attendance" && (
          <AttendanceTab
            members={members}
            attendance={attendance}
            practices={practices}
            participants={participants}
            loading={!!loading.attendance}
            participantsLoading={!!loading.participants}
            api={api}
            reload={loadAttendance}
            reloadPractices={loadPractices}
            reloadParticipants={loadParticipants}
            showToast={showToast}
          />
        )}
        {tab === "lineup" && (
          <LineupTab
            members={members}
            lineups={lineups}
            practices={practices}
            loading={!!loading.lineups}
            api={api}
            reload={loadLineups}
            reloadPractices={loadPractices}
            showToast={showToast}
          />
        )}
        {tab === "scoreboard" && (
          <ScoreboardTab
            games={games}
            loading={!!loading.games}
            api={api}
            reload={loadGames}
            showToast={showToast}
          />
        )}
        {tab === "batting" && (
          <BattingTab
            members={members}
            batting={batting}
            loading={!!loading.batting}
            saving={saving}
            api={api}
            reload={loadBatting}
            showToast={showToast}
          />
        )}
        {tab === "pitching" && (
          <PitchingTab
            members={members}
            pitching={pitching}
            loading={!!loading.pitching}
            saving={saving}
            api={api}
            reload={loadPitching}
            showToast={showToast}
          />
        )}
        {tab === "catching" && (
          <CatchingTab
            members={members}
            catching={catching}
            loading={!!loading.catching}
            saving={saving}
            api={api}
            reload={loadCatching}
            showToast={showToast}
          />
        )}
        {tab === "fielding" && (
          <FieldingTab
            members={members}
            fielding={fielding}
            loading={!!loading.fielding}
            saving={saving}
            api={api}
            reload={loadFielding}
            showToast={showToast}
          />
        )}
        {tab === "probables" && (
          <ProbablesTab
            members={members}
            probables={probables}
            practices={practices}
            loading={!!loading.probables}
            saving={saving}
            pw={pw}
            api={api}
            reload={loadProbables}
            reloadPractices={loadPractices}
            showToast={showToast}
          />
        )}
        {tab === "notify" && (
          <NotifyTab
            pw={pw}
            announcements={announcements}
            loading={!!loading.announcements}
            api={api}
            reload={loadAnnouncements}
            showToast={showToast}
          />
        )}
        {tab === "payments" && (
          <PaymentsTab
            members={members}
            payments={payments}
            practices={practices}
            loading={!!loading.payments}
            api={api}
            reload={loadPayments}
            reloadPractices={loadPractices}
            showToast={showToast}
          />
        )}
        {tab === "stats" && (
          <StatsTab
            members={members}
            attendance={attendance}
            batting={batting}
            loading={!!(loading.attendance || loading.batting)}
          />
        )}
      </main>

      {/* Saving overlay — 書き込み中の視覚フィードバック */}
      {saving && (
        <div
          aria-live="polite"
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(10,14,26,0.55)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 60,
            pointerEvents: "none",
          }}
        >
          <div style={{
            background: "#131a2c",
            border: "1px solid rgba(212,168,42,0.4)",
            padding: "16px 24px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
            fontFamily: "var(--font-zen),sans-serif",
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "#d4a82a",
            fontSize: 13,
          }}>
            <span style={{
              width: 18, height: 18,
              border: "2px solid rgba(212,168,42,0.25)",
              borderTopColor: "#d4a82a",
              borderRadius: "50%",
              animation: "skr-spin 0.8s linear infinite",
            }} />
            保存中…
          </div>
          <style>{`@keyframes skr-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          padding: "14px 20px",
          background: toast.ok ? "#1a9f3a" : "#d10024",
          color: "#fff",
          fontFamily: "var(--font-zen),sans-serif",
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: "0.05em",
          boxShadow: "0 12px 36px rgba(0,0,0,0.4)",
          zIndex: 50,
        }}>
          {toast.ok ? "✓" : "⚠"} {toast.text}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────
// 共通スタイル
// ────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  padding: 20,
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 11px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#fff",
  fontSize: 13,
  fontFamily: "var(--font-zen),sans-serif",
  outline: "none",
};
const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 10,
  fontWeight: 700,
  color: "rgba(255,255,255,0.6)",
  letterSpacing: "0.16em",
  marginBottom: 5,
  textTransform: "uppercase",
};
const btnPrimaryStyle: React.CSSProperties = {
  background: "#d10024",
  color: "#fff",
  border: "none",
  padding: "10px 18px",
  fontFamily: "var(--font-zen),sans-serif",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.12em",
  cursor: "pointer",
};
const btnSubStyle: React.CSSProperties = {
  background: "transparent",
  color: "rgba(255,255,255,0.7)",
  border: "1px solid rgba(255,255,255,0.18)",
  padding: "8px 14px",
  fontFamily: "var(--font-zen),sans-serif",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.08em",
  cursor: "pointer",
};

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: 16, fontWeight: 900, color: "#d4a82a", marginBottom: 12, letterSpacing: "0.06em" }}>
      {children}
    </h3>
  );
}

// ────────────────────────────────────────────────────────
// メンバー名簿タブ
// ────────────────────────────────────────────────────────
function MembersTab({
  members, loading, api, reload, showToast,
}: {
  members: Member[];
  loading: boolean;
  api: <T,>(path: string, body: Record<string, unknown>) => Promise<T | null>;
  reload: () => void;
  showToast: (ok: boolean, text: string) => void;
}) {
  const [editing, setEditing] = useState<Member | null>(null);
  const [form, setForm] = useState({
    id: "", name: "", nickname: "", jerseyNumber: "", position: "未定", joinedDate: todayIso(), active: true,
  });

  function startEdit(m: Member) {
    setEditing(m);
    setForm({
      id: m.id,
      name: m.name,
      nickname: m.nickname,
      jerseyNumber: m.jerseyNumber,
      position: m.position || "未定",
      joinedDate: m.joinedDate || todayIso(),
      active: m.active,
    });
  }
  function cancelEdit() {
    setEditing(null);
    setForm({ id: "", name: "", nickname: "", jerseyNumber: "", position: "未定", joinedDate: todayIso(), active: true });
  }

  async function submit() {
    if (!form.name.trim()) {
      showToast(false, "名前は必須です。");
      return;
    }
    const id = form.id || genId("m");
    const row = [
      id, form.name.trim(), form.nickname.trim(), form.jerseyNumber.trim(),
      form.position, form.joinedDate, form.active ? "TRUE" : "FALSE",
    ];
    let ok;
    if (editing) {
      ok = await api("/api/admin/update", { sheet: "members", rowIndex: editing._row, row });
    } else {
      ok = await api("/api/admin/append", { sheet: "members", row });
    }
    if (ok) {
      showToast(true, editing ? "メンバー情報を更新しました。" : "メンバーを追加しました。");
      cancelEdit();
      reload();
    }
  }

  async function remove(m: Member) {
    if (!m._row) return;
    if (!window.confirm(`「${m.name}」を削除しますか？\n（出欠・打席記録は残ります）`)) return;
    const ok = await api("/api/admin/delete", { sheet: "members", rowIndex: m._row });
    if (ok) {
      showToast(true, "削除しました。");
      reload();
    }
  }

  return (
    <div className="grid gap-5 grid-cols-1 lg:grid-cols-[420px_1fr]">
      {/* 左: フォーム */}
      <section style={cardStyle}>
        <H3>{editing ? `編集: ${editing.name}` : "新規メンバー追加"}</H3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={labelStyle}>名前 <span style={{ color: "#d10024" }}>*</span></label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="例: 柏木 海斗" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>ニックネーム</label>
            <input value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })} placeholder="任意" style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>背番号</label>
              <input value={form.jerseyNumber} onChange={e => setForm({ ...form, jerseyNumber: e.target.value })} placeholder="例: 9" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>ポジション</label>
              <select value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} style={inputStyle as React.CSSProperties}>
                {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>加入日</label>
            <input type="date" value={form.joinedDate} onChange={e => setForm({ ...form, joinedDate: e.target.value })} style={inputStyle} />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", fontSize: 12, cursor: "pointer" }}>
            <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} style={{ accentColor: "#d10024" }} />
            <span>アクティブ（現役メンバー）</span>
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button onClick={submit} style={btnPrimaryStyle}>
              {editing ? "更新する →" : "追加する →"}
            </button>
            {editing && (
              <button onClick={cancelEdit} style={btnSubStyle}>キャンセル</button>
            )}
          </div>
        </div>
      </section>

      {/* 右: 一覧 */}
      <section style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <H3>名簿（{members.length}名）</H3>
          <button onClick={reload} disabled={loading} style={btnSubStyle}>
            {loading ? "読込中..." : "🔄 再読込"}
          </button>
        </div>
        {loading && members.length === 0 ? (
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, textAlign: "center", padding: 24 }}>読み込み中…</p>
        ) : members.length === 0 ? (
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, textAlign: "center", padding: 24 }}>
            まだメンバーが登録されていません。左のフォームから追加してください。
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <Th>#</Th>
                  <Th>名前</Th>
                  <Th>背番号</Th>
                  <Th>ポジション</Th>
                  <Th>加入日</Th>
                  <Th>状態</Th>
                  <Th>{""}</Th>
                </tr>
              </thead>
              <tbody>
                {members.map((m, i) => (
                  <tr key={m.id || i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <Td><span style={{ color: "rgba(255,255,255,0.4)" }}>{i + 1}</span></Td>
                    <Td>
                      <div style={{ fontWeight: 700 }}>{m.name}</div>
                      {m.nickname && <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>{m.nickname}</div>}
                    </Td>
                    <Td>
                      <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 18, fontWeight: 700, color: "#d4a82a" }}>
                        {m.jerseyNumber || "—"}
                      </span>
                    </Td>
                    <Td>{m.position || "—"}</Td>
                    <Td><span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>{formatDateJp(m.joinedDate) || "—"}</span></Td>
                    <Td>
                      {m.active ? (
                        <span style={{ fontSize: 10, padding: "3px 8px", background: "rgba(26,159,58,0.15)", color: "#67e088", letterSpacing: "0.06em" }}>現役</span>
                      ) : (
                        <span style={{ fontSize: 10, padding: "3px 8px", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em" }}>休止</span>
                      )}
                    </Td>
                    <Td>
                      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                        <button onClick={() => startEdit(m)} style={{ padding: "4px 10px", background: "rgba(212,168,42,0.15)", color: "#d4a82a", border: "1px solid rgba(212,168,42,0.35)", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>編集</button>
                        <button onClick={() => remove(m)} style={{ padding: "4px 10px", background: "rgba(209,0,36,0.15)", color: "#ff6982", border: "1px solid rgba(209,0,36,0.35)", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>削除</button>
                      </div>
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

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "0.12em", textTransform: "uppercase" }}>{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: "10px", verticalAlign: "middle" }}>{children}</td>;
}

// ────────────────────────────────────────────────────────
// 出欠確認タブ
// ────────────────────────────────────────────────────────
type AttendanceMode = "register" | "checkin";

function AttendanceTab({
  members, attendance, practices, participants, loading, participantsLoading,
  api, reload, reloadPractices, reloadParticipants, showToast,
}: {
  members: Member[];
  attendance: AttendanceRow[];
  practices: PracticeRow[];
  participants: ParticipantRow[];
  loading: boolean;
  participantsLoading: boolean;
  api: <T,>(path: string, body: Record<string, unknown>) => Promise<T | null>;
  reload: () => void;
  reloadPractices: () => void;
  reloadParticipants: () => void;
  showToast: (ok: boolean, text: string) => void;
}) {
  const [date, setDate] = useState(todayIso());
  const [mode, setMode] = useState<AttendanceMode>("register");
  // 事前登録: 参加予定の memberId set
  const [draftPreReg, setDraftPreReg] = useState<Set<string>>(new Set());
  // 当日出欠: memberId → status
  const [draftStatuses, setDraftStatuses] = useState<Record<string, string>>({});
  // 当日モードで「非登録メンバーも表示する」フラグ
  const [showAllInCheckin, setShowAllInCheckin] = useState(false);

  // 練習一覧
  const sortedPractices = useMemo(
    () => [...practices].filter(p => p.status !== "canceled").sort((a, b) => b.date.localeCompare(a.date)),
    [practices]
  );

  // 選択日の既存出欠
  const existingAttForDate = useMemo(() => {
    const m: Record<string, AttendanceRow> = {};
    for (const a of attendance) if (a.date === date) m[a.memberId] = a;
    return m;
  }, [attendance, date]);

  // 選択日の事前登録メンバー
  const preRegisteredForDate = useMemo(() => {
    return participants.filter(p => p.date === date);
  }, [participants, date]);

  const preRegisteredIds = useMemo(
    () => new Set(preRegisteredForDate.map(p => p.memberId)),
    [preRegisteredForDate]
  );

  const activeMembers = members.filter(m => m.active);

  // 日付が変わったら draft をリセット＆事前登録から初期化
  useEffect(() => {
    setDraftPreReg(new Set(preRegisteredIds));
    setDraftStatuses({});
  }, [date, preRegisteredIds]);

  // 当日モードで表示するメンバー
  const checkinMembers = showAllInCheckin
    ? activeMembers
    : activeMembers.filter(m => preRegisteredIds.has(m.id));

  function statusFor(m: Member): string {
    return draftStatuses[m.id] ?? existingAttForDate[m.id]?.status ?? "未定";
  }

  // ── 事前登録モード: 保存 ──
  async function savePreRegistration() {
    if (!date) { showToast(false, "日付を選んでください。"); return; }
    // 同日の既存 participants を全削除 → draftPreReg をすべて追加
    const existing = participants.filter(p => p.date === date);
    // 削除は行番号の大きい順に（インデックスズレ回避）
    const sortedDel = [...existing].sort((a, b) => b._row - a._row);
    for (const e of sortedDel) {
      await api("/api/admin/delete", { sheet: "participants", rowIndex: e._row });
    }
    // 追加
    let added = 0;
    for (const id of draftPreReg) {
      const m = members.find(mm => mm.id === id);
      if (!m) continue;
      const r = await api("/api/admin/append", { sheet: "participants", row: [date, id, m.name, ""] });
      if (r) added++;
    }
    showToast(true, `参加予定 ${added}名で保存しました。`);
    reloadParticipants();
  }

  // ── 当日モード: 出欠保存 ──
  async function saveAttendance() {
    if (!date) { showToast(false, "日付を選んでください。"); return; }
    let written = 0;
    const targets = showAllInCheckin ? activeMembers : checkinMembers;
    for (const m of targets) {
      const newStatus = draftStatuses[m.id];
      if (newStatus === undefined) continue;
      const existing = existingAttForDate[m.id];
      const row = [date, m.id, m.name, newStatus, existing?.note ?? ""];
      const r = existing
        ? await api("/api/admin/update", { sheet: "attendance", rowIndex: existing._row, row })
        : await api("/api/admin/append", { sheet: "attendance", row });
      if (r) written++;
    }
    if (written > 0) {
      showToast(true, `${written}件の出欠を保存しました。`);
      setDraftStatuses({});
      reload();
    } else {
      showToast(false, "変更がありません。");
    }
  }

  function togglePreReg(id: string) {
    setDraftPreReg(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAllPreReg(checked: boolean) {
    if (checked) setDraftPreReg(new Set(activeMembers.map(m => m.id)));
    else setDraftPreReg(new Set());
  }

  const colors: Record<string, string> = {
    "出席": "#1a9f3a", "欠席": "#d10024", "遅刻": "#d4a82a", "未定": "#5b6373",
  };
  const countBy = (s: string) => checkinMembers.filter(m => statusFor(m) === s).length;

  return (
    <div className="grid gap-5 grid-cols-1">
      {/* 共通: 日付＋モード切替 */}
      <section style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
          <H3>練習出欠</H3>
          {/* モード切替 */}
          <div style={{ display: "inline-flex", border: "1px solid rgba(255,255,255,0.15)", overflow: "hidden" }}>
            {([
              ["register", "📝 事前登録"],
              ["checkin", "✅ 当日出欠"],
            ] as [AttendanceMode, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                style={{
                  padding: "8px 16px",
                  background: mode === key ? "#d10024" : "transparent",
                  color: mode === key ? "#fff" : "rgba(255,255,255,0.6)",
                  border: "none",
                  fontFamily: "var(--font-zen),sans-serif",
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: "0.08em",
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <div>
            <label style={labelStyle}>練習日</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>{formatDateJp(date) || "—"}</p>
          </div>
          {sortedPractices.length > 0 && (
            <div>
              <label style={labelStyle}>登録済み練習から選ぶ</label>
              <select value="" onChange={e => { if (e.target.value) setDate(e.target.value); }} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="">— 練習一覧から選択 —</option>
                {sortedPractices.slice(0, 30).map(p => (
                  <option key={p._row} value={p.date}>
                    {formatDateShort(p.date)}　{p.place || "(場所未登録)"}{p.time ? ` / ${p.time}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          {mode === "register" ? (
            <>
              <button onClick={savePreRegistration} style={btnPrimaryStyle}>💾 参加予定者として保存</button>
              <button onClick={() => toggleAllPreReg(true)} style={btnSubStyle}>全員を予定に</button>
              <button onClick={() => toggleAllPreReg(false)} style={btnSubStyle}>全員解除</button>
            </>
          ) : (
            <>
              <button onClick={saveAttendance} style={btnPrimaryStyle}>💾 出欠を保存</button>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", border: "1px solid rgba(255,255,255,0.15)", fontSize: 12, cursor: "pointer" }}>
                <input type="checkbox" checked={showAllInCheckin} onChange={e => setShowAllInCheckin(e.target.checked)} style={{ accentColor: "#d10024" }} />
                飛び込み参加者も表示
              </label>
            </>
          )}
          <button onClick={reload} style={{ ...btnSubStyle, marginLeft: "auto" }}>{loading ? "..." : "🔄 出欠再読込"}</button>
          <button onClick={reloadParticipants} style={btnSubStyle}>{participantsLoading ? "..." : "🔄 参加予定再読込"}</button>
          <button onClick={reloadPractices} style={btnSubStyle}>練習リスト更新</button>
        </div>

        {/* サマリ（当日モードのみ） */}
        {mode === "checkin" && (
          <div className="grid gap-2 mt-4" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            {ATTENDANCE_STATUSES.map(s => (
              <div key={s} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", letterSpacing: "0.16em", textTransform: "uppercase" }}>{s}</div>
                <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 22, fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>{countBy(s)}</div>
              </div>
            ))}
          </div>
        )}

        {/* 事前登録モードの案内 */}
        {mode === "register" && (
          <div style={{ marginTop: 14, padding: "12px 14px", background: "rgba(212,168,42,0.06)", borderLeft: "3px solid #d4a82a", fontSize: 12, color: "rgba(255,255,255,0.75)", lineHeight: 1.7 }}>
            この日の<strong style={{ color: "#d4a82a" }}>参加予定者</strong>を選んでください。保存後、当日に「✅ 当日出欠」モードへ切り替えると、ここで登録した人だけがリストアップされ、出席／欠席／遅刻を素早く確認できます。
          </div>
        )}
      </section>

      {/* メンバーリスト */}
      <section style={cardStyle}>
        {mode === "register" ? (
          <>
            <H3>参加予定の登録（{draftPreReg.size} / {activeMembers.length}名）</H3>
            {activeMembers.length === 0 ? (
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>アクティブなメンバーがいません。「名簿」タブから追加してください。</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {activeMembers.map((m, i) => {
                  const checked = draftPreReg.has(m.id);
                  return (
                    <li
                      key={m.id || i}
                      onClick={() => togglePreReg(m.id)}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "32px 1fr",
                        gap: 12,
                        alignItems: "center",
                        padding: "12px 10px",
                        borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.05)",
                        cursor: "pointer",
                        background: checked ? "rgba(212,168,42,0.07)" : "transparent",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePreReg(m.id)}
                        onClick={e => e.stopPropagation()}
                        style={{ width: 18, height: 18, accentColor: "#d4a82a", cursor: "pointer" }}
                      />
                      <div>
                        <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 15, color: "#d4a82a", marginRight: 12 }}>{m.jerseyNumber || "—"}</span>
                        <span style={{ fontWeight: 700 }}>{m.name}</span>
                        {m.nickname && <span style={{ marginLeft: 8, color: "rgba(255,255,255,0.4)", fontSize: 12 }}>({m.nickname})</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        ) : (
          <>
            <H3>
              当日出欠（{checkinMembers.length}名{showAllInCheckin ? `／全${activeMembers.length}名` : "・参加予定者のみ"}）
            </H3>
            {preRegisteredIds.size === 0 && !showAllInCheckin ? (
              <div style={{ padding: 20, textAlign: "center", background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)" }}>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginBottom: 10 }}>
                  この日の参加予定が登録されていません。
                </p>
                <button onClick={() => setMode("register")} style={btnPrimaryStyle}>📝 事前登録モードへ</button>
                <button onClick={() => setShowAllInCheckin(true)} style={{ ...btnSubStyle, marginLeft: 6 }}>全メンバーで進める</button>
              </div>
            ) : checkinMembers.length === 0 ? (
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>表示できるメンバーがいません。</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {checkinMembers.map((m, i) => {
                  const cur = statusFor(m);
                  const isPreReg = preRegisteredIds.has(m.id);
                  return (
                    <li key={m.id || i} style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 12, padding: "10px 0", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.05)" }}>
                      <div>
                        <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 15, color: "#d4a82a", marginRight: 12 }}>{m.jerseyNumber || "—"}</span>
                        <span style={{ fontWeight: 700 }}>{m.name}</span>
                        {m.nickname && <span style={{ marginLeft: 8, color: "rgba(255,255,255,0.4)", fontSize: 12 }}>({m.nickname})</span>}
                        {isPreReg ? (
                          <span style={{ marginLeft: 8, fontSize: 10, padding: "2px 7px", background: "rgba(212,168,42,0.15)", color: "#d4a82a", letterSpacing: "0.06em" }}>予定</span>
                        ) : (
                          <span style={{ marginLeft: 8, fontSize: 10, padding: "2px 7px", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)", letterSpacing: "0.06em" }}>飛び込み</span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        {ATTENDANCE_STATUSES.map(s => {
                          const active = cur === s;
                          return (
                            <button
                              key={s}
                              onClick={() => setDraftStatuses(prev => ({ ...prev, [m.id]: s }))}
                              style={{
                                padding: "6px 12px",
                                background: active ? colors[s] : "transparent",
                                color: active ? "#fff" : "rgba(255,255,255,0.5)",
                                border: active ? "none" : "1px solid rgba(255,255,255,0.15)",
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: "0.06em",
                                cursor: "pointer",
                              }}
                            >
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// スタメン登録タブ（紅白戦対応）
// ────────────────────────────────────────────────────────
function LineupTab({
  members, lineups, practices, loading, api, reload, reloadPractices, showToast,
}: {
  members: Member[];
  lineups: LineupRow[];
  practices: PracticeRow[];
  loading: boolean;
  api: <T,>(path: string, body: Record<string, unknown>) => Promise<T | null>;
  reload: () => void;
  reloadPractices: () => void;
  showToast: (ok: boolean, text: string) => void;
}) {
  const [date, setDate] = useState(todayIso());
  const [mode, setMode] = useState<"single" | "split">("single");
  const [teamAName, setTeamAName] = useState("Aチーム");
  const [teamBName, setTeamBName] = useState("Bチーム");
  const [size, setSize] = useState(9);  // 1チームの人数（紅白戦は7や8もアリ）

  // 編集中のスタメン状態：team → order → { memberId, position }
  type Slot = { memberId: string; position: string };
  const [slotsA, setSlotsA] = useState<Slot[]>([]);
  const [slotsB, setSlotsB] = useState<Slot[]>([]);

  // 同日に既に登録があれば読み込む
  useEffect(() => {
    const todays = lineups.filter(l => l.date === date);
    const teamNames = [...new Set(todays.map(l => l.team))];
    if (teamNames.length === 2) {
      setMode("split");
      setTeamAName(teamNames[0] || "Aチーム");
      setTeamBName(teamNames[1] || "Bチーム");
      const A = todays.filter(l => l.team === teamNames[0]).sort((a, b) => a.order - b.order);
      const B = todays.filter(l => l.team === teamNames[1]).sort((a, b) => a.order - b.order);
      const maxLen = Math.max(A.length, B.length, 7);
      setSize(maxLen);
      setSlotsA(Array.from({ length: maxLen }, (_, i) => A[i] ? { memberId: A[i].memberId, position: A[i].position } : { memberId: "", position: "" }));
      setSlotsB(Array.from({ length: maxLen }, (_, i) => B[i] ? { memberId: B[i].memberId, position: B[i].position } : { memberId: "", position: "" }));
    } else if (teamNames.length === 1) {
      setMode("single");
      setTeamAName(teamNames[0] || "ホーム");
      const A = todays.sort((a, b) => a.order - b.order);
      setSize(Math.max(A.length, 9));
      setSlotsA(Array.from({ length: Math.max(A.length, 9) }, (_, i) => A[i] ? { memberId: A[i].memberId, position: A[i].position } : { memberId: "", position: "" }));
    } else {
      // 未登録日
      setSlotsA(Array.from({ length: 9 }, () => ({ memberId: "", position: "" })));
      setSlotsB(Array.from({ length: 9 }, () => ({ memberId: "", position: "" })));
    }
  }, [date, lineups]);

  // サイズ変更時に slots を伸縮
  useEffect(() => {
    setSlotsA(prev => {
      if (prev.length === size) return prev;
      const next = [...prev];
      while (next.length < size) next.push({ memberId: "", position: "" });
      return next.slice(0, size);
    });
    setSlotsB(prev => {
      if (prev.length === size) return prev;
      const next = [...prev];
      while (next.length < size) next.push({ memberId: "", position: "" });
      return next.slice(0, size);
    });
  }, [size]);

  const sortedPractices = useMemo(
    () => [...practices].filter(p => p.status !== "canceled").sort((a, b) => b.date.localeCompare(a.date)),
    [practices]
  );

  const activeMembers = members.filter(m => m.active);

  function updateSlot(team: "A" | "B", idx: number, key: keyof Slot, value: string) {
    const setter = team === "A" ? setSlotsA : setSlotsB;
    setter(prev => prev.map((s, i) => i === idx ? { ...s, [key]: value } : s));
  }

  async function save() {
    if (!date) {
      showToast(false, "日付を選んでください。");
      return;
    }
    // 既存日付のスタメンを全削除してから書き直す
    const existing = lineups.filter(l => l.date === date);
    // 削除（rowIndex は再取得が必要なケースもあるが、大きい順に削除すれば index ズレを回避できる）
    const sorted = [...existing].sort((a, b) => b._row - a._row);
    for (const e of sorted) {
      await api("/api/admin/delete", { sheet: "lineups", rowIndex: e._row });
    }
    // 追加
    let added = 0;
    const writeTeam = async (teamName: string, slots: Slot[]) => {
      for (let i = 0; i < slots.length; i++) {
        const s = slots[i];
        if (!s.memberId) continue;
        const member = members.find(m => m.id === s.memberId);
        if (!member) continue;
        const id = genId("ln");
        const row = [id, date, teamName, String(i + 1), s.memberId, member.name, s.position];
        const r = await api("/api/admin/append", { sheet: "lineups", row });
        if (r) added++;
      }
    };
    await writeTeam(teamAName, slotsA);
    if (mode === "split") await writeTeam(teamBName, slotsB);
    if (added > 0) {
      showToast(true, `スタメン ${added}名を保存しました。`);
      reload();
    } else {
      showToast(false, "登録された選手がいません。");
    }
  }

  function renderTeamCard(teamName: string, setTeamName: (v: string) => void, slots: Slot[], teamKey: "A" | "B") {
    return (
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <input
            value={teamName}
            onChange={e => setTeamName(e.target.value)}
            style={{ ...inputStyle, fontWeight: 700, fontSize: 14, color: "#d4a82a", maxWidth: 200 }}
          />
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
            {slots.filter(s => s.memberId).length} / {slots.length} 名
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {slots.map((slot, i) => {
            const used = slots.map(s => s.memberId).filter((id, idx) => id && idx !== i);
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "32px 1fr 110px", gap: 6, alignItems: "center" }}>
                <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 18, color: "#d4a82a", textAlign: "center", fontWeight: 700 }}>{i + 1}</span>
                <select
                  value={slot.memberId}
                  onChange={e => updateSlot(teamKey, i, "memberId", e.target.value)}
                  style={{ ...inputStyle, padding: "7px 9px", fontSize: 12 }}
                >
                  <option value="">— 選手を選択 —</option>
                  {activeMembers.map(m => (
                    <option key={m.id} value={m.id} disabled={used.includes(m.id)}>
                      #{m.jerseyNumber || "—"} {m.name}{used.includes(m.id) ? "（同チーム重複）" : ""}
                    </option>
                  ))}
                </select>
                <select
                  value={slot.position}
                  onChange={e => updateSlot(teamKey, i, "position", e.target.value)}
                  style={{ ...inputStyle, padding: "7px 9px", fontSize: 12 }}
                >
                  <option value="">守備位置</option>
                  {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* 上部: 日付・モード・人数 */}
      <section style={cardStyle}>
        <H3>スタメン登録</H3>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <div>
            <label style={labelStyle}>日付</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
          </div>
          {sortedPractices.length > 0 && (
            <div>
              <label style={labelStyle}>練習一覧から</label>
              <select value="" onChange={e => { if (e.target.value) setDate(e.target.value); }} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="">— 練習から選ぶ —</option>
                {sortedPractices.slice(0, 30).map(p => (
                  <option key={p._row} value={p.date}>{formatDateShort(p.date)} {p.place}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label style={labelStyle}>編成</label>
            <select value={mode} onChange={e => setMode(e.target.value as "single" | "split")} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="single">通常（1チーム）</option>
              <option value="split">紅白戦（A・B 2チーム）</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>1チームの人数</label>
            <select value={size} onChange={e => setSize(Number(e.target.value))} style={{ ...inputStyle, cursor: "pointer" }}>
              {[7, 8, 9, 10, 11].map(n => <option key={n} value={n}>{n}人</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={save} style={btnPrimaryStyle}>💾 この日付で保存 →</button>
          <button onClick={reload} style={btnSubStyle}>{loading ? "..." : "🔄 再読込"}</button>
          <button onClick={reloadPractices} style={btnSubStyle}>練習リスト更新</button>
        </div>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 10, lineHeight: 1.7 }}>
          ※ 保存すると同日付の既存スタメンは上書きされます。
        </p>
      </section>

      {/* チームカード */}
      {mode === "single" ? (
        renderTeamCard(teamAName, setTeamAName, slotsA, "A")
      ) : (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {renderTeamCard(teamAName, setTeamAName, slotsA, "A")}
          {renderTeamCard(teamBName, setTeamBName, slotsB, "B")}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────
// スコアボードタブ
// ────────────────────────────────────────────────────────
function ScoreboardTab({
  games, loading, api, reload, showToast,
}: {
  games: GameRow[];
  loading: boolean;
  api: <T,>(path: string, body: Record<string, unknown>) => Promise<T | null>;
  reload: () => void;
  showToast: (ok: boolean, text: string) => void;
}) {
  const [date, setDate] = useState(todayIso());
  const [homeTeam, setHomeTeam] = useState("SK ROOKIES");
  const [awayTeam, setAwayTeam] = useState("対戦相手");
  const [innings, setInnings] = useState(9);
  const [homeScores, setHomeScores] = useState<number[]>(() => Array(9).fill(0));
  const [awayScores, setAwayScores] = useState<number[]>(() => Array(9).fill(0));
  const [homeHits, setHomeHits] = useState(0);
  const [awayHits, setAwayHits] = useState(0);
  const [homeErrors, setHomeErrors] = useState(0);
  const [awayErrors, setAwayErrors] = useState(0);
  const [note, setNote] = useState("");
  // ライブ指標
  const [balls, setBalls] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [outs, setOuts] = useState(0);
  const [currentInning, setCurrentInning] = useState(1);
  const [isTop, setIsTop] = useState(true); // true=表（ビジター攻撃）, false=裏（ホーム攻撃）
  // 塁ランナー (true = 走者あり)
  const [base1, setBase1] = useState(false);
  const [base2, setBase2] = useState(false);
  const [base3, setBase3] = useState(false);

  useEffect(() => {
    setHomeScores(prev => {
      if (prev.length === innings) return prev;
      const next = [...prev];
      while (next.length < innings) next.push(0);
      return next.slice(0, innings);
    });
    setAwayScores(prev => {
      if (prev.length === innings) return prev;
      const next = [...prev];
      while (next.length < innings) next.push(0);
      return next.slice(0, innings);
    });
  }, [innings]);

  const homeTotal = homeScores.reduce((a, b) => a + b, 0);
  const awayTotal = awayScores.reduce((a, b) => a + b, 0);

  // 攻撃側＝表ならビジター、裏ならホーム
  const offenseLabel = isTop ? awayTeam : homeTeam;

  function bumpRun(delta: number) {
    const setter = isTop ? setAwayScores : setHomeScores;
    setter(prev => prev.map((v, i) => i === currentInning - 1 ? Math.max(0, v + delta) : v));
  }
  function clearBases() {
    setBase1(false); setBase2(false); setBase3(false);
  }
  function nextHalf() {
    if (isTop) setIsTop(false);
    else {
      setIsTop(true);
      setCurrentInning(i => Math.min(innings, i + 1));
    }
    setBalls(0); setStrikes(0); setOuts(0);
    clearBases();
  }

  function addBall() {
    setBalls(b => {
      if (b >= 3) {
        // フォアボール → 走者は1つずつ進塁、満塁なら得点
        if (base1 && base2 && base3) {
          bumpRun(1);
          showToast(true, "フォアボール → 押し出し1点！");
        } else {
          showToast(true, "フォアボール！");
        }
        // 押し出し進塁の処理（1->2, 2->3, 3->本塁）
        const newB1 = true;
        const newB2 = base1 || base2;
        const newB3 = (base1 && base2) || base3;
        setBase1(newB1); setBase2(newB2); setBase3(newB3);
        return 0;
      }
      return b + 1;
    });
  }
  function addStrike() {
    setStrikes(s => {
      if (s >= 2) {
        showToast(true, "三振！");
        setOuts(o => {
          if (o >= 2) { showToast(true, "スリーアウト！次の回へ。"); nextHalf(); return 0; }
          return o + 1;
        });
        setBalls(0);
        return 0;
      }
      return s + 1;
    });
  }
  function addOut() {
    setOuts(o => {
      if (o >= 2) { showToast(true, "スリーアウト！次の回へ。"); nextHalf(); return 0; }
      return o + 1;
    });
    setBalls(0); setStrikes(0);
  }
  function resetCount() { setBalls(0); setStrikes(0); }
  function resetAll() {
    setBalls(0); setStrikes(0); setOuts(0); setCurrentInning(1); setIsTop(true);
    setHomeScores(Array(innings).fill(0));
    setAwayScores(Array(innings).fill(0));
    setHomeHits(0); setAwayHits(0); setHomeErrors(0); setAwayErrors(0);
    clearBases();
  }

  async function save() {
    if (!date) { showToast(false, "日付は必須です。"); return; }
    const winner = homeTotal > awayTotal ? homeTeam : awayTotal > homeTotal ? awayTeam : "引き分け";
    const id = genId("g");
    const row = [
      id, date, homeTeam, awayTeam,
      homeScores.join(","), awayScores.join(","),
      String(homeHits), String(awayHits),
      String(homeErrors), String(awayErrors),
      winner, note,
    ];
    const ok = await api("/api/admin/append", { sheet: "games", row });
    if (ok) {
      showToast(true, `${winner === "引き分け" ? "引き分け" : winner + " 勝利"}！試合を記録しました。`);
      reload();
    }
  }

  async function remove(g: GameRow) {
    if (!window.confirm(`${formatDateJp(g.date)} の試合（${g.homeTeam} vs ${g.awayTeam}）を削除しますか？`)) return;
    const ok = await api("/api/admin/delete", { sheet: "games", rowIndex: g._row });
    if (ok) { showToast(true, "削除しました。"); reload(); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* スコアボード本体 */}
      <section style={cardStyle}>
        <H3>スコアボード</H3>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>日付</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>{formatDateJp(date) || "—"}</p>
          </div>
          <div>
            <label style={labelStyle}>ビジター（相手 / 上段）</label>
            <input value={awayTeam} onChange={e => setAwayTeam(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>ホーム（自チーム / 下段）</label>
            <input value={homeTeam} onChange={e => setHomeTeam(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>回数</label>
            <select value={innings} onChange={e => setInnings(Number(e.target.value))} style={{ ...inputStyle, cursor: "pointer" }}>
              {[5, 6, 7, 8, 9, 10, 11, 12].map(n => <option key={n} value={n}>{n}回</option>)}
            </select>
          </div>
        </div>

        {/* スコアテーブル: ビジターが上、ホームが下（標準のベースボールスコアボード） */}
        <div style={{ overflowX: "auto", marginBottom: 16 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ padding: 8, background: "rgba(255,255,255,0.06)", textAlign: "left", fontSize: 10, letterSpacing: "0.15em", color: "rgba(255,255,255,0.55)" }}>チーム</th>
                {Array.from({ length: innings }, (_, i) => (
                  <th key={i} style={{ padding: 8, background: i === currentInning - 1 ? "rgba(212,168,42,0.15)" : "rgba(255,255,255,0.06)", textAlign: "center", fontFamily: "var(--font-oswald),sans-serif", fontWeight: 700, color: i === currentInning - 1 ? "#d4a82a" : "rgba(255,255,255,0.65)" }}>{i + 1}</th>
                ))}
                <th style={{ padding: 8, background: "#d10024", color: "#fff", textAlign: "center", fontWeight: 700 }}>R</th>
                <th style={{ padding: 8, background: "rgba(255,255,255,0.06)", textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.55)" }}>H</th>
                <th style={{ padding: 8, background: "rgba(255,255,255,0.06)", textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.55)" }}>E</th>
              </tr>
            </thead>
            <tbody>
              {/* 1行目: ビジター（表 = away batting） */}
              <tr style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <td style={{ padding: 8, fontWeight: 700, maxWidth: 160 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {isTop && <span style={{ fontSize: 10, padding: "2px 6px", background: "#d10024", color: "#fff", letterSpacing: "0.1em" }}>攻撃</span>}
                    {awayTeam}
                  </span>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}>VISITOR / 表</div>
                </td>
                {awayScores.map((s, i) => (
                  <td key={i} style={{ padding: 4, textAlign: "center", background: i === currentInning - 1 && isTop ? "rgba(212,168,42,0.1)" : undefined }}>
                    <input
                      type="number" min={0} value={s}
                      onChange={e => setAwayScores(prev => prev.map((v, j) => j === i ? Math.max(0, Number(e.target.value) || 0) : v))}
                      style={{ width: "100%", maxWidth: 44, padding: "4px 2px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", textAlign: "center", fontFamily: "var(--font-oswald),sans-serif", fontSize: 14 }}
                    />
                  </td>
                ))}
                <td style={{ padding: 8, textAlign: "center", fontFamily: "var(--font-oswald),sans-serif", fontSize: 24, fontWeight: 700, color: "#d10024" }}>{awayTotal}</td>
                <td style={{ padding: 4, textAlign: "center" }}>
                  <input type="number" min={0} value={awayHits} onChange={e => setAwayHits(Math.max(0, Number(e.target.value) || 0))} style={{ width: 44, padding: "4px 2px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", textAlign: "center", fontFamily: "var(--font-oswald),sans-serif", fontSize: 13 }} />
                </td>
                <td style={{ padding: 4, textAlign: "center" }}>
                  <input type="number" min={0} value={awayErrors} onChange={e => setAwayErrors(Math.max(0, Number(e.target.value) || 0))} style={{ width: 44, padding: "4px 2px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", textAlign: "center", fontFamily: "var(--font-oswald),sans-serif", fontSize: 13 }} />
                </td>
              </tr>
              {/* 2行目: ホーム（裏 = home batting） */}
              <tr style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <td style={{ padding: 8, fontWeight: 700, maxWidth: 160 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {!isTop && <span style={{ fontSize: 10, padding: "2px 6px", background: "#d10024", color: "#fff", letterSpacing: "0.1em" }}>攻撃</span>}
                    {homeTeam}
                  </span>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}>HOME / 裏</div>
                </td>
                {homeScores.map((s, i) => (
                  <td key={i} style={{ padding: 4, textAlign: "center", background: i === currentInning - 1 && !isTop ? "rgba(212,168,42,0.1)" : undefined }}>
                    <input
                      type="number" min={0} value={s}
                      onChange={e => setHomeScores(prev => prev.map((v, j) => j === i ? Math.max(0, Number(e.target.value) || 0) : v))}
                      style={{ width: "100%", maxWidth: 44, padding: "4px 2px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", textAlign: "center", fontFamily: "var(--font-oswald),sans-serif", fontSize: 14 }}
                    />
                  </td>
                ))}
                <td style={{ padding: 8, textAlign: "center", fontFamily: "var(--font-oswald),sans-serif", fontSize: 24, fontWeight: 700, color: "#d10024" }}>{homeTotal}</td>
                <td style={{ padding: 4, textAlign: "center" }}>
                  <input type="number" min={0} value={homeHits} onChange={e => setHomeHits(Math.max(0, Number(e.target.value) || 0))} style={{ width: 44, padding: "4px 2px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", textAlign: "center", fontFamily: "var(--font-oswald),sans-serif", fontSize: 13 }} />
                </td>
                <td style={{ padding: 4, textAlign: "center" }}>
                  <input type="number" min={0} value={homeErrors} onChange={e => setHomeErrors(Math.max(0, Number(e.target.value) || 0))} style={{ width: 44, padding: "4px 2px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", textAlign: "center", fontFamily: "var(--font-oswald),sans-serif", fontSize: 13 }} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ライブ指標：B/S/O ＋ 塁ランナー */}
        <div style={{ background: "rgba(0,0,0,0.3)", padding: "16px 18px", border: "1px solid rgba(255,255,255,0.1)", marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 10, color: "#d10024", letterSpacing: "0.3em" }}>LIVE COUNT</p>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
              <strong style={{ color: "#fff" }}>{currentInning}回{isTop ? "表" : "裏"}</strong>
              <span style={{ marginLeft: 8, color: "#d4a82a" }}>攻撃: {offenseLabel}</span>
              <button onClick={() => setIsTop(t => !t)} style={{ ...btnSubStyle, padding: "3px 8px", fontSize: 11, marginLeft: 8 }}>表⇔裏</button>
              <button onClick={() => setCurrentInning(i => Math.min(innings, i + 1))} style={{ ...btnSubStyle, padding: "3px 8px", fontSize: 11, marginLeft: 4 }}>+1回</button>
              <button onClick={() => setCurrentInning(i => Math.max(1, i - 1))} style={{ ...btnSubStyle, padding: "3px 8px", fontSize: 11, marginLeft: 4 }}>-1回</button>
            </div>
          </div>

          {/* B/S/O ＋ 塁ランナー（ダイヤモンド） */}
          <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr 1fr 180px" }}>
            <BSOCounter label="BALL" value={balls} max={4} color="#27ae60" onClick={addBall} onReset={() => setBalls(0)} />
            <BSOCounter label="STRIKE" value={strikes} max={3} color="#d4a82a" onClick={addStrike} onReset={() => setStrikes(0)} />
            <BSOCounter label="OUT" value={outs} max={3} color="#d10024" onClick={addOut} onReset={() => setOuts(0)} />
            <BaseDiamond
              base1={base1} base2={base2} base3={base3}
              onToggle1={() => setBase1(v => !v)}
              onToggle2={() => setBase2(v => !v)}
              onToggle3={() => setBase3(v => !v)}
              onClear={clearBases}
            />
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button onClick={() => bumpRun(1)} style={btnPrimaryStyle}>得点 +1 ({offenseLabel})</button>
            <button onClick={() => bumpRun(-1)} style={btnSubStyle}>得点 -1</button>
            <button onClick={resetCount} style={btnSubStyle}>カウントリセット (B/S)</button>
            <button onClick={nextHalf} style={btnSubStyle}>次の半回 →</button>
            <button onClick={resetAll} style={{ ...btnSubStyle, marginLeft: "auto" }}>全リセット</button>
          </div>
        </div>

        {/* メモ＋保存 */}
        <div>
          <label style={labelStyle}>メモ</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="勝因・メンバー欠席・天候など" style={{ ...inputStyle, resize: "vertical", fontFamily: "var(--font-zen),sans-serif" }} />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <button onClick={save} style={btnPrimaryStyle}>💾 試合を記録する →</button>
          <button onClick={reload} style={btnSubStyle}>{loading ? "..." : "🔄 再読込"}</button>
        </div>
      </section>

      {/* 過去の試合 */}
      <section style={cardStyle}>
        <H3>過去の試合（{games.length}試合）</H3>
        {games.length === 0 ? (
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, textAlign: "center", padding: 24 }}>記録された試合がまだありません。</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <Th>日付</Th>
                  <Th>カード（ビジター vs ホーム）</Th>
                  <Th>スコア</Th>
                  <Th>勝者</Th>
                  <Th>メモ</Th>
                  <Th>{""}</Th>
                </tr>
              </thead>
              <tbody>
                {[...games].sort((a, b) => b.date.localeCompare(a.date)).map(g => (
                  <tr key={g.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <Td><span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>{formatDateJp(g.date)}</span></Td>
                    <Td><strong>{g.awayTeam}</strong> <span style={{ color: "rgba(255,255,255,0.4)" }}>vs</span> <strong>{g.homeTeam}</strong></Td>
                    <Td>
                      <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 18, fontWeight: 700, color: "#d4a82a" }}>
                        {g.awayScores.reduce((a, b) => a + b, 0)} - {g.homeScores.reduce((a, b) => a + b, 0)}
                      </span>
                    </Td>
                    <Td>{g.winner}</Td>
                    <Td><span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{g.note || "—"}</span></Td>
                    <Td><button onClick={() => remove(g)} style={{ padding: "3px 8px", background: "transparent", color: "#ff6982", border: "1px solid rgba(209,0,36,0.3)", fontSize: 10, cursor: "pointer" }}>×</button></Td>
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

/** 塁ダイヤモンド表示 — 2塁が上、1塁が右、3塁が左、本塁が下。 */
function BaseDiamond({
  base1, base2, base3, onToggle1, onToggle2, onToggle3, onClear,
}: {
  base1: boolean; base2: boolean; base3: boolean;
  onToggle1: () => void; onToggle2: () => void; onToggle3: () => void;
  onClear: () => void;
}) {
  const baseStyle = (on: boolean): React.CSSProperties => ({
    position: "absolute",
    width: 32, height: 32,
    background: on ? "#d4a82a" : "rgba(255,255,255,0.06)",
    border: on ? "2px solid #fff" : "2px solid rgba(255,255,255,0.25)",
    cursor: "pointer",
    transition: "all 0.15s",
    transform: "rotate(45deg)",
  });
  const labelStyle: React.CSSProperties = {
    position: "absolute",
    top: "50%", left: "50%",
    transform: "translate(-50%, -50%) rotate(-45deg)",
    fontFamily: "var(--font-oswald),sans-serif",
    fontSize: 11,
    fontWeight: 700,
    pointerEvents: "none",
  };
  const runners = (base1 ? 1 : 0) + (base2 ? 1 : 0) + (base3 ? 1 : 0);
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: 8, position: "relative" }}>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", letterSpacing: "0.18em", textAlign: "center", marginBottom: 4 }}>RUNNERS</div>
      <div style={{ position: "relative", width: 110, height: 110, margin: "0 auto" }}>
        {/* 2塁 (top) */}
        <button onClick={onToggle2} style={{ ...baseStyle(base2), top: 4, left: "50%", marginLeft: -16 }} title="2塁">
          <span style={{ ...labelStyle, color: base2 ? "#0b1e3f" : "rgba(255,255,255,0.55)" }}>2</span>
        </button>
        {/* 3塁 (left) */}
        <button onClick={onToggle3} style={{ ...baseStyle(base3), top: "50%", left: 4, marginTop: -16 }} title="3塁">
          <span style={{ ...labelStyle, color: base3 ? "#0b1e3f" : "rgba(255,255,255,0.55)" }}>3</span>
        </button>
        {/* 1塁 (right) */}
        <button onClick={onToggle1} style={{ ...baseStyle(base1), top: "50%", right: 4, marginTop: -16 }} title="1塁">
          <span style={{ ...labelStyle, color: base1 ? "#0b1e3f" : "rgba(255,255,255,0.55)" }}>1</span>
        </button>
        {/* 本塁 (bottom) - 飾りのみ */}
        <div style={{ position: "absolute", bottom: 4, left: "50%", marginLeft: -10, width: 20, height: 20, background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.2)", borderRadius: "50% 50% 0 50%", transform: "rotate(45deg)" }} title="本塁" />
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
        <span style={{ flex: 1, fontSize: 10, textAlign: "center", color: runners === 0 ? "rgba(255,255,255,0.4)" : "#d4a82a", fontFamily: "var(--font-oswald),sans-serif", fontWeight: 700 }}>
          {runners}人 出塁中
        </span>
        <button onClick={onClear} style={{ padding: "2px 8px", background: "transparent", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.15)", fontSize: 10, cursor: "pointer" }}>C</button>
      </div>
    </div>
  );
}

function BSOCounter({ label, value, max, color, onClick, onReset }: {
  label: string; value: number; max: number; color: string;
  onClick: () => void; onReset: () => void;
}) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: 12, textAlign: "center" }}>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", letterSpacing: "0.18em" }}>{label}</div>
      <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 44, fontWeight: 700, color, lineHeight: 1, margin: "8px 0" }}>{value}</div>
      <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
        <button onClick={onClick} style={{ flex: 1, padding: "8px", background: color, color: "#fff", border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", letterSpacing: "0.1em" }}>+1</button>
        <button onClick={onReset} style={{ padding: "8px 10px", background: "transparent", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.15)", fontSize: 11, cursor: "pointer" }}>R</button>
      </div>
      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>{value}/{max - 1}</div>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// 集金タブ（グラウンド代）
// ────────────────────────────────────────────────────────
function PaymentsTab({
  members, payments, practices, loading, api, reload, reloadPractices, showToast,
}: {
  members: Member[];
  payments: PaymentRow[];
  practices: PracticeRow[];
  loading: boolean;
  api: <T,>(path: string, body: Record<string, unknown>) => Promise<T | null>;
  reload: () => void;
  reloadPractices: () => void;
  showToast: (ok: boolean, text: string) => void;
}) {
  const [date, setDate] = useState(todayIso());
  const [amount, setAmount] = useState(400);
  const [draftMap, setDraftMap] = useState<Record<string, boolean>>({});  // memberId → 受領済みtoggle

  const sortedPractices = useMemo(
    () => [...practices].filter(p => p.status !== "canceled").sort((a, b) => b.date.localeCompare(a.date)),
    [practices]
  );

  // この日付の既存集金
  const existingForDate = useMemo(() => {
    const m: Record<string, PaymentRow> = {};
    for (const p of payments) if (p.date === date) m[p.memberId] = p;
    return m;
  }, [payments, date]);

  // 表示時にdraftMapを既存に同期
  useEffect(() => {
    const m: Record<string, boolean> = {};
    for (const memberId of Object.keys(existingForDate)) m[memberId] = true;
    setDraftMap(m);
  }, [existingForDate]);

  const activeMembers = members.filter(m => m.active);

  async function save() {
    if (!date) { showToast(false, "日付を選んでください。"); return; }
    let added = 0;
    let updated = 0;
    let removed = 0;

    for (const m of activeMembers) {
      const isChecked = !!draftMap[m.id];
      const existing = existingForDate[m.id];

      if (isChecked && !existing) {
        // 新規追加
        const id = genId("pm");
        const row = [id, date, m.id, m.name, String(amount), ""];
        const r = await api("/api/admin/append", { sheet: "payments", row });
        if (r) added++;
      } else if (isChecked && existing && existing.amount !== amount) {
        // 金額更新
        const row = [existing.id, date, m.id, m.name, String(amount), existing.note];
        const r = await api("/api/admin/update", { sheet: "payments", rowIndex: existing._row, row });
        if (r) updated++;
      } else if (!isChecked && existing) {
        // 取消
        const r = await api("/api/admin/delete", { sheet: "payments", rowIndex: existing._row });
        if (r) removed++;
      }
    }
    if (added + updated + removed > 0) {
      showToast(true, `保存しました（追加 ${added} / 更新 ${updated} / 削除 ${removed}）`);
      reload();
    } else {
      showToast(false, "変更がありません。");
    }
  }

  function toggle(memberId: string) {
    setDraftMap(prev => ({ ...prev, [memberId]: !prev[memberId] }));
  }
  function toggleAll(checked: boolean) {
    const m: Record<string, boolean> = {};
    for (const mem of activeMembers) m[mem.id] = checked;
    setDraftMap(m);
  }

  const checkedCount = activeMembers.filter(m => draftMap[m.id]).length;
  const total = checkedCount * amount;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <section style={cardStyle}>
        <H3>グラウンド代の回収</H3>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          <div>
            <label style={labelStyle}>日付</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
          </div>
          {sortedPractices.length > 0 && (
            <div>
              <label style={labelStyle}>練習から選ぶ</label>
              <select value="" onChange={e => { if (e.target.value) setDate(e.target.value); }} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="">— 練習一覧から —</option>
                {sortedPractices.slice(0, 30).map(p => (
                  <option key={p._row} value={p.date}>{formatDateShort(p.date)} {p.place}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label style={labelStyle}>1人あたり金額</label>
            <input type="number" min={0} value={amount} onChange={e => setAmount(Math.max(0, Number(e.target.value) || 0))} style={inputStyle} />
          </div>
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", marginTop: 12 }}>
          <SummaryStat label="受領済み" v={checkedCount} unit="名" />
          <SummaryStat label="未受領" v={activeMembers.length - checkedCount} unit="名" />
          <SummaryStat label="合計金額" v={total} unit="円" />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <button onClick={save} style={btnPrimaryStyle}>💾 この日付で保存 →</button>
          <button onClick={() => toggleAll(true)} style={btnSubStyle}>全員選択</button>
          <button onClick={() => toggleAll(false)} style={btnSubStyle}>全員解除</button>
          <button onClick={reload} style={btnSubStyle}>{loading ? "..." : "🔄 再読込"}</button>
          <button onClick={reloadPractices} style={btnSubStyle}>練習リスト更新</button>
        </div>
      </section>

      <section style={cardStyle}>
        <H3>メンバー（{activeMembers.length}名）</H3>
        {activeMembers.length === 0 ? (
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>アクティブなメンバーがいません。</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {activeMembers.map((m, i) => {
              const checked = !!draftMap[m.id];
              const existing = existingForDate[m.id];
              return (
                <li
                  key={m.id || i}
                  onClick={() => toggle(m.id)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "32px 1fr auto",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 10px",
                    borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.05)",
                    cursor: "pointer",
                    background: checked ? "rgba(26,159,58,0.06)" : "transparent",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(m.id)}
                    onClick={e => e.stopPropagation()}
                    style={{ width: 18, height: 18, accentColor: "#1a9f3a", cursor: "pointer" }}
                  />
                  <div>
                    <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 15, color: "#d4a82a", marginRight: 12 }}>{m.jerseyNumber || "—"}</span>
                    <span style={{ fontWeight: 700 }}>{m.name}</span>
                    {m.nickname && <span style={{ marginLeft: 8, color: "rgba(255,255,255,0.4)", fontSize: 12 }}>({m.nickname})</span>}
                  </div>
                  <div style={{ fontSize: 12, color: checked ? "#67e088" : "rgba(255,255,255,0.45)" }}>
                    {checked ? `✓ ${amount}円 受領` : "—"}
                    {existing && existing.amount !== amount && (
                      <span style={{ marginLeft: 8, fontSize: 10, color: "#d4a82a" }}>（保存時に {existing.amount} → {amount}円に更新）</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// 打席記録タブ
// ────────────────────────────────────────────────────────
function BattingTab({
  members, batting, loading, saving, api, reload, showToast,
}: {
  members: Member[];
  batting: BattingRow[];
  loading: boolean;
  saving: boolean;
  api: <T,>(path: string, body: Record<string, unknown>) => Promise<T | null>;
  reload: () => void;
  showToast: (ok: boolean, text: string) => void;
}) {
  const EMPTY = {
    date: todayIso(),
    memberId: "",
    opponent: "",
    atBats: 0,
    hits: 0,
    doubles: 0,
    triples: 0,
    hr: 0,
    rbi: 0,
    bb: 0,
    so: 0,
    hbp: 0,
    sh: 0,
    sb: 0,
    cs: 0,
  };
  const [form, setForm] = useState(EMPTY);
  const [editingRow, setEditingRow] = useState<number | null>(null); // 編集中の行（_row）。null なら新規

  function startEdit(b: BattingRow) {
    setEditingRow(b._row);
    setForm({
      date: b.date, memberId: b.memberId, opponent: b.opponent,
      atBats: b.atBats, hits: b.hits, doubles: b.doubles, triples: b.triples,
      hr: b.hr, rbi: b.rbi, bb: b.bb, so: b.so, hbp: b.hbp, sh: b.sh, sb: b.sb, cs: b.cs,
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingRow(null);
    setForm(EMPTY);
  }

  async function submit() {
    const member = members.find(m => m.id === form.memberId);
    if (!member) {
      showToast(false, "メンバーを選んでください。");
      return;
    }
    if (!form.date) {
      showToast(false, "日付は必須です。");
      return;
    }
    if (form.atBats < form.hits) {
      showToast(false, "ヒット数が打席数を超えています。");
      return;
    }
    // 単打 + 二塁打 + 三塁打 + 本塁打 ≦ ヒット数
    const longHits = form.doubles + form.triples + form.hr;
    if (longHits > form.hits) {
      showToast(false, "長打の合計がヒット数を超えています。");
      return;
    }
    const row = [
      form.date, member.id, member.name, form.opponent.trim(),
      String(form.atBats), String(form.hits), String(form.doubles), String(form.triples),
      String(form.hr), String(form.rbi), String(form.bb), String(form.so),
      String(form.hbp), String(form.sh), String(form.sb), String(form.cs),
    ];
    if (editingRow != null) {
      const ok = await api("/api/admin/update", { sheet: "batting", rowIndex: editingRow, row });
      if (ok) {
        showToast(true, `${member.name} の打席記録を更新しました。`);
        cancelEdit();
        reload();
      }
    } else {
      const ok = await api("/api/admin/append", { sheet: "batting", row });
      if (ok) {
        showToast(true, `${member.name} の打席を記録しました。`);
        setForm(prev => ({ ...prev, opponent: "", atBats: 0, hits: 0, doubles: 0, triples: 0, hr: 0, rbi: 0, bb: 0, so: 0, hbp: 0, sh: 0, sb: 0, cs: 0 }));
        reload();
      }
    }
  }

  async function remove(b: BattingRow) {
    if (!window.confirm(`${formatDateJp(b.date)} ${b.memberName} の記録を削除しますか？`)) return;
    const ok = await api("/api/admin/delete", { sheet: "batting", rowIndex: b._row });
    if (ok) {
      showToast(true, "削除しました。");
      reload();
    }
  }

  const sortedBatting = [...batting].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="grid gap-5 grid-cols-1 lg:grid-cols-[420px_1fr]">
      <section style={{ ...cardStyle, ...(editingRow != null ? { border: "1px solid #d4a82a" } : {}) }}>
        <H3>{editingRow != null ? "✏️ 打席記録を編集中" : "新しい打席記録"}</H3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={labelStyle}>日付</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>メンバー</label>
            <select value={form.memberId} onChange={e => setForm({ ...form, memberId: e.target.value })} style={inputStyle as React.CSSProperties}>
              <option value="">— 選んでください —</option>
              {members.filter(m => m.active).map(m => (
                <option key={m.id} value={m.id}>
                  #{m.jerseyNumber || "—"} {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>対戦相手 / 試合名</label>
            <input value={form.opponent} onChange={e => setForm({ ...form, opponent: e.target.value })} placeholder="例: 紅白戦 / 〇〇クラブ戦" style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumField label="打席 (AB)" v={form.atBats} on={n => setForm({ ...form, atBats: n })} />
            <NumField label="ヒット (H)" v={form.hits} on={n => setForm({ ...form, hits: n })} />
            <NumField label="二塁打 (2B)" v={form.doubles} on={n => setForm({ ...form, doubles: n })} />
            <NumField label="三塁打 (3B)" v={form.triples} on={n => setForm({ ...form, triples: n })} />
            <NumField label="本塁打 (HR)" v={form.hr} on={n => setForm({ ...form, hr: n })} />
            <NumField label="打点 (RBI)" v={form.rbi} on={n => setForm({ ...form, rbi: n })} />
            <NumField label="四球 (BB)" v={form.bb} on={n => setForm({ ...form, bb: n })} />
            <NumField label="三振 (SO)" v={form.so} on={n => setForm({ ...form, so: n })} />
            <NumField label="死球 (HBP)" v={form.hbp} on={n => setForm({ ...form, hbp: n })} />
            <NumField label="犠打 (SH)" v={form.sh} on={n => setForm({ ...form, sh: n })} />
            <NumField label="盗塁成功 (SB)" v={form.sb} on={n => setForm({ ...form, sb: n })} />
            <NumField label="盗塁失敗 (CS)" v={form.cs} on={n => setForm({ ...form, cs: n })} />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button onClick={submit} disabled={saving} style={{ ...btnPrimaryStyle, flex: 1, opacity: saving ? 0.6 : 1, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "保存中…" : editingRow != null ? "更新する →" : "記録する →"}
            </button>
            {editingRow != null && (
              <button onClick={cancelEdit} disabled={saving} style={{ ...btnSubStyle, flexShrink: 0 }}>キャンセル</button>
            )}
          </div>
        </div>
      </section>

      <section style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <H3>記録一覧（{batting.length}件）</H3>
          <button onClick={reload} style={btnSubStyle}>{loading ? "..." : "🔄 再読込"}</button>
        </div>
        {batting.length === 0 ? (
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, textAlign: "center", padding: 24 }}>
            打席記録がありません。左から登録してください。
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <Th>日付</Th>
                  <Th>選手</Th>
                  <Th>対戦</Th>
                  <Th>AB</Th>
                  <Th>H</Th>
                  <Th>2B</Th>
                  <Th>3B</Th>
                  <Th>HR</Th>
                  <Th>RBI</Th>
                  <Th>BB</Th>
                  <Th>SO</Th>
                  <Th>HBP</Th>
                  <Th>SB</Th>
                  <Th>CS</Th>
                  <Th>{""}</Th>
                </tr>
              </thead>
              <tbody>
                {sortedBatting.map((b, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: editingRow === b._row ? "rgba(212,168,42,0.1)" : undefined }}>
                    <Td><span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>{formatDateShort(b.date)}</span></Td>
                    <Td><strong>{b.memberName}</strong></Td>
                    <Td><span style={{ color: "rgba(255,255,255,0.55)", fontSize: 11 }}>{b.opponent || "—"}</span></Td>
                    <Td>{b.atBats}</Td>
                    <Td><span style={{ color: "#d4a82a", fontWeight: 700 }}>{b.hits}</span></Td>
                    <Td>{b.doubles}</Td>
                    <Td>{b.triples}</Td>
                    <Td><span style={{ color: b.hr > 0 ? "#ff6982" : undefined, fontWeight: b.hr > 0 ? 700 : 400 }}>{b.hr}</span></Td>
                    <Td>{b.rbi}</Td>
                    <Td>{b.bb}</Td>
                    <Td>{b.so}</Td>
                    <Td>{b.hbp}</Td>
                    <Td><span style={{ color: b.sb > 0 ? "#67e088" : undefined }}>{b.sb}</span></Td>
                    <Td>{b.cs}</Td>
                    <Td>
                      <div style={{ display: "flex", gap: 5 }}>
                        <button onClick={() => startEdit(b)} style={{ padding: "3px 8px", background: "transparent", color: "#d4a82a", border: "1px solid rgba(212,168,42,0.4)", fontSize: 10, cursor: "pointer", whiteSpace: "nowrap" }}>編集</button>
                        <button onClick={() => remove(b)} style={{ padding: "3px 8px", background: "transparent", color: "#ff6982", border: "1px solid rgba(209,0,36,0.3)", fontSize: 10, cursor: "pointer" }}>×</button>
                      </div>
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

// ────────────────────────────────────────────────────────
// 投手記録タブ
// ────────────────────────────────────────────────────────
function PitchingTab({
  members, pitching, loading, saving, api, reload, showToast,
}: {
  members: Member[];
  pitching: PitchingRow[];
  loading: boolean;
  saving: boolean;
  api: <T,>(path: string, body: Record<string, unknown>) => Promise<T | null>;
  reload: () => void;
  showToast: (ok: boolean, text: string) => void;
}) {
  // 投球回は X.Y 形式（Y は 0/1/2）で入力させ、内部では outs（=X*3+Y）に変換する。
  const [form, setForm] = useState({
    date: todayIso(),
    memberId: "",
    opponent: "",
    ipWhole: 0,    // 完投したイニング数
    ipFraction: 0, // 端数のアウト数（0/1/2）
    hits: 0,
    runs: 0,
    er: 0,
    so: 0,
    bb: 0,
    hbp: 0,
  });

  async function submit() {
    const member = members.find(m => m.id === form.memberId);
    if (!member) { showToast(false, "メンバーを選んでください。"); return; }
    if (!form.date) { showToast(false, "日付は必須です。"); return; }
    const ipOuts = form.ipWhole * 3 + form.ipFraction;
    if (ipOuts <= 0) { showToast(false, "投球回を入力してください。"); return; }
    if (form.er > form.runs) { showToast(false, "自責点が失点を超えています。"); return; }
    const row = [
      form.date, member.id, member.name, form.opponent.trim(),
      String(ipOuts),
      String(form.hits), String(form.runs), String(form.er),
      String(form.so), String(form.bb), String(form.hbp),
    ];
    const ok = await api("/api/admin/append", { sheet: "pitching", row });
    if (ok) {
      showToast(true, `${member.name} の投球を記録しました。`);
      setForm(prev => ({ ...prev, opponent: "", ipWhole: 0, ipFraction: 0, hits: 0, runs: 0, er: 0, so: 0, bb: 0, hbp: 0 }));
      reload();
    }
  }

  async function remove(p: PitchingRow) {
    if (!window.confirm(`${formatDateJp(p.date)} ${p.memberName} の投球記録を削除しますか？`)) return;
    const ok = await api("/api/admin/delete", { sheet: "pitching", rowIndex: p._row });
    if (ok) { showToast(true, "削除しました。"); reload(); }
  }

  const sortedPitching = [...pitching].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="grid gap-5 grid-cols-1 lg:grid-cols-[420px_1fr]">
      <section style={cardStyle}>
        <H3>新しい投手記録</H3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={labelStyle}>日付</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>投手</label>
            <select value={form.memberId} onChange={e => setForm({ ...form, memberId: e.target.value })} style={inputStyle as React.CSSProperties}>
              <option value="">— 選んでください —</option>
              {members.filter(m => m.active).map(m => (
                <option key={m.id} value={m.id}>#{m.jerseyNumber || "—"} {m.name}{m.position === "投手" ? " ★" : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>対戦相手 / 試合名</label>
            <input value={form.opponent} onChange={e => setForm({ ...form, opponent: e.target.value })} placeholder="例: 〇〇クラブ戦" style={inputStyle} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <NumField label="投球回 (完了イニング)" v={form.ipWhole} on={n => setForm({ ...form, ipWhole: n })} />
            <div>
              <label style={labelStyle}>端数アウト (0/1/2)</label>
              <select value={form.ipFraction} onChange={e => setForm({ ...form, ipFraction: Number(e.target.value) })} style={inputStyle as React.CSSProperties}>
                <option value={0}>0 (.0回)</option>
                <option value={1}>1 (.1回)</option>
                <option value={2}>2 (.2回)</option>
              </select>
            </div>
            <NumField label="被安打 (H)" v={form.hits} on={n => setForm({ ...form, hits: n })} />
            <NumField label="失点 (R)" v={form.runs} on={n => setForm({ ...form, runs: n })} />
            <NumField label="自責点 (ER)" v={form.er} on={n => setForm({ ...form, er: n })} />
            <NumField label="奪三振 (SO)" v={form.so} on={n => setForm({ ...form, so: n })} />
            <NumField label="与四球 (BB)" v={form.bb} on={n => setForm({ ...form, bb: n })} />
            <NumField label="与死球 (HBP)" v={form.hbp} on={n => setForm({ ...form, hbp: n })} />
          </div>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", margin: "4px 0 0" }}>
            投球回は「完了回 + 端数アウト」で入力（例: 5.2 回 = 5回 + 2 out）。防御率は ER×27 / outs で計算します。
          </p>
          <button onClick={submit} disabled={saving} style={{ ...btnPrimaryStyle, marginTop: 4, opacity: saving ? 0.6 : 1, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "保存中…" : "記録する →"}
          </button>
        </div>
      </section>

      <section style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <H3>投手記録一覧（{pitching.length}件）</H3>
          <button onClick={reload} style={btnSubStyle}>{loading ? "..." : "🔄 再読込"}</button>
        </div>
        {pitching.length === 0 ? (
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, textAlign: "center", padding: 24 }}>
            投手記録がありません。左から登録してください。
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <Th>日付</Th>
                  <Th>投手</Th>
                  <Th>対戦</Th>
                  <Th>IP</Th>
                  <Th>H</Th>
                  <Th>R</Th>
                  <Th>ER</Th>
                  <Th>SO</Th>
                  <Th>BB</Th>
                  <Th>HBP</Th>
                  <Th>{""}</Th>
                </tr>
              </thead>
              <tbody>
                {sortedPitching.map((p, i) => {
                  const ipDisplay = `${Math.floor(p.ipOuts / 3)}.${p.ipOuts % 3}`;
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <Td><span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>{formatDateShort(p.date)}</span></Td>
                      <Td><strong>{p.memberName}</strong></Td>
                      <Td><span style={{ color: "rgba(255,255,255,0.55)", fontSize: 11 }}>{p.opponent || "—"}</span></Td>
                      <Td><span style={{ fontFamily: "var(--font-oswald),sans-serif", color: "#d4a82a" }}>{ipDisplay}</span></Td>
                      <Td>{p.hits}</Td>
                      <Td>{p.runs}</Td>
                      <Td>{p.er}</Td>
                      <Td><span style={{ color: p.so >= 5 ? "#67e088" : undefined, fontWeight: p.so >= 5 ? 700 : 400 }}>{p.so}</span></Td>
                      <Td>{p.bb}</Td>
                      <Td>{p.hbp}</Td>
                      <Td>
                        <button onClick={() => remove(p)} style={{ padding: "3px 8px", background: "transparent", color: "#ff6982", border: "1px solid rgba(209,0,36,0.3)", fontSize: 10, cursor: "pointer" }}>×</button>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// 捕手記録タブ（盗塁阻止率用）
// ────────────────────────────────────────────────────────
function CatchingTab({
  members, catching, loading, saving, api, reload, showToast,
}: {
  members: Member[];
  catching: CatchingRow[];
  loading: boolean;
  saving: boolean;
  api: <T,>(path: string, body: Record<string, unknown>) => Promise<T | null>;
  reload: () => void;
  showToast: (ok: boolean, text: string) => void;
}) {
  const [form, setForm] = useState({
    date: todayIso(),
    memberId: "",
    opponent: "",
    sba: 0, // 盗塁試行された数
    cs: 0,  // うち阻止した数
  });

  async function submit() {
    const member = members.find(m => m.id === form.memberId);
    if (!member) { showToast(false, "メンバーを選んでください。"); return; }
    if (!form.date) { showToast(false, "日付は必須です。"); return; }
    if (form.cs > form.sba) { showToast(false, "阻止数が試行数を超えています。"); return; }
    if (form.sba === 0) { showToast(false, "盗塁試行数を入力してください。"); return; }
    const row = [
      form.date, member.id, member.name, form.opponent.trim(),
      String(form.sba), String(form.cs),
    ];
    const ok = await api("/api/admin/append", { sheet: "catching", row });
    if (ok) {
      showToast(true, `${member.name} の捕手記録を保存しました。`);
      setForm(prev => ({ ...prev, opponent: "", sba: 0, cs: 0 }));
      reload();
    }
  }

  async function remove(c: CatchingRow) {
    if (!window.confirm(`${formatDateJp(c.date)} ${c.memberName} の捕手記録を削除しますか？`)) return;
    const ok = await api("/api/admin/delete", { sheet: "catching", rowIndex: c._row });
    if (ok) { showToast(true, "削除しました。"); reload(); }
  }

  const sortedCatching = [...catching].sort((a, b) => b.date.localeCompare(a.date));
  const csRate = form.sba > 0 ? (form.cs / form.sba) : 0;

  return (
    <div className="grid gap-5 grid-cols-1 lg:grid-cols-[420px_1fr]">
      <section style={cardStyle}>
        <H3>新しい捕手記録</H3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={labelStyle}>日付</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>捕手</label>
            <select value={form.memberId} onChange={e => setForm({ ...form, memberId: e.target.value })} style={inputStyle as React.CSSProperties}>
              <option value="">— 選んでください —</option>
              {members.filter(m => m.active).map(m => (
                <option key={m.id} value={m.id}>#{m.jerseyNumber || "—"} {m.name}{m.position === "捕手" ? " ★" : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>対戦相手 / 試合名</label>
            <input value={form.opponent} onChange={e => setForm({ ...form, opponent: e.target.value })} placeholder="例: 〇〇クラブ戦" style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumField label="盗塁試行 (SBA)" v={form.sba} on={n => setForm({ ...form, sba: n })} />
            <NumField label="盗塁阻止 (CS)" v={form.cs} on={n => setForm({ ...form, cs: n })} />
          </div>
          <div style={{ padding: "10px 12px", background: "rgba(212,168,42,0.06)", borderLeft: "3px solid #d4a82a", fontSize: 12 }}>
            この試合の盗塁阻止率: <strong style={{ color: "#d4a82a", fontFamily: "var(--font-oswald),sans-serif", fontSize: 16 }}>{(csRate * 100).toFixed(1)}%</strong>
          </div>
          <button onClick={submit} disabled={saving} style={{ ...btnPrimaryStyle, marginTop: 4, opacity: saving ? 0.6 : 1, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "保存中…" : "記録する →"}
          </button>
        </div>
      </section>

      <section style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <H3>捕手記録一覧（{catching.length}件）</H3>
          <button onClick={reload} style={btnSubStyle}>{loading ? "..." : "🔄 再読込"}</button>
        </div>
        {catching.length === 0 ? (
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, textAlign: "center", padding: 24 }}>
            捕手記録がありません。左から登録してください。
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <Th>日付</Th>
                  <Th>捕手</Th>
                  <Th>対戦</Th>
                  <Th>盗塁試行</Th>
                  <Th>阻止</Th>
                  <Th>阻止率</Th>
                  <Th>{""}</Th>
                </tr>
              </thead>
              <tbody>
                {sortedCatching.map((c, i) => {
                  const rate = c.sba > 0 ? c.cs / c.sba : 0;
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <Td><span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>{formatDateShort(c.date)}</span></Td>
                      <Td><strong>{c.memberName}</strong></Td>
                      <Td><span style={{ color: "rgba(255,255,255,0.55)", fontSize: 11 }}>{c.opponent || "—"}</span></Td>
                      <Td>{c.sba}</Td>
                      <Td>{c.cs}</Td>
                      <Td><span style={{ color: rate >= 0.3 ? "#67e088" : "#d4a82a", fontFamily: "var(--font-oswald),sans-serif" }}>{(rate * 100).toFixed(1)}%</span></Td>
                      <Td>
                        <button onClick={() => remove(c)} style={{ padding: "3px 8px", background: "transparent", color: "#ff6982", border: "1px solid rgba(209,0,36,0.3)", fontSize: 10, cursor: "pointer" }}>×</button>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function NumField({ label, v, on }: { label: string; v: number; on: (n: number) => void }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type="number"
        min={0}
        value={v}
        onChange={e => on(Math.max(0, Number(e.target.value) || 0))}
        style={inputStyle}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────
// 守備記録タブ
// ────────────────────────────────────────────────────────
function FieldingTab({
  members, fielding, loading, saving, api, reload, showToast,
}: {
  members: Member[];
  fielding: FieldingRow[];
  loading: boolean;
  saving: boolean;
  api: <T,>(path: string, body: Record<string, unknown>) => Promise<T | null>;
  reload: () => void;
  showToast: (ok: boolean, text: string) => void;
}) {
  const [form, setForm] = useState({
    date: todayIso(),
    memberId: "",
    opponent: "",
    po: 0, // 刺殺
    a: 0,  // 捕殺
    e: 0,  // 失策
  });

  async function submit() {
    const member = members.find(m => m.id === form.memberId);
    if (!member) { showToast(false, "メンバーを選んでください。"); return; }
    if (!form.date) { showToast(false, "日付は必須です。"); return; }
    if (form.po + form.a + form.e === 0) { showToast(false, "刺殺・捕殺・失策のいずれかを入力してください。"); return; }
    const row = [
      form.date, member.id, member.name, form.opponent.trim(),
      String(form.po), String(form.a), String(form.e),
    ];
    const ok = await api("/api/admin/append", { sheet: "fielding", row });
    if (ok) {
      showToast(true, `${member.name} の守備記録を保存しました。`);
      setForm(prev => ({ ...prev, opponent: "", po: 0, a: 0, e: 0 }));
      reload();
    }
  }

  async function remove(f: FieldingRow) {
    if (!window.confirm(`${formatDateJp(f.date)} ${f.memberName} の守備記録を削除しますか？`)) return;
    const ok = await api("/api/admin/delete", { sheet: "fielding", rowIndex: f._row });
    if (ok) { showToast(true, "削除しました。"); reload(); }
  }

  const sorted = [...fielding].sort((a, b) => b.date.localeCompare(a.date));
  const chances = form.po + form.a + form.e;
  const rate = chances > 0 ? (form.po + form.a) / chances : 0;

  return (
    <div className="grid gap-5 grid-cols-1 lg:grid-cols-[420px_1fr]">
      <section style={cardStyle}>
        <H3>新しい守備記録</H3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={labelStyle}>日付</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>選手</label>
            <select value={form.memberId} onChange={e => setForm({ ...form, memberId: e.target.value })} style={inputStyle as React.CSSProperties}>
              <option value="">— 選んでください —</option>
              {members.filter(m => m.active).map(m => (
                <option key={m.id} value={m.id}>#{m.jerseyNumber || "—"} {m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>対戦相手 / 試合名</label>
            <input value={form.opponent} onChange={e => setForm({ ...form, opponent: e.target.value })} placeholder="例: 〇〇クラブ戦" style={inputStyle} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <NumField label="刺殺 (PO)" v={form.po} on={n => setForm({ ...form, po: n })} />
            <NumField label="捕殺 (A)" v={form.a} on={n => setForm({ ...form, a: n })} />
            <NumField label="失策 (E)" v={form.e} on={n => setForm({ ...form, e: n })} />
          </div>
          <div style={{ padding: "10px 12px", background: "rgba(212,168,42,0.06)", borderLeft: "3px solid #d4a82a", fontSize: 12 }}>
            この試合の守備率: <strong style={{ color: "#d4a82a", fontFamily: "var(--font-oswald),sans-serif", fontSize: 16 }}>{rate.toFixed(3).replace(/^0/, "")}</strong>
            <span style={{ color: "rgba(255,255,255,0.4)", marginLeft: 8 }}>（守備機会 {chances}）</span>
          </div>
          <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.45)", margin: 0, lineHeight: 1.6 }}>
            刺殺(PO)=直接アウトを取った数（捕球・ベースタッチ等）。捕殺(A)=送球などで補助した数。失策(E)=エラー。
          </p>
          <button onClick={submit} disabled={saving} style={{ ...btnPrimaryStyle, marginTop: 4, opacity: saving ? 0.6 : 1, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "保存中…" : "記録する →"}
          </button>
        </div>
      </section>

      <section style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <H3>守備記録一覧（{fielding.length}件）</H3>
          <button onClick={reload} style={btnSubStyle}>{loading ? "..." : "🔄 再読込"}</button>
        </div>
        {fielding.length === 0 ? (
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, textAlign: "center", padding: 24 }}>
            守備記録がありません。左から登録してください。
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <Th>日付</Th>
                  <Th>選手</Th>
                  <Th>対戦</Th>
                  <Th>刺殺</Th>
                  <Th>捕殺</Th>
                  <Th>失策</Th>
                  <Th>守備率</Th>
                  <Th>{""}</Th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((f, i) => {
                  const ch = f.po + f.a + f.e;
                  const r = ch > 0 ? (f.po + f.a) / ch : 0;
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <Td><span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>{formatDateShort(f.date)}</span></Td>
                      <Td><strong>{f.memberName}</strong></Td>
                      <Td><span style={{ color: "rgba(255,255,255,0.55)", fontSize: 11 }}>{f.opponent || "—"}</span></Td>
                      <Td>{f.po}</Td>
                      <Td>{f.a}</Td>
                      <Td><span style={{ color: f.e > 0 ? "#ff6982" : undefined }}>{f.e}</span></Td>
                      <Td><span style={{ color: "#d4a82a", fontFamily: "var(--font-oswald),sans-serif" }}>{r.toFixed(3).replace(/^0/, "")}</span></Td>
                      <Td>
                        <button onClick={() => remove(f)} style={{ padding: "3px 8px", background: "transparent", color: "#ff6982", border: "1px solid rgba(209,0,36,0.3)", fontSize: 10, cursor: "pointer" }}>×</button>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// 予告先発タブ
// ────────────────────────────────────────────────────────
function ProbablesTab({
  members, probables, practices, loading, saving, pw, api, reload, reloadPractices, showToast,
}: {
  members: Member[];
  probables: ProbableRow[];
  practices: PracticeRow[];
  loading: boolean;
  saving: boolean;
  pw: string;
  api: <T,>(path: string, body: Record<string, unknown>) => Promise<T | null>;
  reload: () => void;
  reloadPractices: () => void;
  showToast: (ok: boolean, text: string) => void;
}) {
  const [form, setForm] = useState({
    date: todayIso(),
    opponent: "",
    memberId: "",
    note: "",
  });
  const [notify, setNotify] = useState(true);
  const [sending, setSending] = useState(false);

  // 試合系の練習だけ候補に
  const gamePractices = useMemo(
    () => [...practices].filter(p => p.type === "試合" || p.type === "練習試合").sort((a, b) => b.date.localeCompare(a.date)),
    [practices]
  );

  async function submit() {
    const member = members.find(m => m.id === form.memberId);
    if (!member) { showToast(false, "先発投手を選んでください。"); return; }
    if (!form.date) { showToast(false, "日付は必須です。"); return; }

    // 同じ日付の既存予告は置き換える（削除→追加）
    const existing = probables.filter(p => p.date === form.date);
    for (const ex of [...existing].sort((a, b) => b._row - a._row)) {
      await api("/api/admin/delete", { sheet: "probables", rowIndex: ex._row });
    }
    const row = [form.date, form.opponent.trim(), member.id, member.name, form.note.trim()];
    const ok = await api("/api/admin/append", { sheet: "probables", row });
    if (!ok) return;
    showToast(true, `予告先発を保存しました（${member.name}）`);

    if (notify) {
      setSending(true);
      const body = `${formatDateShort(form.date)}${form.opponent ? " vs " + form.opponent : ""} 先発: ${member.name}${form.note ? "（" + form.note.trim() + "）" : ""}`;
      // お知らせ欄にも投稿
      await api("/api/admin/append", { sheet: "announcements", row: [todayIso(), "先発", "予告先発が発表されました", body] });
      // プッシュ通知
      const r = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": pw },
        body: JSON.stringify({ title: "📣 予告先発が発表されました", body, url: "/stats", tag: "probable" }),
      }).then(res => res.json()).catch(() => null);
      setSending(false);
      if (r?.ok) showToast(true, `お知らせ投稿＆通知を送信しました（${r.sent}/${r.total}人）`);
      else showToast(false, "通知の送信に失敗しました（購読者がいない可能性）");
    }
    setForm(prev => ({ ...prev, opponent: "", memberId: "", note: "" }));
    reload();
  }

  async function remove(p: ProbableRow) {
    if (!window.confirm(`${formatDateJp(p.date)} の予告先発（${p.memberName}）を削除しますか？`)) return;
    const ok = await api("/api/admin/delete", { sheet: "probables", rowIndex: p._row });
    if (ok) { showToast(true, "削除しました。"); reload(); }
  }

  const sorted = [...probables].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="grid gap-5 grid-cols-1 lg:grid-cols-[420px_1fr]">
      <section style={cardStyle}>
        <H3>予告先発を登録</H3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {gamePractices.length > 0 && (
            <div>
              <label style={labelStyle}>試合日から選ぶ（任意）</label>
              <select
                value=""
                onChange={e => {
                  const p = gamePractices.find(g => g.date === e.target.value);
                  if (p) setForm(prev => ({ ...prev, date: p.date, opponent: prev.opponent || (p.note || "") }));
                }}
                style={inputStyle as React.CSSProperties}
              >
                <option value="">— 登録済みの試合日 —</option>
                {gamePractices.map(p => (
                  <option key={p.date + p.place} value={p.date}>{formatDateShort(p.date)} {p.type} @ {p.place}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label style={labelStyle}>日付</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>対戦相手（任意）</label>
            <input value={form.opponent} onChange={e => setForm({ ...form, opponent: e.target.value })} placeholder="例: 〇〇クラブ" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>先発投手</label>
            <select value={form.memberId} onChange={e => setForm({ ...form, memberId: e.target.value })} style={inputStyle as React.CSSProperties}>
              <option value="">— 選んでください —</option>
              {members.filter(m => m.active).map(m => (
                <option key={m.id} value={m.id}>#{m.jerseyNumber || "—"} {m.name}{m.position === "投手" ? " ★" : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>ひとこと（任意）</label>
            <input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="例: 初先発！応援よろしく" style={inputStyle} />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", padding: "8px 0" }}>
            <input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} style={{ width: 18, height: 18, accentColor: "#d4a82a" }} />
            保存と同時にメンバーへ通知する 🔔
          </label>
          <button onClick={submit} disabled={saving || sending} style={{ ...btnPrimaryStyle, opacity: (saving || sending) ? 0.6 : 1, cursor: (saving || sending) ? "not-allowed" : "pointer" }}>
            {sending ? "通知送信中…" : saving ? "保存中…" : "登録する →"}
          </button>
          <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.45)", margin: 0, lineHeight: 1.6 }}>
            同じ日付に登録済みの予告先発があれば置き換えます。成績アプリの「日程」タブに表示されます。
          </p>
        </div>
      </section>

      <section style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <H3>予告先発一覧（{probables.length}件）</H3>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={reloadPractices} style={btnSubStyle}>練習リスト更新</button>
            <button onClick={reload} style={btnSubStyle}>{loading ? "..." : "🔄 再読込"}</button>
          </div>
        </div>
        {probables.length === 0 ? (
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, textAlign: "center", padding: 24 }}>
            予告先発がありません。左から登録してください。
          </p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {sorted.map((p, i) => (
              <li key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 4px", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ minWidth: 60 }}>
                  <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 15, color: "#d4a82a" }}>{formatDateShort(p.date)}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>⚾ {p.memberName}{p.opponent && <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.55)", fontSize: 12, marginLeft: 8 }}>vs {p.opponent}</span>}</div>
                  {p.note && <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{p.note}</div>}
                </div>
                <button onClick={() => remove(p)} style={{ padding: "3px 8px", background: "transparent", color: "#ff6982", border: "1px solid rgba(209,0,36,0.3)", fontSize: 10, cursor: "pointer" }}>×</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// お知らせ / 通知タブ
// ────────────────────────────────────────────────────────
const ANN_CATEGORIES = ["お知らせ", "成績", "先発", "アップデート", "メンテナンス"] as const;

function NotifyTab({
  pw, announcements, loading, api, reload, showToast,
}: {
  pw: string;
  announcements: AnnouncementRow[];
  loading: boolean;
  api: <T,>(path: string, body: Record<string, unknown>) => Promise<T | null>;
  reload: () => void;
  showToast: (ok: boolean, text: string) => void;
}) {
  const [category, setCategory] = useState<string>("お知らせ");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<string>("");

  async function pushSend(t: string, b: string): Promise<{ ok: boolean; sent?: number; total?: number; error?: string } | null> {
    return fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": pw },
      body: JSON.stringify({ title: t, body: b, url: "/stats" }),
    }).then(res => res.json()).catch(() => null);
  }

  // 投稿（+任意で通知）
  async function post(withNotify: boolean) {
    const t = title.trim();
    const b = body.trim();
    if (!t) { showToast(false, "タイトルを入力してください。"); return; }
    setBusy(true);
    setLast("");
    const ok = await api("/api/admin/append", { sheet: "announcements", row: [todayIso(), category, t, b] });
    if (!ok) { setBusy(false); showToast(false, "お知らせの投稿に失敗しました。"); return; }
    let notifyMsg = "";
    if (withNotify) {
      const r = await pushSend(t, b);
      notifyMsg = r?.ok ? `／通知 ${r.sent}/${r.total}人` : "／通知失敗";
    }
    setBusy(false);
    setLast(`お知らせを投稿しました${notifyMsg}`);
    showToast(true, `お知らせを投稿しました${notifyMsg}`);
    setTitle(""); setBody("");
    reload();
  }

  // 通知のみ（投稿しない）
  async function notifyOnly(presetTitle?: string, presetBody?: string) {
    const t = (presetTitle ?? title).trim();
    const b = (presetBody ?? body).trim();
    if (!t) { showToast(false, "タイトルを入力してください。"); return; }
    setBusy(true);
    const r = await pushSend(t, b);
    setBusy(false);
    if (r?.ok) { setLast(`通知のみ送信：${r.sent}/${r.total}人`); showToast(true, `通知を送信しました（${r.sent}/${r.total}人）`); }
    else { setLast(`送信失敗：${r?.error ?? "エラー"}`); showToast(false, r?.error ?? "通知の送信に失敗しました。"); }
  }

  function fillPreset(cat: string, t: string, b: string) {
    setCategory(cat); setTitle(t); setBody(b);
  }

  async function remove(a: AnnouncementRow) {
    if (!window.confirm(`お知らせ「${a.title}」を削除しますか？`)) return;
    const ok = await api("/api/admin/delete", { sheet: "announcements", rowIndex: a._row });
    if (ok) { showToast(true, "削除しました。"); reload(); }
  }

  const sorted = [...announcements].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="grid gap-5 grid-cols-1 lg:grid-cols-[480px_1fr]">
      <section style={cardStyle}>
        <H3>お知らせを投稿 / 通知</H3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={labelStyle}>カテゴリ</label>
            <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle as React.CSSProperties}>
              {ANN_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>タイトル</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="例: 6/13の練習試合の成績を更新しました" style={inputStyle} maxLength={120} />
          </div>
          <div>
            <label style={labelStyle}>本文</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="例: 打撃・守備の成績を反映しました。アプリで確認してね！" rows={3} style={{ ...inputStyle, resize: "vertical" } as React.CSSProperties} maxLength={300} />
          </div>
          <button onClick={() => post(true)} disabled={busy} style={{ ...btnPrimaryStyle, opacity: busy ? 0.6 : 1, cursor: busy ? "not-allowed" : "pointer" }}>
            {busy ? "送信中…" : "お知らせを投稿して通知する 📢🔔"}
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => post(false)} disabled={busy} style={{ ...btnSubStyle, flex: 1 }}>投稿のみ（通知なし）</button>
            <button onClick={() => notifyOnly()} disabled={busy} style={{ ...btnSubStyle, flex: 1 }}>通知のみ（投稿なし）</button>
          </div>
          {last && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", padding: "8px 10px", background: "rgba(255,255,255,0.04)" }}>{last}</div>}
          <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", margin: 0, lineHeight: 1.7 }}>
            投稿は成績アプリの「お知らせ」タブに表示されます（直近5件＋それ以前は展開表示）。<br />
            通知が届くのは「通知をオンにする」を押したメンバーのみ。iPhoneはホーム画面追加後にオンが必要（iOS 16.4+）。送信には Vercel の VAPID_PRIVATE_KEY が必要です。
          </p>
        </div>
      </section>

      <section style={cardStyle}>
        <H3>かんたん入力 / テスト</H3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          <button onClick={() => notifyOnly("✅ テスト通知", "通知が正常に届いています。")} disabled={busy} style={presetBtnStyle}>
            🧪 テスト通知を送る（投稿なし）
          </button>
          <button onClick={() => fillPreset("成績", "⚾ 成績を更新しました", "最新の試合成績をアプリに反映しました。チェックしてね！")} style={presetBtnStyle}>
            ⚾ 「成績を更新しました」を入力
          </button>
          <button onClick={() => fillPreset("先発", "📣 予告先発が発表されました", "次の試合の予告先発が決まりました。アプリの日程タブで確認！")} style={presetBtnStyle}>
            📣 「予告先発が発表されました」を入力
          </button>
          <button onClick={() => fillPreset("アップデート", "🆕 アプリをアップデートしました", "新機能を追加しました。お知らせの「更新内容を見る」をチェック！")} style={presetBtnStyle}>
            🆕 「アップデートしました」を入力
          </button>
          <button onClick={() => fillPreset("メンテナンス", "🛠 メンテナンスのお知らせ", "一時的に表示が不安定になる場合があります。ご了承ください。")} style={presetBtnStyle}>
            🛠 「メンテナンス」を入力
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <H3>投稿済みのお知らせ（{announcements.length}件）</H3>
          <button onClick={reload} style={btnSubStyle}>{loading ? "..." : "🔄"}</button>
        </div>
        {sorted.length === 0 ? (
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, textAlign: "center", padding: 18 }}>まだお知らせはありません。</p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {sorted.map((a, i) => (
              <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 4px", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{formatDateShort(a.date)}</span>
                    <span style={{ fontSize: 10, color: "#d4a82a", background: "rgba(212,168,42,0.12)", padding: "1px 7px" }}>{a.category}</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{a.title}</div>
                  {a.body && <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{a.body}</div>}
                </div>
                <button onClick={() => remove(a)} style={{ padding: "3px 8px", background: "transparent", color: "#ff6982", border: "1px solid rgba(209,0,36,0.3)", fontSize: 10, cursor: "pointer", flexShrink: 0 }}>×</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const presetBtnStyle: React.CSSProperties = {
  ...btnSubStyle,
  textAlign: "left",
  padding: "12px 14px",
  fontSize: 13,
};

// ────────────────────────────────────────────────────────
// 統計タブ
// ────────────────────────────────────────────────────────
function StatsTab({
  members, attendance, batting, loading,
}: {
  members: Member[];
  attendance: AttendanceRow[];
  batting: BattingRow[];
  loading: boolean;
}) {
  // 総練習日数 = attendance シート上のユニーク日付数
  const uniquePracticeDates = useMemo(() => {
    return new Set(attendance.map(a => a.date)).size;
  }, [attendance]);

  // メンバー別統計
  const stats = useMemo(() => {
    return members.map(m => {
      const memBatting = batting.filter(b => b.memberId === m.id);
      const atBats = memBatting.reduce((s, b) => s + b.atBats, 0);
      const hits = memBatting.reduce((s, b) => s + b.hits, 0);
      const hr = memBatting.reduce((s, b) => s + b.hr, 0);
      const rbi = memBatting.reduce((s, b) => s + b.rbi, 0);
      const bb = memBatting.reduce((s, b) => s + b.bb, 0);
      const so = memBatting.reduce((s, b) => s + b.so, 0);
      const games = memBatting.length;
      const avg = atBats > 0 ? hits / atBats : 0;
      const obp = atBats + bb > 0 ? (hits + bb) / (atBats + bb) : 0;

      const memAttendance = attendance.filter(a => a.memberId === m.id);
      const presentCount = memAttendance.filter(a => a.status === "出席").length;
      const lateCount = memAttendance.filter(a => a.status === "遅刻").length;
      const absentCount = memAttendance.filter(a => a.status === "欠席").length;
      const recordedDays = memAttendance.filter(a => a.status !== "未定").length;
      // 出席率 = (出席 + 遅刻) / 記録のあった日
      const attRate = recordedDays > 0 ? (presentCount + lateCount) / recordedDays : 0;

      return { m, atBats, hits, hr, rbi, bb, so, games, avg, obp, presentCount, lateCount, absentCount, recordedDays, attRate };
    });
  }, [members, batting, attendance]);

  // 打率順
  const ranking = [...stats].filter(s => s.m.active && s.atBats >= 1).sort((a, b) => b.avg - a.avg);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* サマリ */}
      <section style={cardStyle}>
        <H3>チーム全体</H3>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
          <SummaryStat label="登録メンバー" v={members.filter(m => m.active).length} unit="名" />
          <SummaryStat label="練習日数" v={uniquePracticeDates} unit="日" />
          <SummaryStat label="試合・打席記録" v={batting.length} unit="件" />
          <SummaryStat label="チーム合計HR" v={batting.reduce((s, b) => s + b.hr, 0)} unit="本" />
          <SummaryStat label="チーム合計打点" v={batting.reduce((s, b) => s + b.rbi, 0)} unit="打点" />
        </div>
      </section>

      {/* 打率ランキング */}
      <section style={cardStyle}>
        <H3>打率ランキング（1打席以上）</H3>
        {loading ? (
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, textAlign: "center", padding: 16 }}>読み込み中…</p>
        ) : ranking.length === 0 ? (
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, textAlign: "center", padding: 16 }}>
            打席記録がまだありません。「打席記録」タブから登録してください。
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <Th>順位</Th>
                  <Th>選手</Th>
                  <Th>試合</Th>
                  <Th>打席</Th>
                  <Th>安打</Th>
                  <Th>HR</Th>
                  <Th>RBI</Th>
                  <Th>打率</Th>
                  <Th>出塁率</Th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((s, i) => (
                  <tr key={s.m.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <Td>
                      <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 18, fontWeight: 700, color: i < 3 ? "#d4a82a" : "rgba(255,255,255,0.4)" }}>
                        {i + 1}
                      </span>
                    </Td>
                    <Td>
                      <span style={{ fontFamily: "var(--font-oswald),sans-serif", color: "#d4a82a", marginRight: 8 }}>#{s.m.jerseyNumber || "—"}</span>
                      <strong>{s.m.name}</strong>
                    </Td>
                    <Td>{s.games}</Td>
                    <Td>{s.atBats}</Td>
                    <Td>{s.hits}</Td>
                    <Td>{s.hr}</Td>
                    <Td>{s.rbi}</Td>
                    <Td>
                      <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 18, fontWeight: 700, color: "#d4a82a" }}>{avg3(s.avg)}</span>
                    </Td>
                    <Td>
                      <span style={{ fontFamily: "var(--font-oswald),sans-serif", color: "rgba(255,255,255,0.75)" }}>{avg3(s.obp)}</span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 出席率ランキング */}
      <section style={cardStyle}>
        <H3>出席率（出席＋遅刻 / 記録のあった日）</H3>
        {stats.filter(s => s.m.active && s.recordedDays > 0).length === 0 ? (
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, textAlign: "center", padding: 16 }}>
            出欠の記録がまだありません。「出欠確認」タブから記録してください。
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <Th>選手</Th>
                  <Th>出席</Th>
                  <Th>遅刻</Th>
                  <Th>欠席</Th>
                  <Th>記録日数</Th>
                  <Th>出席率</Th>
                </tr>
              </thead>
              <tbody>
                {[...stats]
                  .filter(s => s.m.active && s.recordedDays > 0)
                  .sort((a, b) => b.attRate - a.attRate)
                  .map(s => (
                    <tr key={s.m.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <Td>
                        <span style={{ fontFamily: "var(--font-oswald),sans-serif", color: "#d4a82a", marginRight: 8 }}>#{s.m.jerseyNumber || "—"}</span>
                        <strong>{s.m.name}</strong>
                      </Td>
                      <Td><span style={{ color: "#67e088" }}>{s.presentCount}</span></Td>
                      <Td><span style={{ color: "#d4a82a" }}>{s.lateCount}</span></Td>
                      <Td><span style={{ color: "#ff6982" }}>{s.absentCount}</span></Td>
                      <Td>{s.recordedDays}</Td>
                      <Td>
                        <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 16, fontWeight: 700, color: "#d4a82a" }}>
                          {Math.round(s.attRate * 100)}%
                        </span>
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

function SummaryStat({ label, v, unit }: { label: string; v: number; unit?: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "14px 16px" }}>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", letterSpacing: "0.16em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: "var(--font-oswald),sans-serif", color: "#fff", marginTop: 2 }}>
        <span style={{ fontSize: 26, fontWeight: 700 }}>{v}</span>
        {unit && <span style={{ marginLeft: 5, fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{unit}</span>}
      </div>
    </div>
  );
}
