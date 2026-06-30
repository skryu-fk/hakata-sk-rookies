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

const ALLOWED_SHEETS = ["news", "tweets", "blog", "practices", "members", "attendance", "batting", "lineups", "games", "payments", "participants", "pitching", "catching", "fielding", "probables", "subscriptions", "announcements", "settings", "pending", "accounts"];

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * セルの値を文字列に変換する。
 * Google Sheets の Date 型セルは Apps Script では Date オブジェクトとして返るため、
 * 単に String() すると "Fri May 29 2026 00:00:00 GMT+0900 (Japan Standard Time)" のような
 * 表示困難な文字列になる。Date は "YYYY-MM-DD" に明示変換する。
 */
function cellToString(v) {
  if (v == null) return "";
  if (Object.prototype.toString.call(v) === "[object Date]" && !isNaN(v.getTime())) {
    var y = v.getFullYear();
    var m = v.getMonth() + 1;
    var d = v.getDate();
    return y + "-" + (m < 10 ? "0" + m : m) + "-" + (d < 10 ? "0" + d : d);
  }
  return String(v);
}

function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(name);
  if (sh) return sh;
  sh = ss.insertSheet(name);
  if (name === "news")            sh.appendRow(["date", "category", "title", "body", "slug"]);
  else if (name === "tweets")     sh.appendRow(["date", "text", "url"]);
  else if (name === "blog")       sh.appendRow(["date", "category", "title", "excerpt", "content", "slug"]);
  else if (name === "practices")  sh.appendRow(["date", "type", "place", "status", "time", "note"]);
  else if (name === "members")    sh.appendRow(["id", "name", "nickname", "jerseyNumber", "position", "joinedDate", "active"]);
  else if (name === "attendance") sh.appendRow(["date", "memberId", "memberName", "status", "note"]);
  else if (name === "batting")    sh.appendRow(["date", "memberId", "memberName", "opponent", "atBats", "hits", "doubles", "triples", "hr", "rbi", "bb", "so", "hbp", "sh", "sb", "cs"]);
  else if (name === "lineups")    sh.appendRow(["id", "date", "team", "order", "memberId", "memberName", "position"]);
  else if (name === "games")      sh.appendRow(["id", "date", "homeTeam", "awayTeam", "homeScores", "awayScores", "homeHits", "awayHits", "homeErrors", "awayErrors", "winner", "note"]);
  else if (name === "payments")   sh.appendRow(["id", "date", "memberId", "memberName", "amount", "note"]);
  else if (name === "participants") sh.appendRow(["date", "memberId", "memberName", "note"]);
  else if (name === "pitching")   sh.appendRow(["date", "memberId", "memberName", "opponent", "ipOuts", "hits", "runs", "er", "so", "bb", "hbp"]);
  else if (name === "catching")   sh.appendRow(["date", "memberId", "memberName", "opponent", "sba", "cs"]);
  else if (name === "fielding")   sh.appendRow(["date", "memberId", "memberName", "opponent", "po", "a", "e"]);
  else if (name === "probables")  sh.appendRow(["date", "opponent", "memberId", "memberName", "note"]);
  else if (name === "subscriptions") sh.appendRow(["endpoint", "p256dh", "auth", "label", "createdAt"]);
  else if (name === "announcements") sh.appendRow(["date", "category", "title", "body"]);
  else if (name === "settings")   sh.appendRow(["key", "value", "note"]);
  else if (name === "pending")    sh.appendRow(["id", "kind", "date", "opponent", "memberId", "memberName", "data", "createdAt"]);
  else if (name === "accounts")   sh.appendRow(["id", "name", "nameKey", "hash", "salt", "status", "createdAt"]);
  return sh;
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.password !== PASSWORD) {
      return jsonResponse({ ok: false, error: "auth" });
    }

    // 複数シートを1回のリクエストでまとめて取得（読み込み高速化）。
    // 単一シート検証より前に処理する。
    if (String(body.op) === "listMany") {
      var names = body.sheets;
      if (!Array.isArray(names)) return jsonResponse({ ok: false, error: "sheets required" });
      var out = {};
      for (var k = 0; k < names.length; k++) {
        var nm = String(names[k]);
        if (ALLOWED_SHEETS.indexOf(nm) === -1) continue;
        var s = getOrCreateSheet(nm);
        var d = s.getDataRange().getValues();
        out[nm] = d.slice(1).map(function (row, i) {
          return { rowIndex: i + 2, data: row.map(cellToString) };
        });
      }
      return jsonResponse({ ok: true, sheets: out });
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
      // セル値は cellToString() で文字列化（Date オブジェクトは "YYYY-MM-DD" に変換）。
      const rows = data.slice(1).map(function (row, i) {
        return {
          rowIndex: i + 2,
          data: row.map(cellToString),
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

    // キー列の値で「あれば更新・なければ追加」する冪等な書き込み。
    // 何度実行しても結果が同じなので、タイムアウト時にサーバ側で安全に再試行できる
    // （重複行を作らない）。メンテナンス切替など設定の上書きに使う。
    if (op === "upsert") {
      var keyCol = Number(body.keyCol || 1);   // 1始まりの列番号
      var keyVal = String(body.keyVal == null ? "" : body.keyVal);
      var row = body.row;
      if (!Array.isArray(row)) return jsonResponse({ ok: false, error: "row required" });
      var values = sh.getDataRange().getValues();
      var foundRow = -1;
      for (var i = 1; i < values.length; i++) { // 1行目はヘッダなので飛ばす
        if (String(values[i][keyCol - 1]) === keyVal) { foundRow = i + 1; break; } // 1始まりの表行
      }
      var numCols = Math.max(row.length, sh.getLastColumn());
      var padded = row.slice();
      while (padded.length < numCols) padded.push("");
      if (foundRow === -1) {
        sh.insertRowsBefore(2, 1);
        sh.getRange(2, 1, 1, numCols).setValues([padded]);
      } else {
        sh.getRange(foundRow, 1, 1, numCols).setValues([padded]);
      }
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
