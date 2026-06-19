import React from "react";
import { colors, fonts } from "./tokens";

export type SectionHeadingProps = {
  /** 日本語の見出し（例: 「メンバー募集」） */
  jp: string;
  /** 英字のアイブロウ（例: 「Recruit」） */
  en: string;
  /** 暗い背景に置くとき true（文字を白に） */
  light?: boolean;
};

/**
 * セクション見出し。英字アイブロウ＋日本語タイトル＋赤いバーの3点セット。
 * サイト各セクションの先頭で使う共通の見出しパターン。
 */
export function SectionHeading({ jp, en, light = false }: SectionHeadingProps) {
  return (
    <div>
      <p
        style={{
          fontFamily: fonts.display,
          fontSize: 11,
          letterSpacing: "0.45em",
          color: colors.red,
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        {en}
      </p>
      <h2
        style={{
          fontFamily: fonts.sans,
          fontSize: "clamp(26px, 3.5vw, 42px)",
          fontWeight: 900,
          color: light ? colors.white : colors.navy,
          lineHeight: 1.1,
          margin: 0,
        }}
      >
        {jp}
      </h2>
      <div style={{ width: 44, height: 4, background: colors.red, marginTop: 14, borderRadius: 2 }} />
    </div>
  );
}
