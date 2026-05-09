/**
 * 博多SKルーキーズ — 管理画面 → スプレッドシート 書き込み用 Apps Script
 *
 * 設定方法:
 *   1) Google スプレッドシートを開く
 *   2) 拡張機能 → Apps Script
 *   3) 開いたエディタの中身をすべて削除して、このファイルの内容を貼り付け
 *   4) 下の PASSWORD を、Vercel に設定する ADMIN_PASSWORD と同じ値に書き換え
 *   5) 右上「デプロイ」→「新しいデプロイ」
 *      - 種類: ウェブアプリ
 *      - 説明: 任意（例: hakata-admin）
 *      - 次のユーザーとして実行: 自分
 *      - アクセスできるユーザー: 全員
 *      （※「全員」でもパスワード一致がないと弾かれるので外には公開されません）
 *   6) 表示された URL（https://script.google.com/macros/s/.../exec）を Vercel の
 *      環境変数 APPS_SCRIPT_URL に設定
 *   7) Vercel で再デプロイ → /admin から送信テスト
 */

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
    if (!["news", "tweets"].includes(sheetName)) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: "unknown sheet" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sh = ss.getSheetByName(sheetName);
    if (!sh) {
      // 無ければ作る
      sh = ss.insertSheet(sheetName);
      if (sheetName === "news") {
        sh.appendRow(["date", "category", "title", "body", "slug"]);
      } else if (sheetName === "tweets") {
        sh.appendRow(["date", "text", "url"]);
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
