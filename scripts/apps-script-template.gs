/**
 * 博多SKルーキーズ — 管理画面 ⇄ スプレッドシート 双方向API
 * （スタンドアロン版 — script.google.com から作る）
 *
 * 機能:
 *   - op="list"   : シートの全行を取得（rowIndex付き）
 *   - op="append" : 先頭(2行目)に行を追加（既定）
 *   - op="update" : rowIndex の行を上書き
 *   - op="delete" : rowIndex の行を削除
 *
 * 設定方法:
 *   1) https://script.google.com → 新しいプロジェクト
 *   2) この内容を全部貼り付け
 *   3) 下の SHEET_ID と PASSWORD を Vercel 環境変数と一致させる
 *   4) デプロイ → ウェブアプリ → アクセスは「全員」
 *   5) 出てきた URL を Vercel の APPS_SCRIPT_URL に登録
 *
 * 既存デプロイの更新時:
 *   - 「デプロイ」→「デプロイを管理」→ ✏️編集
 *   - バージョン → 「新しいバージョン」を選択
 *   - 「デプロイ」を押す（URL は変わらないので Vercel 側はいじらなくてOK）
 */

const SHEET_ID = "ここをスプレッドシートのIDに置き換える";
const PASSWORD = "ここをADMIN_PASSWORDと同じ値に置き換える";

const ALLOWED_SHEETS = ["news", "tweets", "blog", "practices"];

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(name);
  if (sh) return sh;
  sh = ss.insertSheet(name);
  if (name === "news")      sh.appendRow(["date", "category", "title", "body", "slug"]);
  else if (name === "tweets")    sh.appendRow(["date", "text", "url"]);
  else if (name === "blog")      sh.appendRow(["date", "category", "title", "excerpt", "content", "slug"]);
  else if (name === "practices") sh.appendRow(["date", "type", "place", "status", "time", "note"]);
  return sh;
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.password !== PASSWORD) {
      return jsonResponse({ ok: false, error: "auth" });
    }
    const sheetName = String(body.sheet || "");
    if (ALLOWED_SHEETS.indexOf(sheetName) === -1) {
      return jsonResponse({ ok: false, error: "unknown sheet" });
    }
    const op = String(body.op || "append");
    const sh = getOrCreateSheet(sheetName);

    if (op === "list") {
      const data = sh.getDataRange().getValues();
      // 1行目はヘッダ。データ部に rowIndex を付けて返す（rowIndex は 1-based の表行番号）。
      const rows = data.slice(1).map(function (row, i) {
        return {
          rowIndex: i + 2, // 2 = 最初のデータ行
          data: row.map(function (v) { return v == null ? "" : String(v); }),
        };
      });
      return jsonResponse({ ok: true, rows: rows });
    }

    if (op === "append") {
      const row = body.row;
      if (!Array.isArray(row)) return jsonResponse({ ok: false, error: "row required" });
      const numCols = Math.max(row.length, sh.getLastColumn());
      sh.insertRowsBefore(2, 1);
      const padded = row.slice();
      while (padded.length < numCols) padded.push("");
      sh.getRange(2, 1, 1, numCols).setValues([padded]);
      return jsonResponse({ ok: true });
    }

    if (op === "update") {
      const rowIndex = Number(body.rowIndex);
      const row = body.row;
      if (!rowIndex || rowIndex < 2) return jsonResponse({ ok: false, error: "bad rowIndex" });
      if (!Array.isArray(row)) return jsonResponse({ ok: false, error: "row required" });
      if (rowIndex > sh.getLastRow()) return jsonResponse({ ok: false, error: "rowIndex out of range" });
      const numCols = Math.max(row.length, sh.getLastColumn());
      const padded = row.slice();
      while (padded.length < numCols) padded.push("");
      sh.getRange(rowIndex, 1, 1, numCols).setValues([padded]);
      return jsonResponse({ ok: true });
    }

    if (op === "delete") {
      const rowIndex = Number(body.rowIndex);
      if (!rowIndex || rowIndex < 2) return jsonResponse({ ok: false, error: "bad rowIndex" });
      if (rowIndex > sh.getLastRow()) return jsonResponse({ ok: false, error: "rowIndex out of range" });
      sh.deleteRow(rowIndex);
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ ok: false, error: "unknown op" });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

function doGet() {
  return jsonResponse({ ok: true, hint: "POST only" });
}
