"use client";

import { useCallback, useEffect, useState } from "react";
import { lineStartUrl } from "@/lib/handoffClient";

/**
 * マイページの「LINEでログイン」
 *
 * 連携すると、次からIDとパスワードを入れずに入れる。
 * 連携できるのは自分のアカウントだけで、LINEから新しく登録はできない。
 */
export default function LineLinkCard() {
  const [state, setState] = useState<"loading" | "off" | "linked" | "unlinked">("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/line/status");
      const d = await res.json().catch(() => ({}));
      if (!d?.ok) { setState("off"); return; }
      setState(!d.enabled ? "off" : d.linked ? "linked" : "unlinked");
    } catch { setState("off"); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // 連携から戻ってきたときの結果を出す
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("line");
    if (!p) return;
    const texts: Record<string, { ok: boolean; text: string }> = {
      linked: { ok: true, text: "LINEと連携しました。次からLINEでログインできます。" },
      login_ok: { ok: true, text: "LINEでログインしました。" },
      canceled: { ok: false, text: "LINEでの連携をキャンセルしました。" },
      expired: { ok: false, text: "時間が経ちすぎました。もう一度お試しください。" },
      already_used: { ok: false, text: "このLINEアカウントは、別のメンバーに連携済みです。" },
      not_linked: { ok: false, text: "このLINEアカウントは連携されていません。先にIDとパスワードでログインし、マイページから連携してください。" },
      pending: { ok: false, text: "アカウントが承認待ちです。代表の承認後にご利用ください。" },
      rejected: { ok: false, text: "このアカウントは現在利用できません。" },
      disabled: { ok: false, text: "LINEログインはいま使えません。" },
      no_column: { ok: false, text: "連携を保存できませんでした。データベースの準備（supabase/schema.sql の実行）が済んでいません。" },
      save_failed: { ok: false, text: "連携を保存できませんでした。もう一度お試しください。" },
    };
    setMsg(texts[p] ?? { ok: false, text: "LINEとの連携に失敗しました。もう一度お試しください。" });
    // 結果はURLに残さない（再読み込みで何度も出るため）
    const url = new URL(window.location.href);
    url.searchParams.delete("line");
    window.history.replaceState({}, "", url.toString());
  }, []);

  async function unlink() {
    if (busy) return;
    if (!window.confirm("LINEとの連携を解除します。次からはIDとパスワードでログインしてください。")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/line/status", { method: "DELETE" });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d?.ok) { setState("unlinked"); setMsg({ ok: true, text: "連携を解除しました。" }); }
      else setMsg({ ok: false, text: d?.error || "解除に失敗しました。" });
    } catch { setMsg({ ok: false, text: "ネットワークエラーが発生しました。" }); }
    finally { setBusy(false); }
  }

  // 設定されていないときは、何も出さない
  if (state === "off") return null;

  return (
    <div style={{ background: "#2C2C2E", border: "1px solid #38383A", borderRadius: 16, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <h3 style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 800, fontSize: 16, color: "#fff", margin: 0 }}>
          LINEでログイン
        </h3>
        {state !== "loading" && (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
            background: state === "linked" ? "rgba(6,199,85,0.16)" : "rgba(235,235,245,0.10)",
            color: state === "linked" ? "#06c755" : "rgba(235,235,245,0.60)",
          }}>{state === "linked" ? "連携済み" : "未連携"}</span>
        )}
      </div>

      <p style={{ fontSize: 12.5, color: "rgba(235,235,245,0.60)", lineHeight: 1.8, marginBottom: 14 }}>
        {state === "linked"
          ? "ログイン画面の「LINEでログイン」から、IDとパスワードなしで入れます。"
          : "連携すると、次からIDとパスワードを入れずにログインできます。LINEに保存されるものはなく、こちらが預かるのはLINEのユーザーIDだけです。"}
      </p>

      {msg && (
        <p style={{ fontSize: 13, color: msg.ok ? "#30D158" : "#FF453A", lineHeight: 1.7, marginBottom: 12 }}>
          {msg.text}
        </p>
      )}

      {state === "linked" ? (
        <button type="button" onClick={unlink} disabled={busy}
          style={{
            padding: "12px 20px", borderRadius: 10, border: "1px solid #48484A",
            background: "transparent", color: "rgba(235,235,245,0.75)",
            fontSize: 14, fontWeight: 700, cursor: busy ? "wait" : "pointer",
          }}>
          連携を解除する
        </button>
      ) : state === "unlinked" ? (
        /* ホーム画面アプリから来たかを伝えて、戻り方の案内を正しく出す */
        <button type="button" disabled={busy}
          onClick={async () => { setBusy(true); window.location.href = await lineStartUrl("link"); }}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8, border: "none",
            padding: "13px 22px", borderRadius: 10, background: "#06c755",
            color: "#fff", fontSize: 14, fontWeight: 800, cursor: busy ? "wait" : "pointer",
          }}>
          LINEと連携する →
        </button>
      ) : null}
    </div>
  );
}
