/**
 * ログインの引き渡し
 *
 * ── なぜ要るのか ──
 * iPhoneでホーム画面に追加したアプリは、Safariとログイン情報の保管庫が
 * 別になっている。アプリからLINEへ行くと、戻ってくる先はSafariになるので、
 * そこでログインが成立しても、アプリ側には何も伝わらない。
 * 「LINEでログインしたのに、アプリに戻ると入っていない」の正体がこれ。
 *
 * ── どう渡すか ──
 *   1. アプリが合言葉を作り、自分の中だけに置く。渡すのはその指紋（SHA-256）だけ
 *   2. 指紋はLINEへの往復に持たせる（指紋だけでは引き出せない）
 *   3. Safari側でログインが成立したら、指紋を札にして引換券を預ける
 *   4. アプリに戻ったら、アプリが合言葉を見せて引き取る
 *      → このやり取りはアプリ自身の通信なので、アプリの保管庫にログインが入る
 *
 * 引換券は一度きり・10分で期限切れ。中身はアカウントの符号と期限だけ。
 */
import { createHash, randomBytes } from "node:crypto";
import { supabaseEnabled, putHandoff, takeHandoff } from "@/lib/supabaseData";

/** 引換券の有効時間。アプリに戻るまでの間だけ持てばよい */
export const HANDOFF_TTL = 10 * 60;

/** 引き渡しの置き場が使えるか */
export function handoffEnabled(): boolean {
  return supabaseEnabled();
}

/** 合言葉から札（指紋）を作る。アプリ側と同じ計算 */
export function handoffKey(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

/** Safari側で成立したログインを預ける */
export async function saveHandoff(key: string, accountId: string): Promise<boolean> {
  if (!handoffEnabled()) return false;
  return putHandoff(key, accountId, HANDOFF_TTL);
}

/** アプリ側が引き取る。一度きり */
export async function claimHandoff(secret: string): Promise<string | null> {
  if (!handoffEnabled() || !secret) return null;
  return takeHandoff(handoffKey(secret));
}

/**
 * 置き場が本当に使えるかを、実際に預けて取り出して確かめる。
 *
 * ここが動かないと、iPhoneのホーム画面アプリでLINEログインしても
 * アプリ側に入れない。設定の見落としを目で確かめられるように、
 * /api/admin/health から呼べるようにしてある。
 */
export async function selfTestHandoff(): Promise<{ ok: boolean; note: string }> {
  if (!handoffEnabled()) {
    return { ok: false, note: "Supabaseが未設定のため、引き渡しは使えません。" };
  }
  const secret = randomBytes(32).toString("hex");
  const mark = "acc_selftest";
  try {
    if (!(await saveHandoff(handoffKey(secret), mark))) {
      return { ok: false, note: "預け入れに失敗しました。Supabaseのストレージ権限をご確認ください。" };
    }
    if ((await claimHandoff(secret)) !== mark) {
      return { ok: false, note: "預けたものを取り出せませんでした。" };
    }
    if (await claimHandoff(secret)) {
      return { ok: false, note: "一度きりになっていません（2回取り出せました）。" };
    }
    return { ok: true, note: "預け入れ・取り出し・一度きり、すべて確認できました。" };
  } catch (e) {
    return { ok: false, note: `確認中にエラーになりました（${String(e).slice(0, 80)}）。` };
  }
}
