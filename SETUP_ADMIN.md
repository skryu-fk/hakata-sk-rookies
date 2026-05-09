# 管理画面（/admin）セットアップ手順

サイトの `/admin` から、お知らせ・ツイートを追加して即時反映できるようにする手順です。
1回だけ設定すれば、以降はずっと使えます。

---

## 全体像

```
[管理画面 /admin]
    ↓ POST (パスワード付き)
[Vercel /api/admin/append]
    ↓ 認証 → 転送
[Apps Script Web App]
    ↓ スプレッドシートに行追記
[Google スプレッドシート]
    ↓ ISR で再取得（即時 revalidate）
[サイトに反映]
```

---

## 手順

### ① パスワードを決める

管理画面のログイン用パスワードです。**16文字以上の推測されにくい文字列**にしてください。
例: `r0ok1es-fuk-2026-yT8q` 

このあと **Vercel と Apps Script の両方に同じ値** を設定します。

### ② Apps Script を作る

1. **`SHEETS_ID` で使っている Google スプレッドシート**を開く
2. メニュー: **拡張機能 → Apps Script**
3. 開いたエディタの **`Code.gs` の中身を全部削除**
4. リポジトリの `scripts/apps-script-template.gs` の内容をコピー＆ペースト
5. 上の方にある定数を書き換え:
   ```js
   const PASSWORD = "（①で決めたパスワード）";
   ```
6. 💾 保存（Ctrl+S）
7. 右上 **「デプロイ」** → **「新しいデプロイ」**
8. 設定:
   - 種類: **ウェブアプリ**
   - 説明: 任意（例：`hakata-admin-v1`）
   - 次のユーザーとして実行: **自分**
   - アクセスできるユーザー: **全員**
     > ⚠️「全員」になりますが、パスワード一致がないと弾かれるので外には公開されません
9. 「デプロイ」を押す → 初回はGoogleアカウント認証が出るので承認
10. 表示された **ウェブアプリURL**（`https://script.google.com/macros/s/.../exec`）を控える

### ③ Vercel に環境変数を設定

Vercel ダッシュボード → プロジェクト → **Settings → Environment Variables** に追加:

| Key | Value | 環境 |
|---|---|---|
| `ADMIN_PASSWORD` | ①で決めたパスワード | Production, Preview, Development 全部 |
| `APPS_SCRIPT_URL` | ②-10 のURL | Production, Preview, Development 全部 |

### ④ Vercel を再デプロイ

Deployments → 最新の右の「⋯」 → **Redeploy**

### ⑤ 動作確認

1. `/admin` にアクセス
2. パスワード入力
3. お知らせタブで適当に1件入力 → 送信
4. トップの「お知らせ」セクションに即反映されればOK

---

## 使い方

### お知らせを追加する

1. `/admin` を開いてパスワード入力
2. 「お知らせ」タブを選ぶ
3. 日付・カテゴリ・タイトルを入力
4. **本文を書くと「詳しく →」付きでクリック可能になる**（詳細ページ自動生成）
5. 本文の書式:
   - 改行: そのまま改行
   - 段落: 空行を1つ入れる
   - 太字: `**ここが太字**`
   - リンク: `[表示テキスト](https://example.com)`
6. 送信

### ツイートを追加する

1. Xに投稿後、サイトトップに載せたい投稿を選ぶ
2. `/admin` の「ツイート」タブ
3. 日付・本文・該当ツイートのURL（任意）を入力
4. 送信

URLを入れるとカードがリンクになり、クリックでXの元投稿に飛びます。

---

## トラブルシューティング

### パスワードが違いますと出る

- Vercelの `ADMIN_PASSWORD` と入力したパスワードが一致しているか確認
- 環境変数を変更した場合は **再デプロイ必須**

### 「APPS_SCRIPT_URL が未設定です」と出る

- Vercel に `APPS_SCRIPT_URL` を登録 → 再デプロイ

### 「Apps Script でエラー (HTTP 401)」と出る

- Apps Script 内の `PASSWORD` 定数と Vercel の `ADMIN_PASSWORD` が一致しているか確認
- Apps Script を編集したら **再デプロイ**（既存のデプロイを「管理」→「編集」→ バージョン: 新しいバージョン → デプロイ）

### 反映されない

- スプレッドシートを開いて、行が追加されているか確認
  - 追加されてない → Apps Script 側の問題
  - 追加されてる → 5分待つか、Vercel で Redeploy

### 管理画面のURLを他人に教えたくない

- `/admin` は `robots.txt` で検索エンジン除外済み
- パスワード認証があるので、URL を知っていても入れません
- それでも心配なら Vercel の Password Protection（Pro プラン）も検討
