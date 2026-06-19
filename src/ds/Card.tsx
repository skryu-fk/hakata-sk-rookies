import React from "react";
import { colors } from "./tokens";

export type CardProps = {
  /** 明色(light, 白背景) か 暗色(dark, 紺背景) か */
  tone?: "light" | "dark";
  /** 左に赤いアクセントバーを出す */
  accent?: boolean;
  /** 内側余白 */
  padding?: number;
  children: React.ReactNode;
};

/**
 * ブランドの基本カード。チーム紹介・スポンサー・活動カードなどの枠。
 */
export function Card({ tone = "light", accent = false, padding = 28, children }: CardProps) {
  const isLight = tone === "light";
  return (
    <div
      style={{
        background: isLight ? colors.white : "rgba(255,255,255,0.03)",
        border: `1px solid ${isLight ? colors.line2 : "rgba(255,255,255,0.09)"}`,
        borderLeft: accent ? `4px solid ${colors.red}` : undefined,
        color: isLight ? colors.ink : colors.white,
        padding,
      }}
    >
      {children}
    </div>
  );
}
