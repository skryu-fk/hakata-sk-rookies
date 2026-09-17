/**
 * /api/member/reset-request — パスワードを忘れた人が、管理者にリセットを申請する。
 *   POST { name } … 氏名（全角カタカナ）
 *
 * ログインできない状態から使うため認証は不要。代わりに
 *   - 名簿(members)のカナと一致すること
 *   - IP単位のレート制限
 * で保護する。実際にアカウントを消すのは管理者だけ（ここでは印を付けるだけ）。
 *
 * パスワードは復元できない（ハッシュ保存のため）ので、
 * 「管理者がアカウントを削除 → 本人が新規登録し直す」方式にしている。
 */
import { kanaKey, isKatakanaName } from "@/lib/security";
import { callAppsScript } from "@/lib/admin-shared";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Row = { rowIndex: number; data: string[] };

export async function POST(request: Request) {
  const rl = rateLimit(`member-reset:${clientIp(request.headers)}`, { limit: 5, windowMs: 10 * 60_000, lockMs: 20 * 60_000 });
  if (!rl.ok) return tooMany(rl.retryAfter);

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "リクエスト形式が不正です。" }, { status: 400 });
  }

  const name = String(body.name ?? "").normalize("NFKC").trim().replace(/\s+/g, "　");
  if (!isKatakanaName(name)) {
    return Response.json({ ok: false, error: "氏名は全角カタカナで入力してください（例：ヤマダ　タロウ）。" }, { status: 400 });
  }
  const key = kanaKey(name);

  // 名簿に載っている人かを確認
  const mList = await callAppsScript({ op: "list", sheet: "members" });
  if (!mList.ok) return Response.json({ ok: false, error: mList.error }, { status: mList.status });
  const members = (mList.data as { rows?: Row[] }).rows ?? [];
  const hit = members.find(r => {
    const kana = kanaKey(r.data[7] ?? "");
    const nm = kanaKey(r.data[1] ?? "");
    return (kana && kana === key) || (nm && nm === key);
  });
  if (!hit) {
    return Response.json({ ok: false, error: "この氏名はチーム名簿に見つかりませんでした。入力（カタカナ表記）をご確認ください。" }, { status: 403 });
  }
  const memberId = hit.data[0] ?? "";

  // 対象アカウントを探す
  const aList = await callAppsScript({ op: "list", sheet: "accounts" });
  if (!aList.ok) return Response.json({ ok: false, error: aList.error }, { status: aList.status });
  const accounts = (aList.data as { rows?: Row[] }).rows ?? [];
  const acc = accounts.find(r => (r.data[7] ?? "") === memberId && (r.data[5] ?? "") !== "rejected");

  if (!acc) {
    // まだ登録していない人。申請ではなくそのまま新規登録すればよい。
    return Response.json({
      ok: true,
      alreadyFree: true,
      message: "まだアカウントがありません。そのまま「新規登録」から登録できます。",
    });
  }

  if ((acc.data[5] ?? "") === "reset_requested") {
    return Response.json({
      ok: true,
      message: "すでに申請済みです。管理者がリセットするまでお待ちください。",
    });
  }

  // status だけを reset_requested に書き換える（パスワードは触らない）
  const next = acc.data.slice();
  while (next.length < 9) next.push("");
  next[5] = "reset_requested";
  const res = await callAppsScript({ op: "update", sheet: "accounts", rowIndex: acc.rowIndex, row: next });
  if (!res.ok) return Response.json({ ok: false, error: res.error }, { status: res.status });

  return Response.json({
    ok: true,
    message: "リセットを申請しました。管理者が対応したら、新しく登録し直せるようになります。",
  });
}
