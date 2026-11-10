"use client";

import { useCallback, useEffect, useState } from "react";
import { APP_VERSION } from "@/data/changelog";

/**
 * 新しい版が出ていることを知らせる帯
 *
 * ホーム画面に追加したアプリは、閉じたつもりでもメモリに残っていることが多く、
 * 新しい版を出しても古い画面のまま動き続ける。
 * 「直したはずなのに変わっていない」の正体はこれなので、
 * 画面のほうから気づいて、押すだけで新しくできるようにする。
 *
 * 見に行くのは、開いたときと、アプリに戻ってきたとき。
 * 定期的に叩くことはしない（電池と通信を使うため）。
 */
export default function UpdateBanner() {
  const [latest, setLatest] = useState("");
  const [reloading, setReloading] = useState(false);

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/app-version", { cache: "no-store" });
      const d = await res.json().catch(() => null);
      if (d?.ok && typeof d.version === "string") setLatest(d.version);
    } catch { /* 通信できないときは何も出さない */ }
  }, []);

  useEffect(() => {
    check();
    const onShow = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("focus", onShow);
    return () => {
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("focus", onShow);
    };
  }, [check]);

  if (!latest || latest === APP_VERSION || reloading) return null;

  async function update() {
    setReloading(true);
    // 通知用のService Workerしか使っていないが、将来に備えて置いておく
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } catch { /* 消せなくても読み込み直せば新しくなる */ }
    window.location.reload();
  }

  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 25,
      background: "linear-gradient(135deg,#E5B84B,#f0cf6a)",
      color: "#10131C", padding: "11px 14px",
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <span style={{ fontSize: 17, lineHeight: 1 }}>🆕</span>
      <div style={{ flex: 1, minWidth: 0, lineHeight: 1.5 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800 }}>新しいバージョン（v{latest}）があります</div>
        <div style={{ fontSize: 11.5, opacity: 0.75 }}>いまは v{APP_VERSION} を表示しています</div>
      </div>
      <button
        onClick={update}
        style={{
          flexShrink: 0, padding: "9px 16px", borderRadius: 8, border: "none",
          background: "#10131C", color: "#E5B84B", fontSize: 13, fontWeight: 800,
          cursor: "pointer",
        }}
      >更新する</button>
    </div>
  );
}
