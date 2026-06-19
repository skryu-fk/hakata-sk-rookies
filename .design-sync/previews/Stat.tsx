import React from "react";
import { Stat } from "hakata-rookies";

/** 単体のスタッツ。 */
export const Default = () => <Stat value="13" unit="名" label="Current Members" />;

/** 横並び（ヒーローの「13名 / 2026 / 福岡市」のような並び）。 */
export const Row = () => (
  <div style={{ display: "flex", gap: 32 }}>
    <Stat value="13" unit="名" label="Members" />
    <Stat value="2026" label="Founded" />
    <Stat value="福岡市" label="Base City" />
  </div>
);

/** 暗色背景用（light）。数値が金色、ラベルが淡色になる。 */
export const OnDark = () => (
  <div style={{ background: "#0b1e3f", padding: 28, display: "flex", gap: 32 }}>
    <Stat value=".333" label="AVG" light />
    <Stat value="12" unit="本" label="Home Runs" light />
    <Stat value="2.45" label="ERA" light />
  </div>
);
