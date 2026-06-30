/**
 * /api/admin/* で共有するユーティリティ。
 * 各 Route Handler で使う認証チェック・Apps Script 転送・キャッシュ無効化をまとめてある。
 */

import { revalidatePath, revalidateTag } from "next/cache";
import { safeEqual, verifySession, readCookie, MEMBER_COOKIE, ADMIN_COOKIE } from "@/lib/security";

export const ALLOWED_SHEETS = new Set([
  // コンテンツ系
  "news", "tweets", "blog", "practices",
  // チーム運営系（/admin/team で使用）
  "members", "attendance", "batting",
  // 試合・運営拡張
  "lineups",   // スタメン登録（紅白戦のA/B振り分けにも）
  "games",     // スコアボード／試合記録
  "payments",  // グラウンド代の集金記録
  "participants", // 練習への事前登録（参加予定）
  // 成績データ
  "pitching",     // 投手成績（防御率・奪三振率の計算用）
  "catching",     // 捕手成績（盗塁阻止率の計算用）
  "fielding",     // 守備成績（刺殺・捕殺・失策 → 守備率）
  // スケジュール拡張
  "probables",    // 予告先発（試合日ごとの先発投手）
  // Web Push
  "subscriptions",// プッシュ通知の購読情報
  // お知らせ
  "announcements",// 成績アプリのお知らせ欄
  // 設定（メンテナンスフラグ等）
  "settings",
  // 承認待ち（スコアラーがアプリから記録した暫定結果）
  "pending",
  // メンバー個人アカウント（本名+パスワードハッシュ・承認制）
  "accounts",
]);

export type AdminOp = "list" | "append" | "update" | "delete";

export function ensureAuth(headers: Headers): Response | null {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    console.error("[admin] ADMIN_PASSWORD is not set");
    return Response.json(
      { ok: false, error: "サーバー設定エラー（ADMIN_PASSWORD 未設定）" },
      { status: 500 }
    );
  }
  // 署名付き管理者セッション Cookie か、ヘッダのパスワード（定数時間比較）
  if (verifySession(readCookie(headers, ADMIN_COOKIE), "admin")) return null;
  const pw = headers.get("x-admin-password") ?? "";
  if (pw && safeEqual(pw, expected)) return null;
  return Response.json({ ok: false, error: "パスワードが違います。" }, { status: 401 });
}

/**
 * メンバー閲覧用の認証。/stats など read-only ページで使う。
 * 個人アカウント制に一本化したため、ログイン時に発行される署名付きメンバー
 * セッション Cookie のみで認可する（共通パスワード／ヘッダの後方互換は廃止）。
 */
export function ensureMemberAuth(headers: Headers): Response | null {
  if (verifySession(readCookie(headers, MEMBER_COOKIE), "member")) return null;
  return Response.json({ ok: false, error: "ログインが必要です。" }, { status: 401 });
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

  // 冪等な操作（list=読み取り / upsert=キー指定の上書き）は、コールドスタートや
  // 一時的失敗・タイムアウトを自動リトライで吸収する（重複や副作用が出ない）。
  // 非冪等な書き込み(append/update/delete)は二重実行を避けるため1回だけ。
  const canRetry = payload.op === "list" || payload.op === "upsert";

  // 全体の制限時間。maxDuration(60s) の手前で必ず打ち切り、Vercel に強制終了される前に
  // 自前のわかりやすいエラーを返せるようにする。
  const startedAt = Date.now();
  const DEADLINE_MS = 50_000;
  const PER_ATTEMPT_MS = 20_000;

  let lastStatus = 502;
  let lastError = "Apps Script への接続に失敗しました。";

  for (let attempt = 1; ; attempt++) {
    const remaining = DEADLINE_MS - (Date.now() - startedAt);
    // 1回目は必ず実行。2回目以降は残り時間がある時だけ。
    const attemptTimeout = Math.max(4_000, Math.min(PER_ATTEMPT_MS, remaining));
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: process.env.ADMIN_PASSWORD, ...payload }),
        redirect: "follow",
        signal: AbortSignal.timeout(attemptTimeout),
      });
      const text = await r.text().catch(() => "");

      let data: { ok?: boolean; error?: string } | null = null;
      try { data = JSON.parse(text); } catch { /* JSON以外（HTML 等）は下で扱う */ }

      if (data && typeof data === "object") {
        if (data.ok === true) return { ok: true, data };
        // 業務エラー（unknown sheet / unknown op など）はリトライしても無駄なので即返す
        console.error("[admin] Apps Script returned non-ok:", data);
        return { ok: false, status: 502, error: data.error ?? "Apps Script の処理に失敗しました。" };
      }

      // JSON でない応答 = ほぼ「未デプロイ」か「アクセス権が“全員”でない」状態。
      // この場合 Google のログイン/承認 HTML が返ってくる。
      const looksLikeGoogleLogin = /accounts\.google\.com|ServiceLogin|signin|<html/i.test(text);
      lastStatus = 502;
      lastError = looksLikeGoogleLogin
        ? "Apps Script に接続できません。デプロイの「アクセスできるユーザー」を『全員』にして、新しいバージョンで再デプロイしてください。"
        : `Apps Script の応答が不正です（HTTP ${r.status}）。URL とデプロイ設定をご確認ください。`;
      console.error("[admin] Apps Script non-JSON response (attempt " + attempt + "):", r.status, text.slice(0, 200));
    } catch (e) {
      const name = (e as { name?: string })?.name;
      if (name === "TimeoutError" || name === "AbortError") {
        lastStatus = 504;
        lastError = "Apps Script の応答が遅く、タイムアウトしました。少し時間をおいて再度お試しください。";
      } else {
        lastStatus = 502;
        lastError = "Apps Script への接続に失敗しました。";
      }
      console.error("[admin] Apps Script attempt", attempt, "error:", e);
    }

    // リトライ判定：冪等な操作で、かつ残り時間がある場合のみ次の試行へ。
    if (!canRetry) break;
    if (DEADLINE_MS - (Date.now() - startedAt) < 5_000) break;
    await new Promise(res => setTimeout(res, 400));
  }

  console.error("[admin] Apps Script failed:", lastError);
  return { ok: false, status: lastStatus, error: lastError };
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
