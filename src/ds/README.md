# 博多SKルーキーズ デザインシステム（`src/ds`）

サイトのブランド（色・フォント・基本UI）を、**アプリやデータに依存しない再利用コンポーネント**として切り出したもの。
将来 `design-sync` で Claude Design に取り込めるよう、各コンポーネントは単体で描画できる（next/image・サーバーデータ・ルーティング非依存。スタイルはインラインでトークン参照）。

## トークン（`tokens.ts`）
- 色: `navy #0b1e3f` / `red #d10024` / `gold #d4a82a` / `base #f5f2ec` / `ink` / `muted` / `line`
- フォント: 本文=Zen Kaku Gothic New / 数字・英字見出し=Oswald / 装飾=RocknRoll One

## コンポーネント
| 名前 | 用途 |
|---|---|
| `Button` | CTA。`variant` = primary(赤)/outline/navy、`size`、`href` or `onClick` |
| `Badge` | カテゴリ・状態ラベル。`tone` = red/gold/navy/neutral、`variant` = solid/soft |
| `Card` | 枠カード。`tone` = light/dark、`accent`（赤バー） |
| `SectionHeading` | 英字アイブロウ＋日本語見出し＋赤バー。`light`で暗背景対応 |
| `Stat` | 大きな数値＋単位＋ラベル（スタッツ表示）。`light`で暗背景対応 |

## 使い方
```tsx
import { Button, Badge, Card, SectionHeading, Stat, colors } from "@/ds";

<SectionHeading en="Recruit" jp="メンバー募集" />
<Button variant="primary" size="lg" href="#contact">メンバーに応募する →</Button>
<Badge tone="red">重要</Badge>
<Stat value="13" unit="名" label="Current Members" />
```

## 今後（Phase 2）
- `src/ds` を esbuild で dist 化（`window.HakataDS.*` に公開）＋ フォント@importを含む `styles.css`
- `design-sync`（package shape）で Claude Design に同期
