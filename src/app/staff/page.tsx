"use client";

/**
 * 首脳陣専用アプリ（/staff）
 *
 * ── なぜ独立サイトにしなかったか ──
 * コーチは全員すでにメンバーアカウントを持っている。別ログインを作ると
 * 退団・改名のたびに2か所直すことになり、必ずどこかで食い違う。
 * なのでログインはメンバーアプリと共通にして、accounts の「役割」で
 * 入れるかどうかを決めている。選手・日程・成績のデータもそのまま使う。
 *
 * ── 権限 ──
 * ここでの出し分けは「使いやすさ」のためのもので、守りではない。
 * 実際の可否はサーバー（/api/staff/*）で必ず確かめている。
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  AREAS, LEVEL_LABEL, can, evalItemsFor,
  type Permission, type StaffLevel, type StaffUser,
} from "@/lib/staffRoles";

/* ── 共通の見た目 ──────────────────────────────────────── */
const IOS_FONT = `-apple-system, BlinkMacSystemFont, "Hiragino Sans", "Noto Sans JP", sans-serif`;
const GOLD = "#E5B84B";
const NAVY = "#0b1e3f";
const LINE = "#2C2C2E";

const card: React.CSSProperties = {
  background: "#1C1C1E", border: `1px solid ${LINE}`, borderRadius: 14, padding: 16,
};
const input: React.CSSProperties = {
  width: "100%", padding: "11px 13px", background: "#2C2C2E", border: `1px solid ${LINE}`,
  borderRadius: 9, color: "#fff", fontSize: 15, fontFamily: IOS_FONT, boxSizing: "border-box",
};
const label: React.CSSProperties = {
  display: "block", fontSize: 11.5, fontWeight: 700, color: "rgba(235,235,245,0.6)", marginBottom: 5,
};
const btn: React.CSSProperties = {
  padding: "11px 18px", borderRadius: 9, border: "none", cursor: "pointer",
  background: GOLD, color: NAVY, fontWeight: 800, fontSize: 14, fontFamily: IOS_FONT,
};
const btnSub: React.CSSProperties = {
  ...btn, background: "#2C2C2E", color: "rgba(235,235,245,0.85)", border: `1px solid ${LINE}`,
};

type Row = { rowIndex: number; data: string[] };

/** 首脳陣が使う表をまとめて取ってくる（画面の状態は変えない） */
async function fetchStaffSheets(): Promise<Record<string, Row[]>> {
  const res = await fetch("/api/staff/list", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sheets: [
        "members", "practices", "attendance", "batting", "pitching",
        "games", "evaluations",
        "staff_reports", "practice_menus", "order_plans",
        "staff_topics", "staff_comments", "staff_approvals", "staff_audit",
      ],
    }),
    cache: "no-store",
  });
  const d = await res.json().catch(() => null);
  if (!res.ok || !d?.ok) throw new Error(d?.error ?? "読み込みに失敗しました。");
  return d.sheets as Record<string, Row[]>;
}
type Sheets = Record<string, Row[]>;

const TABS = [
  { key: "home", label: "ホーム", icon: "🏠", perm: null },
  { key: "players", label: "選手", icon: "👥", perm: "player.view" },
  { key: "practice", label: "練習", icon: "📋", perm: "practice.create" },
  { key: "order", label: "オーダー", icon: "⚾", perm: "order.create" },
  { key: "report", label: "レポート", icon: "📝", perm: "report.create" },
  { key: "meeting", label: "会議", icon: "💬", perm: "meeting.join" },
  { key: "approval", label: "承認", icon: "✅", perm: "approval.request" },
  { key: "staff", label: "設定", icon: "⚙️", perm: "staff.manage" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default function StaffPage() {
  const [me, setMe] = useState<StaffUser | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "denied">("loading");
  const [sheets, setSheets] = useState<Sheets>({});
  const [tab, setTab] = useState<TabKey>("home");
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const show = useCallback((ok: boolean, text: string) => {
    setToast({ ok, text });
    setTimeout(() => setToast(null), 3200);
  }, []);

  /* ── 本人確認 ── */
  useEffect(() => {
    fetch("/api/staff/me", { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        if (d?.ok) { setMe(d.user); setState("ok"); }
        else setState("denied");
      })
      .catch(() => setState("denied"));
  }, []);

  /* ── データ取得 ──
     取ってくる処理と画面への反映を分けている。
     効果の中で直接 setState すると、無駄な再描画が連鎖するため。 */
  const load = useCallback(
    () => fetchStaffSheets().then(s => setSheets(s)).catch(() => {}),
    [],
  );

  useEffect(() => {
    if (state !== "ok") return;
    fetchStaffSheets().then(s => setSheets(s)).catch(() => {});
  }, [state]);

  /** 首脳陣向けの保存。成功したら読み直す */
  const save = useCallback(async (payload: Record<string, unknown>): Promise<boolean> => {
    setBusy(true);
    try {
      const res = await fetch("/api/staff/save", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok || !d?.ok) { show(false, d?.error ?? "保存に失敗しました。"); return false; }
      await load();
      return true;
    } catch {
      show(false, "通信に失敗しました。");
      return false;
    } finally { setBusy(false); }
  }, [load, show]);

  const allow = useCallback((p: Permission) => can(me, p), [me]);

  if (state === "loading") {
    return <Center>読み込み中…</Center>;
  }
  if (state === "denied" || !me) {
    return (
      <Center>
        <p style={{ fontSize: 17, fontWeight: 800, marginBottom: 10 }}>首脳陣専用ページです</p>
        <p style={{ fontSize: 13.5, color: "rgba(235,235,245,0.6)", lineHeight: 1.9, marginBottom: 22 }}>
          メンバーアプリでログインしたうえで、代表から首脳陣に任命されると使えます。
        </p>
        <Link href="/stats" style={{ ...btn, textDecoration: "none", display: "inline-block" }}>
          メンバーアプリへ
        </Link>
      </Center>
    );
  }

  const visibleTabs = TABS.filter(t => t.perm === null || allow(t.perm));

  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#fff", fontFamily: IOS_FONT }}>
      {/* ヘッダー */}
      <header style={{
        background: NAVY, borderBottom: `3px solid #d10024`, position: "sticky", top: 0, zIndex: 50,
        transform: "translateZ(0)", paddingTop: "env(safe-area-inset-top)",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 16px", height: 60, display: "flex", alignItems: "center", gap: 12 }}>
          <Image src="/sk_logo_crop.png" alt="" width={38} height={31} style={{ objectFit: "contain" }} />
          <div style={{ lineHeight: 1.2, minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 13.5 }}>首脳陣コンソール</div>
            <div style={{ fontSize: 10, color: GOLD, letterSpacing: "0.2em" }}>STAFF CONSOLE</div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right", minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{me.name}</div>
            <div style={{ fontSize: 10.5, color: GOLD }}>{me.title}</div>
          </div>
        </div>
      </header>

      {/* タブ */}
      <nav style={{
        background: "#0F1626", borderBottom: `1px solid ${LINE}`, position: "sticky",
        top: "calc(63px + env(safe-area-inset-top))", zIndex: 40, transform: "translateZ(0)",
      }}>
        <div className="staff-tabs" style={{ maxWidth: 1100, margin: "0 auto", padding: "10px 12px", display: "flex", gap: 6, overflowX: "auto" }}>
          {visibleTabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9,
              border: "none", cursor: "pointer", whiteSpace: "nowrap", fontSize: 13, fontWeight: 700,
              fontFamily: IOS_FONT,
              background: tab === t.key ? GOLD : "transparent",
              color: tab === t.key ? NAVY : "rgba(235,235,245,0.6)",
            }}>
              <span style={{ fontSize: 14 }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </nav>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "18px 16px 80px" }}>
        {tab === "home" && <HomeView me={me} sheets={sheets} allow={allow} onGo={setTab} />}
        {tab === "players" && <PlayersView sheets={sheets} />}
        {tab === "practice" && <PracticeView me={me} sheets={sheets} save={save} busy={busy} show={show} reload={load} allow={allow} />}
        {tab === "order" && <OrderView me={me} sheets={sheets} save={save} busy={busy} show={show} reload={load} />}
        {tab === "report" && <ReportView me={me} sheets={sheets} save={save} busy={busy} />}
        {tab === "meeting" && <MeetingView me={me} sheets={sheets} save={save} busy={busy} allow={allow} />}
        {tab === "approval" && <ApprovalView me={me} sheets={sheets} show={show} reload={load} allow={allow} />}
        {tab === "staff" && <StaffAdminView show={show} />}
      </main>

      {toast && (
        <div style={{
          position: "fixed", left: 16, right: 16, bottom: "calc(20px + env(safe-area-inset-bottom))",
          maxWidth: 560, margin: "0 auto", padding: "13px 18px", borderRadius: 11, zIndex: 100,
          background: toast.ok ? "#14532d" : "#7f1d1d", color: "#fff", fontSize: 13.5, fontWeight: 700,
          textAlign: "center",
        }}>
          {toast.text}
        </div>
      )}
    </div>
  );
}

/* ── 小さな部品 ────────────────────────────────────────── */
function Center({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: "100vh", background: "#000", color: "#fff", fontFamily: IOS_FONT,
      display: "grid", placeItems: "center", padding: 28, textAlign: "center",
    }}>
      <div style={{ maxWidth: 380 }}>{children}</div>
    </div>
  );
}

