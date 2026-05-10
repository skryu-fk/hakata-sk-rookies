/**
 * /api/admin/* で共有するユーティリティ。
 * 各 Route Handler で使う認証チェック・Apps Script 転送・キャッシュ無効化をまとめてある。
 */

import { revalidatePath, revalidateTag } from "next/cache";

export const ALLOWED_SHEETS = new Set(["news", "tweets", "blog", "practices"]);

export type AdminOp = "list" | "append" | "update" | "delete";

export function ensureAuth(headers: Headers): Response | null {
  const pw = headers.get("x-admin-password") ?? "";
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    console.error("[admin] ADMIN_PASSWORD is not set");
    return Response.json(
      { ok: false, error: "サーバー設定エラー（ADMIN_PASSWORD 未設定）" },
      { status: 500 }
    );
  }
  if (pw !== expected) {
    return Response.json({ ok: false, error: "パスワードが違います。" }, { status: 401 });
  }
  return null;
}

export function ensureSheet(sheet: string | undefined): Response | null {
  if (!sheet || !ALLOWED_SHEETS.has(sheet)) {
    return Response.json({ ok: false, error: "未知の sheet です。" }, { status: 400 });
  }
  return null;
}

export async function callAppsScript(payload: Record<string, unknown>): Promise<
  { ok: true; data: unknown } | { ok: false; status: number; error: string }
> {
  const url = process.env.APPS_SCRIPT_URL;
  if (!url) {
    console.error("[admin] APPS_SCRIPT_URL is not set");
    return { ok: false, status: 500, error: "APPS_SCRIPT_URL が未設定です。" };
  }
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: process.env.ADMIN_PASSWORD, ...payload }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      console.error("[admin] Apps Script HTTP error:", r.status, text);
      return { ok: false, status: 502, error: `Apps Script でエラー (HTTP ${r.status})` };
    }
    const data = (await r.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!data || data.ok !== true) {
      console.error("[admin] Apps Script returned non-ok:", data);
      return { ok: false, status: 502, error: data?.error ?? "Apps Script の処理に失敗しました。" };
    }
    return { ok: true, data };
  } catch (e) {
    console.error("[admin] Network error:", e);
    return { ok: false, status: 502, error: "Apps Script への接続に失敗しました。" };
  }
}

/** 書き込み系の操作後に呼ぶキャッシュ無効化。 */
export function flushCaches(sheet: string) {
  try {
    // `{ expire: 0 }` で即時失効。"max" だと stale-while-revalidate になり、
    // 直後にアクセスしたユーザーが「追加前」のキャッシュを掴まされて404になる。
    revalidateTag(`sheet:${sheet}`, { expire: 0 });
    revalidatePath("/");
    if (sheet === "news") {
      revalidatePath("/news/[slug]", "page");
    } else if (sheet === "blog") {
      revalidatePath("/blog");
      revalidatePath("/blog/[slug]", "page");
    }
  } catch (e) {
    console.warn("[admin] revalidate warning:", e);
  }
}

export function safeRow(row: unknown[]): string[] {
  return row.map(v => {
    const s = (v ?? "").toString();
    return s.length > 5000 ? s.slice(0, 5000) : s;
  });
}
