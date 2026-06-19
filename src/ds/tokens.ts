/**
 * 博多SKルーキーズ デザインシステム — デザイントークン
 *
 * アプリ全体のブランド値の単一ソース。コンポーネントはこの値だけを参照し、
 * 色やフォントを直書きしない。globals.css の @theme と一致させること。
 *
 * フォントはアプリ内では next/font の CSS 変数（--font-zen 等）が入るが、
 * 単体描画（デザインツール）でも崩れないよう実フォント名をフォールバックに含める。
 */

export const colors = {
  navy: "#0b1e3f",
  navy2: "#142a52",
  navy3: "#1c3866",
  red: "#d10024",
  red2: "#a80019",
  gold: "#d4a82a",
  base: "#f5f2ec",
  white: "#ffffff",
  ink: "#131922",
  muted: "#5b6373",
  line: "#d8d4cb",
  line2: "#e8e4dc",
} as const;

export const fonts = {
  /** 本文・見出し（日本語） */
  sans: "var(--font-zen), 'Zen Kaku Gothic New', system-ui, sans-serif",
  /** 数字・英字の見出し（スタッツ等） */
  display: "var(--font-oswald), 'Oswald', system-ui, sans-serif",
  /** ティッカー等の装飾 */
  ticker: "var(--font-rocknroll), 'RocknRoll One', system-ui, sans-serif",
} as const;

export const radius = {
  none: 0,
  sm: 2,
  md: 4,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 18,
  xl: 22,
} as const;

export type ColorToken = keyof typeof colors;
