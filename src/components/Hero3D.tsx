"use client";

/**
 * ヒーロー3Dのゲート付き読み込み。
 * - SSRしない（WebGLはクライアント専用）
 * - デスクトップ幅 ＆ モーション許可 ＆ ある程度のCPUコア数 のときだけ3Dを出す
 *   （モバイル・低性能・モーション抑制では描画せず、SVG側にフォールバック）
 */
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false });

export default function Hero3D() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const wide = window.matchMedia("(min-width: 768px)").matches;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const cores = navigator.hardwareConcurrency ?? 4;
      // WebGL が使えるかも軽くチェック
      const canWebGL = (() => {
        try {
          const c = document.createElement("canvas");
          return !!(c.getContext("webgl2") || c.getContext("webgl"));
        } catch { return false; }
      })();
      setShow(wide && !reduced && cores >= 4 && canWebGL);
    } catch { /* 失敗時は出さない */ }
  }, []);

  if (!show) return null;
  return <HeroScene />;
}