function H({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 9, marginBottom: 12, flexWrap: "wrap" }}>
      <h2 style={{ fontSize: 17, fontWeight: 800 }}>{children}</h2>
      {sub && <span style={{ fontSize: 10.5, color: "rgba(235,235,245,0.35)", letterSpacing: "0.22em" }}>{sub}</span>}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: "rgba(235,235,245,0.45)", fontSize: 13, textAlign: "center", padding: "28px 10px", lineHeight: 1.9 }}>
      {children}
    </p>
  );
}

function Chip({ text, color }: { text: string; color: string }) {
  return (
    <span style={{ fontSize: 10.5, fontWeight: 700, color: "#fff", background: color, padding: "3px 9px", borderRadius: 5, whiteSpace: "nowrap" }}>
      {text}
    </span>
  );
}

const STATUS_COLOR: Record<string, string> = {
  申請中: "#b45309", 承認: "#15803d", 差し戻し: "#b45309", 却下: "#b91c1c",
  下書き: "#44403c", 公開: "#15803d",
};

function rowsOf(sheets: Sheets, name: string): Row[] {
  return sheets[name] ?? [];
}

function todayIso(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

/* ── ① ダッシュボード ──────────────────────────────────── */
function HomeView({ me, sheets, allow, onGo }: {
  me: StaffUser; sheets: Sheets; allow: (p: Permission) => boolean; onGo: (t: TabKey) => void;
}) {
  const today = todayIso();
  const nextPractice = rowsOf(sheets, "practices")
    .map(r => r.data)
    .filter(d => (d[0] ?? "") >= today && (d[3] ?? "") !== "canceled")
    .sort((a, b) => (a[0] ?? "").localeCompare(b[0] ?? ""))[0];

  const pending = rowsOf(sheets, "staff_approvals").filter(r => (r.data[7] ?? "") === "申請中");
  const myReports = rowsOf(sheets, "staff_reports")
    .filter(r => (r.data[2] ?? "") === me.accountId).length;
  const recentReports = [...rowsOf(sheets, "staff_reports")]
    .sort((a, b) => (b.data[1] ?? "").localeCompare(a.data[1] ?? "")).slice(0, 4);
  const openTopics = rowsOf(sheets, "staff_topics").filter(r => (r.data[5] ?? "") !== "決定済み");
  const members = rowsOf(sheets, "members").filter(r => (r.data[6] ?? "TRUE").toUpperCase() !== "FALSE");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...card, borderColor: GOLD }}>
        <p style={{ fontSize: 12, color: "rgba(235,235,245,0.6)", marginBottom: 5 }}>
          {LEVEL_LABEL[me.level]}（{me.area}担当）としてログイン中
        </p>
        <p style={{ fontSize: 19, fontWeight: 900 }}>{me.name} さん</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        <Stat label="在籍選手" value={members.length} unit="名" />
        <Stat label="承認待ち" value={pending.length} unit="件" accent={pending.length > 0} />
        <Stat label="自分のレポート" value={myReports} unit="件" />
        <Stat label="進行中の議題" value={openTopics.length} unit="件" />
      </div>

      <section style={card}>
        <H sub="NEXT">次回の予定</H>
        {nextPractice ? (
          <div>
            <p style={{ fontSize: 16, fontWeight: 800, color: GOLD, marginBottom: 4 }}>
              {nextPractice[0]}　{nextPractice[4] || "時刻未定"}
            </p>
            <p style={{ fontSize: 13.5, color: "rgba(235,235,245,0.8)" }}>
              {nextPractice[1] || "練習"}／📍{nextPractice[2] || "場所未定"}
            </p>
            {nextPractice[5] && (
              <p style={{ fontSize: 12, color: "rgba(235,235,245,0.5)", marginTop: 6, lineHeight: 1.8 }}>※ {nextPractice[5]}</p>
            )}
          </div>
        ) : <Empty>今後の予定はまだ登録されていません。</Empty>}
      </section>

      {allow("approval.decide") && pending.length > 0 && (
        <section style={{ ...card, borderColor: "#b45309" }}>
          <H sub="WAITING">承認を待っています（{pending.length}）</H>
          {pending.slice(0, 5).map(r => (
            <div key={r.rowIndex} style={{ padding: "9px 0", borderTop: `1px solid ${LINE}` }}>
              <p style={{ fontSize: 13.5, fontWeight: 700 }}>{r.data[3]}</p>
              <p style={{ fontSize: 11.5, color: "rgba(235,235,245,0.5)" }}>{r.data[6]} · {r.data[11]}</p>
            </div>
          ))}
          <button onClick={() => onGo("approval")} style={{ ...btnSub, marginTop: 12, width: "100%" }}>
            承認画面へ →
          </button>
        </section>
      )}

      <section style={card}>
        <H sub="REPORTS">最近の指導記録</H>
        {recentReports.length === 0 ? <Empty>まだ指導記録がありません。</Empty> : recentReports.map(r => (
          <div key={r.rowIndex} style={{ padding: "10px 0", borderTop: `1px solid ${LINE}` }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 3 }}>
              <span style={{ fontSize: 12, color: GOLD, fontWeight: 700 }}>{r.data[1]}</span>
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>{r.data[5] || "チーム全体"}</span>
              <Chip text={r.data[6] || "全体"} color="#374151" />
            </div>
            <p style={{ fontSize: 12, color: "rgba(235,235,245,0.55)", lineHeight: 1.7 }}>
              {(r.data[7] ?? "").slice(0, 60)}{(r.data[7] ?? "").length > 60 ? "…" : ""}
            </p>
            <p style={{ fontSize: 11, color: "rgba(235,235,245,0.35)", marginTop: 3 }}>記録者 {r.data[3]}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

function Stat({ label: l, value, unit, accent }: { label: string; value: number; unit: string; accent?: boolean }) {
  return (
    <div style={{ ...card, padding: 14 }}>
      <p style={{ fontSize: 11, color: "rgba(235,235,245,0.5)", marginBottom: 6 }}>{l}</p>
      <p style={{ fontSize: 26, fontWeight: 800, color: accent ? "#ff9f43" : GOLD, lineHeight: 1 }}>
        {value}<span style={{ fontSize: 12, marginLeft: 3, color: "rgba(235,235,245,0.5)" }}>{unit}</span>
      </p>
    </div>
  );
}

/* ── ② 選手管理 ────────────────────────────────────────── */
function PlayersView({ sheets }: { sheets: Sheets }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const members = rowsOf(sheets, "members")
    .map(r => r.data)
    .filter(d => (d[1] ?? "").trim() && (d[6] ?? "TRUE").toUpperCase() !== "FALSE");

  const battingBy = useMemo(() => {
    const m = new Map<string, { ab: number; h: number; hr: number }>();
    for (const r of rowsOf(sheets, "batting")) {
      const id = r.data[1] ?? "";
      const cur = m.get(id) ?? { ab: 0, h: 0, hr: 0 };
      cur.ab += Number(r.data[4]) || 0;
      cur.h += Number(r.data[5]) || 0;
      cur.hr += Number(r.data[8]) || 0;
      m.set(id, cur);
    }
    return m;
  }, [sheets]);

  const reportsBy = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const r of rowsOf(sheets, "staff_reports")) {
      const id = r.data[4] ?? "";
      m.set(id, [...(m.get(id) ?? []), r]);
    }
    return m;
  }, [sheets]);

  return (
    <div>
      <H sub="PLAYERS">選手一覧（{members.length}名）</H>
      {members.length === 0 ? <Empty>名簿が読み込めませんでした。</Empty> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {members.map(d => {
            const id = d[0] ?? "";
            const open = openId === id;
            const b = battingBy.get(id);
            const avg = b && b.ab > 0 ? (b.h / b.ab).toFixed(3).replace(/^0/, "") : "—";
            const reports = reportsBy.get(id) ?? [];
            return (
              <div key={id} style={card}>
                <button onClick={() => setOpenId(open ? null : id)} style={{
                  width: "100%", background: "transparent", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 12, color: "#fff", padding: 0, textAlign: "left",
                }}>
                  <span style={{ fontSize: 19, fontWeight: 800, color: GOLD, width: 36 }}>{d[3] || "—"}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{d[1]}</span>
                    <span style={{ display: "block", fontSize: 11.5, color: "rgba(235,235,245,0.5)" }}>
                      {d[4] || "ポジション未定"} · 打率 {avg} · 指導記録 {reports.length}件
                    </span>
                  </span>
                  <span style={{ color: "rgba(235,235,245,0.35)", fontSize: 18 }}>{open ? "−" : "＋"}</span>
                </button>

                {open && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${LINE}` }}>
                    <p style={{ ...label, marginBottom: 8 }}>この守備位置で見る評価項目</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                      {evalItemsFor(d[4] ?? "").map(it => (
                        <span key={it.key} style={{
                          fontSize: 11.5, padding: "5px 10px", borderRadius: 7,
                          background: "#2C2C2E", color: "rgba(235,235,245,0.8)",
                        }}>{it.label}</span>
                      ))}
                    </div>
                    <p style={{ ...label, marginBottom: 8 }}>指導の履歴</p>
                    {reports.length === 0 ? (
                      <p style={{ fontSize: 12.5, color: "rgba(235,235,245,0.4)" }}>まだ記録がありません。</p>
                    ) : (
                      [...reports].sort((a, b2) => (b2.data[1] ?? "").localeCompare(a.data[1] ?? "")).map(r => (
                        <div key={r.rowIndex} style={{ padding: "9px 0", borderTop: `1px solid ${LINE}` }}>
                          <p style={{ fontSize: 11.5, color: GOLD, marginBottom: 3 }}>{r.data[1]} · {r.data[3]}</p>
                          <p style={{ fontSize: 13, lineHeight: 1.8 }}>{r.data[7]}</p>
                          {r.data[9] && <p style={{ fontSize: 12, color: "#ff9f43", marginTop: 4 }}>課題: {r.data[9]}</p>}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── ⑤ 指導レポート ────────────────────────────────────── */
function ReportView({ me, sheets, save, busy }: {
  me: StaffUser; sheets: Sheets;
  save: (p: Record<string, unknown>) => Promise<boolean>; busy: boolean;
}) {
  const members = rowsOf(sheets, "members")
    .map(r => r.data)
    .filter(d => (d[1] ?? "").trim() && (d[6] ?? "TRUE").toUpperCase() !== "FALSE");
  const [f, setF] = useState({
    date: todayIso(), memberId: "", content: "", good: "", improve: "", next: "", rating: "3",
  });

  const reports = [...rowsOf(sheets, "staff_reports")]
    .sort((a, b) => (b.data[1] ?? "").localeCompare(a.data[1] ?? ""));

  async function submit() {
    if (!f.content.trim()) return;
    const m = members.find(x => x[0] === f.memberId);
    const ok = await save({
      kind: "report", op: "append",
      row: [
        "", f.date, "", me.name,
        f.memberId, m?.[1] ?? "", me.area,
        f.content.trim(), f.good.trim(), f.improve.trim(), f.next.trim(),
        f.rating, "下書き", "",
      ],
    });
    if (ok) setF({ ...f, content: "", good: "", improve: "", next: "" });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <section style={card}>
        <H sub="NEW">指導レポートを書く</H>
        <div style={{ display: "grid", gap: 11 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 11 }}>
            <div>
              <label style={label}>指導日</label>
              <input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} style={input} />
            </div>
            <div>
              <label style={label}>対象選手</label>
              <select value={f.memberId} onChange={e => setF({ ...f, memberId: e.target.value })} style={{ ...input, cursor: "pointer" }}>
                <option value="">チーム全体</option>
                {members.map(m => <option key={m[0]} value={m[0]}>{m[1]}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>総合評価</label>
              <select value={f.rating} onChange={e => setF({ ...f, rating: e.target.value })} style={{ ...input, cursor: "pointer" }}>
                {["5", "4", "3", "2", "1"].map(v => <option key={v} value={v}>{"★".repeat(Number(v))}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={label}>指導内容（必須）</label>
            <textarea value={f.content} onChange={e => setF({ ...f, content: e.target.value })} rows={3}
              placeholder="何を見て、何を伝えたか" style={{ ...input, resize: "vertical" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 11 }}>
            <div>
              <label style={label}>良かった点</label>
              <textarea value={f.good} onChange={e => setF({ ...f, good: e.target.value })} rows={2} style={{ ...input, resize: "vertical" }} />
            </div>
            <div>
              <label style={label}>改善すべき点</label>
              <textarea value={f.improve} onChange={e => setF({ ...f, improve: e.target.value })} rows={2} style={{ ...input, resize: "vertical" }} />
            </div>
          </div>
          <div>
            <label style={label}>次回の課題</label>
            <input value={f.next} onChange={e => setF({ ...f, next: e.target.value })} style={input} />
          </div>
          <button onClick={submit} disabled={busy || !f.content.trim()} style={{ ...btn, opacity: busy || !f.content.trim() ? 0.5 : 1 }}>
            {busy ? "保存中…" : "レポートを保存する"}
          </button>
          <p style={{ fontSize: 11, color: "rgba(235,235,245,0.4)", lineHeight: 1.8 }}>
            保存したレポートは首脳陣で共有されます。選手本人に見せるかどうかは代表が決めます。
          </p>
        </div>
      </section>

      <section style={card}>
        <H sub="LOG">レポート一覧（{reports.length}）</H>
        {reports.length === 0 ? <Empty>まだレポートがありません。</Empty> : reports.map(r => (
          <div key={r.rowIndex} style={{ padding: "12px 0", borderTop: `1px solid ${LINE}` }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 5 }}>
              <span style={{ fontSize: 12, color: GOLD, fontWeight: 700 }}>{r.data[1]}</span>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{r.data[5] || "チーム全体"}</span>
              <Chip text={r.data[6] || "全体"} color="#374151" />
              <Chip text={r.data[12] || "下書き"} color={STATUS_COLOR[r.data[12] || "下書き"] ?? "#44403c"} />
              <span style={{ marginLeft: "auto", fontSize: 12, color: GOLD }}>{"★".repeat(Number(r.data[11]) || 0)}</span>
            </div>
            <p style={{ fontSize: 13.5, lineHeight: 1.85 }}>{r.data[7]}</p>
            {r.data[8] && <p style={{ fontSize: 12.5, color: "#67e088", marginTop: 5 }}>◎ {r.data[8]}</p>}
            {r.data[9] && <p style={{ fontSize: 12.5, color: "#ff9f43", marginTop: 3 }}>△ {r.data[9]}</p>}
            {r.data[10] && <p style={{ fontSize: 12.5, color: "rgba(235,235,245,0.6)", marginTop: 3 }}>次回: {r.data[10]}</p>}
            <p style={{ fontSize: 11, color: "rgba(235,235,245,0.35)", marginTop: 6 }}>記録者 {r.data[3]}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

/* ── ③ 練習メニュー ────────────────────────────────────── */
function PracticeView({ me, sheets, save, busy, show, reload, allow }: {
  me: StaffUser; sheets: Sheets;
  save: (p: Record<string, unknown>) => Promise<boolean>; busy: boolean;
  show: (ok: boolean, t: string) => void; reload: () => Promise<void>;
  allow: (p: Permission) => boolean;
}) {
  const [f, setF] = useState({
    date: todayIso(), place: "", time: "", title: "", items: "", targets: "", gear: "", purpose: "",
  });
  const menus = [...rowsOf(sheets, "practice_menus")]
    .sort((a, b) => (b.data[1] ?? "").localeCompare(a.data[1] ?? ""));

  async function submit() {
    if (!f.title.trim()) return;
    const ok = await save({
      kind: "practice", op: "append",
      row: [
        "", f.date, f.place.trim(), f.time.trim(), f.title.trim(),
        f.items.trim(), "", me.name, f.targets.trim(),
        f.gear.trim(), f.purpose.trim(), "下書き", "",
      ],
    });
    if (ok) setF({ ...f, title: "", items: "", targets: "", gear: "", purpose: "" });
  }

  async function requestPublish(r: Row) {
    const res = await fetch("/api/staff/approval", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        op: "request", kind: "practice", refId: r.data[0],
        title: `練習メニューの公開：${r.data[4]}`,
        summary: `${r.data[1]} ${r.data[2]}／${r.data[5]}`,
      }),
    });
    const d = await res.json().catch(() => null);
    if (res.ok && d?.ok) { show(true, "代表に公開を申請しました。"); await reload(); }
    else show(false, d?.error ?? "申請に失敗しました。");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <section style={card}>
        <H sub="NEW">練習メニューを作る</H>
        <div style={{ display: "grid", gap: 11 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 11 }}>
            <div><label style={label}>練習日</label>
              <input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} style={input} /></div>
            <div><label style={label}>場所</label>
              <input value={f.place} onChange={e => setF({ ...f, place: e.target.value })} placeholder="例: 山王公園野球場" style={input} /></div>
            <div><label style={label}>時間</label>
              <input value={f.time} onChange={e => setF({ ...f, time: e.target.value })} placeholder="例: 18:00〜20:00" style={input} /></div>
          </div>
          <div><label style={label}>メニュー名（必須）</label>
            <input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="例: 守備基礎＋打撃" style={input} /></div>
          <div><label style={label}>内容（1行ずつ。所要時間も書けます）</label>
            <textarea value={f.items} onChange={e => setF({ ...f, items: e.target.value })} rows={5}
              placeholder={"アップ 15分\nキャッチボール 15分\nノック 30分（担当：おおきさん）\nフリー打撃 40分"}
              style={{ ...input, resize: "vertical", lineHeight: 1.8 }} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 11 }}>
            <div><label style={label}>対象選手</label>
              <input value={f.targets} onChange={e => setF({ ...f, targets: e.target.value })} placeholder="例: 投手陣 / 全員" style={input} /></div>
            <div><label style={label}>必要な道具</label>
              <input value={f.gear} onChange={e => setF({ ...f, gear: e.target.value })} placeholder="例: ネット・ティー" style={input} /></div>
          </div>
          <div><label style={label}>この練習の目的</label>
            <input value={f.purpose} onChange={e => setF({ ...f, purpose: e.target.value })} style={input} /></div>
          <button onClick={submit} disabled={busy || !f.title.trim()} style={{ ...btn, opacity: busy || !f.title.trim() ? 0.5 : 1 }}>
            {busy ? "保存中…" : "下書きとして保存する"}
          </button>
          <p style={{ fontSize: 11, color: "rgba(235,235,245,0.4)", lineHeight: 1.8 }}>
            保存しただけではメンバーに見えません。代表が承認すると公開されます。
          </p>
        </div>
      </section>

      <section style={card}>
        <H sub="LIST">作成済み（{menus.length}）</H>
        {menus.length === 0 ? <Empty>まだ練習メニューがありません。</Empty> : menus.map(r => (
          <div key={r.rowIndex} style={{ padding: "12px 0", borderTop: `1px solid ${LINE}` }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 5 }}>
              <span style={{ fontSize: 12, color: GOLD, fontWeight: 700 }}>{r.data[1]}</span>
              <span style={{ fontSize: 14.5, fontWeight: 800 }}>{r.data[4]}</span>
              <Chip text={r.data[11] || "下書き"} color={STATUS_COLOR[r.data[11] || "下書き"] ?? "#44403c"} />
            </div>
            <p style={{ fontSize: 12.5, color: "rgba(235,235,245,0.6)", marginBottom: 6 }}>
              📍{r.data[2] || "場所未定"}　{r.data[3]}　{r.data[8] && `／対象 ${r.data[8]}`}
            </p>
            {r.data[5] && (
              <pre style={{
                fontSize: 12.5, lineHeight: 1.9, color: "rgba(235,235,245,0.85)", whiteSpace: "pre-wrap",
                background: "#111", padding: "10px 12px", borderRadius: 8, fontFamily: IOS_FONT, margin: 0,
              }}>{r.data[5]}</pre>
            )}
            {r.data[10] && <p style={{ fontSize: 12, color: "rgba(235,235,245,0.55)", marginTop: 6 }}>目的: {r.data[10]}</p>}
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "rgba(235,235,245,0.35)" }}>作成 {r.data[7]}</span>
              {(r.data[11] || "下書き") === "下書き" && (
                allow("practice.publish")
                  ? <span style={{ fontSize: 11, color: "rgba(235,235,245,0.5)", marginLeft: "auto" }}>承認画面から公開できます</span>
                  : <button onClick={() => requestPublish(r)} style={{ ...btnSub, marginLeft: "auto", padding: "7px 13px", fontSize: 12 }}>
                      代表に公開を申請する
                    </button>
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

/* ── ④ オーダー案 ──────────────────────────────────────── */
function OrderView({ me, sheets, save, busy, show, reload }: {
  me: StaffUser; sheets: Sheets;
  save: (p: Record<string, unknown>) => Promise<boolean>; busy: boolean;
  show: (ok: boolean, t: string) => void; reload: () => Promise<void>;
}) {
  const members = rowsOf(sheets, "members")
    .map(r => r.data)
    .filter(d => (d[1] ?? "").trim() && (d[6] ?? "TRUE").toUpperCase() !== "FALSE");
  const POSITIONS = ["投手", "捕手", "一塁手", "二塁手", "三塁手", "遊撃手", "左翼手", "中堅手", "右翼手", "指名打者"];

  const [date, setDate] = useState(todayIso());
  const [title, setTitle] = useState("");
  const [slots, setSlots] = useState(() => Array.from({ length: 9 }, () => ({ memberId: "", position: "" })));
  const [pitchers, setPitchers] = useState("");
  const [memo, setMemo] = useState("");

  const plans = [...rowsOf(sheets, "order_plans")]
    .sort((a, b) => (b.data[1] ?? "").localeCompare(a.data[1] ?? ""));

  async function submit() {
    if (!title.trim()) return;
    const lineup = slots
      .map((s, i) => ({ order: i + 1, ...s }))
      .filter(s => s.memberId)
      .map(s => ({ ...s, name: members.find(m => m[0] === s.memberId)?.[1] ?? "" }));
    const ok = await save({
      kind: "order", op: "append",
      row: [
        "", date, title.trim(), "", me.name,
        JSON.stringify(lineup), pitchers.trim(), memo.trim(), "",
        "案", "",
      ],
    });
    if (ok) { setTitle(""); setMemo(""); setPitchers(""); setSlots(Array.from({ length: 9 }, () => ({ memberId: "", position: "" }))); }
  }

  async function requestDecide(r: Row) {
    const res = await fetch("/api/staff/approval", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        op: "request", kind: "order", refId: r.data[0],
        title: `オーダーの確定：${r.data[2]}`,
        summary: `${r.data[1]}／作成 ${r.data[4]}`,
      }),
    });
    const d = await res.json().catch(() => null);
    if (res.ok && d?.ok) { show(true, "代表に確定を申請しました。"); await reload(); }
    else show(false, d?.error ?? "申請に失敗しました。");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <section style={card}>
        <H sub="NEW">オーダー案を作る</H>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 11, marginBottom: 13 }}>
          <div><label style={label}>試合日</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={input} /></div>
          <div><label style={label}>案の名前（必須）</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="例: ノジーズ戦 A案" style={input} /></div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 13 }}>
          {slots.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 7, alignItems: "center" }}>
              <span style={{ width: 26, fontSize: 15, fontWeight: 800, color: GOLD, flexShrink: 0 }}>{i + 1}</span>
              <select value={s.memberId} onChange={e => setSlots(p => p.map((x, j) => j === i ? { ...x, memberId: e.target.value } : x))}
                style={{ ...input, flex: 2, cursor: "pointer" }}>
                <option value="">— 選手 —</option>
                {members.map(m => <option key={m[0]} value={m[0]}>{m[1]}</option>)}
              </select>
              <select value={s.position} onChange={e => setSlots(p => p.map((x, j) => j === i ? { ...x, position: e.target.value } : x))}
                style={{ ...input, flex: 1, cursor: "pointer" }}>
                <option value="">— 守備 —</option>
                {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gap: 11 }}>
          <div><label style={label}>投手起用プラン・継投案</label>
            <textarea value={pitchers} onChange={e => setPitchers(e.target.value)} rows={2}
              placeholder="例: 先発◯◯（4回）→ 中継ぎ△△（2回）→ 抑え□□" style={{ ...input, resize: "vertical" }} /></div>
          <div><label style={label}>戦術メモ</label>
            <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={2} style={{ ...input, resize: "vertical" }} /></div>
          <button onClick={submit} disabled={busy || !title.trim()} style={{ ...btn, opacity: busy || !title.trim() ? 0.5 : 1 }}>
            {busy ? "保存中…" : "案として保存する"}
          </button>
        </div>
      </section>

      <section style={card}>
        <H sub="PLANS">オーダー案（{plans.length}）</H>
        {plans.length === 0 ? <Empty>まだオーダー案がありません。</Empty> : plans.map(r => {
          let lineup: { order: number; name: string; position: string }[] = [];
          try { lineup = JSON.parse(r.data[5] || "[]"); } catch { lineup = []; }
          return (
            <div key={r.rowIndex} style={{ padding: "12px 0", borderTop: `1px solid ${LINE}` }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 7 }}>
                <span style={{ fontSize: 12, color: GOLD, fontWeight: 700 }}>{r.data[1]}</span>
                <span style={{ fontSize: 14.5, fontWeight: 800 }}>{r.data[2]}</span>
                <Chip text={r.data[9] === "公開" ? "確定" : "案"} color={r.data[9] === "公開" ? "#15803d" : "#44403c"} />
              </div>
              {lineup.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 4, marginBottom: 7 }}>
                  {lineup.map(l => (
                    <div key={l.order} style={{ fontSize: 12.5, display: "flex", gap: 7 }}>
                      <span style={{ color: GOLD, fontWeight: 700, width: 16 }}>{l.order}</span>
                      <span style={{ fontWeight: 600 }}>{l.name}</span>
                      <span style={{ color: "rgba(235,235,245,0.45)" }}>{l.position}</span>
                    </div>
                  ))}
                </div>
              )}
              {r.data[6] && <p style={{ fontSize: 12.5, color: "rgba(235,235,245,0.7)" }}>投手: {r.data[6]}</p>}
              {r.data[7] && <p style={{ fontSize: 12.5, color: "rgba(235,235,245,0.55)", marginTop: 3 }}>{r.data[7]}</p>}
              <div style={{ display: "flex", gap: 8, marginTop: 9, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "rgba(235,235,245,0.35)" }}>作成 {r.data[4]}</span>
                {r.data[9] !== "公開" && (
                  <button onClick={() => requestDecide(r)} style={{ ...btnSub, marginLeft: "auto", padding: "7px 13px", fontSize: 12 }}>
                    代表に確定を申請する
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

/* ── ⑥ 首脳陣会議 ──────────────────────────────────────── */
function MeetingView({ me, sheets, save, busy, allow }: {
  me: StaffUser; sheets: Sheets;
  save: (p: Record<string, unknown>) => Promise<boolean>; busy: boolean;
  allow: (p: Permission) => boolean;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  const topics = [...rowsOf(sheets, "staff_topics")]
    .sort((a, b) => (b.data[7] ?? "").localeCompare(a.data[7] ?? ""));
  const commentsBy = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const c of rowsOf(sheets, "staff_comments")) {
      const id = c.data[1] ?? "";
      m.set(id, [...(m.get(id) ?? []), c]);
    }
    return m;
  }, [sheets]);

  async function addTopic() {
    if (!title.trim()) return;
    const ok = await save({
      kind: "topic", op: "append",
      row: ["", title.trim(), body.trim(), "", me.name, "議論中", "", ""],
    });
    if (ok) { setTitle(""); setBody(""); }
  }

  async function addComment(topicId: string, vote: string) {
    if (!comment.trim() && !vote) return;
    const ok = await save({
      kind: "comment", op: "append",
      row: ["", topicId, "", me.name, comment.trim(), vote, ""],
    });
    if (ok) setComment("");
  }

  async function decide(r: Row, text: string) {
    if (!text.trim()) return;
    const d = [...r.data];
    d[5] = "決定済み";
    d[6] = text.trim();
    await save({ kind: "topic", op: "update", rowIndex: r.rowIndex, row: d });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <section style={card}>
        <H sub="NEW">議題を立てる</H>
        <div style={{ display: "grid", gap: 11 }}>
          <div><label style={label}>議題（必須）</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="例: 練習頻度を増やすか" style={input} /></div>
          <div><label style={label}>内容</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={3} style={{ ...input, resize: "vertical" }} /></div>
          <button onClick={addTopic} disabled={busy || !title.trim()} style={{ ...btn, opacity: busy || !title.trim() ? 0.5 : 1 }}>
            議題を作成する
          </button>
          <p style={{ fontSize: 11, color: "rgba(235,235,245,0.4)", lineHeight: 1.8 }}>
            LINEと違って流れていきません。決まったことは記録として残ります。
          </p>
        </div>
      </section>

      {topics.length === 0 ? <Empty>まだ議題がありません。</Empty> : topics.map(r => {
        const id = r.data[0] ?? "";
        const cs = commentsBy.get(id) ?? [];
        const yes = cs.filter(c => c.data[5] === "賛成").length;
        const no = cs.filter(c => c.data[5] === "反対").length;
        const open = openId === id;
        const decided = (r.data[5] ?? "") === "決定済み";
        return (
          <section key={r.rowIndex} style={card}>
            <button onClick={() => setOpenId(open ? null : id)} style={{
              width: "100%", background: "transparent", border: "none", cursor: "pointer",
              color: "#fff", padding: 0, textAlign: "left",
            }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 5 }}>
                <Chip text={decided ? "決定済み" : "議論中"} color={decided ? "#15803d" : "#b45309"} />
                <span style={{ fontSize: 15, fontWeight: 800 }}>{r.data[1]}</span>
                <span style={{ marginLeft: "auto", fontSize: 12, color: "rgba(235,235,245,0.45)" }}>
                  💬{cs.length}　👍{yes}　👎{no}
                </span>
              </div>
              <p style={{ fontSize: 11.5, color: "rgba(235,235,245,0.4)" }}>提案 {r.data[4]} · {(r.data[7] ?? "").slice(0, 10)}</p>
            </button>

            {open && (
              <div style={{ marginTop: 13, paddingTop: 13, borderTop: `1px solid ${LINE}` }}>
                {r.data[2] && <p style={{ fontSize: 13.5, lineHeight: 1.9, marginBottom: 12 }}>{r.data[2]}</p>}
                {decided && (
                  <div style={{ background: "#14532d", borderRadius: 9, padding: "11px 13px", marginBottom: 12 }}>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginBottom: 3 }}>決定事項</p>
                    <p style={{ fontSize: 13.5, fontWeight: 700 }}>{r.data[6]}</p>
                  </div>
                )}
                {cs.map(c => (
                  <div key={c.rowIndex} style={{ padding: "9px 0", borderTop: `1px solid ${LINE}` }}>
                    <p style={{ fontSize: 11.5, color: GOLD, marginBottom: 2 }}>
                      {c.data[3]}{c.data[5] && `　${c.data[5] === "賛成" ? "👍 賛成" : "👎 反対"}`}
                    </p>
                    {c.data[4] && <p style={{ fontSize: 13, lineHeight: 1.8 }}>{c.data[4]}</p>}
                  </div>
                ))}
                {!decided && (
                  <div style={{ marginTop: 12, display: "grid", gap: 9 }}>
                    <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2}
                      placeholder="意見・改善案を書く" style={{ ...input, resize: "vertical" }} />
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button onClick={() => addComment(id, "")} disabled={busy} style={{ ...btnSub, flex: 1 }}>コメントする</button>
                      <button onClick={() => addComment(id, "賛成")} disabled={busy} style={{ ...btnSub, color: "#67e088" }}>👍 賛成</button>
                      <button onClick={() => addComment(id, "反対")} disabled={busy} style={{ ...btnSub, color: "#ff6982" }}>👎 反対</button>
                    </div>
                    {allow("meeting.decide") && (
                      <DecideBox onDecide={text => decide(r, text)} busy={busy} />
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function DecideBox({ onDecide, busy }: { onDecide: (t: string) => void; busy: boolean }) {
  const [text, setText] = useState("");
  return (
    <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 11, display: "grid", gap: 8 }}>
      <label style={label}>決定事項として記録する（副代表以上）</label>
      <input value={text} onChange={e => setText(e.target.value)} placeholder="決まったことを書く" style={input} />
      <button onClick={() => { onDecide(text); setText(""); }} disabled={busy || !text.trim()}
        style={{ ...btn, opacity: busy || !text.trim() ? 0.5 : 1 }}>
        この内容で決定する
      </button>
    </div>
  );
}

/* ── ⑦ 承認申請 ────────────────────────────────────────── */
function ApprovalView({ me, sheets, show, reload, allow }: {
  me: StaffUser; sheets: Sheets;
  show: (ok: boolean, t: string) => void; reload: () => Promise<void>;
  allow: (p: Permission) => boolean;
}) {
  const [busy, setBusy] = useState(false);
  const list = [...rowsOf(sheets, "staff_approvals")]
    .sort((a, b) => (b.data[11] ?? "").localeCompare(a.data[11] ?? ""));
  const canDecide = allow("approval.decide");

  async function decide(r: Row, status: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/staff/approval", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "decide", rowIndex: r.rowIndex, status }),
      });
      const d = await res.json().catch(() => null);
      if (res.ok && d?.ok) { show(true, `${status}しました。`); await reload(); }
      else show(false, d?.error ?? "処理に失敗しました。");
    } finally { setBusy(false); }
  }

  return (
    <div>
      <H sub="APPROVALS">承認申請（{list.length}）</H>
      <p style={{ fontSize: 12, color: "rgba(235,235,245,0.5)", lineHeight: 1.9, marginBottom: 14 }}>
        {canDecide
          ? "首脳陣からの申請です。承認すると、練習メニューやオーダーが実際に公開・確定されます。"
          : `申請の状況です。裁けるのは代表のみです（あなたは${LEVEL_LABEL[me.level]}）。`}
      </p>
      {list.length === 0 ? <Empty>申請はありません。</Empty> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {list.map(r => {
            const status = r.data[7] || "申請中";
            return (
              <div key={r.rowIndex} style={{ ...card, borderColor: status === "申請中" ? "#b45309" : LINE }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                  <Chip text={status} color={STATUS_COLOR[status] ?? "#44403c"} />
                  <span style={{ fontSize: 14.5, fontWeight: 800 }}>{r.data[3]}</span>
                </div>
                {r.data[4] && <p style={{ fontSize: 13, color: "rgba(235,235,245,0.7)", lineHeight: 1.8 }}>{r.data[4]}</p>}
                <p style={{ fontSize: 11.5, color: "rgba(235,235,245,0.4)", marginTop: 6 }}>
                  申請 {r.data[6]} · {r.data[11]}
                  {r.data[8] && `　／　${r.data[7]} by ${r.data[8]}`}
                </p>
                {canDecide && status === "申請中" && (
                  <div style={{ display: "flex", gap: 8, marginTop: 11, flexWrap: "wrap" }}>
                    <button onClick={() => decide(r, "承認")} disabled={busy} style={{ ...btn, background: "#15803d", color: "#fff", flex: 1 }}>承認する</button>
                    <button onClick={() => decide(r, "差し戻し")} disabled={busy} style={btnSub}>差し戻し</button>
                    <button onClick={() => decide(r, "却下")} disabled={busy} style={{ ...btnSub, color: "#ff6982" }}>却下</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── ⑨ 首脳陣の設定（代表のみ） ───────────────────────── */
type RoleAccount = {
  rowIndex: number; accountId: string; name: string; userId: string;
  memberId: string; level: number; title: string; area: string;
};

/** アカウントと役割の一覧を取ってくる（画面の状態は変えない） */
async function fetchRoleAccounts(): Promise<RoleAccount[]> {
  const res = await fetch("/api/staff/roles", { cache: "no-store" });
  const d = await res.json().catch(() => null);
  if (!res.ok || !d?.ok) throw new Error(d?.error ?? "読み込みに失敗しました。");
  return d.accounts as RoleAccount[];
}

function StaffAdminView({ show }: { show: (ok: boolean, t: string) => void }) {
  const [accounts, setAccounts] = useState<RoleAccount[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () => fetchRoleAccounts().then(a => setAccounts(a)).catch(() => show(false, "読み込みに失敗しました。")),
    [show],
  );

  useEffect(() => {
    fetchRoleAccounts().then(a => setAccounts(a)).catch(() => {});
  }, []);

  async function apply(a: RoleAccount, level: number, title: string, area: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/staff/roles", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: a.accountId, level, title, area }),
      });
      const d = await res.json().catch(() => null);
      if (res.ok && d?.ok) { show(true, level === 0 ? `${a.name} を解任しました。` : `${a.name} を任命しました。`); await load(); }
      else show(false, d?.error ?? "変更に失敗しました。");
    } finally { setBusy(false); }
  }

  const staff = accounts.filter(a => a.level > 0);
  const others = accounts.filter(a => a.level === 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <section style={card}>
        <H sub="STAFF">首脳陣（{staff.length}名）</H>
        <p style={{ fontSize: 12, color: "rgba(235,235,245,0.5)", lineHeight: 1.9, marginBottom: 12 }}>
          メンバーアカウントに役割を付けると、この首脳陣アプリに入れるようになります。
          権限レベルを「メンバー」に戻すと解任されます。
        </p>
        {staff.length === 0 ? <Empty>まだ任命されていません。下から任命してください。</Empty>
          : staff.map(a => <RoleRow key={a.accountId} a={a} onApply={apply} busy={busy} />)}
      </section>

      <section style={card}>
        <H sub="MEMBERS">ほかのメンバー（{others.length}名）</H>
        {others.length === 0 ? <Empty>対象のアカウントがありません。</Empty>
          : others.map(a => <RoleRow key={a.accountId} a={a} onApply={apply} busy={busy} />)}
      </section>
    </div>
  );
}

function RoleRow({ a, onApply, busy }: {
  a: RoleAccount; onApply: (a: RoleAccount, level: number, title: string, area: string) => void; busy: boolean;
}) {
  const [level, setLevel] = useState(a.level);
  const [title, setTitle] = useState(a.title);
  const [area, setArea] = useState(a.area || "全体");
  const dirty = level !== a.level || title !== a.title || area !== (a.area || "全体");

  return (
    <div style={{ padding: "12px 0", borderTop: `1px solid ${LINE}` }}>
      <div style={{ display: "flex", gap: 9, alignItems: "center", marginBottom: 9, flexWrap: "wrap" }}>
        <span style={{ fontSize: 14.5, fontWeight: 700 }}>{a.name}</span>
        <span style={{ fontSize: 11, color: "rgba(235,235,245,0.4)" }}>{a.userId}</span>
        {a.level > 0 && <Chip text={LEVEL_LABEL[a.level as StaffLevel]} color="#374151" />}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
        <select value={level} onChange={e => setLevel(Number(e.target.value))} style={{ ...input, cursor: "pointer" }}>
          {[0, 1, 2, 3, 4].map(l => <option key={l} value={l}>{LEVEL_LABEL[l as StaffLevel]}</option>)}
        </select>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="役職名（例: 投手コーチ）" style={input} />
        <select value={area} onChange={e => setArea(e.target.value)} style={{ ...input, cursor: "pointer" }} disabled={level === 0}>
          {AREAS.map(x => <option key={x} value={x}>{x}担当</option>)}
        </select>
      </div>
      {dirty && (
        <button onClick={() => onApply(a, level, title, area)} disabled={busy}
          style={{ ...btn, marginTop: 9, width: "100%", opacity: busy ? 0.5 : 1 }}>
          {level === 0 ? "解任する" : "この内容で任命する"}
        </button>
      )}
    </div>
  );
}
