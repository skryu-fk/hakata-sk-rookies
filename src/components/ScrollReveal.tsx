"use client";

import { useEffect } from "react";

/**
 * ScrollReveal
 * クライアントコンポーネント。マウント後に IntersectionObserver を起動し、
 * .reveal / .reveal-left / .reveal-right クラスを持つ要素が
 * ビューポートに入ったタイミングで .visible を付与します。
 * DOM を描画しません（null を返します）。
 */
export default function ScrollReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const delay = Number(el.dataset.delay ?? 0);
            setTimeout(() => el.classList.add("visible"), delay);
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.12 }
    );

    const observe = () => {
      document
        .querySelectorAll<HTMLElement>(".reveal, .reveal-left, .reveal-right")
        .forEach((el) => io.observe(el));
    };

    // React のハイドレーション完了後に少し遅らせて登録
    const t1 = setTimeout(observe, 300);
    const t2 = setTimeout(observe, 900); // 遅延マウントのコンポーネント向け

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      io.disconnect();
    };
  }, []);

  return null;
}
