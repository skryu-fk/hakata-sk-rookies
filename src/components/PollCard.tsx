"use client";
/**
 * 投票カード — 管理者が作った投票を、アプリのお知らせ欄に出して回答してもらう。
 *
 * 選択肢を押すとその場で投票が入り、押し直せば変更できる（1人1票）。
 * 誰がどれに入れたかはチーム全員に見える方針のため、名前も表示できるようにしている。
 * 締切を過ぎた投票・締め切られた投票は、結果だけ見られる状態にする。
 */
import { useState } from "react";

export type Poll = {
  id: string;
  question: string;
  options: string[];
  note: string;
  status: string;    // "open" | "closed"
  deadline: string;  // "YYYY-MM-DD"（空なら締切なし）
  createdAt: string;
};
export type PollVote = { pollId: string; memberId: string; memberName: string; choice: string };
export type VoteResult = { ok: true } | { ok: false; error: string };

/** 締切日を過ぎている／締め切られている＝もう投票できない */
export function isPollLive(p: Poll, today = new Date().toISOString().slice(0, 10)): boolean {
  return p.status === "open" && (!p.deadline || p.deadline >= today);
}

const GOLD = "#E5B84B";

export default function PollCard({ poll, votes, me, onVote }: {
  poll: Poll;
  votes: PollVote[];
  me: string;
  onVote: (pollId: string, choice: string) => Promise<VoteResult>;
}) {
  const [sending, setSending] = useState("");
  const [error, setError] = useState("");
  const [showNames, setShowNames] = useState(false);

  const myVote = votes.find(v => v.memberId === me)?.choice ?? "";
  const total = votes.length;
  const locked = !isPollLive(poll);

  async function pick(choice: string) {
    if (locked || sending) return;
    setSending(choice);
    setError("");
    const res = await onVote(poll.id, choice);
    if (!res.ok) setError(res.error);
    setSending("");
  }

  return (
    <section
      className="stx-row"
      style={{
        background: "#1C1C1E",
        border: `1px solid ${locked ? "#38383A" : "rgba(229,184,75,0.35)"}`,
        borderRadius: 16,
        padding: 18,
        marginBottom: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 17 }}>🗳</span>
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.14em", color: locked ? "rgba(235,235,245,0.45)" : GOLD }}>
          {locked ? "終了した投票" : "投票してください"}
        </span>
        {!locked && !myVote && me && (
          <span style={{ fontSize: 10.5, fontWeight: 700, color: "#000", background: GOLD, borderRadius: 999, padding: "2px 8px" }}>
            未回答
          </span>
        )}
        {poll.deadline && (
          <span style={{ fontSize: 11, color: "rgba(235,235,245,0.45)", marginLeft: "auto" }}>締切 {poll.deadline}</span>
        )}
      </div>

      <h3 style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 900, fontSize: 17, lineHeight: 1.6, marginBottom: poll.note ? 6 : 14 }}>
        {poll.question}
      </h3>
      {poll.note && (
        <p style={{ fontSize: 12.5, color: "rgba(235,235,245,0.60)", lineHeight: 1.8, margin: "0 0 14px" }}>{poll.note}</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {poll.options.map(opt => {
          const got = votes.filter(v => v.choice === opt);
          const pct = total > 0 ? (got.length / total) * 100 : 0;
          const mine = myVote === opt;
          const disabled = locked || !!sending || !me;
          return (
            <button
              key={opt}
              onClick={() => pick(opt)}
              disabled={disabled}
              style={{
                display: "block", width: "100%", textAlign: "left", position: "relative",
                padding: "13px 14px", borderRadius: 12, overflow: "hidden",
                background: mine ? "rgba(229,184,75,0.14)" : "#2C2C2E",
                border: `1px solid ${mine ? GOLD : "#38383A"}`,
                color: "#fff",
                cursor: disabled ? (sending ? "wait" : "default") : "pointer",
              }}
            >
              {/* 得票率のバー（背景） */}
              <span style={{
                position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`,
                background: mine ? "rgba(229,184,75,0.20)" : "rgba(235,235,245,0.07)",
                transition: "width .35s",
              }} />
              <span style={{ position: "relative", display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ fontSize: 15, flexShrink: 0, color: mine ? GOLD : "rgba(235,235,245,0.30)" }}>
                  {mine ? "◉" : "○"}
                </span>
                <span style={{ fontSize: 14.5, fontWeight: mine ? 700 : 500, flex: 1, lineHeight: 1.5 }}>{opt}</span>
                <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 14, color: mine ? GOLD : "rgba(235,235,245,0.60)", flexShrink: 0 }}>
                  {sending === opt ? "…" : `${got.length}票`}
                </span>
              </span>
              {showNames && got.length > 0 && (
                <span style={{ position: "relative", display: "block", fontSize: 11.5, color: "rgba(235,235,245,0.60)", lineHeight: 1.7, marginTop: 6, paddingLeft: 24 }}>
                  {got.map(g => g.memberName || "（名前未設定）").join("・")}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error && <p style={{ fontSize: 12, color: "#FF453A", lineHeight: 1.7, margin: "10px 0 0" }}>{error}</p>}

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11.5, color: "rgba(235,235,245,0.45)" }}>
          {total}人が回答
          {locked ? "／この投票は終了しました" : myVote ? "／押し直すと変更できます" : ""}
        </span>
        {total > 0 && (
          <button
            onClick={() => setShowNames(v => !v)}
            style={{ marginLeft: "auto", background: "transparent", border: "none", color: GOLD, fontSize: 11.5, fontWeight: 700, cursor: "pointer", padding: 0 }}
          >
            {showNames ? "名前を隠す" : "誰が入れたか見る →"}
          </button>
        )}
      </div>

      {!me && !locked && (
        <p style={{ fontSize: 11.5, color: "rgba(235,235,245,0.45)", lineHeight: 1.7, marginTop: 8 }}>
          名簿と連携されていないため投票できません。管理者にご連絡ください。
        </p>
      )}
    </section>
  );
}
