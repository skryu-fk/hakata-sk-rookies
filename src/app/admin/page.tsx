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

type Tab = "news" | "tweets";
type Status = { ok: boolean; text: string } | null;

const NEWS_CATEGORIES = ["サイト", "募集", "活動", "試合", "告知"] as const;

function todayDot(): string {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}
function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function autoSlug(date: string, title: string): string {
  const d = date.replace(/[./]/g, "-");
  const base = title
    .toLowerCase()
    .replace(/[\s　]+/g, "-")
    .replace(/[^\w\-ぁ-んァ-ヶー一-龯]/g, "")
    .slice(0, 24);
  return `${d}-${base || "post"}`;
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

  const newsBodyHtml = useMemo(() => renderMarkdown(nBody), [nBody]);
  const finalSlug = nSlug.trim() || autoSlug(nDate, nTitle);

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
    } else {
      if (!tDate || !tText.trim()) {
        setStatus({ ok: false, text: "日付と本文は必須です。" });
        return;
      }
    }
    setSubmitting(true);
    const payload =
      tab === "news"
        ? {
            sheet: "news" as const,
            // 列順: date | category | title | body | slug
            row: [nDate, nCat, nTitle.trim(), nBody.trim(), finalSlug],
          }
        : {
            sheet: "tweets" as const,
            // 列順: date | text | url
            row: [tDate, tText.trim(), tUrl.trim()],
          };
    try {
      const res = await fetch("/api/admin/append", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": pw },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        setStatus({ ok: true, text: "送信しました！サイトに反映されました（最大数秒）。" });
        if (tab === "news") {
          setNTitle(""); setNBody(""); setNSlug("");
        } else {
          setTText(""); setTUrl("");
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

  const tabBtn = (key: Tab, label: string): React.CSSProperties => ({
    padding: "10px 22px",
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
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setTab("news")} style={tabBtn("news", "お知らせ")}>お知らせ</button>
              <button onClick={() => setTab("tweets")} style={tabBtn("tweets", "ツイート")}>ツイート</button>
            </div>
          </div>

          {/* Forms */}
          {tab === "news" ? (
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
                background: submitting ? "#666" : "#d10024",
                color: "#fff",
                border: "none",
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: "0.15em",
                cursor: submitting ? "not-allowed" : "pointer",
                fontFamily: "var(--font-zen),sans-serif",
              }}
            >
              {submitting ? "送信中…" : "送信してサイトに反映する →"}
            </button>
          </div>

          <div style={{ marginTop: 32, padding: "16px 20px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.85 }}>
            <strong style={{ color: "#d4a82a" }}>ヒント</strong>　お知らせの本文を書いた行は一覧から「詳しく →」付きでクリック可能になり、<code>/news/[slug]</code> で詳細ページが開きます。本文を空にすると一覧表示のみ（クリック不可）。
          </div>
        </div>
      </main>
    </>
  );
}
