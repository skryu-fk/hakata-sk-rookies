"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 数字の入力欄
 *
 * ふつうの <input type="number" value={0}> は「0」が入った状態で表示されるので、
 * そこに 1 を打つと「01」になってしまう。消してから打ち直すのが地味に面倒で、
 * 記録をつけている最中にいちいち止まる原因になっていた。
 *
 * ここでは
 *   - 中身は文字列で持ち、入力中はそのまま見せる（勝手に書き換えない）
 *   - 触った瞬間に全選択するので、打てばそのまま置き換わる
 *   - 先頭の 0 は自動で落とす（"01" → "1"）
 *   - 空にしたら 0 として扱う（入力中は空のままにしておく）
 * という形にして、「0 を消す」作業が要らないようにしている。
 */
export default function NumberField({
  value,
  onChange,
  min = 0,
  max,
  style,
  className,
  placeholder,
  disabled,
  "aria-label": ariaLabel,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  style?: React.CSSProperties;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const [text, setText] = useState(String(value));
  const focused = useRef(false);

  // 外から値が変わったときは表示も合わせる。
  // ただし入力中は触らない（打っている途中で書き換わると打ちにくいため）。
  useEffect(() => {
    if (!focused.current) setText(String(value));
  }, [value]);

  function clamp(n: number): number {
    let v = n;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    return v;
  }

  function handleChange(raw: string) {
    // 数字とマイナスだけ残す（全角で打たれても拾えるように半角へ寄せる）
    const half = raw.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
    let cleaned = half.replace(/[^\d-]/g, "");
    // マイナスは先頭の1つだけ有効
    const neg = cleaned.startsWith("-") && (min === undefined || min < 0);
    cleaned = cleaned.replace(/-/g, "");
    // 先頭の 0 を落とす。"007" → "7"、"000" → "0"
    cleaned = cleaned.replace(/^0+(?=\d)/, "");
    const shown = (neg ? "-" : "") + cleaned;
    setText(shown);
    if (cleaned === "") { onChange(clamp(0)); return; }
    const n = Number(shown);
    if (Number.isFinite(n)) onChange(clamp(n));
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={text}
      placeholder={placeholder}
      disabled={disabled}
      aria-label={ariaLabel}
      className={className}
      style={style}
      onFocus={e => { focused.current = true; e.currentTarget.select(); }}
      onBlur={e => {
        focused.current = false;
        // 空のまま離れたら 0 に戻す
        const n = e.currentTarget.value === "" ? clamp(0) : clamp(Number(e.currentTarget.value) || 0);
        setText(String(n));
        onChange(n);
      }}
      onChange={e => handleChange(e.target.value)}
    />
  );
}
