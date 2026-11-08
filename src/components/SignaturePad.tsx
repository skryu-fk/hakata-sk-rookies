"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 指で書く署名欄
 *
 * スマホで書けることを前提にしている:
 *   - touch-action: none にしないと、なぞった瞬間にページがスクロールして線が引けない
 *   - Pointer Events を使い、指・ペン・マウスを同じ処理で扱う
 *   - 画面の解像度（devicePixelRatio）に合わせて実ピクセルを増やす。
 *     これをしないと、線がぼやけて署名として読めない画像になる。
 *
 * 書き終えるたびに PNG のデータURLを onChange に渡す。
 * 透過PNGだと印刷したときに線が見えないことがあるため、白地で書き出す。
 */
export default function SignaturePad({
  value,
  onChange,
  height = 150,
  placeholder = "ここに指で署名してください",
}: {
  value: string;
  onChange: (dataUrl: string) => void;
  height?: number;
  placeholder?: string;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(!value);

  /** 画面サイズに合わせてキャンバスを作り直す（中身は消える） */
  const setup = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const w = wrap.clientWidth;
    if (!w) return;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, height);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111111";
  }, [height]);

  useEffect(() => {
    setup();
    // 画面の回転や、折り返しで幅が変わったときだけ作り直す
    let w = wrapRef.current?.clientWidth ?? 0;
    const ro = new ResizeObserver(() => {
      const next = wrapRef.current?.clientWidth ?? 0;
      if (Math.abs(next - w) < 2) return;
      w = next;
      setup();
      setEmpty(true);
      onChange("");
    });
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
    // onChange は毎回変わりうるので依存に入れない（入れると描いた線が消える）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setup]);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
    // 点だけ打って終わる「・」も残るようにする
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && last.current) {
      ctx.beginPath();
      ctx.arc(last.current.x, last.current.y, 1.1, 0, Math.PI * 2);
      ctx.fillStyle = "#111111";
      ctx.fill();
    }
    setEmpty(false);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    const p = pos(e);
    if (!ctx || !last.current) return;
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  }

  function up() {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL("image/png"));
  }

  function clear() {
    setup();
    setEmpty(true);
    onChange("");
  }

  return (
    <div ref={wrapRef}>
      <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid #48484A", background: "#fff" }}>
        <canvas
          ref={canvasRef}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onPointerLeave={up}
          style={{ display: "block", touchAction: "none", cursor: "crosshair" }}
        />
        {empty && (
          <span style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none", color: "#9b9b9b", fontSize: 13,
          }}>{placeholder}</span>
        )}
        {/* 署名の基準線。まっすぐ書きやすくするだけで、画像にも入る */}
        <span style={{
          position: "absolute", left: 18, right: 18, bottom: Math.round(height * 0.25),
          height: 1, background: "#e2e2e2", pointerEvents: "none",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
        <span style={{ fontSize: 11, color: "rgba(235,235,245,0.45)" }}>指でなぞって書いてください</span>
        <button type="button" onClick={clear}
          style={{ background: "transparent", border: "1px solid #48484A", color: "rgba(235,235,245,0.75)", borderRadius: 8, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>
          書き直す
        </button>
      </div>
    </div>
  );
}
