/**
 * /api/admin/append — 管理画面からのお知らせ・ツイート追加を Apps Script Web App 経由で
 * Google スプレッドシートに書き込む。
 *
 * 必要な Vercel 環境変数:
 *   ADMIN_PASSWORD     — 管理画面のログインパスワード（Apps Script 側にも同じ値を設定）
 *   APPS_SCRIPT_URL    — Apps Script デプロイURL (例 https://script.google.com/macros/s/.../exec)
 *
 * セットアップは scripts/apps-script-template.gs と SETUP_ADMIN.md を参照。
 */

import { revalidatePath, revalidateTag } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_SHEETS = new Set(["news", "tweets"]);

export async function POST(request: Request) {
  // ── 認証 ──
  const pw = request.headers.get("x-admin-password") ?? "";
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    console.error("[admin/append] ADMIN_PASSWORD is not set");
    return Response.json(
      { ok: false, error: "サーバー設定エラー（ADMIN_PASSWORD 未設定）" },
      { status: 500 }
    );
  }
  if (pw !== expected) {
    return Response.json(
      { ok: false, error: "パスワードが違います。" },
      { status: 401 }
    );
  }

  // ── 入力検証 ──
  let body: { sheet?: string; row?: unknown[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "リクエスト形式が不正です。" }, { status: 400 });
  }
  const sheet = (body.sheet ?? "").toString();
  const row = body.row;
  if (!ALLOWED_SHEETS.has(sheet)) {
    return Response.json({ ok: false, error: "未知の sheet です。" }, { status: 400 });
  }
  if (!Array.isArray(row) || row.length === 0 || row.length > 16) {
    return Response.json({ ok: false, error: "row が不正です。" }, { status: 400 });
  }
  // 各セルは文字列に正規化＆過大入力ブロック
  const safeRow = row.map(v => {
    const s = (v ?? "").toString();
    return s.length > 5000 ? s.slice(0, 5000) : s;
  });

  // ── Apps Script Web App に転送 ──
  const appsScriptUrl = process.env.APPS_SCRIPT_URL;
  if (!appsScriptUrl) {
    console.error("[admin/append] APPS_SCRIPT_URL is not set");
    return Response.json(
      {
        ok: false,
        error:
          "APPS_SCRIPT_URL が未設定です。SETUP_ADMIN.md の手順に沿って Vercel に登録してください。",
      },
      { status: 500 }
    );
  }

  try {
    const r = await fetch(appsScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: expected, sheet, row: safeRow }),
      // Apps Script は最大数十秒かかることがあるので余裕を持たせる
      signal: AbortSignal.timeout(20_000),
    });
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      console.error("[admin/append] Apps Script HTTP error:", r.status, text);
      return Response.json(
        { ok: false, error: `Apps Script でエラー (HTTP ${r.status})。SETUP_ADMIN.md を再確認してください。` },
        { status: 502 }
      );
    }
    const data = await r.json().catch(() => null);
    if (!data || data.ok !== true) {
      console.error("[admin/append] Apps Script returned non-ok body:", data);
      return Response.json(
        { ok: false, error: data?.error ?? "Apps Script の処理に失敗しました。" },
        { status: 502 }
      );
    }
  } catch (e) {
    console.error("[admin/append] Network error:", e);
    return Response.json(
      { ok: false, error: "Apps Script への接続に失敗しました。" },
      { status: 502 }
    );
  }

  // ── キャッシュ無効化 ──
  // sheets.ts の fetch に `tags: ['sheet:${sheetName}']` を付けてあるので、
  // 該当タグだけ stale 化して次のアクセスで最新化される。
  try {
    revalidateTag(`sheet:${sheet}`, "max");
    revalidatePath("/");
    if (sheet === "news") {
      revalidatePath("/news/[slug]", "page");
    }
  } catch (e) {
    console.warn("[admin/append] revalidate warning:", e);
  }

  return Response.json({ ok: true });
}
