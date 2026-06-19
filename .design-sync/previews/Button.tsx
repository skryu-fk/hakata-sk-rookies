import React from "react";
import { Button } from "hakata-rookies";

/** 主要CTA。サイトの「メンバーに応募する」ボタン。 */
export const Primary = () => <Button variant="primary" size="lg" href="#contact">メンバーに応募する →</Button>;

/** 配色バリエーション（primary / outline / navy）。 */
export const Variants = () => (
  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
    <Button variant="primary">応募する →</Button>
    <Button variant="outline">チームを知る</Button>
    <Button variant="navy">お問い合わせ</Button>
  </div>
);

/** サイズ（sm / md / lg）。 */
export const Sizes = () => (
  <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
    <Button variant="primary" size="sm">SM</Button>
    <Button variant="primary" size="md">MD</Button>
    <Button variant="primary" size="lg">LG</Button>
  </div>
);

/** 横幅いっぱい（block）。フォーム送信などに使う。 */
export const Block = () => (
  <div style={{ width: 320 }}>
    <Button variant="primary" block>応募フォームへ →</Button>
  </div>
);

/** 無効状態。 */
export const Disabled = () => <Button variant="primary" disabled>送信中…</Button>;
