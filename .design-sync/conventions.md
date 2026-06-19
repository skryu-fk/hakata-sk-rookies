# 博多SKルーキーズ デザインシステム

福岡市の草野球チーム「博多SKルーキーズ」のブランドUI。力強く、フラットで、スポーツらしい配色。
コンポーネントは `window.HakataDS.*`（`Button` / `Badge` / `Card` / `SectionHeading` / `Stat`）から使う。

## セットアップ（重要）
- **プロバイダー不要**。各コンポーネントは自己完結（インラインスタイル）で、ラッパー無しでそのまま配置できる。
- **`styles.css` を必ず読み込むこと**。ここでブランドフォント（Zen Kaku Gothic New / Oswald / RocknRoll One）を読み込み、トークンの CSS 変数（`--navy` `--red` `--gold` 等）を定義している。読み込まないとフォントがフォールバックになる。
- フォント役割：本文・見出し＝Zen Kaku Gothic New / 数値・英字ラベル＝Oswald / 装飾＝RocknRoll One。

## スタイリングの作法（このDSの語彙）
- **CSSクラスは使わない。スタイルは props で指定する**（utility class 体系ではない）。
- エージェント自身のレイアウト用の余白・整列は、インラインの CSS 変数を使う：
  `var(--navy)` `var(--red)` `var(--gold)` `var(--base)` `var(--ink)` `var(--muted)` `var(--line)`、
  フォントは `var(--font-zen)` / `var(--font-oswald)`。
- ブランド配色：紺 `#0b1e3f`（基調）/ 赤 `#d10024`（アクセント・CTA）/ 金 `#d4a82a`（強調・数値）/ ベージュ `#f5f2ec`（明るい背景）。

## コンポーネントごとの要点（props で制御）
- **Button** — `variant`: `primary`(赤) / `outline`(枠線) / `navy`(紺)、`size`: `sm`/`md`/`lg`、`href`(→`<a>`) か `onClick`(→`<button>`)、`block`、`disabled`。主要CTAは `primary` + `lg`。
- **Badge** — `tone`: `red`/`gold`/`navy`/`neutral`、`variant`: `solid`/`soft`。カテゴリ・ステータスラベル。
- **Card** — `tone`: `light`(白) / `dark`(紺背景内)、`accent`(左に赤バー)、`padding`。枠カード。
- **SectionHeading** — `en`(英字アイブロウ) + `jp`(日本語見出し) + 赤バー。暗い背景では `light`。各セクションの先頭に。
- **Stat** — `value` + `unit` + `label`。大きな数値表示（人数・成績）。暗い背景では `light`（数値が金色に）。

## 暗い背景での使い方
紺（`#0b1e3f`）など暗い背景に置くときは、`Card tone="dark"` / `SectionHeading light` / `Stat light` を使う。
明色版をそのまま暗背景に置くと文字が見えにくくなる。

## 真実のありか
- スタイル/トークン/フォント定義：バインドされた `styles.css` とその `@import`。
- 各コンポーネントのAPI：`<Name>.d.ts`（`<Name>Props`）。使い方例：各 `<Name>.prompt.md` と preview。

## 最小の組み立て例
```tsx
// 紺セクションの見出し＋CTA
<div style={{ background: "var(--navy)", padding: 48 }}>
  <SectionHeading en="Recruit" jp="メンバー募集" light />
  <p style={{ color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-zen)", margin: "16px 0 24px" }}>
    初心者大歓迎。一緒に野球を楽しむ仲間を募集中です。
  </p>
  <Button variant="primary" size="lg" href="#contact">メンバーに応募する →</Button>
</div>
```
