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
import { readCache, writeCache, clearCache } from "@/lib/clientCache";

const MEMBER_PW_KEY = "skr_member_pw";

/* ── アプリのバージョン / 更新履歴 ────────────────────────── */
const APP_VERSION = "2.0";
type ChangeLogEntry = { version: string; date: string; items: string[] };
const CHANGELOG: ChangeLogEntry[] = [
  {
    version: "2.0",
    date: "2026-09-18",
    items: [
      "🔑 ログイン方法を「ユーザーID＋パスワード」に変更しました",
      "🆕 アカウントを作り直しました。お手数ですが各自で新規登録をお願いします",
      "👤 氏名は全角カタカナで入力（例：ヤマダ　タロウ）",
      "🎫 登録するとユーザーIDが発行されます。必ず控えてください",
      "🔒 パスワードは英字と数字を含む8文字以上に変更",
      "⚡ 表示を高速化（前回のデータをすぐ表示して裏で更新）",
      "🎨 ログイン画面のデザインを刷新しました",
    ],
  },
  {
    version: "1.5",
    date: "2026-07-01",
    items: [
      "👤 マイページを追加（自分の表示名・ニックネームを編集できます）",
      "🔗 管理者がアカウントと名簿を「連携」→ あなたの成績が自動表示",
      "⚡ 読み込みを高速化（全データを1回でまとめて取得）",
      "🔒 パスワードはマイページからは変更できません（安全のため）",
    ],
  },
  {
    version: "1.4",
    date: "2026-06-30",
    items: [
      "👤 メンバー個人アカウント制を導入（本名＋自分のパスワードでログイン）",
      "📝 新規登録ページを追加（パスワードは2回入力で確認）",
      "🛡 共通パスワードでのログインは廃止し、なりすましを防止",
      "✅ 登録は管理者の承認制（承認された人だけログインできます）",
      "🔐 パスワードは暗号化（ハッシュ化）して保存・誰にも見えません",
    ],
  },
  {
    version: "1.3",
    date: "2026-06-24",
    items: [
      "🧠 独自開発AI「SKドッパミンAI」を搭載（フォーム診断）",
      "🎥 動画からバッティング/ピッチングを骨格解析→点数・項目別評価・改善点",
      "🖼 構え〜インパクト〜フォロースルーの連続写真（骨格つき）を表示",
      "🎯 改善アドバイスはプロ・指導者のフォーム理論ベース",
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
  球場練習: "#d10024", キャッチボール: "#E5B84B", 試合: "#4a90e2", 練習試合: "#9b59b6", 全体練習: "#27ae60",
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
        <p style={{ color: "rgba(235,235,245,0.60)", fontSize: 13, letterSpacing: "0.15em" }}>VERIFYING…</p>
      </div>
    );
  }

  if (!authed) return <LoginGate onSuccess={() => setAuthed(true)} />;
  return <StatsDashboard onLogout={async () => {
    try { await fetch("/api/member/logout", { method: "POST" }); } catch {}
    // 端末に残したキャッシュ（成績など）も消す
    clearCache();
    try { localStorage.removeItem("skr_me"); localStorage.removeItem("skr_login_name"); } catch {}
    setAuthed(false);
  }} />;
}

const IOS_FONT = `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif`;

const pageBgStyle: React.CSSProperties = {
  fontFamily: IOS_FONT,
  minHeight: "100vh",
  background: "#000000",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

/* ── デザイントークン（iOS風のシンプルさ × チームカラー）──────── */
/**
 * iOS風の不透明パレット。
 * 半透明やぼかしは使わず、面の「明るさの差」だけで階層を表す（iOSのダークUIと同じ考え方）。
 * 真っ黒ではなく紺みを少し残して、チームらしさを保つ。
 */
const UI = {
  gold: "#E5B84B",      // ブランド色（iOSのsystemBlueの位置づけ）
  goldDim: "rgba(229,184,75,0.15)",
  bg: "#000000",        // systemBackground
  card: "#1C1C1E",      // secondarySystemGroupedBackground
  field: "#2C2C2E",     // tertiarySystemBackground（入力欄・fill）
  line: "#38383A",      // separator
  text: "#FFFFFF",      // label
  sub: "rgba(235,235,245,0.60)",  // secondaryLabel
  faint: "rgba(235,235,245,0.30)", // tertiaryLabel
  danger: "#FF453A",    // systemRed (dark)
  ok: "#30D158",        // systemGreen (dark)
  r: 14,
};

const uiField: React.CSSProperties = {
  width: "100%",
  padding: "15px 16px",
  background: UI.field,
  border: "1px solid transparent",
  borderRadius: 12,
  color: UI.text,
  // 16px 未満だと iOS でフォーカス時にズームしてしまう
  fontSize: 16,
  lineHeight: 1.4,
  outline: "none",
  WebkitAppearance: "none",
};

const uiCard: React.CSSProperties = {
  background: "#1C1C1E",
  border: "1px solid #38383A",
  borderRadius: 16,
  padding: 18,
};

const uiLabel: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: UI.sub,
  marginBottom: 7,
  letterSpacing: "0.02em",
};

const uiPrimary: React.CSSProperties = {
  width: "100%",
  height: 52,
  background: UI.gold,
  color: "#10131C",
  border: "none",
  borderRadius: 12,
  fontFamily: "var(--font-zen),sans-serif",
  fontWeight: 800,
  fontSize: 16,
  letterSpacing: "0.04em",
  cursor: "pointer",
};

/** 全角カタカナ＋スペースのみか（サーバ側 isKatakanaName と同じ判定） */
function isKatakanaClient(s: string): boolean {
  const t = s.normalize("NFKC").trim();
  if (!t) return false;
  if (!/^[゠-ヿ 　]+$/.test(t)) return false;
  return /[ァ-ヺ]/.test(t);
}
/** パスワード条件の充足状況 */
function pwChecks(pw: string) {
  return { len: pw.length >= 8, alpha: /[A-Za-z]/.test(pw), num: /[0-9]/.test(pw) };
}

function Rule({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: ok ? UI.ok : UI.faint }}>
      <span style={{
        width: 15, height: 15, borderRadius: "50%", flexShrink: 0,
        background: ok ? "#19332d" : "#38383A",
        display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9, lineHeight: 1,
      }}>{ok ? "✓" : ""}</span>
      {children}
    </div>
  );
}

