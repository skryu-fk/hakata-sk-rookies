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

type Tab = "members" | "attendance" | "batting" | "stats";

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
    <div style={{
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
          <Image src="/logo.png" alt="logo" width={72} height={72} className="object-contain mx-auto" />
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
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(ok: boolean, text: string) {
    setToast({ ok, text });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  // ── 共通 API 呼び出し ──
  const api = useCallback(async <T,>(path: string, body: Record<string, unknown>): Promise<T | null> => {
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
      joinedDate: r.data[5] ?? "",
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
      date: r.data[0] ?? "",
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
      date: r.data[0] ?? "",
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
      _row: r.rowIndex,
    })));
  }, [api]);

  // 初回ロード
  useEffect(() => { loadMembers(); }, [loadMembers]);
  useEffect(() => { if (tab === "attendance" && attendance.length === 0) loadAttendance(); }, [tab, attendance.length, loadAttendance]);
  useEffect(() => { if (tab === "batting" && batting.length === 0) loadBatting(); }, [tab, batting.length, loadBatting]);
  useEffect(() => {
    if (tab === "stats") {
      // 統計タブは attendance / batting の両方が必要
      if (attendance.length === 0) loadAttendance();
      if (batting.length === 0) loadBatting();
    }
  }, [tab, attendance.length, batting.length, loadAttendance, loadBatting]);

  // ── レンダリング ──
  return (
    <div style={{ minHeight: "100vh", background: "#0a0e1a", color: "#fff" }}>
      {/* Top bar */}
      <header style={{ background: "#0b1e3f", borderBottom: "3px solid #d10024" }}>
        <div className="max-w-[1280px] mx-auto px-5 md:px-8 flex items-center" style={{ height: 64, gap: 16 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
            <Image src="/logo.png" alt="logo" width={36} height={36} className="object-contain" />
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
            ["members", "メンバー名簿", members.length],
            ["attendance", "出欠確認", attendance.length],
            ["batting", "打席記録", batting.length],
            ["stats", "統計", undefined],
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
            loading={!!loading.attendance}
            api={api}
            reload={loadAttendance}
            showToast={showToast}
          />
        )}
        {tab === "batting" && (
          <BattingTab
            members={members}
            batting={batting}
            loading={!!loading.batting}
            api={api}
            reload={loadBatting}
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
                    <Td><span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>{m.joinedDate || "—"}</span></Td>
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
function AttendanceTab({
  members, attendance, loading, api, reload, showToast,
}: {
  members: Member[];
  attendance: AttendanceRow[];
  loading: boolean;
  api: <T,>(path: string, body: Record<string, unknown>) => Promise<T | null>;
  reload: () => void;
  showToast: (ok: boolean, text: string) => void;
}) {
  const [date, setDate] = useState(todayIso());
  const [draftStatuses, setDraftStatuses] = useState<Record<string, string>>({});

  // 選択日の既存記録
  const existingForDate = useMemo(() => {
    const m: Record<string, AttendanceRow> = {};
    for (const a of attendance) if (a.date === date) m[a.memberId] = a;
    return m;
  }, [attendance, date]);

  // active メンバーのみ
  const activeMembers = members.filter(m => m.active);

  function statusFor(m: Member): string {
    return draftStatuses[m.id] ?? existingForDate[m.id]?.status ?? "未定";
  }

  async function save() {
    if (!date) {
      showToast(false, "日付を選んでください。");
      return;
    }
    let written = 0;
    for (const m of activeMembers) {
      const newStatus = draftStatuses[m.id];
      if (newStatus === undefined) continue; // 変更なし
      const existing = existingForDate[m.id];
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

  const countBy = (s: string) =>
    activeMembers.filter(m => statusFor(m) === s).length;

  return (
    <div className="grid gap-5 grid-cols-1">
      <section style={cardStyle}>
        <H3>練習日の出欠を記録</H3>
        <div className="grid gap-3 items-end" style={{ gridTemplateColumns: "1fr auto auto", flexWrap: "wrap" }}>
          <div>
            <label style={labelStyle}>練習日</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
          </div>
          <button onClick={save} style={btnPrimaryStyle}>この日付で保存 →</button>
          <button onClick={reload} style={btnSubStyle}>{loading ? "..." : "🔄 再読込"}</button>
        </div>

        {/* サマリ */}
        <div className="grid gap-2 mt-4" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          {ATTENDANCE_STATUSES.map(s => (
            <div key={s} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "10px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", letterSpacing: "0.16em", textTransform: "uppercase" }}>{s}</div>
              <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 22, fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>{countBy(s)}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={cardStyle}>
        <H3>メンバー別出欠（{activeMembers.length}名）</H3>
        {activeMembers.length === 0 ? (
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>アクティブなメンバーがいません。「メンバー名簿」タブから追加してください。</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {activeMembers.map((m, i) => {
              const cur = statusFor(m);
              return (
                <li key={m.id || i} style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 12, padding: "10px 0", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.05)" }}>
                  <div>
                    <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 15, color: "#d4a82a", marginRight: 12 }}>{m.jerseyNumber || "—"}</span>
                    <span style={{ fontWeight: 700 }}>{m.name}</span>
                    {m.nickname && <span style={{ marginLeft: 8, color: "rgba(255,255,255,0.4)", fontSize: 12 }}>({m.nickname})</span>}
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {ATTENDANCE_STATUSES.map(s => {
                      const active = cur === s;
                      const colors: Record<string, string> = {
                        "出席": "#1a9f3a", "欠席": "#d10024", "遅刻": "#d4a82a", "未定": "#5b6373",
                      };
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
      </section>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// 打席記録タブ
// ────────────────────────────────────────────────────────
function BattingTab({
  members, batting, loading, api, reload, showToast,
}: {
  members: Member[];
  batting: BattingRow[];
  loading: boolean;
  api: <T,>(path: string, body: Record<string, unknown>) => Promise<T | null>;
  reload: () => void;
  showToast: (ok: boolean, text: string) => void;
}) {
  const [form, setForm] = useState({
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
  });

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
    const row = [
      form.date, member.id, member.name, form.opponent.trim(),
      String(form.atBats), String(form.hits), String(form.doubles), String(form.triples),
      String(form.hr), String(form.rbi), String(form.bb), String(form.so),
    ];
    const ok = await api("/api/admin/append", { sheet: "batting", row });
    if (ok) {
      showToast(true, `${member.name} の打席を記録しました。`);
      setForm(prev => ({ ...prev, opponent: "", atBats: 0, hits: 0, doubles: 0, triples: 0, hr: 0, rbi: 0, bb: 0, so: 0 }));
      reload();
    }
  }

  async function remove(b: BattingRow) {
    if (!window.confirm(`${b.date} ${b.memberName} の記録を削除しますか？`)) return;
    const ok = await api("/api/admin/delete", { sheet: "batting", rowIndex: b._row });
    if (ok) {
      showToast(true, "削除しました。");
      reload();
    }
  }

  const sortedBatting = [...batting].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="grid gap-5 grid-cols-1 lg:grid-cols-[420px_1fr]">
      <section style={cardStyle}>
        <H3>新しい打席記録</H3>
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
          </div>
          <button onClick={submit} style={{ ...btnPrimaryStyle, marginTop: 4 }}>記録する →</button>
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
                  <Th>{""}</Th>
                </tr>
              </thead>
              <tbody>
                {sortedBatting.map((b, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <Td><span style={{ color: "rgba(255,255,255,0.6)" }}>{b.date}</span></Td>
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
                    <Td>
                      <button onClick={() => remove(b)} style={{ padding: "3px 8px", background: "transparent", color: "#ff6982", border: "1px solid rgba(209,0,36,0.3)", fontSize: 10, cursor: "pointer" }}>×</button>
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
