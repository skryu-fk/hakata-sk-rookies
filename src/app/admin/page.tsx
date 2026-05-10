"use client";

/**
 * /admin — お知らせ・ツイート管理画面
 *
 * フロー:
 *   1) パスワード入力（ADMIN_PASSWORD）
 *   2) タブで news / tweets 切替
 *   3) フォーム入力 → 送信
 *   4) /api/admin/append → Apps Script → スプレッドシート追記
 *   5) revalidateTag でサイト即時反映
 *
 * 設定手順は SETUP_ADMIN.md 参照。
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { renderMarkdown } from "@/lib/markdown";

type Tab = "news" | "tweets" | "blog" | "practice";
type Status = { ok: boolean; text: string } | null;
type ListItem = { rowIndex: number; data: string[] };

/** タブ → スプレッドシート名 */
const SHEET_FOR: Record<Tab, "news" | "tweets" | "blog" | "practices"> = {
  news: "news",
  tweets: "tweets",
  blog: "blog",
  practice: "practices",
};

const NEWS_CATEGORIES = ["サイト", "募集", "活動", "試合", "告知"] as const;
const BLOG_CATEGORIES = ["コラム", "活動報告", "お役立ち", "試合レポート", "お知らせ"] as const;
const PRACTICE_STATUSES = [
  { value: "scheduled", label: "予定" },
  { value: "tentative", label: "未定（要相談）" },
  { value: "canceled", label: "中止" },
] as const;

function todayDot(): string {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}
function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function autoSlug(date: string, title: string): string {
  // URLに使うので必ず ASCII（英数字とハイフン）だけのスラグを返す。
  // 日本語タイトルはエンコード時の取り回しが面倒なので、
  //   ・ASCIIだけ抜き出せた場合はそれを使う
  //   ・抜き出せない場合は時刻ベースのランダム文字列にフォールバック
  const d = date.replace(/[./]/g, "-");
  const ascii = title
    .toLowerCase()
    .replace(/[\s　]+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  if (ascii.length >= 3) return `${d}-${ascii}`;
  // 非ASCIIタイトル → タイムスタンプ(base36)でユニーク化（衝突しない短い文字列）
  const t = Date.now().toString(36).slice(-6);
  return `${d}-${t}`;
}

const inp: React.CSSProperties = {
  width: "100%",
  border: "1px solid #d8d4cb",
  background: "#fff",
  padding: "11px 14px",
  fontSize: 14,
  color: "#131922",
  outline: "none",
  fontFamily: "var(--font-zen),sans-serif",
  boxSizing: "border-box",
};

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#0b1e3f", letterSpacing: "0.06em", marginBottom: 6 }}>
        {label}
      </label>
      {children}
      {hint && <p style={{ fontSize: 11, color: "#8a8a8a", marginTop: 6, lineHeight: 1.7 }}>{hint}</p>}
    </div>
  );
}

