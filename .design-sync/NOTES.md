# design-sync メモ

## このリポジトリの性質
- これは Next.js 16 の **アプリ**であり、当初はデザインシステム（再利用コンポーネントライブラリ）ではなかった。
- Storybook なし / コンポーネント dist ビルドなし。`src/components/` はページ専用部品（next/image・サーバーデータ依存）。

## 方針（2026-06 ユーザー合意）
- まず `src/ds/` に **アプリ非依存の汎用表示コンポーネント＋トークン** を切り出して「デザインシステム化」する。
- 同期シェイプは **package**（Storybook は Next16+Tailwind v4 と相性が重いため、軽量 dist ビルドを採用予定）。

## ブランド・トークン（globals.css @theme 由来）
- navy #0b1e3f / navy-2 #142a52 / navy-3 #1c3866
- red #d10024 / red-2 #a80019
- gold #d4a82a
- base #f5f2ec / ink #131922 / muted #5b6373 / line #d8d4cb / line-2 #e8e4dc
- fonts: 本文=Zen Kaku Gothic New / 数字・見出し=Oswald / ティッカー=RocknRoll One

## Phase 2 でやること（未着手）
- `src/ds/` を esbuild で dist 化（`window.HakataDS.*` に公開）＋ styles.css（フォント@import＋トークン）
- design-sync を package shape で実行（プレビューは usage 例から作成）
