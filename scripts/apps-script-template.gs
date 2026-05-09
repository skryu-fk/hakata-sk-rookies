/**
 * 博多SKルーキーズ — 管理画面 → スプレッドシート 書き込み用 Apps Script
 * （スタンドアロン版 — script.google.com から直接プロジェクトを作って使う）
 *
 * 設定方法:
 *   1) https://script.google.com を開く
 *   2) 「新しいプロジェクト」をクリック
 *   3) 開いたエディタの中身をすべて削除して、このファイルの内容を貼り付け
 *   4) 下の SHEET_ID を、Vercel の SHEETS_ID と同じ値に書き換え
 *      （スプレッドシートURL `.../spreadsheets/d/XXXXXX/edit` の XXXXXX 部分）
 *   5) 下の PASSWORD を、Vercel の ADMIN_PASSWORD と同じ値に書き換え
 *   6) 💾 保存（Ctrl+S）→ プロジェクト名を聞かれたら任意で（例：hakata-admin）
 *   7) 右上「デプロイ」→「新しいデプロイ」
 *      - ⚙️ 種類の選択 → ウェブアプリ
 *      - 説明: 任意
 *      - 次のユーザーとして実行: 自分
 *      - アクセスできるユーザー: 全員
 *      （※「Google アカウントを持つ全員」ではなく「全員」を選ぶ）
 *   8) 「デプロイ」を押す → 初回は権限の確認画面が出るので
 *      「アクセスを承認」→ アカウント選択 → 「詳細」→「（プロジェクト名）に移動（安全ではないページ）」
 *      → 「許可」 を順に押す
 *   9) 表示された URL（https://script.google.com/macros/s/.../exec）を Vercel の
 *      環境変数 APPS_SCRIPT_URL に設定 → Redeploy → /admin から送信テスト
 */

const SHEET_ID = "ここをスプレッドシートのIDに置き換える";
const PASSWORD = "ここをADMIN_PASSWORDと同じ値に置き換える";

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.password !== PASSWORD) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: "auth" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const sheetName = String(body.sheet || "");
    const row = body.row;
    if (!Array.isArray(row)) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: "row required" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (!["news", "tweets", "blog", "practices"].includes(sheetName)) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: "unknown sheet" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sh = ss.getSheetByName(sheetName);
    if (!sh) {
      // 無ければ作る
      sh = ss.insertSheet(sheetName);
      if (sheetName === "news") {
        sh.appendRow(["date", "category", "title", "body", "slug"]);
      } else if (sheetName === "tweets") {
        sh.appendRow(["date", "text", "url"]);
      } else if (sheetName === "blog") {
        sh.appendRow(["date", "category", "title", "excerpt", "content", "slug"]);
      } else if (sheetName === "practices") {
        sh.appendRow(["date", "type", "place", "status", "time", "note"]);
      }
    }

    // 新しい行を一番上 (2行目) に挿入する。
    // 1行目はヘッダなので、データ部の先頭に並ぶようにする。
    const numCols = Math.max(row.length, sh.getLastColumn());
    sh.insertRowsBefore(2, 1);
    const r = sh.getRange(2, 1, 1, numCols);
    const padded = row.slice();
    while (padded.length < numCols) padded.push("");
    r.setValues([padded]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, hint: "POST only" }))
    .setMimeType(ContentService.MimeType.JSON);
}
