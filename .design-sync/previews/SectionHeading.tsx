import React from "react";
import { SectionHeading } from "hakata-rookies";

/** 明色背景（既定）。各セクションの先頭に置く見出し。 */
export const Default = () => (
  <div style={{ maxWidth: 520 }}>
    <SectionHeading en="Recruit" jp="メンバー募集" />
  </div>
);

/** いくつかのセクション名の例。 */
export const Examples = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 32, maxWidth: 520 }}>
    <SectionHeading en="News" jp="お知らせ" />
    <SectionHeading en="Activity" jp="活動概要" />
  </div>
);

/** 暗色背景用（light）。紺セクションの中で使う。 */
export const OnDark = () => (
  <div style={{ background: "#0b1e3f", padding: 28, maxWidth: 520 }}>
    <SectionHeading en="Schedule" jp="スケジュール" light />
  </div>
);
