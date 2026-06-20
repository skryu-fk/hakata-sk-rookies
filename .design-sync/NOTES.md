# design-sync メモ

## このリポジトリの性質
- これは Next.js 16 の **アプリ**であり、当初はデザインシステム（再利用コンポーネントライブラリ）ではなかった。
- Storybook なし。`src/components/` はページ専用部品（next/image・サーバーデータ依存）。
- そこで `src/ds/` に **アプリ非依存の汎用表示コンポーネント＋トークン** を切り出してデザインシステム化した。

## 現状（sync 済み）
- 同期シェイプ = **package**。
- `npm run build:ds`（= `tsc -p tsconfig.ds.json`）で `ds-dist/` に ESM + `.d.ts` を出力。
- converter エントリ: **`./ds-dist/index.js`**、globalName = **`HakataDS`**。
- cssEntry = `src/ds/styles.css`（ブランドフォントの @import ＋ トークンの CSS 変数）。
- プレビュー（`.design-sync/previews/*.tsx`）作成済み。import は規約どおり `'hakata-rookies'`（→ `window.HakataDS` にシムされる）。
- conventions.md 作成済み（`readmeHeader` に設定）。
- **2026-06-21: claude.ai/design への初回アップロード完了。** プロジェクト「博多SKルーキーズ デザインシステム」（`projectId: 841978ec-0f53-4e2d-ba08-dccd7b979a7a`）に Badge/Button/Card/SectionHeading/Stat の5コンポーネント（全カードプレビューを採点済み・全て `good`）をアップロード済み。`https://claude.ai/design/p/841978ec-0f53-4e2d-ba08-dccd7b979a7a`

## ⚠️ 解決済みの過去の問題（記録として）
- 以前の環境では `/design-login`・`/login` が無く DesignSync ツールを認可できなかったため、`config.json` に `projectId: 6c4f8153-...` が記録されていたが、実際には `create_project` が一度も成功しておらず**存在しないプロジェクトID**だった。今回の sync で `get_project` が 404 を返したことで判明し、新規プロジェクトを作成して projectId を上記に更新した。
- 教訓: `projectId` が config にあっても、`DesignSync(get_project)` で実在を確認するまで信用しない（base SKILL.md §1 の手順どおり）。

## 同期コマンド（認可可能な環境で）
```
node .ds-sync/package-build.mjs --config .design-sync/config.json --node-modules ./node_modules \
  --entry ./ds-dist/index.js --out ./ds-bundle
node .ds-sync/package-validate.mjs ./ds-bundle
```
（実際は `/design-sync` スキルが上記を内部で実行する）

## ブランド・トークン（globals.css @theme 由来）
- navy #0b1e3f / red #d10024 / gold #d4a82a / base #f5f2ec / ink #131922 / muted #5b6373 / line #d8d4cb
- fonts: 本文=Zen Kaku Gothic New / 数字・英字=Oswald / 装飾=RocknRoll One

## Re-sync リスク / 次の同期が見るべき点
- **フォント**: `src/ds/styles.css` は Google Fonts の remote `@import`。validate で `[FONT_REMOTE]`（情報）になる想定。完全自己完結にしたい場合は woff2 を同梱して `extraFonts` に設定。
- **CSS**: コンポーネントはインラインスタイルのみ（コンポーネントCSSなし）→ validate で `[CSS_RUNTIME]`（非ブロッキング）になる想定。
- **コンポーネント発見**: `index.d.ts` の PascalCase 値エクスポートは Button/Badge/Card/SectionHeading/Stat の5つ。型エクスポート（`ButtonProps` 等）や lowercase の `colors`/`fonts` を誤って拾う場合は `componentSrcMap` で除外する。
- **プレビューの描画チェック（Chromium）と採点はこの環境では未実施**。同期する環境で playwright/chromium を入れて検証・採点する。
- tsconfig から `.design-sync` / `ds-dist` 等を exclude 済み（previews の `'hakata-rookies'` import が `next build` を壊さないように）。
