import React from "react";
import { colors, fonts } from "./tokens";

export type BadgeTone = "red" | "gold" | "navy" | "neutral";

export type BadgeProps = {
  /** 配色。カテゴリ・状態ラベルに使う */
  tone?: BadgeTone;
  /** 塗りつぶし(solid) か淡色(soft) か */
  variant?: "solid" | "soft";
  children: React.ReactNode;
};

function toneColors(tone: BadgeTone, variant: "solid" | "soft"): React.CSSProperties {
  const map: Record<BadgeTone, { base: string; on: string }> = {
    red: { base: colors.red, on: colors.white },
    gold: { base: colors.gold, on: colors.navy },
    navy: { base: colors.navy, on: colors.white },
    neutral: { base: colors.muted, on: colors.white },
  };
  const c = map[tone];
  if (variant === "soft") {
    return { background: `${c.base}1f`, color: c.base };
  }
  return { background: c.base, color: c.on };
}

/**
 * カテゴリ・ステータス用の小さなラベル（お知らせの「重要」「成績」など）。
 */
export function Badge({ tone = "red", variant = "solid", children }: BadgeProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontFamily: fonts.sans,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.08em",
        padding: "3px 9px",
        ...toneColors(tone, variant),
      }}
    >
      {children}
    </span>
  );
}
