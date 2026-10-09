"use client";

/**
 * スコアボードの「更新」ボタン
 *
 * 公開サイトは5分間キャッシュ（ISR）されるので、管理画面で記録した直後は
 * まだ古い内容が出ていることがある。本家と同じ位置に更新ボタンを置いて、
 * その場で読み直せるようにしている。
 */
export default function ScoreboardRefresh() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: "transparent", border: "1px solid rgba(255,255,255,0.5)",
        borderRadius: 999, color: "#fff", cursor: "pointer",
        fontFamily: "var(--font-zen),sans-serif", fontSize: 11.5, fontWeight: 700,
        padding: "5px 13px",
      }}
      aria-label="スコアボードを更新する"
    >
      <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2.4} aria-hidden>
        <path d="M20 12a8 8 0 1 1-2.3-5.6" strokeLinecap="round" />
        <path d="M20 4v5h-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      更新
    </button>
  );
}