export default function AdminPage() {
  const [pw, setPw] = useState("");
  const [tab, setTab] = useState<Tab>("news");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  // News form
  const [nDate, setNDate] = useState(todayDot);
  const [nCat, setNCat] = useState<typeof NEWS_CATEGORIES[number]>("告知");
  const [nTitle, setNTitle] = useState("");
  const [nBody, setNBody] = useState("");
  const [nSlug, setNSlug] = useState("");

  // Tweet form
  const [tDate, setTDate] = useState(todayIso);
  const [tText, setTText] = useState("");
  const [tUrl, setTUrl] = useState("");

  // Blog form
  const [bDate, setBDate] = useState(todayDot);
  const [bCat, setBCat] = useState<typeof BLOG_CATEGORIES[number]>("コラム");
  const [bTitle, setBTitle] = useState("");
  const [bExcerpt, setBExcerpt] = useState("");
  const [bContent, setBContent] = useState("");
  const [bSlug, setBSlug] = useState("");

  // Practice form
  const [pDate, setPDate] = useState(todayIso);
  const [pPlace, setPPlace] = useState("");
  const [pIsMatch, setPIsMatch] = useState(false);
  const [pStatus, setPStatus] = useState<(typeof PRACTICE_STATUSES)[number]["value"]>("scheduled");
  const [pTime, setPTime] = useState("");
  const [pNote, setPNote] = useState("");

  // ── 一覧 / 編集状態 ──
  const [listing, setListing] = useState<Record<Tab, ListItem[] | null>>({
    news: null, tweets: null, blog: null, practice: null,
  });
  const [listLoading, setListLoading] = useState<Record<Tab, boolean>>({
    news: false, tweets: false, blog: false, practice: false,
  });
  // 編集モード: editing.rowIndex の行を上書きする
  const [editing, setEditing] = useState<{ tab: Tab; rowIndex: number } | null>(null);

  const newsBodyHtml = useMemo(() => renderMarkdown(nBody), [nBody]);
  const finalSlug = nSlug.trim() || autoSlug(nDate, nTitle);
  const finalBlogSlug = bSlug.trim() || autoSlug(bDate, bTitle);

  // 練習種別は place ベース（球場 or 野球場 → 球場練習、それ以外 → 公園練習）
  const inferredPracticeType = pIsMatch
    ? "試合"
    : /球場/.test(pPlace)
    ? "球場練習"
    : "公園練習";

  // ───────── 一覧 / 編集 / 削除 ヘルパー ─────────
  async function loadList(t: Tab) {
    if (!pw) {
      setStatus({ ok: false, text: "先にパスワードを入力してください。" });
      return;
    }
    setListLoading(prev => ({ ...prev, [t]: true }));
    try {
      const res = await fetch("/api/admin/list", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": pw },
        body: JSON.stringify({ sheet: SHEET_FOR[t] }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        setListing(prev => ({ ...prev, [t]: data.rows ?? [] }));
      } else {
        setStatus({ ok: false, text: data?.error ?? "一覧の取得に失敗しました。" });
      }
    } catch {
      setStatus({ ok: false, text: "ネットワークエラーが発生しました。" });
    } finally {
      setListLoading(prev => ({ ...prev, [t]: false }));
    }
  }

  function startEdit(t: Tab, item: ListItem) {
    setEditing({ tab: t, rowIndex: item.rowIndex });
    const d = item.data;
    if (t === "news") {
      setNDate(d[0] ?? ""); setNCat((NEWS_CATEGORIES as readonly string[]).includes(d[1]) ? d[1] as typeof NEWS_CATEGORIES[number] : "告知");
      setNTitle(d[2] ?? ""); setNBody(d[3] ?? ""); setNSlug(d[4] ?? "");
    } else if (t === "tweets") {
      setTDate(d[0] ?? ""); setTText(d[1] ?? ""); setTUrl(d[2] ?? "");
    } else if (t === "blog") {
      setBDate(d[0] ?? ""); setBCat((BLOG_CATEGORIES as readonly string[]).includes(d[1]) ? d[1] as typeof BLOG_CATEGORIES[number] : "コラム");
      setBTitle(d[2] ?? ""); setBExcerpt(d[3] ?? ""); setBContent(d[4] ?? ""); setBSlug(d[5] ?? "");
    } else if (t === "practice") {
      setPDate(d[0] ?? ""); setPIsMatch((d[1] ?? "").trim() === "試合");
      setPPlace(d[2] ?? "");
      const st = (d[3] ?? "scheduled") as (typeof PRACTICE_STATUSES)[number]["value"];
      setPStatus(["scheduled", "tentative", "canceled"].includes(st) ? st : "scheduled");
      setPTime(d[4] ?? ""); setPNote(d[5] ?? "");
    }
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function cancelEdit() {
    setEditing(null);
    setStatus(null);
  }

  async function deleteRow(t: Tab, item: ListItem) {
    if (!pw) {
      setStatus({ ok: false, text: "先にパスワードを入力してください。" });
      return;
    }
    const summary = item.data.slice(0, 3).filter(Boolean).join(" / ").slice(0, 60);
    if (!window.confirm(`削除しますか？\n${summary}`)) return;
    try {
      const res = await fetch("/api/admin/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": pw },
        body: JSON.stringify({ sheet: SHEET_FOR[t], rowIndex: item.rowIndex }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        setStatus({ ok: true, text: "削除しました。" });
        if (editing && editing.tab === t && editing.rowIndex === item.rowIndex) {
          setEditing(null);
        }
        loadList(t);
      } else {
        setStatus({ ok: false, text: data?.error ?? "削除に失敗しました。" });
      }
    } catch {
      setStatus({ ok: false, text: "ネットワークエラーが発生しました。" });
    }
  }

  async function submit() {
    setStatus(null);
    if (!pw) {
      setStatus({ ok: false, text: "パスワードを入力してください。" });
      return;
    }
    if (tab === "news") {
      if (!nDate || !nTitle.trim()) {
        setStatus({ ok: false, text: "日付とタイトルは必須です。" });
        return;
      }
    } else if (tab === "tweets") {
      if (!tDate || !tText.trim()) {
        setStatus({ ok: false, text: "日付と本文は必須です。" });
        return;
      }
    } else if (tab === "blog") {
      if (!bDate || !bTitle.trim() || !bContent.trim()) {
        setStatus({ ok: false, text: "日付・タイトル・本文は必須です。" });
        return;
      }
    } else if (tab === "practice") {
      if (!pDate || !pPlace.trim()) {
        setStatus({ ok: false, text: "日付と場所は必須です。" });
        return;
      }
    }
    setSubmitting(true);
    const row =
      tab === "news"
        ? [nDate, nCat, nTitle.trim(), nBody.trim(), finalSlug]
        : tab === "tweets"
        ? [tDate, tText.trim(), tUrl.trim()]
        : tab === "blog"
        ? [bDate, bCat, bTitle.trim(), bExcerpt.trim(), bContent.trim(), finalBlogSlug]
        : // practice
          // type は "試合" のときだけ書く（それ以外は place ベースで自動判定される）
          [pDate, pIsMatch ? "試合" : "", pPlace.trim(), pStatus, pTime.trim(), pNote.trim()];

    const isUpdate = !!editing && editing.tab === tab;
    const url = isUpdate ? "/api/admin/update" : "/api/admin/append";
    const payload: Record<string, unknown> = {
      sheet: SHEET_FOR[tab],
      row,
    };
    if (isUpdate) {
      payload.rowIndex = editing!.rowIndex;
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": pw },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        setStatus({
          ok: true,
          text: isUpdate
            ? "更新しました！サイトに反映されました（最大数秒）。"
            : "送信しました！サイトに反映されました（最大数秒）。",
        });
        // 編集モードを抜けてフォームクリア
        setEditing(null);
        if (tab === "news") {
          setNTitle(""); setNBody(""); setNSlug("");
        } else if (tab === "tweets") {
          setTText(""); setTUrl("");
        } else if (tab === "blog") {
          setBTitle(""); setBExcerpt(""); setBContent(""); setBSlug("");
        } else if (tab === "practice") {
          setPPlace(""); setPTime(""); setPNote(""); setPIsMatch(false); setPStatus("scheduled");
        }
        // 一覧があればリフレッシュ
        if (listing[tab] !== null) {
          loadList(tab);
        }
      } else {
        setStatus({ ok: false, text: data?.error ?? "送信に失敗しました。" });
      }
    } catch {
      setStatus({ ok: false, text: "ネットワークエラーが発生しました。" });
    } finally {
      setSubmitting(false);
    }
  }

  const tabBtn = (key: Tab): React.CSSProperties => ({
    padding: "10px 18px",
    background: tab === key ? "#d10024" : "transparent",
    color: tab === key ? "#fff" : "rgba(255,255,255,0.6)",
    border: tab === key ? "none" : "1px solid rgba(255,255,255,0.15)",
    fontFamily: "var(--font-zen),sans-serif",
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: "0.08em",
    cursor: "pointer",
  });

  return (
    <>
      {/* Header */}
      <header style={{ background: "#0b1e3f", color: "#fff", borderBottom: "3px solid #d10024" }}>
        <div className="max-w-[1100px] mx-auto px-5 md:px-8 flex items-center" style={{ height: 64, gap: 16 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
            <Image src="/logo.png" alt="logo" width={36} height={36} className="object-contain" />
            <div style={{ lineHeight: 1.1 }}>
              <div style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 900, fontSize: 14 }}>博多SKルーキーズ</div>
              <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: "0.3em", marginTop: 2 }}>ADMIN CONSOLE</div>
            </div>
          </Link>
          <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}>
            非公開ページ・関係者専用
          </span>
        </div>
      </header>

      <main style={{ background: "#0b1e3f", minHeight: "calc(100vh - 64px)", color: "#fff" }}>
        <div className="max-w-[1100px] mx-auto px-5 md:px-8" style={{ paddingTop: 32, paddingBottom: 64 }}>
          {/* Password + tab bar */}
          <div className="grid gap-4 md:[grid-template-columns:1fr_auto] items-center mb-8">
            <input
              type="password"
              value={pw}
              onChange={e => setPw(e.target.value)}
              placeholder="管理パスワード"
              autoComplete="current-password"
              style={{ ...inp, background: "rgba(255,255,255,0.06)", color: "#fff", borderColor: "rgba(255,255,255,0.15)", maxWidth: 320 }}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => setTab("news")}    style={tabBtn("news")}>お知らせ</button>
              <button onClick={() => setTab("tweets")}  style={tabBtn("tweets")}>ツイート</button>
              <button onClick={() => setTab("blog")}    style={tabBtn("blog")}>ブログ</button>
              <button onClick={() => setTab("practice")} style={tabBtn("practice")}>練習</button>
            </div>
          </div>

          {/* Forms */}
          {tab === "blog" ? (
            <div className="grid gap-8 md:grid-cols-2">
              <section style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: 24 }}>
                <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d4a82a", letterSpacing: "0.4em", marginBottom: 18 }}>NEW BLOG POST</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <Field label="日付（例：2026.05.10）">
                    <input value={bDate} onChange={e => setBDate(e.target.value)} style={inp} />
                  </Field>
                  <Field label="カテゴリ">
                    <select value={bCat} onChange={e => setBCat(e.target.value as typeof BLOG_CATEGORIES[number])} style={{ ...inp, cursor: "pointer" }}>
                      {BLOG_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="タイトル">
                    <input value={bTitle} onChange={e => setBTitle(e.target.value)} placeholder="例：5月の活動報告" style={inp} />
                  </Field>
                  <Field label="抜粋（一覧カードに表示される短い説明）">
                    <textarea value={bExcerpt} onChange={e => setBExcerpt(e.target.value)} rows={3} placeholder="記事の冒頭に配置する2〜3行の紹介文" style={{ ...inp, resize: "vertical", minHeight: 70, fontFamily: "var(--font-zen),sans-serif" }} />
                  </Field>
                  <Field
                    label="本文"
                    hint="改行ごとに段落。記法: ―― 区切り線 / 【セクション】大見出し / ■ 中見出し / ・箇条書き / Q. A. でQ&A / **太字** / [リンク文字](URL)"
                  >
                    <textarea
                      value={bContent}
                      onChange={e => setBContent(e.target.value)}
                      rows={16}
                      placeholder={"5月9日に山王公園球場で初練習を行いました。\n\n――\n\n【参加メンバー】\n■ 当日の参加状況\n10名のメンバーが集まり〜"}
                      style={{ ...inp, resize: "vertical", minHeight: 280, fontFamily: "var(--font-zen),sans-serif" }}
                    />
                  </Field>
                  <Field label="URLスラグ（任意・空欄なら自動）" hint={`生成: /blog/${finalBlogSlug || "..."}`}>
                    <input value={bSlug} onChange={e => setBSlug(e.target.value)} placeholder="例: 2026-05-10-first-practice-report" style={inp} />
                  </Field>
                </div>
              </section>

              <section style={{ background: "#fff", color: "#1f2734", padding: 24, maxHeight: 720, overflowY: "auto" }}>
                <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d10024", letterSpacing: "0.4em", marginBottom: 14 }}>PREVIEW</p>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 13, color: "#0b1e3f", letterSpacing: "0.06em" }}>{bDate || "—"}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", padding: "3px 9px", background: "#d10024", color: "#fff" }}>{bCat}</span>
                </div>
                <h3 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: 22, fontWeight: 900, color: "#0b1e3f", lineHeight: 1.4, marginBottom: 12 }}>
                  {bTitle || "（タイトル未入力）"}
                </h3>
                {bExcerpt && (
                  <p style={{ fontSize: 13, color: "#5b6373", lineHeight: 1.85, marginBottom: 14, padding: "10px 14px", background: "#f5f2ec", borderLeft: "3px solid #d4a82a" }}>{bExcerpt}</p>
                )}
                {bContent.trim() ? (
                  <div style={{ borderTop: "1px solid #e0dcd4", paddingTop: 14 }}>
                    {bContent.split(/\r?\n/).filter(b => b.length > 0).map((block, i) => {
                      if (block === "――") return <hr key={i} style={{ border: "none", borderTop: "1px solid #e0dcd4", margin: "20px 0" }} />;
                      if (/^【.+】$/.test(block)) return <h4 key={i} style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: 15, fontWeight: 900, color: "#0b1e3f", marginTop: 20, marginBottom: 8, borderLeft: "4px solid #d10024", paddingLeft: 10 }}>{block.replace(/^【|】$/g, "")}</h4>;
                      if (block.startsWith("■")) return <h5 key={i} style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: 13, fontWeight: 900, color: "#0b1e3f", marginTop: 14, marginBottom: 6 }}>{block}</h5>;
                      if (block.startsWith("・")) return <p key={i} style={{ fontSize: 13, lineHeight: 1.9, color: "#3a3f4a", marginLeft: 12, marginBottom: 4 }}>{block}</p>;
                      if (/^Q\. /.test(block)) return <p key={i} style={{ fontSize: 13, fontWeight: 700, color: "#0b1e3f", marginTop: 12, marginBottom: 2 }}>{block}</p>;
                      if (/^A\. /.test(block)) return <p key={i} style={{ fontSize: 12.5, lineHeight: 1.85, color: "#3a3f4a", marginBottom: 10 }}>{block}</p>;
                      return <p key={i} style={{ fontSize: 13, lineHeight: 1.95, color: "#3a3f4a", marginBottom: 10 }}>{block}</p>;
                    })}
                  </div>
                ) : (
                  <p style={{ fontSize: 12, color: "#8a8a8a", lineHeight: 1.85 }}>本文を書くとプレビューが出ます。</p>
                )}
              </section>
            </div>
          ) : tab === "practice" ? (
            <div className="grid gap-8 md:grid-cols-2">
              <section style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: 24 }}>
                <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d4a82a", letterSpacing: "0.4em", marginBottom: 18 }}>NEW PRACTICE</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <Field label="日付（例：2026-05-15）">
                    <input value={pDate} onChange={e => setPDate(e.target.value)} style={inp} />
                  </Field>
                  <Field label="場所" hint="場所名に「球場」or「野球場」が入っていれば自動的に球場練習扱いになります。">
                    <input value={pPlace} onChange={e => setPPlace(e.target.value)} placeholder="例: 山王公園球場 / 東平尾公園" style={inp} />
                  </Field>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <input type="checkbox" id="pIsMatch" checked={pIsMatch} onChange={e => setPIsMatch(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#d10024" }} />
                    <label htmlFor="pIsMatch" style={{ fontSize: 13, color: "#fff", cursor: "pointer" }}>これは試合（type 列に「試合」と書く）</label>
                  </div>
                  <Field label="ステータス">
                    <select value={pStatus} onChange={e => setPStatus(e.target.value as (typeof PRACTICE_STATUSES)[number]["value"])} style={{ ...inp, cursor: "pointer" }}>
                      {PRACTICE_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </Field>
                  <Field label="時間（任意）">
                    <input value={pTime} onChange={e => setPTime(e.target.value)} placeholder="例: 18:30〜20:30" style={inp} />
                  </Field>
                  <Field label="備考（任意）" hint="「天候次第で中止の可能性あり」など。">
                    <textarea value={pNote} onChange={e => setPNote(e.target.value)} rows={2} placeholder="" style={{ ...inp, resize: "vertical", minHeight: 60, fontFamily: "var(--font-zen),sans-serif" }} />
                  </Field>
                </div>
              </section>

              <section style={{ background: "#fff", color: "#1f2734", padding: 24 }}>
                <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d10024", letterSpacing: "0.4em", marginBottom: 14 }}>PREVIEW</p>
                <div style={{ background: "#0b1e3f", color: "#fff", padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{ minWidth: 54, textAlign: "center" }}>
                    {(() => {
                      const m = pDate.match(/(\d{1,2})-(\d{1,2})$/);
                      const mm = m ? m[1].padStart(2, "0") : "—";
                      const dd = m ? m[2].padStart(2, "0") : "—";
                      return (
                        <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 22, lineHeight: 1 }}>{mm}.{dd}</div>
                      );
                    })()}
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4, letterSpacing: "0.05em" }}>{pStatus === "canceled" ? "中止" : pStatus === "tentative" ? "未定" : "予定"}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: inferredPracticeType === "球場練習" ? "#d10024" : inferredPracticeType === "試合" ? "#4a90e2" : "#d4a82a", flexShrink: 0 }} />
                      <span style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 700, fontSize: 14 }}>{inferredPracticeType}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}>
                      📍 {pPlace || "（場所未入力）"}{pTime ? ` / ${pTime}` : ""}
                    </div>
                    {pNote && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>※ {pNote}</div>}
                  </div>
                </div>
                <p style={{ fontSize: 11, color: "#8a8a8a", lineHeight: 1.85, marginTop: 12 }}>
                  種別はチェックボックスと「場所」の文字列から自動判定（「球場」「野球場」を含む → 球場練習 / それ以外 → 公園練習）。
                </p>
              </section>
            </div>
          ) : tab === "news" ? (
            <div className="grid gap-8 md:grid-cols-2">
              <section style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: 24 }}>
                <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d4a82a", letterSpacing: "0.4em", marginBottom: 18 }}>NEW NEWS</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <Field label="日付（例：2026.05.10）">
                    <input value={nDate} onChange={e => setNDate(e.target.value)} style={inp} />
                  </Field>
                  <Field label="カテゴリ">
                    <select value={nCat} onChange={e => setNCat(e.target.value as typeof NEWS_CATEGORIES[number])} style={{ ...inp, cursor: "pointer" }}>
                      {NEWS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="タイトル">
                    <input value={nTitle} onChange={e => setNTitle(e.target.value)} placeholder="例：メンバーが13人になりました！" style={inp} />
                  </Field>
                  <Field
                    label="本文（任意・ここを書くと『詳しく →』表示が出て詳細ページが生成されます）"
                    hint="改行で改行 / 空行で段落 / **太字** / [リンク文字](https://...) が使えます。"
                  >
                    <textarea
                      value={nBody}
                      onChange={e => setNBody(e.target.value)}
                      rows={10}
                      placeholder={"例：\n立ち上げから3週間で13人になりました。\n\n引き続き募集中です。気になる方は[こちら](#contact)まで。"}
                      style={{ ...inp, resize: "vertical", minHeight: 180, fontFamily: "var(--font-zen),sans-serif" }}
                    />
                  </Field>
                  <Field label="URLスラグ（任意・空欄なら自動生成）" hint={`生成: /news/${finalSlug || "..."}`}>
                    <input value={nSlug} onChange={e => setNSlug(e.target.value)} placeholder="2026-05-10-members-13" style={inp} />
                  </Field>
                </div>
              </section>

              <section style={{ background: "#fff", color: "#1f2734", padding: 24 }}>
                <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d10024", letterSpacing: "0.4em", marginBottom: 14 }}>PREVIEW</p>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 14, color: "#0b1e3f", letterSpacing: "0.06em" }}>{nDate || "—"}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", padding: "3px 9px", background: nCat === "募集" ? "#d10024" : nCat === "告知" ? "#d4a82a" : "#0b1e3f", color: nCat === "告知" ? "#0b1e3f" : "#fff" }}>{nCat}</span>
                </div>
                <h3 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: 22, fontWeight: 900, color: "#0b1e3f", lineHeight: 1.4, marginBottom: 16 }}>
                  {nTitle || "（タイトル未入力）"}
                </h3>
                {nBody.trim() ? (
                  <div className="news-body" style={{ fontSize: 14 }} dangerouslySetInnerHTML={{ __html: newsBodyHtml }} />
                ) : (
                  <p style={{ fontSize: 13, color: "#8a8a8a", lineHeight: 1.85 }}>本文を書くと、ここにプレビューが表示されます。空のままでもタイトルだけのお知らせとして投稿できます（その場合は詳細ページなしで一覧に表示）。</p>
                )}
              </section>
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2">
              <section style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: 24 }}>
                <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d4a82a", letterSpacing: "0.4em", marginBottom: 18 }}>NEW TWEET</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <Field label="投稿日（例：2026-05-10）">
                    <input value={tDate} onChange={e => setTDate(e.target.value)} style={inp} />
                  </Field>
                  <Field label="本文">
                    <textarea value={tText} onChange={e => setTText(e.target.value)} rows={6} placeholder="例：今日は山王公園球場で球場練習でした！" style={{ ...inp, resize: "vertical", minHeight: 140, fontFamily: "var(--font-zen),sans-serif" }} />
                  </Field>
                  <Field label="該当ツイートのURL（任意）" hint="X上の元投稿のURLを貼るとカードがリンクになります。">
                    <input value={tUrl} onChange={e => setTUrl(e.target.value)} placeholder="https://x.com/SK_rookies_FK/status/..." style={inp} />
                  </Field>
                </div>
              </section>

              <section style={{ background: "#fff", color: "#1f2734", padding: 24 }}>
                <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d10024", letterSpacing: "0.4em", marginBottom: 14 }}>PREVIEW</p>
                <div style={{ background: "#f5f2ec", padding: 18, border: "1px solid #e0dcd4" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 36, height: 36, background: "#0b1e3f", display: "grid", placeItems: "center" }}>
                      <Image src="/logo.png" alt="" width={28} height={28} className="object-contain" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 900, fontSize: 13, color: "#0b1e3f" }}>博多SKルーキーズ</div>
                      <div style={{ fontSize: 11, color: "#8a8a8a", marginTop: 2 }}>@SK_rookies_FK · {tDate || "—"}</div>
                    </div>
                  </div>
                  <p style={{ fontSize: 13.5, color: "#1f2734", lineHeight: 1.85, whiteSpace: "pre-wrap", minHeight: 60 }}>
                    {tText || "（本文未入力）"}
                  </p>
                  {tUrl && <div style={{ fontSize: 11, color: "#d10024", fontWeight: 700, letterSpacing: "0.08em", marginTop: 10 }}>Xで開く →</div>}
                </div>
              </section>
            </div>
          )}

          {/* Submit */}
          <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
            {editing && editing.tab === tab && (
              <div style={{ padding: "10px 14px", background: "rgba(212,168,42,0.08)", border: "1px solid rgba(212,168,42,0.3)", color: "#d4a82a", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <span><strong>編集モード</strong>　行 {editing.rowIndex} を上書きします。送信すると現在の内容で置き換わります。</span>
                <button onClick={cancelEdit} style={{ padding: "6px 12px", background: "transparent", border: "1px solid rgba(212,168,42,0.5)", color: "#d4a82a", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  キャンセル
                </button>
              </div>
            )}
            {status && (
              <div style={{ padding: "12px 16px", background: status.ok ? "rgba(36,209,55,0.08)" : "rgba(209,0,36,0.08)", border: `1px solid ${status.ok ? "rgba(36,209,55,0.3)" : "rgba(209,0,36,0.3)"}`, color: status.ok ? "#67e088" : "#ff6982", fontSize: 13 }}>
                {status.text}
              </div>
            )}
            <button
              onClick={submit}
              disabled={submitting}
              style={{
                width: "100%",
                padding: 16,
                background: submitting ? "#666" : editing && editing.tab === tab ? "#d4a82a" : "#d10024",
                color: editing && editing.tab === tab ? "#0b1e3f" : "#fff",
                border: "none",
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: "0.15em",
                cursor: submitting ? "not-allowed" : "pointer",
                fontFamily: "var(--font-zen),sans-serif",
              }}
            >
              {submitting
                ? "送信中…"
                : editing && editing.tab === tab
                ? "この内容で更新する →"
                : "送信してサイトに反映する →"}
            </button>
          </div>

          {/* ───────── 一覧 / 編集 / 削除 ───────── */}
          <ListPanel
            key={tab}
            tab={tab}
            items={listing[tab]}
            loading={listLoading[tab]}
            editingRowIndex={editing && editing.tab === tab ? editing.rowIndex : null}
            onLoad={() => loadList(tab)}
            onEdit={item => startEdit(tab, item)}
            onDelete={item => deleteRow(tab, item)}
          />

          <div style={{ marginTop: 24, padding: "16px 20px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.85 }}>
            <strong style={{ color: "#d4a82a" }}>使い分け</strong>
            <span style={{ color: "rgba(255,255,255,0.75)" }}>お知らせ</span>＝短い告知（募集/告知/活動報告など、1〜数行）。
            <span style={{ color: "rgba(255,255,255,0.75)" }}>ブログ</span>＝長文記事（コラム・活動レポート・お役立ち情報）。
            両方は別のシート・別ページに保存され、サイト上の表示エリアも別になります。
          </div>
        </div>
      </main>
    </>
  );
}

// ───────── ListPanel ─────────
function summarizeRow(tab: Tab, data: string[]): { date: string; head: string; sub?: string } {
  if (tab === "news") {
    return { date: data[0] ?? "", head: data[2] ?? "(無題)", sub: data[1] ? `[${data[1]}]` : undefined };
  }
  if (tab === "tweets") {
    const text = (data[1] ?? "").replace(/\s+/g, " ");
    return { date: data[0] ?? "", head: text.slice(0, 60) + (text.length > 60 ? "…" : "") };
  }
  if (tab === "blog") {
    return { date: data[0] ?? "", head: data[2] ?? "(無題)", sub: data[1] ? `[${data[1]}]` : undefined };
  }
  // practice
  const isMatch = (data[1] ?? "").trim() === "試合";
  const place = data[2] ?? "";
  const type = isMatch ? "試合" : /球場/.test(place) ? "球場練習" : "公園練習";
  const stLabel = data[3] === "canceled" ? "中止" : data[3] === "tentative" ? "未定" : "予定";
  return { date: data[0] ?? "", head: `${place || "(場所未入力)"} — ${type}`, sub: `[${stLabel}]${data[4] ? " " + data[4] : ""}` };
}

function ListPanel({
  tab, items, loading, editingRowIndex, onLoad, onEdit, onDelete,
}: {
  tab: Tab;
  items: ListItem[] | null;
  loading: boolean;
  editingRowIndex: number | null;
  onLoad: () => void;
  onEdit: (item: ListItem) => void;
  onDelete: (item: ListItem) => void;
}) {
  return (
    <section style={{ marginTop: 36, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d4a82a", letterSpacing: "0.4em" }}>EXISTING</p>
          <p style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 700, color: "#fff", fontSize: 14, marginTop: 2 }}>
            既存の{tab === "news" ? "お知らせ" : tab === "tweets" ? "ツイート" : tab === "blog" ? "ブログ" : "練習"}一覧
          </p>
        </div>
        <button
          onClick={onLoad}
          disabled={loading}
          style={{
            padding: "8px 16px",
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.2)",
            color: loading ? "rgba(255,255,255,0.4)" : "#fff",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.06em",
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "読み込み中…" : items === null ? "一覧を読み込む" : "再読み込み"}
        </button>
      </div>
      {items === null ? (
        <div style={{ padding: "32px 20px", color: "rgba(255,255,255,0.45)", fontSize: 12, textAlign: "center" }}>
          上のボタンで一覧を読み込んでください。
        </div>
      ) : items.length === 0 ? (
        <div style={{ padding: "32px 20px", color: "rgba(255,255,255,0.45)", fontSize: 12, textAlign: "center" }}>
          まだ登録されていません。
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {items.map(item => {
            const s = summarizeRow(tab, item.data);
            const isCurrent = editingRowIndex === item.rowIndex;
            return (
              <li key={item.rowIndex} style={{
                padding: "12px 20px",
                borderTop: "1px solid rgba(255,255,255,0.05)",
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 10,
                alignItems: "center",
                background: isCurrent ? "rgba(212,168,42,0.07)" : "transparent",
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 12, color: "rgba(255,255,255,0.55)", letterSpacing: "0.06em", flexShrink: 0 }}>#{item.rowIndex}</span>
                    <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 12, color: "#d4a82a", letterSpacing: "0.06em", flexShrink: 0 }}>{s.date || "—"}</span>
                    {s.sub && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{s.sub}</span>}
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.5, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.head}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => onEdit(item)}
                    disabled={isCurrent}
                    style={{ padding: "6px 12px", background: isCurrent ? "#d4a82a" : "rgba(212,168,42,0.15)", color: isCurrent ? "#0b1e3f" : "#d4a82a", border: "1px solid rgba(212,168,42,0.4)", fontSize: 12, fontWeight: 700, cursor: isCurrent ? "default" : "pointer" }}
                  >
                    {isCurrent ? "編集中" : "編集"}
                  </button>
                  <button
                    onClick={() => onDelete(item)}
                    style={{ padding: "6px 12px", background: "rgba(209,0,36,0.15)", color: "#ff6982", border: "1px solid rgba(209,0,36,0.4)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                  >
                    削除
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
