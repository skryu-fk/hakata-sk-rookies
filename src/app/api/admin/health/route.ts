/**
 * /api/admin/health — サーバー側の設定が入っているかの確認（管理者のみ）。
 *
 * 「Vercelに入れたつもりだったが入っていなかった」を目で確かめるための窓口。
 * 値そのものは絶対に返さない。返すのは「入っているか」と、鍵の長さなど
 * 危険な設定になっていないかの判定だけ。
 *
 * 設定ミスはそれ自体が攻撃の手がかりになるため、管理者ログインを必須にし、
 * 検索避けとキャッシュ禁止は next.config.ts の /api/* の指定で効いている。
 */
import { ensureAuth } from "@/lib/admin-shared";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";
import { MAINTENANCE, inMaintenance } from "@/lib/maintenance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Check = {
  key: string;
  label: string;
  ok: boolean;
  level: "必須" | "推奨";
  note: string;
};

export async function GET(request: Request) {
  const rl = rateLimit(`admin-health:${clientIp(request.headers)}`, { limit: 30, windowMs: 60_000 });
  if (!rl.ok) return tooMany(rl.retryAfter);

  const authErr = ensureAuth(request.headers);
  if (authErr) return authErr;

  const env = (k: string) => (process.env[k] ?? "").trim();
  const has = (k: string) => env(k).length > 0;

  const secret = env("SESSION_SECRET");
  const adminPw = env("ADMIN_PASSWORD");

  // セッションの署名鍵は、短いと総当たりで割り出される。
  // 管理者パスワードと同じ値にするのも、漏れたときに一緒に破られるため避ける。
  const secretStrong = secret.length >= 32 && secret !== adminPw;

  const checks: Check[] = [
    {
      key: "SESSION_SECRET", label: "セッションの署名鍵",
      ok: secretStrong, level: "必須",
      note: !secret
        ? "未設定です。いまは管理者パスワードから鍵を作っているため、パスワードが漏れるとログインを偽造されます。"
        : secret === adminPw
          ? "管理者パスワードと同じ値です。別のランダムな文字列にしてください。"
          : secret.length < 32
            ? `短すぎます（${secret.length}文字）。32文字以上にしてください。`
            : `設定済み（${secret.length}文字）。`,
    },
    {
      key: "ADMIN_PASSWORD", label: "管理者パスワード",
      ok: adminPw.length > 0, level: "必須",
      note: adminPw ? `設定済み（${adminPw.length}文字）。` : "未設定です。管理画面に入れません。",
    },
    {
      key: "SUPABASE_URL", label: "データの保存先（URL）",
      ok: has("SUPABASE_URL"), level: "必須",
      note: has("SUPABASE_URL") ? "設定済み。" : "未設定です。スプレッドシート側で動いています。",
    },
    {
      key: "SUPABASE_SERVICE_ROLE_KEY", label: "データの保存先（鍵）",
      ok: has("SUPABASE_SERVICE_ROLE_KEY"), level: "必須",
      note: has("SUPABASE_SERVICE_ROLE_KEY") ? "設定済み。" : "未設定です。署名画像の保存もできません。",
    },
    {
      key: "APPS_SCRIPT_URL", label: "スプレッドシート連携",
      ok: has("APPS_SCRIPT_URL"), level: "推奨",
      note: has("APPS_SCRIPT_URL") ? "設定済み（Supabaseが使えないときの控え）。" : "未設定です。",
    },
    {
      key: "VAPID_PUBLIC_KEY", label: "プッシュ通知の鍵",
      ok: has("VAPID_PUBLIC_KEY") && has("VAPID_PRIVATE_KEY"), level: "推奨",
      note: has("VAPID_PRIVATE_KEY") ? "設定済み。" : "未設定です。通知が送れません。",
    },
    {
      key: "NEXT_PUBLIC_SITE_URL", label: "サイトのURL",
      ok: has("NEXT_PUBLIC_SITE_URL"), level: "推奨",
      note: has("NEXT_PUBLIC_SITE_URL") ? "設定済み。" : "未設定です。別サイトからの書き込み判定がゆるくなります。",
    },
  ];

  const ng = checks.filter(c => !c.ok);

  return Response.json({
    ok: true,
    summary: ng.length === 0
      ? "すべて設定されています。"
      : `${ng.length}件、確認が必要です（必須 ${ng.filter(c => c.level === "必須").length}件）。`,
    checks,
    maintenance: {
      // いま止まっているか。環境変数 MAINTENANCE による上書きも含めた結果
      active: inMaintenance(),
      flag: env("MAINTENANCE") || "（未設定・時間どおり）",
      from: MAINTENANCE.fromLabel,
      to: MAINTENANCE.toLabel,
    },
    checkedAt: new Date().toISOString(),
  });
}
