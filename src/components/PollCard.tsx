"use client";
/**
 * 投票カード — 管理者が作った投票を表示して、その場で回答してもらう。
 *
 * 選択肢を押すとすぐ投票が入り、押し直せば変更できる（1人1票）。
 * 誰がどれに入れたかはチーム全員に見える方針のため、名前も出せるようにしている。
 * 締切を過ぎた投票・締め切られた投票は、結果だけ見られる状態にする。
 * 質問にも選択肢にも画像を付けられる（ユニフォームの案を見比べる用途など）。
 */
import { useState } from "react";
import { type PollOption, isPollLive } from "@/lib/polls";

export type Poll = {
  id: string;
  question: string;
  options: PollOption[];
  note: string;
  status: string;    // "open" | "closed"
  deadline: string;  // "YYYY-MM-DD"（空なら締切なし）
  createdAt: string;
  image?: string;    // 質問に添付した画像
};
export type PollVote = { pollId: string; memberId: string; memberName: string; choice: string };
export type VoteResult = { ok: true } | { ok: false; error: string };

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
  const [zoom, setZoom] = useState("");

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

      {/* 質問に添付された画像（タップで拡大） */}
      {poll.image && (
        <button
          onClick={() => setZoom(poll.image!)}
          style={{ display: "block", width: "100%", padding: 0, border: "none", background: "transparent", cursor: "zoom-in", marginBottom: 14 }}
        >
          {/* 解析結果や添付画像は外部URLのため next/image を使わない */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={poll.image} alt="" style={{ width: "100%", maxHeight: 260, objectFit: "cover", borderRadius: 12, display: "block" }} />
        </button>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {poll.options.map(opt => {
          const got = votes.filter(v => v.choice === opt.label);
          const pct = total > 0 ? (got.length / total) * 100 : 0;
          const mine = myVote === opt.label;
          const disabled = locked || !!sending || !me;
          return (
            <button
              key={opt.label}
              onClick={() => pick(opt.label)}
              disabled={disabled}
              style={{
                display: "block", width: "100%", textAlign: "left", position: "relative",
                padding: opt.image ? 0 : "13px 14px", borderRadius: 12, overflow: "hidden",
                background: mine ? "rgba(229,184,75,0.14)" : "#2C2C2E",
                border: `1px solid ${mine ? GOLD : "#38383A"}`,
                color: "#fff",
                cursor: disabled ? (sending ? "wait" : "default") : "pointer",
              }}
            >
              {/* 選択肢の画像（見比べられるよう大きめに出す） */}
              {opt.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={opt.image} alt="" style={{ width: "100%", height: 150, objectFit: "cover", display: "block" }} />
              )}
              <span style={{ position: "relative", display: "block", padding: opt.image ? "11px 14px 13px" : 0 }}>
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
                  <span style={{ fontSize: 14.5, fontWeight: mine ? 700 : 500, flex: 1, lineHeight: 1.5 }}>{opt.label}</span>
                  <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 14, color: mine ? GOLD : "rgba(235,235,245,0.60)", flexShrink: 0 }}>
                    {sending === opt.label ? "…" : `${got.length}票`}
                  </span>
                </span>
                {showNames && got.length > 0 && (
                  <span style={{ position: "relative", display: "block", fontSize: 11.5, color: "rgba(235,235,245,0.60)", lineHeight: 1.7, marginTop: 6, paddingLeft: 24 }}>
                    {got.map(g => g.memberName || "（名前未設定）").join("・")}
                  </span>
                )}
              </span>
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

      {/* 画像の拡大表示（どこを押しても閉じる） */}
      {zoom && (
        <div
          onClick={() => setZoom("")}
          style={{
            position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.92)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16, cursor: "zoom-out",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8 }} />
        </div>
      )}
    </section>
  );
}
