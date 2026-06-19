import React from "react";
import { Card, Badge } from "hakata-rookies";

/** 明色カード（白背景）。チーム紹介・活動カードの枠。 */
export const Light = () => (
  <div style={{ maxWidth: 360 }}>
    <Card tone="light">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Badge tone="gold">活動報告</Badge>
        <span style={{ fontSize: 12, color: "#5b6373" }}>2026.06.10</span>
      </div>
      <h3 style={{ fontFamily: "var(--font-zen)", fontWeight: 900, fontSize: 18, color: "#0b1e3f", margin: "0 0 8px" }}>
        5月の活動まとめ
      </h3>
      <p style={{ fontSize: 14, color: "#3a3f4a", lineHeight: 1.8, margin: 0 }}>
        球場練習3回・公園練習5回。新メンバーも加わって、にぎやかな1ヶ月でした。
      </p>
    </Card>
  </div>
);

/** 赤アクセントバー付き。重要な内容の強調に。 */
export const Accent = () => (
  <div style={{ maxWidth: 360 }}>
    <Card tone="light" accent>
      <h3 style={{ fontFamily: "var(--font-zen)", fontWeight: 900, fontSize: 16, color: "#0b1e3f", margin: "0 0 6px" }}>
        会費改定のお知らせ
      </h3>
      <p style={{ fontSize: 13, color: "#3a3f4a", lineHeight: 1.7, margin: 0 }}>
        2026年8月分より月会費を1,000円に改定します。
      </p>
    </Card>
  </div>
);

/** 暗色カード（紺背景）。ダークなセクション内で使う。 */
export const Dark = () => (
  <div style={{ maxWidth: 360, background: "#0b1e3f", padding: 20 }}>
    <Card tone="dark">
      <h3 style={{ fontFamily: "var(--font-zen)", fontWeight: 900, fontSize: 16, color: "#fff", margin: "0 0 6px" }}>
        近日の練習
      </h3>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, margin: 0 }}>
        6/14（土）東平尾公園 18:00〜
      </p>
    </Card>
  </div>
);
