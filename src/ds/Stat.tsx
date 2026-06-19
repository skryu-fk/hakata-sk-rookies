import React from "react";
import { colors, fonts } from "./tokens";

export type StatProps = {
  /** 大きく見せる数値（例: "13", ".333"） */
  value: React.ReactNode;
  /** 数値の後ろの単位（例: "名", "本"） */
  unit?: string;
  /** 下のラベル（例: "Current Members"） */
  label: string;
  /** 暗い背景用（数値を金、ラベルを淡色に） */
  light?: boolean;
};

/**
 * スタッツ表示。ヒーローの「13名 / 2026 / 福岡市」や成績サマリの大きな数値に使う。
 */
export function Stat({ value, unit, label, light = false }: StatProps) {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontFamily: fonts.display,
          fontWeight: 700,
          lineHeight: 1,
          fontSize: "clamp(28px, 4vw, 44px)",
          color: light ? colors.gold : colors.navy,
        }}
      >
        {value}
        {unit && (
          <span style={{ fontSize: "0.42em", color: light ? "rgba(255,255,255,0.5)" : colors.muted, marginLeft: 4 }}>
            {unit}
          </span>
        )}
      </div>
      <div
        style={{
          fontFamily: fonts.display,
          fontSize: 10,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: light ? "rgba(255,255,255,0.4)" : colors.muted,
          marginTop: 6,
        }}
      >
        {label}
      </div>
    </div>
  );
}
