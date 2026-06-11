/**
 * サーバー側の Web Push 送信ユーティリティ。
 * web-push ライブラリを使い、購読情報（subscriptions シート）へ通知を配信する。
 *
 * 必要な環境変数:
 *   VAPID_PRIVATE_KEY … VAPID 秘密鍵（Vercel に設定）
 *   VAPID_SUBJECT     … "mailto:..." 形式（任意。未設定時は既定値）
 */
import webpush from "web-push";
import { VAPID_PUBLIC_KEY } from "@/lib/vapid";
import { callAppsScript } from "@/lib/admin-shared";

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!priv) {
    console.error("[push] VAPID_PRIVATE_KEY is not set");
    return false;
  }
  const subject = process.env.VAPID_SUBJECT || "mailto:hakata.sk.rookies@example.com";
  webpush.setVapidDetails(subject, VAPID_PUBLIC_KEY, priv);
  configured = true;
  return true;
}

export type PushPayload = { title: string; body: string; url?: string; tag?: string };

type SubRow = { rowIndex: number; endpoint: string; p256dh: string; auth: string };

async function listSubscriptions(): Promise<SubRow[]> {
  const res = await callAppsScript({ op: "list", sheet: "subscriptions" });
  if (!res.ok) return [];
  const rows = (res.data as { rows?: { rowIndex: number; data: string[] }[] }).rows ?? [];
  return rows
    .map(r => ({ rowIndex: r.rowIndex, endpoint: r.data[0] ?? "", p256dh: r.data[1] ?? "", auth: r.data[2] ?? "" }))
    .filter(s => s.endpoint && s.p256dh && s.auth);
}

/**
 * 全購読者へ通知を送る。失効した購読（404/410）は subscriptions シートから削除する。
 * 戻り値: { sent, failed, total }
 */
export async function sendToAll(payload: PushPayload): Promise<{ ok: boolean; sent: number; failed: number; total: number; error?: string }> {
  if (!ensureConfigured()) {
    return { ok: false, sent: 0, failed: 0, total: 0, error: "VAPID_PRIVATE_KEY 未設定" };
  }
  const subs = await listSubscriptions();
  if (subs.length === 0) return { ok: true, sent: 0, failed: 0, total: 0 };

  const body = JSON.stringify(payload);
  const dead: number[] = [];
  let sent = 0, failed = 0;

  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        body
      );
      sent++;
    } catch (e: unknown) {
      failed++;
      const code = (e as { statusCode?: number })?.statusCode;
      if (code === 404 || code === 410) dead.push(s.rowIndex);
    }
  }));

  // 失効した購読を削除（rowIndex の大きい順に消すとズレない）
  for (const rowIndex of dead.sort((a, b) => b - a)) {
    await callAppsScript({ op: "delete", sheet: "subscriptions", rowIndex }).catch(() => {});
  }

  return { ok: true, sent, failed, total: subs.length };
}