/* ── ログイン / 新規登録 ──────────────────────────────── */
function LoginGate({ onSuccess }: { onSuccess: () => void }) {
  const [view, setView] = useState<"login" | "register" | "issued" | "forgot">("login");
  const [forgotName, setForgotName] = useState("");
  const [forgotMsg, setForgotMsg] = useState("");
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // 発行されたユーザーID（登録直後に控えてもらう画面で使う）
  const [issued, setIssued] = useState<{ userId: string; name: string } | null>(null);
  const [memorized, setMemorized] = useState(false);
  const [copied, setCopied] = useState(false);

  const pc = pwChecks(pw);
  const nameOk = isKatakanaClient(name);
  const nameTouched = name.trim().length > 0;
  const canRegister = nameOk && pc.len && pc.alpha && pc.num && pw === pw2;

  function go(v: "login" | "register" | "forgot") {
    setView(v); setError(""); setPw(""); setPw2(""); setForgotMsg("");
  }

  async function doForgot() {
    if (busy) return;
    if (!isKatakanaClient(forgotName)) { setError("氏名は全角カタカナで入力してください（例：ヤマダ　タロウ）。"); return; }
    setBusy(true); setError(""); setForgotMsg("");
    try {
      const res = await fetch("/api/member/reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: forgotName.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d?.ok) setForgotMsg(d.message || "申請しました。");
      else if (res.status === 429) setError("申請が多すぎます。しばらく待ってからお試しください。");
      else setError(d?.error || "申請に失敗しました。");
    } catch {
      setError("ネットワークエラーが発生しました。");
    } finally { setBusy(false); }
  }

  async function doLogin() {
    if (busy) return;
    if (!userId.trim() || !pw) { setError("ユーザーIDとパスワードを入力してください。"); return; }
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/member/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId.trim(), password: pw }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d?.ok) {
        try { localStorage.setItem("skr_login_name", d.name || ""); } catch {}
        onSuccess();
      } else if (res.status === 429) {
        setError("試行回数が多すぎます。しばらく待ってからお試しください。");
      } else {
        setError(d?.error || "ログインに失敗しました。");
      }
    } catch {
      setError("ネットワークエラーが発生しました。");
    } finally { setBusy(false); }
  }

  async function doRegister() {
    if (busy) return;
    if (!nameOk) { setError("氏名は全角カタカナで入力してください（例：ヤマダ　タロウ）。"); return; }
    if (!(pc.len && pc.alpha && pc.num)) { setError("パスワードは8文字以上で、英字と数字の両方を含めてください。"); return; }
    if (pw !== pw2) { setError("確認用パスワードが一致しません。"); return; }
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/member/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), password: pw, password2: pw2 }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d?.ok && d.userId) {
        setIssued({ userId: d.userId, name: d.name || name.trim() });
        setUserId(d.userId);
        setPw(""); setPw2(""); setMemorized(false); setCopied(false);
        setView("issued");
      } else if (res.status === 429) {
        setError("試行回数が多すぎます。しばらく待ってからお試しください。");
      } else {
        setError(d?.error || "登録に失敗しました。");
      }
    } catch {
      setError("ネットワークエラーが発生しました。");
    } finally { setBusy(false); }
  }

  async function copyId() {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.userId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* クリップボード不可の端末は手で控えてもらう */ }
  }

  /* ── ユーザーID発行画面 ── */
  if (view === "issued" && issued) {
    return (
      <div style={pageBgStyle}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          <div style={{ textAlign: "center", marginBottom: 22 }}>
            <div style={{ fontSize: 40, lineHeight: 1 }}>🎉</div>
            <div style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 900, fontSize: 21, marginTop: 12 }}>
              登録が完了しました
            </div>
            <div style={{ fontSize: 13, color: UI.sub, marginTop: 6 }}>{issued.name} さん</div>
          </div>

          <div style={{
            background: "#201f1d", border: `1px solid #6d5b2f`,
            borderRadius: UI.r, padding: "22px 20px", textAlign: "center",
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: UI.gold, letterSpacing: "0.12em" }}>あなたのユーザーID</div>
            <div style={{
              fontFamily: "var(--font-oswald),sans-serif", fontSize: 40, fontWeight: 700,
              color: UI.gold, letterSpacing: "0.1em", margin: "10px 0 4px",
            }}>
              {issued.userId}
            </div>
            <button
              onClick={copyId}
              style={{
                marginTop: 8, padding: "9px 18px", background: "#2C2C2E",
                color: UI.text, border: `1px solid ${UI.line}`, borderRadius: 999,
                fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              {copied ? "✓ コピーしました" : "IDをコピー"}
            </button>
          </div>

          <div style={{
            marginTop: 16, padding: "14px 16px", background: "#1e0d19",
            border: "1px solid #5a081d", borderRadius: 12,
            fontSize: 12.5, lineHeight: 1.8, color: "rgba(235,235,245,0.75)",
          }}>
            ⚠️ <strong style={{ color: "#fff" }}>このIDは次回以降のログインに必ず必要です。</strong><br />
            スクリーンショットを撮る・メモする など、<strong style={{ color: "#fff" }}>今すぐ控えてください</strong>。忘れた場合は管理者に確認が必要になります。
          </div>

          <label style={{
            display: "flex", alignItems: "center", gap: 10, marginTop: 18,
            fontSize: 14, color: UI.text, cursor: "pointer",
          }}>
            <input
              type="checkbox"
              checked={memorized}
              onChange={e => setMemorized(e.target.checked)}
              style={{ width: 20, height: 20, accentColor: UI.gold, cursor: "pointer" }}
            />
            ユーザーIDを控えました
          </label>

          <button
            onClick={() => { setIssued(null); setView("login"); }}
            disabled={!memorized}
            style={{ ...uiPrimary, marginTop: 14, opacity: memorized ? 1 : 0.4, cursor: memorized ? "pointer" : "not-allowed" }}
          >
            ログイン画面へ
          </button>
        </div>
      </div>
    );
  }

  /* ── パスワードを忘れた場合の申請画面 ── */
  if (view === "forgot") {
    return (
      <div style={pageBgStyle}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 36, lineHeight: 1 }}>🔑</div>
            <div style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 900, fontSize: 20, marginTop: 12 }}>
              パスワードを忘れた場合
            </div>
            <p style={{ fontSize: 12.5, color: UI.sub, lineHeight: 1.85, marginTop: 10 }}>
              安全のためパスワードは元に戻せません。<br />
              管理者にリセットを申請すると、<strong style={{ color: "#fff" }}>新しく登録し直せる</strong>ようになります。
            </p>
          </div>

          {forgotMsg ? (
            <>
              <div style={{
                padding: "16px 16px", background: "#142626",
                border: "1px solid #2a5f46", borderRadius: 12,
                fontSize: 13, lineHeight: 1.9, color: "rgba(235,235,245,0.75)",
              }}>
                ✅ {forgotMsg}
              </div>
              <button onClick={() => go("login")} style={{ ...uiPrimary, marginTop: 18 }}>
                ログイン画面へ戻る
              </button>
            </>
          ) : (
            <form onSubmit={e => { e.preventDefault(); doForgot(); }}>
              <div style={{ marginBottom: 16 }}>
                <label style={uiLabel}>氏名（全角カタカナ）</label>
                <input
                  value={forgotName}
                  onChange={e => setForgotName(e.target.value)}
                  placeholder="ヤマダ　タロウ"
                  autoFocus
                  style={{
                    ...uiField,
                    borderColor: forgotName.trim()
                      ? (isKatakanaClient(forgotName) ? "#337451" : "#853d4c")
                      : "transparent",
                  }}
                />
                <div style={{ marginTop: 7 }}>
                  <Rule ok={isKatakanaClient(forgotName)}>登録したときと同じカタカナの氏名</Rule>
                </div>
              </div>

              {error && (
                <div style={{
                  marginBottom: 16, padding: "12px 14px", background: "#220c19",
                  border: "1px solid #50091c", borderRadius: 12,
                  color: UI.danger, fontSize: 12.5, lineHeight: 1.7,
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy || !isKatakanaClient(forgotName)}
                style={{
                  ...uiPrimary,
                  opacity: (busy || !isKatakanaClient(forgotName)) ? 0.4 : 1,
                  cursor: (busy || !isKatakanaClient(forgotName)) ? "not-allowed" : "pointer",
                }}
              >
                {busy ? "送信中…" : "管理者にリセットを申請する"}
              </button>
            </form>
          )}

          <div style={{ textAlign: "center", marginTop: 18 }}>
            <button onClick={() => go("login")} style={{ background: "none", border: "none", color: UI.faint, fontSize: 12.5, cursor: "pointer" }}>
              ← ログイン画面へ戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isLogin = view === "login";

  return (
    <div style={pageBgStyle}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* ヘッダー */}
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <Image src="/sk_logo_crop.png" alt="" width={62} height={50} style={{ objectFit: "contain", margin: "0 auto", display: "block" }} />
          <div style={{
            fontFamily: "var(--font-oswald),sans-serif", fontSize: 10, letterSpacing: "0.34em",
            color: UI.gold, marginTop: 12,
          }}>
            HAKATA SK ROOKIES
          </div>
          <div style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 900, fontSize: 22, marginTop: 7, letterSpacing: "0.01em" }}>
            メンバー成績アプリ
          </div>
        </div>

        {/* セグメント切替（iOS風） */}
        <div style={{ display: "flex", background: UI.field, borderRadius: 12, padding: 4, marginBottom: 22 }}>
          {([["login", "ログイン"], ["register", "新規登録"]] as const).map(([k, label]) => {
            const on = view === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => go(k)}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 9, border: "none",
                  background: on ? UI.gold : "transparent",
                  color: on ? "#10131C" : UI.sub,
                  fontFamily: "var(--font-zen),sans-serif", fontWeight: 800, fontSize: 14,
                  cursor: "pointer", transition: "background .18s, color .18s",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <form onSubmit={e => { e.preventDefault(); isLogin ? doLogin() : doRegister(); }}>
          {isLogin ? (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={uiLabel}>ユーザーID</label>
                <input
                  value={userId}
                  onChange={e => setUserId(e.target.value.toUpperCase())}
                  placeholder="SKR-8421"
                  autoComplete="username"
                  autoCapitalize="characters"
                  autoFocus
                  style={{ ...uiField, fontFamily: "var(--font-oswald),sans-serif", letterSpacing: "0.1em", fontSize: 18 }}
                />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={uiLabel}>パスワード</label>
                <input
                  type="password"
                  value={pw}
                  onChange={e => setPw(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={uiField}
                />
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={uiLabel}>氏名（全角カタカナ）</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="ヤマダ　タロウ"
                  autoComplete="name"
                  autoFocus
                  style={{
                    ...uiField,
                    borderColor: nameTouched ? (nameOk ? "#337451" : "#853d4c") : "transparent",
                  }}
                />
                <div style={{ marginTop: 7 }}>
                  <Rule ok={nameOk}>カタカナのみ（漢字・ひらがな・英数字は使えません）</Rule>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={uiLabel}>パスワード</label>
                <input
                  type="password"
                  value={pw}
                  onChange={e => setPw(e.target.value)}
                  placeholder="英字と数字を含む8文字以上"
                  autoComplete="new-password"
                  style={uiField}
                />
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 8 }}>
                  <Rule ok={pc.len}>8文字以上</Rule>
                  <Rule ok={pc.alpha}>英字を含む</Rule>
                  <Rule ok={pc.num}>数字を含む</Rule>
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={uiLabel}>パスワード（確認）</label>
                <input
                  type="password"
                  value={pw2}
                  onChange={e => setPw2(e.target.value)}
                  placeholder="もう一度入力"
                  autoComplete="new-password"
                  style={{
                    ...uiField,
                    borderColor: pw2 ? (pw === pw2 ? "#337451" : "#853d4c") : "transparent",
                  }}
                />
              </div>

              <div style={{
                marginBottom: 18, padding: "12px 14px", background: UI.goldDim,
                border: `1px solid #4c4127`, borderRadius: 12,
                fontSize: 11.5, lineHeight: 1.75, color: "rgba(235,235,245,0.75)",
              }}>
                登録できるのは<strong style={{ color: "#fff" }}>チーム名簿に登録済みのメンバー</strong>のみです。登録が完了すると<strong style={{ color: UI.gold }}>ユーザーID</strong>が発行されます。
              </div>
            </>
          )}

          {error && (
            <div style={{
              marginBottom: 16, padding: "12px 14px", background: "#220c19",
              border: "1px solid #50091c", borderRadius: 12,
              color: UI.danger, fontSize: 12.5, lineHeight: 1.7,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || (!isLogin && !canRegister)}
            style={{
              ...uiPrimary,
              background: busy ? "#38383A" : UI.gold,
              opacity: (!isLogin && !canRegister) ? 0.4 : 1,
              cursor: busy || (!isLogin && !canRegister) ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "処理中…" : isLogin ? "ログイン" : "登録する"}
          </button>

          {isLogin && (
            <div style={{ textAlign: "center", marginTop: 14 }}>
              <button
                type="button"
                onClick={() => go("forgot")}
                style={{ background: "none", border: "none", color: UI.sub, fontSize: 12.5, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}
              >
                ユーザーID・パスワードを忘れた場合
              </button>
            </div>
          )}
        </form>

        {/* ホーム画面に追加 */}
        <details style={{ marginTop: 24, background: "#1C1C1E", border: `1px solid ${UI.line}`, borderRadius: 12, padding: "13px 16px" }}>
          <summary style={{ fontSize: 13, color: UI.sub, cursor: "pointer", listStyle: "none", fontWeight: 600 }}>
            📱 ホーム画面に追加すると便利です
          </summary>
          <div style={{ marginTop: 12, fontSize: 12, color: UI.faint, lineHeight: 1.85 }}>
            <div style={{ color: UI.sub, fontWeight: 600, marginBottom: 3 }}>iPhone（Safari）</div>
            共有ボタン → 「ホーム画面に追加」 → 「追加」
            <div style={{ color: UI.sub, fontWeight: 600, margin: "10px 0 3px" }}>Android（Chrome）</div>
            右上「⋮」→ 「ホーム画面に追加」 → 「追加」
          </div>
        </details>

        <div style={{ textAlign: "center", marginTop: 18 }}>
          <Link href="/" style={{ fontSize: 12, color: UI.faint, textDecoration: "none" }}>
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
type Tab = "news" | "stats" | "schedule" | "mypage";
type StatKind = "batting" | "pitching" | "catching" | "fielding";
type Profile = { name: string; linked: boolean; memberId: string; memberName: string; nickname: string };
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
  const [statKind, setStatKind] = useState<StatKind>("batting");
  const [scope, setScope] = useState<string>(TOTAL_SCOPE); // TOTAL_SCOPE or gameKey

  // 全シートを1回のリクエストでまとめて取得（読み込み高速化）。
  // 認証は Cookie（同一オリジンの fetch で自動送信）。パスワードは送らない。
  const fetchSheets = useCallback(async (sheets: string[]): Promise<Record<string, ListRow[]>> => {
    const res = await fetch("/api/member/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sheets }),
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok || !data.sheets) return {};
    return data.sheets as Record<string, ListRow[]>;
  }, []);

  // 取得済みデータを画面に反映する（キャッシュからの復元にも使う）
  const applySheets = useCallback((map: Record<string, ListRow[]>) => {
    {
      const rowsOf = (name: string): ListRow[] => map[name] ?? [];

      setMembers(rowsOf("members").map(r => ({
        id: r.data[0] ?? "",
        name: r.data[1] ?? "",
        nickname: r.data[2] ?? "",
        jerseyNumber: r.data[3] ?? "",
        position: r.data[4] ?? "",
        active: (r.data[6] ?? "TRUE").toString().toUpperCase() !== "FALSE",
      })));
      setBatting(rowsOf("batting").map(r => ({
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
      })));
      setPitching(rowsOf("pitching").map(r => ({
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
      })));
      setCatching(rowsOf("catching").map(r => ({
        date: normalizeDate(r.data[0] ?? ""),
        memberId: r.data[1] ?? "",
        opponent: r.data[3] ?? "",
        sba: num(r.data[4]),
        cs: num(r.data[5]),
      })));
      setFielding(rowsOf("fielding").map(r => ({
        date: normalizeDate(r.data[0] ?? ""),
        memberId: r.data[1] ?? "",
        opponent: r.data[3] ?? "",
        po: num(r.data[4]),
        a: num(r.data[5]),
        e: num(r.data[6]),
      })));
      setPractices(rowsOf("practices").map(r => ({
        date: normalizeDate(r.data[0] ?? ""),
        type: r.data[1] ?? "",
        place: r.data[2] ?? "",
        status: r.data[3] ?? "",
        time: r.data[4] ?? "",
        note: r.data[5] ?? "",
      })));
      setProbables(rowsOf("probables").map(r => ({
        date: normalizeDate(r.data[0] ?? ""),
        opponent: r.data[1] ?? "",
        memberId: r.data[2] ?? "",
        memberName: r.data[3] ?? "",
        note: r.data[4] ?? "",
      })));
      setAnnouncements(rowsOf("announcements").map(r => ({
        date: normalizeDate(r.data[0] ?? ""),
        category: r.data[1] ?? "お知らせ",
        title: r.data[2] ?? "",
        body: r.data[3] ?? "",
      })));
      setParticipants(rowsOf("participants").map(r => ({
        date: normalizeDate(r.data[0] ?? ""),
        memberId: r.data[1] ?? "",
        memberName: r.data[2] ?? "",
        note: r.data[3] ?? "",
      })));
      setAttendance(rowsOf("attendance").map(r => ({
        date: normalizeDate(r.data[0] ?? ""),
        memberId: r.data[1] ?? "",
        memberName: r.data[2] ?? "",
        status: r.data[3] ?? "",
        note: r.data[4] ?? "",
      })));
      const setts = rowsOf("settings").map(r => ({
        key: r.data[0] ?? "",
        value: r.data[1] ?? "",
        note: r.data[2] ?? "",
      }));
      const mt = setts.find(s => s.key === "maintenance");
      setMaintenance({ on: mt?.value === "on", message: mt?.note ?? "" });
    }
  }, []);

  const loadAll = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    try {
      const map = await fetchSheets([
        "members", "batting", "pitching", "catching", "fielding",
        "practices", "probables", "announcements", "participants", "settings", "attendance",
      ]);
      // 取得できた時だけ反映（失敗時はキャッシュ表示を保つ）
      if (Object.keys(map).length > 0) {
        applySheets(map);
        writeCache("stats_sheets", map);
        setUpdatedAt(new Date());
      }
    } finally {
      setLoading(false);
    }
  }, [fetchSheets, applySheets]);

  // 初回：キャッシュがあれば即描画してから、裏で最新を取り直す
  useEffect(() => {
    const cached = readCache<Record<string, ListRow[]>>("stats_sheets");
    if (cached) {
      applySheets(cached);
      setLoading(false);
      loadAll(true);
    } else {
      loadAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  // マイページ情報（ログイン本人）。連携済みなら自分の成績を自動で表示する。
  const [profile, setProfile] = useState<Profile | null>(null);
  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/member/profile", { cache: "no-store" });
      const d = await res.json().catch(() => null);
      if (res.ok && d?.ok) {
        setProfile({ name: d.name ?? "", linked: !!d.linked, memberId: d.memberId ?? "", memberName: d.memberName ?? "", nickname: d.nickname ?? "" });
        if (d.linked && d.memberId) {
          setMe(d.memberId);
          try { window.localStorage.setItem("skr_me", d.memberId); } catch {}
        }
      }
    } catch { /* 未ログイン等は無視 */ }
  }, []);
  useEffect(() => { loadProfile(); }, [loadProfile]);
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
      fontFamily: IOS_FONT,
      background: "#000000",
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
          background: #38383A; margin-top: 4px; overflow: hidden;
        }
        .stx-bar > span {
          display: block; height: 100%; transform-origin: left center;
          animation: stxGrow 0.9s cubic-bezier(0.16,1,0.3,1) both;
        }

        @keyframes stxGold {
          0%, 100% { box-shadow: 0 0 0 0 #6f5b21; }
          60%      { box-shadow: 0 0 0 7px #000000; }
        }
        .stx-rank-1 { animation: stxGold 2.4s ease-out infinite; }

        .stx-chip { border-radius: 10px; transition: background 0.2s, color 0.2s, border-color 0.2s, transform 0.2s, box-shadow 0.2s; }
        .stx-chip:hover { transform: translateY(-1px); box-shadow: 0 4px 14px #070a11; }

        .stx-card { border-radius: 12px; transition: transform 0.25s cubic-bezier(0.16,1,0.3,1), border-color 0.25s, box-shadow 0.25s; }
        .stx-card:hover { transform: translateY(-3px); border-color: #655320 !important; box-shadow: 0 14px 40px #06080d, 0 0 0 1px #28251b; }

        @keyframes stxSpin { to { transform: rotate(360deg); } }
        .stx-spin { animation: stxSpin 0.9s linear infinite; }

        @keyframes stxDetailIn { from { opacity: 0; transform: translateY(16px) scale(0.98); } }
        .stx-detail { animation: stxDetailIn 0.42s cubic-bezier(0.16,1,0.3,1) both; }
        .stx-tap { transition: background 0.2s, transform 0.2s cubic-bezier(0.16,1,0.3,1); cursor: pointer; }
        .stx-tap:hover { background: #38383A; transform: translateX(4px); }
        .stx-tap:active { transform: scale(0.99); }

        /* ボタン/チップの光沢スイープ */
        .stx-sheen { position: relative; overflow: hidden; }
        .stx-sheen::before {
          content: ""; position: absolute; top: 0; left: 0; width: 60%; height: 100%;
          background: linear-gradient(105deg, transparent, #38383A, transparent);
          transform: translateX(-160%); transition: transform 0.6s ease;
        }
        .stx-sheen:hover::before { transform: translateX(230%); }

        @media (prefers-reduced-motion: reduce) {
          .stx-fx::before, .stx-fx::after, .stx-headline::after { animation: none; }
        }
      `}</style>

      {/* v1.2 背景FX（グリッド＋オーロラ＋スキャンライン） */}

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
            background: "radial-gradient(ellipse 80% 50% at 50% -10%, #2e0b1a, transparent), #000000",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}
        >
          <div className="stx-detail" style={{ width: "100%", maxWidth: 420, textAlign: "center", background: "#1C1C1E", border: "1px solid #5b4c1f", padding: "34px 26px", boxShadow: "0 24px 70px #04060a" }}>
            <div style={{ fontSize: 46, lineHeight: 1 }}>🛠</div>
            <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#E5B84B", letterSpacing: "0.32em", marginTop: 14 }}>UNDER MAINTENANCE</div>
            <h2 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: 22, fontWeight: 900, marginTop: 8 }}>ただいまメンテナンス中です</h2>
            <p style={{ fontSize: 13, color: "rgba(235,235,245,0.60)", lineHeight: 1.9, marginTop: 12, whiteSpace: "pre-line" }}>
              {maintenance.message || "成績アプリは一時的にご利用いただけません。\nしばらく経ってから開き直してください。"}
            </p>
            <button
              onClick={() => loadAll()}
              className="btn-sheen"
              style={{ marginTop: 22, padding: "12px 26px", background: "linear-gradient(135deg, #E5B84B, #f0c75e)", color: "#000000", border: "none", fontFamily: "var(--font-zen),sans-serif", fontSize: 13, fontWeight: 800, letterSpacing: "0.1em", cursor: "pointer" }}
            >
              🔄 再読み込み
            </button>
            <div style={{ fontSize: 10.5, color: "rgba(235,235,245,0.30)", marginTop: 14 }}>HAKATA SK ROOKIES</div>
          </div>
        </div>
      )}

      {/* ── ヘッダー ── */}
      <header className="stx-headline" style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "saturate(180%) blur(20px)", WebkitBackdropFilter: "saturate(180%) blur(20px)", borderBottom: "0.5px solid #38383A", position: "sticky", top: 0, zIndex: 20 }}>
        <div className="max-w-[1280px] mx-auto px-5 md:px-8 flex items-center" style={{ height: 60, gap: 14 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
            <Image src="/sk_logo_crop.png" alt="logo" width={42} height={35} className="object-contain" />
            <div style={{ lineHeight: 1.1 }}>
              <div style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 900, fontSize: 13.5, display: "flex", alignItems: "center", gap: 6 }}>
                メンバー成績アプリ
                <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 9, fontWeight: 700, color: "#000000", background: "linear-gradient(135deg, #f3d176, #E5B84B)", padding: "2px 7px", borderRadius: 999, letterSpacing: "0.05em", boxShadow: "0 0 12px #796322" }}>v{APP_VERSION}</span>
              </div>
              <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 8.5, color: "#E5B84B", letterSpacing: "0.3em", marginTop: 2 }}>HAKATA SK ROOKIES</div>
            </div>
          </Link>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            {updatedAt && !loading && (
              <span className="hidden sm:inline" style={{ fontSize: 9.5, color: "rgba(235,235,245,0.30)", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                更新 {String(updatedAt.getHours()).padStart(2, "0")}:{String(updatedAt.getMinutes()).padStart(2, "0")}
              </span>
            )}
            <button
              onClick={() => loadAll()}
              disabled={loading}
              aria-label="データを更新"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "7px 13px",
                background: "linear-gradient(135deg, #2e2a1b, #1a1a19)",
                border: "1px solid #655320",
                color: "#E5B84B",
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
              style={{ padding: "7px 13px", background: "transparent", border: "1px solid #38383A", color: "rgba(235,235,245,0.75)", fontSize: 11, cursor: "pointer", letterSpacing: "0.06em" }}
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

      {/* ── 画面タイトル（iOSのLarge Title）＋ 絞り込み ── */}
      <div className="max-w-[720px] mx-auto px-4" style={{ paddingTop: 6, position: "relative", zIndex: 1 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em", margin: "8px 0 16px", lineHeight: 1.15 }}>
          {tab === "news" ? "お知らせ" : tab === "stats" ? "成績" : tab === "schedule" ? "日程" : "マイページ"}
        </h1>

        {tab === "stats" && (
          <>
            <SegControl
              items={[["batting", "打撃"], ["pitching", "投手"], ["catching", "捕手"], ["fielding", "守備"]]}
              value={statKind}
              onChange={setStatKind}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 12, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
              <ScopeChip active={scope === TOTAL_SCOPE} onClick={() => setScope(TOTAL_SCOPE)} primary>通算</ScopeChip>
              {games.map(g => (
                <ScopeChip key={g.key} active={scope === g.key} onClick={() => setScope(g.key)}>
                  <span style={{ fontFamily: "var(--font-oswald),sans-serif", marginRight: 5 }}>{mdLabel(g.date)}</span>
                  {g.opponent || "試合"}
                </ScopeChip>
              ))}
              {games.length === 0 && !loading && (
                <span style={{ fontSize: 12, color: "rgba(235,235,245,0.30)", alignSelf: "center", whiteSpace: "nowrap" }}>
                  試合記録が増えると試合別も見られます
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── 本文 ── */}
      <main className="max-w-[720px] mx-auto px-4" style={{ paddingTop: 16, paddingBottom: 120, position: "relative" }}>
        {loading ? (
          <p style={{ textAlign: "center", color: "rgba(235,235,245,0.60)", padding: 48, fontSize: 14 }}>読み込み中…</p>
        ) : tab === "news" ? (
          <NewsView announcements={announcements} />
        ) : tab === "schedule" ? (
          <ScheduleView upcoming={upcoming} pastGames={pastGames} probableByDate={probableByDate} participantsByDate={participantsByDate} membersById={membersById} attendanceByDate={attendanceByDate} members={members} me={me} onPickMe={pickMe} onVote={vote} />
        ) : tab === "mypage" ? (
          <>
            <MyPageView profile={profile} onReload={loadProfile} />
            <div style={{ marginTop: 22 }}><FormCheckView /></div>
          </>
        ) : statKind === "batting" ? (
          <BattingStatsView key={`b-${scope}`} stats={battingStats} scopeLabel={scopeLabel} isGame={scope !== TOTAL_SCOPE} />
        ) : statKind === "pitching" ? (
          <PitchingStatsView key={`p-${scope}`} stats={pitchingStats} scopeLabel={scopeLabel} />
        ) : statKind === "catching" ? (
          <CatchingStatsView key={`c-${scope}`} stats={catchingStats} scopeLabel={scopeLabel} />
        ) : (
          <FieldingStatsView key={`f-${scope}`} stats={fieldingStats} scopeLabel={scopeLabel} />
        )}
      </main>

      {/* ── 下部タブバー（iOSのタブバー：半透明＋すりガラス） ── */}
      <nav style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 30,
        background: "rgba(0,0,0,0.80)",
        backdropFilter: "saturate(180%) blur(20px)", WebkitBackdropFilter: "saturate(180%) blur(20px)",
        borderTop: "0.5px solid #38383A",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        <div style={{ display: "flex", maxWidth: 560, margin: "0 auto" }}>
          {([
            ["news", "📣", "お知らせ", announcements.length],
            ["stats", "⚾", "成績", -1],
            ["schedule", "📅", "日程", scheduleCount],
            ["mypage", "👤", "マイページ", -1],
          ] as [Tab, string, string, number][]).map(([key, icon, label, badge]) => {
            const on = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  flex: 1, background: "transparent", border: "none", cursor: "pointer",
                  padding: "8px 0 7px", display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 3, position: "relative",
                  color: on ? "#E5B84B" : "rgba(235,235,245,0.45)",
                }}
              >
                <span style={{ fontSize: 22, lineHeight: 1, filter: on ? "none" : "grayscale(1)", opacity: on ? 1 : 0.75 }}>{icon}</span>
                <span style={{ fontSize: 10.5, fontWeight: on ? 600 : 500, letterSpacing: "0.01em" }}>{label}</span>
                {badge > 0 && (
                  <span style={{
                    position: "absolute", top: 4, left: "calc(50% + 8px)",
                    minWidth: 17, height: 17, padding: "0 4px", borderRadius: 999,
                    background: "#FF453A", color: "#fff", fontSize: 10.5, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--font-oswald),sans-serif",
                  }}>{badge > 99 ? "99+" : badge}</span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/* ── SKドッパミンAI（大規模アップデートのため一時停止中）──────── */
function FormCheckView() {
  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <div style={{ ...uiCard, textAlign: "center", padding: "44px 26px" }}>
        <div style={{ fontSize: 46, lineHeight: 1 }}>🚧</div>
        <div style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 900, fontSize: 19, marginTop: 14 }}>
          SKドッパミンAIは準備中です
        </div>
        <p style={{ fontSize: 13.5, color: UI.sub, lineHeight: 1.9, margin: "12px 0 0" }}>
          解析の精度を大きく上げるため、大規模なアップデートを進めています。
          <br />準備ができ次第、このタブから使えるようになります。
        </p>
        <div style={{ marginTop: 20, padding: "11px 14px", background: UI.goldDim, border: `1px solid #4c4127`, borderRadius: 12, fontSize: 12, color: UI.sub, lineHeight: 1.8 }}>
          再開したらアプリのお知らせでご案内します。
        </div>
      </div>
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
        <span style={{ fontSize: 11.5, color: "rgba(235,235,245,0.60)", lineHeight: 1.5 }}>
          この端末/ブラウザは通知に非対応です。iPhoneは<strong style={{ color: "#E5B84B" }}>ホーム画面に追加</strong>してから開くと通知が使えます。
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
        {msg && <div style={{ fontSize: 10.5, color: "rgba(235,235,245,0.60)", marginTop: 2 }}>{msg}</div>}
      </div>
      {state !== "on" && (
        <button
          onClick={enable}
          disabled={state === "working"}
          style={{
            flexShrink: 0,
            padding: "7px 14px",
            background: state === "working" ? "#555" : "linear-gradient(135deg, #E5B84B, #f0c75e)",
            color: "#000000", border: "none",
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
  background: "#1C1C1E",
  border: "1px solid #3d351d",
  padding: "10px 14px",
};

function ScopeChip({ children, active, onClick, primary }: { children: React.ReactNode; active: boolean; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="stx-chip"
      style={{
        flexShrink: 0,
        padding: "8px 15px",
        borderRadius: 999,
        background: active ? (primary ? "#d10024" : "#E5B84B") : "#38383A",
        color: active ? (primary ? "#fff" : "#000000") : "rgba(235,235,245,0.60)",
        border: `1px solid ${active ? "transparent" : "#38383A"}`,
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
  先発: { color: "#c08fe0", bg: "#201930" },
  成績: { color: "#67e088", bg: "#162927" },
  アップデート: { color: "#8fc4ff", bg: "#1b2636" },
  メンテナンス: { color: "#ffb84a", bg: "#2a241f" },
  お知らせ: { color: "#E5B84B", bg: "#24221a" },
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
function MyPageView({ profile, onReload }: { profile: Profile | null; onReload: () => void }) {
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (profile) { setName(profile.memberName || ""); setNickname(profile.nickname || ""); }
  }, [profile?.memberName, profile?.nickname]);

  async function save() {
    if (busy) return;
    const nm = name.trim();
    if (!nm) { setMsg({ ok: false, text: "名前を入力してください。" }); return; }
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/member/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nm, nickname: nickname.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d?.ok) { setMsg({ ok: true, text: "保存しました。" }); onReload(); }
      else setMsg({ ok: false, text: d?.error || "保存に失敗しました。" });
    } catch { setMsg({ ok: false, text: "ネットワークエラーが発生しました。" }); }
    finally { setBusy(false); }
  }

  const box: React.CSSProperties = {
    background: "#2C2C2E",
    border: "1px solid #38383A", borderRadius: 16, padding: 20,
  };
  const label: React.CSSProperties = { display: "block", fontSize: 11, color: "rgba(235,235,245,0.60)", letterSpacing: "0.05em", marginBottom: 6 };
  const input: React.CSSProperties = { width: "100%", padding: 13, background: "#2C2C2E", border: "1px solid #38383A", color: "#fff", fontSize: 15, borderRadius: 8 };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={box}>
        <div style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 900, fontSize: 18, marginBottom: 4 }}>👤 マイページ</div>
        <div style={{ fontSize: 12, color: "rgba(235,235,245,0.60)", marginBottom: 16 }}>
          ログイン名：<span style={{ color: "#fff", fontWeight: 700 }}>{profile ? (profile.name || "—") : "読み込み中…"}</span>
        </div>

        {!profile ? (
          <div style={{ textAlign: "center", padding: "20px 0", color: "rgba(235,235,245,0.60)", fontSize: 13 }}>読み込み中…</div>
        ) : profile.linked ? (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>表示名（成績・ランキングに出る名前）</label>
              <input value={name} onChange={e => setName(e.target.value)} maxLength={40} style={input} placeholder="山田 太郎" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>ニックネーム（任意）</label>
              <input value={nickname} onChange={e => setNickname(e.target.value)} maxLength={20} style={input} placeholder="たろー" />
            </div>
            {msg && (
              <div style={{ marginBottom: 12, fontSize: 12.5, color: msg.ok ? "#9fe6b0" : "#ff6982" }}>{msg.ok ? "✅ " : ""}{msg.text}</div>
            )}
            <button
              onClick={save}
              disabled={busy || name.trim() === ""}
              className="btn-sheen"
              style={{ width: "100%", padding: 14, background: busy ? "#666" : "linear-gradient(135deg, #E5B84B, #f0c75e)", color: "#000000", border: "none", borderRadius: 8, fontFamily: "var(--font-zen),sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: "0.08em", cursor: busy ? "not-allowed" : "pointer" }}
            >
              {busy ? "保存中…" : "名前を保存する"}
            </button>
          </>
        ) : (
          <div style={{ padding: "18px 14px", background: "#1a1a19", border: "1px solid #51441e", borderRadius: 10, fontSize: 13, lineHeight: 1.8, color: "rgba(235,235,245,0.75)" }}>
            まだ名簿と<strong style={{ color: "#f0c75e" }}>連携されていません</strong>。<br />
            管理者が連携すると、あなたの<strong style={{ color: "#fff" }}>成績が表示され、名前を編集</strong>できるようになります。管理者に連携を依頼してください。
          </div>
        )}
      </div>

      <div style={{ ...box, padding: "14px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span style={{ fontSize: 16 }}>🔒</span>
        <div style={{ fontSize: 11.5, color: "rgba(235,235,245,0.60)", lineHeight: 1.7 }}>
          パスワードはここでは変更できません（安全のため）。忘れた場合はチーム管理者にご連絡ください。
        </div>
      </div>
    </div>
  );
}

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
          <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#E5B84B", letterSpacing: "0.25em" }}>APP VERSION</span>
          <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 26, fontWeight: 700, color: "#fff", lineHeight: 1 }}>v{APP_VERSION}</span>
          <span style={{ fontSize: 11, color: "rgba(235,235,245,0.30)" }}>最新の状態です</span>
          <button
            onClick={() => setShowChangelog(v => !v)}
            className="stx-chip"
            style={{ marginLeft: "auto", padding: "6px 12px", background: "#1C1C1E", border: "1px solid #38383A", color: "#E5B84B", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
          >
            {showChangelog ? "更新内容を閉じる" : "更新内容を見る →"}
          </button>
        </div>
        {showChangelog && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
            {CHANGELOG.map(c => (
              <div key={c.version} style={{ borderLeft: "3px solid #E5B84B", paddingLeft: 14 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 17, fontWeight: 700, color: "#E5B84B" }}>v{c.version}</span>
                  <span style={{ fontSize: 11, color: "rgba(235,235,245,0.30)" }}>{fmtAnnDate(c.date)}</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: 4, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                  {c.items.map((it, i) => (
                    <li key={i} style={{ fontSize: 12.5, color: "rgba(235,235,245,0.75)", lineHeight: 1.6 }}>{it}</li>
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
                <li key={a.date + a.title + i} className="stx-row" style={{ padding: "14px 4px", borderTop: i === 0 ? "none" : "1px solid #38383A", animationDelay: `${100 + i * 50}ms` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 12, color: "rgba(235,235,245,0.60)" }}>{fmtAnnDate(a.date)}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: cs.color, background: cs.bg, padding: "2px 9px" }}>{a.category}</span>
                  </div>
                  <div style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 800, fontSize: 15, lineHeight: 1.4, marginBottom: a.body ? 4 : 0 }}>{a.title}</div>
                  {a.body && <div style={{ fontSize: 13, color: "rgba(235,235,245,0.60)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{a.body}</div>}
                </li>
              );
            })}
          </ul>
        )}
        {hasMore && (
          <div style={{ textAlign: "center", marginTop: 14 }}>
            <button
              onClick={() => setShowAll(v => !v)}
              style={{ padding: "10px 24px", background: "#1C1C1E", border: "1px solid #38383A", color: "#E5B84B", fontFamily: "var(--font-zen),sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", cursor: "pointer" }}
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
    1: { bg: "linear-gradient(135deg, #f0c75e, #E5B84B)", color: "#000000" },
    2: { bg: "linear-gradient(135deg, #d9dee6, #9aa4b2)", color: "#000000" },
    3: { bg: "linear-gradient(135deg, #d49a6a, #a06b3e)", color: "#000000" },
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
        border: s ? "none" : "1px solid #38383A",
        color: s ? s.color : "rgba(235,235,245,0.60)",
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
  background: "#1C1C1E",
  border: "1px solid #38383A",
  borderRadius: 16,
  padding: 18,
  marginBottom: 14,
};
const tableStyle: React.CSSProperties = {
  width: "100%",
  fontSize: 13.5,
  borderCollapse: "collapse",
};
const emptyMsg: React.CSSProperties = {
  color: "rgba(235,235,245,0.30)",
  fontSize: 13,
  textAlign: "center",
  padding: 36,
  lineHeight: 1.9,
};

function H({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
      <h3 style={{
        fontFamily: "var(--font-zen),sans-serif",
        fontWeight: 800,
        fontSize: 16,
        letterSpacing: "0.01em",
        color: "#fff",
      }}>
        {children}
      </h3>
      {sub && <span style={{ fontSize: 11, color: "rgba(235,235,245,0.30)", letterSpacing: "0.04em" }}>{sub}</span>}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{
      padding: "10px",
      textAlign: "left",
      color: "rgba(235,235,245,0.60)",
      fontWeight: 600,
      fontSize: 11,
      letterSpacing: "0.03em",
      borderBottom: "1px solid #38383A",
      whiteSpace: "nowrap",
    }}>{children}</th>
  );
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <td style={{
      padding: "12px 10px",
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
      fontSize: 16,
      color: hl ? "#E5B84B" : "#fff",
    }}>{children}</span>
  );
}

function SummaryCell({ label, value, fmt, accent }: { label: string; value: number; fmt: (n: number) => string; accent?: boolean }) {
  return (
    <div style={{ background: "#1C1C1E", borderRadius: 12, padding: "14px 14px" }}>
      <div style={{ fontSize: 11, color: "rgba(235,235,245,0.60)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 26, fontWeight: 700, color: accent ? "#E5B84B" : "#fff", lineHeight: 1 }}>
        <CountUp value={value} fmt={fmt} />
      </div>
    </div>
  );
}

/* ── 打撃ビュー ───────────────────────────────────────── */
/* ── iOS風の共通パーツ ─────────────────────────────────
 * iOSの「グループ化リスト」を再現する。
 *   - 角丸カードに行を積み、区切り線は左側をインセット
 *   - 数値は囲んだタイルで大きく見せる
 *   - 行をタップすると詳細が開く（iOSのディスクロージャ）
 */
function IosLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 13, color: "rgba(235,235,245,0.60)", fontWeight: 400,
      padding: "0 4px 7px", letterSpacing: "0.01em",
    }}>{children}</div>
  );
}

function IosGroup({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "#1C1C1E", borderRadius: 12, overflow: "hidden", marginBottom: 22, ...style }}>
      {children}
    </div>
  );
}

/** 囲み数値タイル。数字を大きく、ラベルを小さく。 */
function StatTile({ label, value, accent, tone }: { label: string; value: React.ReactNode; accent?: boolean; tone?: string }) {
  return (
    <div style={{ background: "#2C2C2E", borderRadius: 10, padding: "11px 8px", textAlign: "center", minWidth: 0 }}>
      <div style={{ fontSize: 11, color: "rgba(235,235,245,0.60)", marginBottom: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
      <div style={{
        fontFamily: "var(--font-oswald),sans-serif", fontSize: 21, fontWeight: 700, lineHeight: 1,
        color: tone ?? (accent ? "#E5B84B" : "#FFFFFF"),
      }}>{value}</div>
    </div>
  );
}

function TileGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(74px, 1fr))", gap: 8 }}>
      {children}
    </div>
  );
}

/** iOSのセグメンテッドコントロール */
function SegControl<T extends string>({ items, value, onChange }: {
  items: [T, string][]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: "flex", background: "#2C2C2E", borderRadius: 9, padding: 2, gap: 2 }}>
      {items.map(([k, label]) => {
        const on = k === value;
        return (
          <button
            key={k}
            onClick={() => onChange(k)}
            style={{
              flex: 1, padding: "7px 4px", borderRadius: 7, border: "none",
              background: on ? "#E5B84B" : "transparent",
              color: on ? "#10131C" : "#FFFFFF",
              fontSize: 13.5, fontWeight: on ? 700 : 500, cursor: "pointer",
              whiteSpace: "nowrap", transition: "background .15s, color .15s",
            }}
          >{label}</button>
        );
      })}
    </div>
  );
}

/** 順位の丸バッジ（1〜3位は色付き） */
function RankDot({ rank }: { rank: number }) {
  const c = rank === 1 ? "#E5B84B" : rank === 2 ? "#C7CCD4" : rank === 3 ? "#CD8B5C" : "#3A3A3C";
  const fg = rank <= 3 ? "#10131C" : "rgba(235,235,245,0.60)";
  return (
    <span style={{
      width: 24, height: 24, borderRadius: "50%", background: c, color: fg,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-oswald),sans-serif", fontSize: 13, fontWeight: 700, flexShrink: 0,
    }}>{rank}</span>
  );
}

/**
 * 選手1人ぶんの行。
 * 折りたたみ時は「順位・背番号・名前・主要数値」だけを大きく見せ、
 * タップで詳細（囲み数値タイル）を開く。
 */
function PlayerRow({
  rank, name, jersey, main, mainLabel, sub, first, open, onToggle, children,
}: {
  rank: number; name: string; jersey: string;
  main: string; mainLabel: string; sub: string;
  first: boolean; open: boolean; onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ borderTop: first ? "none" : "0.5px solid #38383A" }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 11,
          padding: "13px 14px", background: open ? "#2C2C2E" : "transparent",
          border: "none", cursor: "pointer", textAlign: "left", color: "#fff",
        }}
      >
        <RankDot rank={rank} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
            <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 13, color: "#E5B84B", flexShrink: 0 }}>
              #{jersey || "—"}
            </span>
            <span style={{ fontSize: 16, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {name}
            </span>
          </div>
          <div style={{ fontSize: 12.5, color: "rgba(235,235,245,0.60)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {sub}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 25, fontWeight: 700, lineHeight: 1, color: "#E5B84B" }}>
            {main}
          </div>
          <div style={{ fontSize: 10.5, color: "rgba(235,235,245,0.30)", marginTop: 3 }}>{mainLabel}</div>
        </div>
        <span style={{
          color: "rgba(235,235,245,0.30)", fontSize: 17, flexShrink: 0,
          transform: open ? "rotate(90deg)" : "none", transition: "transform .2s",
        }}>›</span>
      </button>
      {open && <div style={{ padding: "4px 14px 16px", background: "#2C2C2E" }}>{children}</div>}
    </div>
  );
}

/** 開いた行を1つだけに保つための小さなフック */
function useOpenRow() {
  const [openId, setOpenId] = useState<string | null>(null);
  return { openId, toggle: (id: string) => setOpenId(p => (p === id ? null : id)) };
}

/* ── 打撃 ─────────────────────────────────────────────── */
function BattingStatsView({ stats, scopeLabel, isGame }: { stats: BattingStat[]; scopeLabel: string; isGame: boolean }) {
  const active = stats.filter(s => s.ab > 0 || s.bb > 0 || s.hbp > 0);
  const ranked = [...active].sort((a, b) => b.avg - a.avg);
  const { openId, toggle } = useOpenRow();

  const teamAb = active.reduce((s, x) => s + x.ab, 0);
  const teamH = active.reduce((s, x) => s + x.h, 0);
  const teamHr = active.reduce((s, x) => s + x.hr, 0);
  const teamRbi = active.reduce((s, x) => s + x.rbi, 0);
  const teamSb = active.reduce((s, x) => s + x.sb, 0);
  const teamAvg = teamAb > 0 ? teamH / teamAb : 0;

  return (
    <div>
      <IosLabel>{scopeLabel}のチーム成績</IosLabel>
      <IosGroup style={{ padding: 14 }}>
        <TileGrid>
          <StatTile label="チーム打率" value={fmtAvg(teamAvg)} accent />
          <StatTile label="安打" value={teamH} />
          <StatTile label="本塁打" value={teamHr} />
          <StatTile label="打点" value={teamRbi} />
          <StatTile label="盗塁" value={teamSb} />
        </TileGrid>
      </IosGroup>

      <IosLabel>打率ランキング（タップで詳細）</IosLabel>
      {ranked.length === 0 ? (
        <IosGroup><p style={emptyMsg}>{isGame ? "この試合の打席記録はありません。" : "まだ打席記録がありません。"}</p></IosGroup>
      ) : (
        <IosGroup>
          {ranked.map((s, i) => (
            <PlayerRow
              key={s.m.id}
              rank={i + 1}
              name={s.m.name}
              jersey={s.m.jerseyNumber}
              main={fmtAvg(s.avg)}
              mainLabel="打率"
              sub={`${s.h}安打 / ${s.ab}打数 · OPS ${fmtAvg(s.ops)}`}
              first={i === 0}
              open={openId === s.m.id}
              onToggle={() => toggle(s.m.id)}
            >
              <TileGrid>
                <StatTile label="試合" value={s.games} />
                <StatTile label="打数" value={s.ab} />
                <StatTile label="安打" value={s.h} accent />
                <StatTile label="本塁打" value={s.hr} tone={s.hr > 0 ? "#FF453A" : undefined} />
                <StatTile label="打点" value={s.rbi} />
                <StatTile label="盗塁" value={s.sb} />
                <StatTile label="四球" value={s.bb} />
                <StatTile label="三振" value={s.so} />
                <StatTile label="出塁率" value={fmtAvg(s.obp)} />
                <StatTile label="長打率" value={fmtAvg(s.slg)} />
                <StatTile label="OPS" value={fmtAvg(s.ops)} accent />
                <StatTile label="wOBA" value={s.pa > 0 ? fmtAvg(s.woba) : "—"} />
                <StatTile label="wRC+" value={s.pa > 0 ? s.wrcPlus : "—"} tone={s.wrcPlus >= 100 ? "#30D158" : undefined} />
                <StatTile label="WAR" value={s.pa > 0 ? s.war.toFixed(1) : "—"} accent />
              </TileGrid>
            </PlayerRow>
          ))}
        </IosGroup>
      )}
      <p style={{ fontSize: 12, color: "rgba(235,235,245,0.30)", lineHeight: 1.7, padding: "0 4px", margin: "-12px 0 22px" }}>
        wOBA＝出塁の質を打率の物差しで表した総合指標。wRC+＝チーム平均を100とした得点創出力。WAR＝勝利への貢献度の目安。いずれもチーム内の相対評価で、打席数が少ないと大きく振れます。
      </p>
    </div>
  );
}

/* ── 投手 ─────────────────────────────────────────────── */
function PitchingStatsView({ stats, scopeLabel }: { stats: PitchingStat[]; scopeLabel: string }) {
  const active = stats.filter(s => s.ipOuts > 0);
  const ranked = [...active].sort((a, b) => a.era - b.era);
  const { openId, toggle } = useOpenRow();

  const teamOuts = active.reduce((s, x) => s + x.ipOuts, 0);
  const teamEr = active.reduce((s, x) => s + x.er, 0);
  const teamSo = active.reduce((s, x) => s + x.so, 0);
  const teamBb = active.reduce((s, x) => s + x.bb, 0);
  const teamEra = teamOuts > 0 ? (teamEr * 27) / teamOuts : 0;

  return (
    <div>
      <IosLabel>{scopeLabel}のチーム成績</IosLabel>
      <IosGroup style={{ padding: 14 }}>
        <TileGrid>
          <StatTile label="チーム防御率" value={fmtEra(teamEra)} accent />
          <StatTile label="投球回" value={fmtIp(teamOuts)} />
          <StatTile label="奪三振" value={teamSo} />
          <StatTile label="与四球" value={teamBb} />
        </TileGrid>
      </IosGroup>

      <IosLabel>防御率ランキング（タップで詳細）</IosLabel>
      {ranked.length === 0 ? (
        <IosGroup><p style={emptyMsg}>まだ投球記録がありません。</p></IosGroup>
      ) : (
        <IosGroup>
          {ranked.map((s, i) => (
            <PlayerRow
              key={s.m.id}
              rank={i + 1}
              name={s.m.name}
              jersey={s.m.jerseyNumber}
              main={fmtEra(s.era)}
              mainLabel="防御率"
              sub={`${fmtIp(s.ipOuts)}回 · ${s.so}奪三振 · WHIP ${s.whip.toFixed(2)}`}
              first={i === 0}
              open={openId === s.m.id}
              onToggle={() => toggle(s.m.id)}
            >
              <TileGrid>
                <StatTile label="登板" value={s.appearances} />
                <StatTile label="投球回" value={fmtIp(s.ipOuts)} accent />
                <StatTile label="被安打" value={s.hits} />
                <StatTile label="失点" value={s.runs} />
                <StatTile label="自責点" value={s.er} />
                <StatTile label="奪三振" value={s.so} accent />
                <StatTile label="与四球" value={s.bb} />
                <StatTile label="死球" value={s.hbp} />
                <StatTile label="K/9" value={s.k9.toFixed(1)} />
                <StatTile label="WHIP" value={s.whip.toFixed(2)} />
              </TileGrid>
            </PlayerRow>
          ))}
        </IosGroup>
      )}
    </div>
  );
}

/* ── 捕手 ─────────────────────────────────────────────── */
function CatchingStatsView({ stats, scopeLabel }: { stats: CatchingStat[]; scopeLabel: string }) {
  const active = stats.filter(s => s.sba > 0);
  const ranked = [...active].sort((a, b) => b.rate - a.rate);
  const { openId, toggle } = useOpenRow();

  const teamSba = active.reduce((s, x) => s + x.sba, 0);
  const teamCs = active.reduce((s, x) => s + x.cs, 0);
  const teamRate = teamSba > 0 ? teamCs / teamSba : 0;

  return (
    <div>
      <IosLabel>{scopeLabel}のチーム成績</IosLabel>
      <IosGroup style={{ padding: 14 }}>
        <TileGrid>
          <StatTile label="盗塁阻止率" value={fmtPct(teamRate)} accent />
          <StatTile label="盗塁企図" value={teamSba} />
          <StatTile label="盗塁刺" value={teamCs} />
        </TileGrid>
      </IosGroup>

      <IosLabel>阻止率ランキング（タップで詳細）</IosLabel>
      {ranked.length === 0 ? (
        <IosGroup><p style={emptyMsg}>まだ捕手記録がありません。</p></IosGroup>
      ) : (
        <IosGroup>
          {ranked.map((s, i) => (
            <PlayerRow
              key={s.m.id}
              rank={i + 1}
              name={s.m.name}
              jersey={s.m.jerseyNumber}
              main={fmtPct(s.rate)}
              mainLabel="阻止率"
              sub={`${s.cs}/${s.sba} 盗塁刺 · ${s.games}試合`}
              first={i === 0}
              open={openId === s.m.id}
              onToggle={() => toggle(s.m.id)}
            >
              <TileGrid>
                <StatTile label="試合" value={s.games} />
                <StatTile label="盗塁企図" value={s.sba} />
                <StatTile label="盗塁刺" value={s.cs} accent />
                <StatTile label="阻止率" value={fmtPct(s.rate)} accent />
              </TileGrid>
            </PlayerRow>
          ))}
        </IosGroup>
      )}
    </div>
  );
}

/* ── 守備 ─────────────────────────────────────────────── */
function FieldingStatsView({ stats, scopeLabel }: { stats: FieldingStat[]; scopeLabel: string }) {
  const active = stats.filter(s => s.chances > 0);
  const ranked = [...active].sort((a, b) => b.rate - a.rate);
  const { openId, toggle } = useOpenRow();

  const teamPo = active.reduce((s, x) => s + x.po, 0);
  const teamA = active.reduce((s, x) => s + x.a, 0);
  const teamE = active.reduce((s, x) => s + x.e, 0);
  const teamCh = active.reduce((s, x) => s + x.chances, 0);
  const teamRate = teamCh > 0 ? (teamPo + teamA) / teamCh : 0;

  return (
    <div>
      <IosLabel>{scopeLabel}のチーム成績</IosLabel>
      <IosGroup style={{ padding: 14 }}>
        <TileGrid>
          <StatTile label="チーム守備率" value={fmtAvg(teamRate)} accent />
          <StatTile label="刺殺" value={teamPo} />
          <StatTile label="捕殺" value={teamA} />
          <StatTile label="失策" value={teamE} tone={teamE > 0 ? "#FF453A" : undefined} />
        </TileGrid>
      </IosGroup>

      <IosLabel>守備率ランキング（タップで詳細）</IosLabel>
      {ranked.length === 0 ? (
        <IosGroup><p style={emptyMsg}>まだ守備記録がありません。</p></IosGroup>
      ) : (
        <IosGroup>
          {ranked.map((s, i) => (
            <PlayerRow
              key={s.m.id}
              rank={i + 1}
              name={s.m.name}
              jersey={s.m.jerseyNumber}
              main={fmtAvg(s.rate)}
              mainLabel="守備率"
              sub={`刺殺${s.po} · 捕殺${s.a} · 失策${s.e}`}
              first={i === 0}
              open={openId === s.m.id}
              onToggle={() => toggle(s.m.id)}
            >
              <TileGrid>
                <StatTile label="試合" value={s.games} />
                <StatTile label="刺殺" value={s.po} accent />
                <StatTile label="捕殺" value={s.a} accent />
                <StatTile label="失策" value={s.e} tone={s.e > 0 ? "#FF453A" : undefined} />
                <StatTile label="守備機会" value={s.chances} />
                <StatTile label="守備率" value={fmtAvg(s.rate)} accent />
              </TileGrid>
            </PlayerRow>
          ))}
        </IosGroup>
      )}
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
            const color = st.canceled ? "#38383A" : (PRACTICE_COLOR[next.type] ?? "#E5B84B");
            const prob = isGameType(next.type) ? probableByDate.get(next.date) : undefined;
            const cnt = countFor(next.date);
            return (
              <div
                className="stx-tap"
                onClick={() => setSelected(next)}
                role="button"
                tabIndex={0}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(next); } }}
                style={{ borderLeft: `4px solid ${color}`, padding: "18px 18px 16px", background: "linear-gradient(135deg, #161719, #120d18)", position: "relative", opacity: st.canceled ? 0.6 : 1 }}
              >
                <span className="stx-rank-1" style={{ position: "absolute", top: -1, right: 12, fontFamily: "var(--font-oswald),sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.3em", background: "#E5B84B", color: "#000000", padding: "3px 12px" }}>NEXT</span>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ textAlign: "center", flexShrink: 0 }}>
                    <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 32, fontWeight: 700, lineHeight: 1 }}>{mdLabel(next.date)}</div>
                    <div style={{ fontSize: 11, color: "#E5B84B", marginTop: 5, letterSpacing: "0.15em", fontWeight: 700 }}>{weekday(next.date)}曜日</div>
                  </div>
                  <div style={{ width: 1, alignSelf: "stretch", background: "#3A3A3C" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: color }} />
                      <span style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 900, fontSize: 16 }}>{practiceTypeLabel(next.type)}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", background: st.canceled ? "#38383A" : st.tentative ? "#28251b" : "#38383A", color: st.canceled ? "rgba(235,235,245,0.60)" : st.tentative ? "#E5B84B" : "rgba(235,235,245,0.60)", padding: "2px 8px" }}>{st.label}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "rgba(235,235,245,0.75)" }}>📍 {next.place}</div>
                    {next.time && <div style={{ fontSize: 12, color: "#E5B84B", marginTop: 3, fontFamily: "var(--font-oswald),sans-serif", letterSpacing: "0.08em" }}>🕐 {next.time}</div>}
                    {next.note && <div style={{ fontSize: 11.5, color: "rgba(235,235,245,0.60)", lineHeight: 1.6, marginTop: 5 }}>※ {next.note}</div>}
                  </div>
                </div>
                {/* 予告先発 */}
                {isGameType(next.type) && (
                  <div style={{ marginTop: 14, background: "#191628", border: "1px solid #442c57", padding: "10px 14px" }}>
                    <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 10, color: "#c08fe0", letterSpacing: "0.25em", marginBottom: 5 }}>PROBABLE PITCHER ／ 予告先発</div>
                    {prob && prob.memberName ? (
                      <div>
                        <span style={{ fontSize: 17, fontWeight: 900 }}>⚾ {prob.memberName}</span>
                        {prob.opponent && <span style={{ fontSize: 12, color: "rgba(235,235,245,0.60)", marginLeft: 10 }}>vs {prob.opponent}</span>}
                        {prob.note && <div style={{ fontSize: 11.5, color: "rgba(235,235,245,0.60)", marginTop: 4 }}>{prob.note}</div>}
                      </div>
                    ) : (
                      <span style={{ fontSize: 13, color: "rgba(235,235,245,0.30)" }}>未発表（決まり次第お知らせします）</span>
                    )}
                  </div>
                )}
                {/* 参加予定 → タップ誘導 */}
                <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid #38383A" }}>
                  <span style={{ fontSize: 12.5, color: cnt > 0 ? "#67e088" : "rgba(235,235,245,0.60)" }}>
                    👥 参加予定 <strong style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 15 }}>{cnt}</strong> 人
                  </span>
                  <span style={{ fontSize: 11.5, color: "#E5B84B", fontWeight: 700 }}>タップで参加メンバー →</span>
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
              const color = st.canceled ? "#38383A" : (PRACTICE_COLOR[p.type] ?? "#E5B84B");
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
                  style={{ display: "flex", gap: 14, padding: "12px 8px 12px 12px", borderTop: i === 0 ? "none" : "1px solid #38383A", borderLeft: `3px solid ${color}`, opacity: st.canceled ? 0.55 : 1, animationDelay: `${120 + i * 50}ms` }}
                >
                  <div style={{ minWidth: 50, textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 18, lineHeight: 1 }}>{mdLabel(p.date)}</div>
                    <div style={{ fontSize: 10, color: "rgba(235,235,245,0.60)", marginTop: 3 }}>{weekday(p.date)}曜日</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 700, fontSize: 13.5 }}>{practiceTypeLabel(p.type)}</span>
                      <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", background: st.tentative ? "#28251b" : "#38383A", color: st.tentative ? "#E5B84B" : "rgba(235,235,245,0.60)", padding: "2px 7px" }}>{st.label}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: "rgba(235,235,245,0.75)" }}>📍 {p.place}{p.time ? ` / ${p.time}` : ""}</div>
                    {prob && prob.memberName && (
                      <div style={{ fontSize: 11.5, color: "#c08fe0", marginTop: 3 }}>⚾ 予告先発: <strong style={{ color: "#fff" }}>{prob.memberName}</strong></div>
                    )}
                    {p.note && <div style={{ fontSize: 11, color: "rgba(235,235,245,0.30)", marginTop: 2 }}>※ {p.note}</div>}
                  </div>
                  <div style={{ alignSelf: "center", textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 11.5, color: cnt > 0 ? "#67e088" : "rgba(235,235,245,0.60)" }}>👥 {cnt}</div>
                    <div style={{ fontSize: 16, color: "rgba(235,235,245,0.30)", lineHeight: 1 }}>›</div>
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
                  style={{ display: "flex", gap: 12, padding: "10px 8px 10px 4px", borderTop: i === 0 ? "none" : "1px solid #38383A" }}
                >
                  <div style={{ minWidth: 50, textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 16, color: "rgba(235,235,245,0.75)", lineHeight: 1 }}>{mdLabel(p.date)}</div>
                    <div style={{ fontSize: 10, color: "rgba(235,235,245,0.30)", marginTop: 3 }}>{weekday(p.date)}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
                      <span style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 700, fontSize: 13 }}>{practiceTypeLabel(p.type)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(235,235,245,0.60)", marginTop: 2 }}>📍 {p.place}</div>
                  </div>
                  <div style={{ alignSelf: "center", textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 11.5, color: cnt > 0 ? "#67e088" : "rgba(235,235,245,0.60)" }}>👥 {cnt}</div>
                    <div style={{ fontSize: 16, color: "rgba(235,235,245,0.30)", lineHeight: 1 }}>›</div>
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
  const color = st.canceled ? "#38383A" : (PRACTICE_COLOR[practice.type] ?? "#E5B84B");
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
        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", marginBottom: 12, background: "#1C1C1E", border: "1px solid #38383A", color: "#fff", fontFamily: "var(--font-zen),sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
      >
        ← 日程一覧に戻る
      </button>

      {/* 練習ヘッダー */}
      <section style={{ ...cardStyle, padding: 0, overflow: "hidden", marginBottom: 14 }}>
        <div style={{ borderLeft: `4px solid ${color}`, padding: "16px 18px", background: "linear-gradient(135deg, #161719, #120d18)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ textAlign: "center", flexShrink: 0 }}>
              <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{mdLabel(practice.date)}</div>
              <div style={{ fontSize: 10.5, color: "#E5B84B", marginTop: 4, fontWeight: 700 }}>{weekday(practice.date)}曜日</div>
            </div>
            <div style={{ width: 1, alignSelf: "stretch", background: "#3A3A3C" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                <span style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 900, fontSize: 15 }}>{practiceTypeLabel(practice.type)}</span>
                <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", background: "#2C2C2E", color: "rgba(235,235,245,0.75)", padding: "2px 7px" }}>{st.label}</span>
              </div>
              <div style={{ fontSize: 12.5, color: "rgba(235,235,245,0.75)" }}>📍 {practice.place}{practice.time ? ` / ${practice.time}` : ""}</div>
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
          style={{ width: "100%", padding: "14px", marginBottom: 14, cursor: "pointer", fontFamily: "var(--font-zen),sans-serif", fontWeight: 800, fontSize: 15, color: "#000000", background: "linear-gradient(135deg,#E5B84B,#f0cf6a)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          📋 スコアをつける
          <span style={{ fontSize: 10.5, fontWeight: 700, opacity: 0.75 }}>（記録 → 管理者の承認で反映）</span>
        </button>
      )}

      {/* あなたの出欠（投票） */}
      <section style={{ ...cardStyle, marginBottom: 14, border: "1px solid #473c1d" }}>
        <H sub="YOUR RSVP">参加投票</H>
        {(!me || changeMe) ? (
          <div>
            <label style={{ display: "block", fontSize: 12, color: "rgba(235,235,245,0.60)", marginBottom: 6 }}>あなたの名前を選んでください</label>
            <select
              value={me}
              onChange={e => { onPickMe(e.target.value); setChangeMe(false); }}
              className="admin-dark"
              style={{ width: "100%", padding: 12, background: "#2C2C2E", border: "1px solid #38383A", color: "#fff", fontSize: 14 }}
            >
              <option value="">— 選んでください —</option>
              {members.filter(m => m.active).map(m => (
                <option key={m.id} value={m.id}>#{m.jerseyNumber || "—"} {m.name}</option>
              ))}
            </select>
            <p style={{ fontSize: 10.5, color: "rgba(235,235,245,0.30)", marginTop: 6 }}>※ この端末に記憶されます（次回から選択不要）。</p>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: "rgba(235,235,245,0.75)" }}>あなた：</span>
              <strong style={{ fontSize: 14 }}>#{meMember?.jerseyNumber || "—"} {meMember?.name || "（不明）"}</strong>
              <button onClick={() => setChangeMe(true)} style={{ marginLeft: "auto", fontSize: 11, color: "#E5B84B", background: "transparent", border: "1px solid #5b4c1f", padding: "3px 10px", cursor: "pointer" }}>変更</button>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => doVote("出席")}
                disabled={!!voting}
                style={{ flex: 1, padding: "14px", cursor: voting ? "wait" : "pointer", fontFamily: "var(--font-zen),sans-serif", fontWeight: 800, fontSize: 15, color: myVote === "出席" ? "#000000" : "#67e088", background: myVote === "出席" ? "linear-gradient(135deg,#67e088,#9ff0b3)" : "#152725", border: myVote === "出席" ? "none" : "1px solid #2f6245" }}
              >
                {voting === "出席" ? "送信中…" : "⭕ 参加する"}
              </button>
              <button
                onClick={() => doVote("欠席")}
                disabled={!!voting}
                style={{ flex: 1, padding: "14px", cursor: voting ? "wait" : "pointer", fontFamily: "var(--font-zen),sans-serif", fontWeight: 800, fontSize: 15, color: myVote === "欠席" ? "#fff" : "#ff6982", background: myVote === "欠席" ? "linear-gradient(135deg,#d10024,#ff4d6a)" : "#1e0d19", border: myVote === "欠席" ? "none" : "1px solid #5a081d" }}
              >
                {voting === "欠席" ? "送信中…" : "❌ 不参加"}
              </button>
            </div>
            {myVote && <p style={{ fontSize: 11.5, color: "rgba(235,235,245,0.60)", marginTop: 8, textAlign: "center" }}>現在の回答：<strong style={{ color: myVote === "出席" ? "#67e088" : "#ff6982" }}>{myVote === "出席" ? "参加" : "不参加"}</strong>（押し直しで変更できます）</p>}
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
                  <li key={a.memberId + i} className="stx-row" style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 4px", borderTop: i === 0 ? "none" : "1px solid #38383A", animationDelay: `${i * 35}ms` }}>
                    <span style={{ flexShrink: 0, width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: "50%", background: "#152725", border: "1px solid #2b573f", fontFamily: "var(--font-oswald),sans-serif", fontSize: 13, fontWeight: 700, color: "#67e088" }}>{m?.jerseyNumber || "—"}</span>
                    <span style={{ fontWeight: 700, fontSize: 13.5 }}>{m?.name || a.memberName}{m?.nickname && <span style={{ marginLeft: 6, color: "rgba(235,235,245,0.30)", fontSize: 11 }}>({m.nickname})</span>}</span>
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
                      <li key={a.memberId + i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 4px", borderTop: i === 0 ? "none" : "1px solid #38383A", opacity: 0.7 }}>
                        <span style={{ flexShrink: 0, width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: "50%", background: "#1C1C1E", fontFamily: "var(--font-oswald),sans-serif", fontSize: 13, color: "rgba(235,235,245,0.60)" }}>{m?.jerseyNumber || "—"}</span>
                        <span style={{ fontWeight: 600, fontSize: 13, color: "rgba(235,235,245,0.75)" }}>{m?.name || a.memberName}</span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </>
        )}
        {participants.length > 0 && (
          <p style={{ fontSize: 10.5, color: "rgba(235,235,245,0.30)", marginTop: 12, paddingTop: 10, borderTop: "1px solid #38383A" }}>
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
  { key: "hr", label: "本塁打", deltas: { atBats: 1, hits: 1, hr: 1 }, tone: "#E5B84B" },
  { key: "bb", label: "四球", deltas: { bb: 1 }, tone: "#7fb3ff" },
  { key: "hbp", label: "死球", deltas: { hbp: 1 }, tone: "#7fb3ff" },
  { key: "so", label: "三振", deltas: { atBats: 1, so: 1 }, tone: "#ff6982" },
  { key: "out", label: "凡退", deltas: { atBats: 1 }, tone: "#38383A" },
  { key: "sh", label: "犠打", deltas: { sh: 1 }, tone: "#7fb3ff" },
];
const BAT_MODS: { key: string; label: string; deltas: Partial<BLine>; tone: string }[] = [
  { key: "rbi", label: "打点 +1", deltas: { rbi: 1 }, tone: "#E5B84B" },
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
      <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 12, color: "rgba(235,235,245,0.60)", width: 12 }}>{label}</span>
      <div style={{ display: "flex", gap: 5 }}>
        {Array.from({ length: max }).map((_, i) => (
          <span key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: i < n ? color : "#38383A", boxShadow: i < n ? `0 0 9px ${color}` : "none", transition: "background .15s, box-shadow .15s" }} />
        ))}
      </div>
    </div>
  );
}
function BaseDiamond({ bases }: { bases: Bases }) {
  const sq = (occ: boolean): React.CSSProperties => ({
    position: "absolute", width: 32, height: 32, transform: "translate(-50%,-50%) rotate(45deg)",
    background: occ ? "linear-gradient(135deg,#f0cf6a,#E5B84B)" : "#38383A",
    border: "1px solid " + (occ ? "#f0cf6a" : "#38383A"),
    boxShadow: occ ? "0 0 16px #8d7224" : "none", transition: "background .2s, box-shadow .2s",
  });
  const lbl = (occ: boolean): React.CSSProperties => ({ position: "absolute", transform: "translate(-50%,-50%)", fontSize: 9, fontWeight: 800, color: occ ? "#000000" : "rgba(235,235,245,0.60)", zIndex: 1, fontFamily: "var(--font-oswald),sans-serif" });
  return (
    <div style={{ position: "relative", width: 150, height: 118, margin: "12px auto 2px" }}>
      <div style={{ ...sq(!!bases.b2), left: "50%", top: "26%" }} />
      <div style={{ ...sq(!!bases.b3), left: "20%", top: "60%" }} />
      <div style={{ ...sq(!!bases.b1), left: "80%", top: "60%" }} />
      <div style={{ position: "absolute", left: "50%", top: "92%", transform: "translate(-50%,-50%)", width: 15, height: 15, background: "#3A4256", clipPath: "polygon(50% 0,100% 38%,82% 100%,18% 100%,0 38%)" }} />
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
        <p style={{ fontSize: 13, color: "rgba(235,235,245,0.60)", lineHeight: 1.7 }}>
          管理者が内容を確認して承認すると、成績に反映されます。<br />（承認まで成績ランキングには表示されません）
        </p>
        <button onClick={onClose} style={{ marginTop: 20, padding: "12px 28px", background: "linear-gradient(135deg,#E5B84B,#f0cf6a)", color: "#000000", border: "none", fontFamily: "var(--font-zen),sans-serif", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>日程に戻る</button>
      </div>
    );
  }

  const cur = batter ? (batLines[batter] ?? emptyB()) : null;
  const curP = pitcher ? (pitchLines[pitcher] ?? emptyP()) : null;
  const numInput: React.CSSProperties = { width: "100%", padding: "8px", background: "#2C2C2E", border: "1px solid #38383A", color: "#fff", fontSize: 16, textAlign: "center", fontFamily: "var(--font-oswald),sans-serif" };

  return (
    <div className="stx-detail">
      <button onClick={onClose} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", marginBottom: 12, background: "#1C1C1E", border: "1px solid #38383A", color: "#fff", fontFamily: "var(--font-zen),sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
        ← 日程に戻る
      </button>

      {/* ヘッダー：日付・対戦相手 */}
      <section style={{ ...cardStyle, marginBottom: 14 }}>
        <H sub="SCORER">スコア記録 — {mdLabel(date)}</H>
        <label style={{ display: "block", fontSize: 12, color: "rgba(235,235,245,0.60)", marginBottom: 6 }}>対戦相手</label>
        <input value={opponent} onChange={e => setOpponent(e.target.value)} placeholder="例）福岡ベアーズ" className="admin-dark"
          style={{ width: "100%", padding: 10, background: "#2C2C2E", border: "1px solid #38383A", color: "#fff", fontSize: 14 }} />
      </section>

      {/* ライブ記録 / かんたん集計 モード切替 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {([["live", "🎙 ライブ記録"], ["simple", "✍️ かんたん集計"]] as const).map(([k, lbl]) => (
          <button key={k} onClick={() => setMode(k)} className="stx-chip"
            style={{ flex: 1, padding: "11px", cursor: "pointer", fontFamily: "var(--font-zen),sans-serif", fontWeight: 800, fontSize: 13.5, color: mode === k ? "#000000" : "#fff", background: mode === k ? "linear-gradient(135deg,#E5B84B,#f0cf6a)" : "#38383A", border: "1px solid " + (mode === k ? "transparent" : "#38383A"), boxShadow: mode === k ? "0 4px 16px #5b4c1f" : "none" }}>
            {lbl}
          </button>
        ))}
      </div>

      {mode === "live" && (() => {
        const liveBtn = (onClick: () => void, label: string, tone: string, big = false): React.ReactNode => (
          <button onClick={onClick} key={label}
            style={{ padding: big ? "14px 4px" : "11px 4px", cursor: "pointer", fontFamily: "var(--font-zen),sans-serif", fontWeight: 800, fontSize: big ? 14 : 12.5, color: tone, background: "#1C1C1E", border: "1px solid " + tone + "55", borderRadius: 9 }}>
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
                  <div style={{ fontSize: 11, color: act ? "#E5B84B" : "rgba(235,235,245,0.60)", fontWeight: 700, letterSpacing: "0.1em" }}>{lab}{act ? " ●攻撃" : ""}</div>
                  <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 38, fontWeight: 700, lineHeight: 1, color: "#fff", textShadow: act ? "0 0 18px #6f5b21" : "none" }}>{sc}</div>
                </div>
              ))}
              <div style={{ textAlign: "center", flex: 1.1, borderLeft: "1px solid #38383A", borderRight: "1px solid #38383A" }}>
                <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 22, fontWeight: 700, color: "#E5B84B" }}>{live.inning}</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>{live.half === "top" ? "回 表" : "回 裏"}</div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
              <LiveDots label="O" n={live.outs} max={2} color="#ff6982" />
              <LiveDots label="B" n={live.balls} max={3} color="#67e088" />
              <LiveDots label="S" n={live.strikes} max={2} color="#E5B84B" />
            </div>
            <BaseDiamond bases={live.bases} />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={manualChange} className="stx-chip" style={{ flex: 1, padding: "10px", cursor: "pointer", fontWeight: 800, fontSize: 13, color: "#fff", background: "#2C2C2E", border: "1px solid #38383A", fontFamily: "var(--font-zen),sans-serif" }}>▶ 攻守交代</button>
              <button onClick={undoLive} disabled={!histLen} style={{ flex: 1, padding: "10px", cursor: histLen ? "pointer" : "default", fontWeight: 800, fontSize: 13, color: histLen ? "#E5B84B" : "rgba(235,235,245,0.60)", background: "transparent", border: "1px solid " + (histLen ? "#5b4c1f" : "#38383A"), borderRadius: 9, fontFamily: "var(--font-zen),sans-serif" }}>↩︎ 1つ戻す</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, justifyContent: "center", fontSize: 11.5, color: "rgba(235,235,245,0.60)" }}>
              <span>自チームの攻撃：</span>
              {([["top", "表"], ["bottom", "裏"]] as const).map(([h, l]) => (
                <button key={h} onClick={() => setWeBatHalf(h)} style={{ padding: "4px 12px", cursor: "pointer", borderRadius: 7, fontWeight: 800, fontSize: 12, color: weBatHalf === h ? "#000000" : "#fff", background: weBatHalf === h ? "#E5B84B" : "#38383A", border: "1px solid " + (weBatHalf === h ? "transparent" : "#38383A") }}>{l}</button>
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
                    <span style={{ fontSize: 13, fontWeight: 700 }}><span style={{ color: "#E5B84B" }}>{bn}</span>　{r.name}</span>
                    <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                      <button onClick={() => runnerOp(b, "adv")} style={{ padding: "6px 11px", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#67e088", background: "#1C1C1E", border: "1px solid #67e08855", borderRadius: 7 }}>{b === "b3" ? "生還" : "進塁"}</button>
                      {ourTurn && <button onClick={() => runnerOp(b, "steal")} style={{ padding: "6px 11px", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#E5B84B", background: "#1C1C1E", border: "1px solid #E5B84B55", borderRadius: 7 }}>盗塁</button>}
                      <button onClick={() => runnerOp(b, "out")} style={{ padding: "6px 11px", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#ff6982", background: "#1C1C1E", border: "1px solid #ff698255", borderRadius: 7 }}>アウト</button>
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
                      style={{ padding: "7px 11px", cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: on ? "#000000" : "#fff", background: on ? "#E5B84B" : "#38383A", border: "1px solid " + (on ? "transparent" : "#38383A") }}>
                      #{m.jerseyNumber || "—"} {m.name}
                    </button>
                  );
                })}
              </div>
              {batter ? (
                <>
                  <div style={{ fontSize: 12.5, color: "rgba(235,235,245,0.75)", marginBottom: 8, fontWeight: 700 }}>打席：{membersById.get(batter)?.name}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                    {liveBtn(() => ourHit(1, "単打"), "単打", "#67e088", true)}
                    {liveBtn(() => ourHit(2, "二塁打"), "二塁打", "#67e088", true)}
                    {liveBtn(() => ourHit(3, "三塁打"), "三塁打", "#67e088", true)}
                    {liveBtn(() => ourHit(4, "本塁打"), "本塁打", "#E5B84B", true)}
                    {liveBtn(() => ourWalk(false), "四球", "#7fb3ff", true)}
                    {liveBtn(() => ourWalk(true), "死球", "#7fb3ff", true)}
                    {liveBtn(() => ourOut("so"), "三振", "#ff6982", true)}
                    {liveBtn(() => ourOut("go"), "ゴロ", "#38383A", true)}
                    {liveBtn(() => ourOut("fo"), "フライ", "#38383A", true)}
                    {liveBtn(() => ourOut("sh"), "犠打", "#7fb3ff", true)}
                    {liveBtn(() => ourReachError(), "失策出塁", "#38383A", true)}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 8 }}>
                    {liveBtn(ourBall, "ボール", "#67e088")}
                    {liveBtn(ourStrike, "ストライク", "#E5B84B")}
                    {liveBtn(ourFoul, "ファウル", "#38383A")}
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
                      style={{ padding: "7px 11px", cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: on ? "#000000" : "#fff", background: on ? "#E5B84B" : "#38383A", border: "1px solid " + (on ? "transparent" : "#38383A") }}>
                      #{m.jerseyNumber || "—"} {m.name}
                    </button>
                  );
                })}
              </div>
              {pitcher ? (
                <>
                  <div style={{ fontSize: 12.5, color: "rgba(235,235,245,0.75)", marginBottom: 8, fontWeight: 700 }}>投手：{membersById.get(pitcher)?.name}（相手の打席）</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                    {liveBtn(() => oppStrikeout(), "奪三振", "#67e088", true)}
                    {liveBtn(() => oppOut("go"), "ゴロアウト", "#38383A", true)}
                    {liveBtn(() => oppOut("fo"), "フライアウト", "#38383A", true)}
                    {liveBtn(() => oppHit(1, "被安打"), "被安打", "#ff6982", true)}
                    {liveBtn(() => oppHit(2, "被二塁打"), "被二塁打", "#ff6982", true)}
                    {liveBtn(() => oppHit(4, "被本塁打"), "被本塁打", "#ff6982", true)}
                    {liveBtn(() => oppWalk(false), "与四球", "#7fb3ff", true)}
                    {liveBtn(() => oppWalk(true), "与死球", "#7fb3ff", true)}
                    {liveBtn(() => oppRun(), "失点 +1", "#ff6982", true)}
                    {liveBtn(() => oppError(), "失策で出塁", "#38383A", true)}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 8 }}>
                    {liveBtn(defBall, "ボール", "#67e088")}
                    {liveBtn(defStrike, "ストライク", "#E5B84B")}
                    {liveBtn(defFoul, "ファウル", "#38383A")}
                  </div>
                </>
              ) : <p style={emptyMsg}>投手を選ぶと結果ボタンが出ます。</p>}
            </section>
          )}

          {/* 実況ログ */}
          {feed.length > 0 && (
            <section style={{ ...cardStyle, marginBottom: 14 }}>
              <H sub="LOG">実況</H>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 12.5, color: "rgba(235,235,245,0.75)" }}>
                {feed.map((t, i) => (
                  <li key={i} style={{ padding: "5px 0", borderTop: i === 0 ? "none" : "1px solid #38383A", opacity: 1 - i * 0.08 }}>{t}</li>
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
            style={{ flex: 1, padding: "10px", cursor: "pointer", fontFamily: "var(--font-zen),sans-serif", fontWeight: 800, fontSize: 14, color: tab === k ? "#000000" : "#fff", background: tab === k ? "linear-gradient(135deg,#E5B84B,#f0cf6a)" : "#38383A", border: "1px solid " + (tab === k ? "transparent" : "#38383A") }}>
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
                    style={{ padding: "7px 11px", cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: on ? "#000000" : "#fff", background: on ? "#E5B84B" : has ? "#2e2a1b" : "#38383A", border: "1px solid " + (on ? "transparent" : has ? "#5b4c1f" : "#38383A") }}>
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
                <button onClick={undo} disabled={!events.length} style={{ fontSize: 11.5, color: events.length ? "#E5B84B" : "rgba(235,235,245,0.60)", background: "transparent", border: "1px solid " + (events.length ? "#5b4c1f" : "#38383A"), padding: "5px 11px", cursor: events.length ? "pointer" : "default" }}>↩︎ 1つ戻す</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {BAT_ACTIONS.map(a => (
                  <button key={a.key} onClick={() => applyBat(a.deltas)}
                    style={{ padding: "13px 4px", cursor: "pointer", fontFamily: "var(--font-zen),sans-serif", fontWeight: 800, fontSize: 14, color: a.tone, background: "#1C1C1E", border: "1px solid " + a.tone + "55" }}>
                    {a.label}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {BAT_MODS.map(a => (
                  <button key={a.key} onClick={() => applyBat(a.deltas)}
                    style={{ flex: 1, padding: "10px 4px", cursor: "pointer", fontFamily: "var(--font-zen),sans-serif", fontWeight: 700, fontSize: 12.5, color: a.tone, background: "#1C1C1E", border: "1px dashed " + a.tone + "55" }}>
                    {a.label}
                  </button>
                ))}
              </div>
              {cur && (
                <div style={{ marginTop: 12, fontSize: 12, color: "rgba(235,235,245,0.75)", textAlign: "center" }}>
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
                    style={{ padding: "7px 11px", cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: on ? "#000000" : "#fff", background: on ? "#E5B84B" : has ? "#2e2a1b" : "#38383A", border: "1px solid " + (on ? "transparent" : has ? "#5b4c1f" : "#38383A") }}>
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
                  <label style={{ display: "block", fontSize: 11, color: "rgba(235,235,245,0.60)", marginBottom: 4 }}>投球回</label>
                  <input type="number" inputMode="numeric" min={0} value={curP.inn || ""} onChange={e => setPitchField(pitcher, "inn", Number(e.target.value))} style={numInput} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, color: "rgba(235,235,245,0.60)", marginBottom: 4 }}>+アウト(0〜2)</label>
                  <input type="number" inputMode="numeric" min={0} max={2} value={curP.outs || ""} onChange={e => setPitchField(pitcher, "outs", Math.min(2, Number(e.target.value)))} style={numInput} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                {([["hits", "被安打"], ["runs", "失点"], ["er", "自責点"], ["so", "奪三振"], ["bb", "与四球"], ["hbp", "与死球"]] as const).map(([f, lbl]) => (
                  <div key={f}>
                    <label style={{ display: "block", fontSize: 11, color: "rgba(235,235,245,0.60)", marginBottom: 4 }}>{lbl}</label>
                    <input type="number" inputMode="numeric" min={0} value={curP[f] || ""} onChange={e => setPitchField(pitcher, f, Number(e.target.value))} style={numInput} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: "rgba(235,235,245,0.60)", textAlign: "center" }}>
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
        style={{ width: "100%", padding: "16px", cursor: submitting || totalRecords === 0 ? "default" : "pointer", fontFamily: "var(--font-zen),sans-serif", fontWeight: 900, fontSize: 16, color: totalRecords === 0 ? "rgba(235,235,245,0.60)" : "#000000", background: totalRecords === 0 ? "#38383A" : "linear-gradient(135deg,#E5B84B,#f0cf6a)", border: "none" }}>
        {submitting ? "送信中…" : totalRecords === 0 ? "記録を入力してください" : `📨 ${totalRecords}件を承認待ちに送信`}
      </button>
      <p style={{ fontSize: 10.5, color: "rgba(235,235,245,0.30)", textAlign: "center", marginTop: 8, lineHeight: 1.6 }}>
        送信後、管理者が承認すると成績に反映されます。<br />承認前は管理者が内容を編集できます。
      </p>
    </div>
  );
}
