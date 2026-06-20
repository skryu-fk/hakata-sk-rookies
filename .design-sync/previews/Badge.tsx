import React from "react";
import { Badge } from "hakata-rookies";

/** 配色（red / gold / navy / neutral）。お知らせカテゴリやステータスに使う。 */
export const Tones = () => (
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
    <Badge tone="red">重要</Badge>
    <Badge tone="gold">成績</Badge>
    <Badge tone="navy">先発</Badge>
    <Badge tone="neutral">お知らせ</Badge>
  </div>
);

/** 淡色（soft）。背景になじませたいとき。 */
export const Soft = () => (
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
    <Badge tone="red" variant="soft">重要</Badge>
    <Badge tone="gold" variant="soft">成績</Badge>
    <Badge tone="navy" variant="soft">先発</Badge>
  </div>
);

/** アイコン付き（子要素に絵文字や記号を入れられる）。 */
export const WithIcon = () => (
  <Badge tone="red"><span aria-hidden>🌡️</span>熱中症対策</Badge>
);
