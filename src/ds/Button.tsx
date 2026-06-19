import React from "react";
import { colors, fonts } from "./tokens";

export type ButtonVariant = "primary" | "outline" | "navy";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = {
  /** ボタンの見た目。primary=赤 / outline=枠線 / navy=紺 */
  variant?: ButtonVariant;
  /** サイズ */
  size?: ButtonSize;
  /** href を渡すと <a>、無ければ <button> として描画 */
  href?: string;
  /** クリックハンドラ（button 時） */
  onClick?: () => void;
  /** 横幅いっぱいに広げる */
  block?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
};

const SIZES: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: "8px 16px", fontSize: 13 },
  md: { padding: "13px 28px", fontSize: 14 },
  lg: { padding: "15px 32px", fontSize: 15 },
};

function variantStyle(variant: ButtonVariant): React.CSSProperties {
  switch (variant) {
    case "outline":
      return { background: "transparent", color: colors.navy, border: `2px solid ${colors.navy}` };
    case "navy":
      return { background: colors.navy, color: colors.white, border: "2px solid transparent" };
    case "primary":
    default:
      return { background: colors.red, color: colors.white, border: "2px solid transparent" };
  }
}

/**
 * ブランドの基本ボタン。チーム共通の CTA（「メンバーに応募する →」等）に使う。
 */
export function Button({
  variant = "primary",
  size = "md",
  href,
  onClick,
  block = false,
  disabled = false,
  children,
}: ButtonProps) {
  const style: React.CSSProperties = {
    display: block ? "flex" : "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: block ? "100%" : undefined,
    fontFamily: fonts.sans,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    transition: "background 0.2s, border-color 0.2s, transform 0.2s",
    ...SIZES[size],
    ...variantStyle(variant),
  };

  if (href) {
    return (
      <a href={href} style={style} aria-disabled={disabled}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={style}>
      {children}
    </button>
  );
}
