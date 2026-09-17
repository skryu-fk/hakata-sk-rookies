/**
 * /api/member/register — メンバーアカウントの新規登録。
 *   POST { name, password, password2 }
 *     - name      : 氏名（全角カタカナのみ。例「ヤマダ　タロウ」）
 *     - password  : 8文字以上・英字と数字を両方含む
 *     - password2 : 確認用（password と一致必須）
 *
 * 仕様:
 *   - 名簿(members)に登録済みの人だけが作れる（カナが一致しなければ弾く）。
 *     → 承認作業なしで部外者を防ぎ、同時に名簿＝成績へ自動で連携する。
 *   - ユーザーID（例 SKR-8421）を自動発行し、以後のログインはこのIDで行う。
 *   - パスワードは平文保存せず scrypt ハッシュ＋ソルトで保存する。
 */
import { hashPassword, nameKey, kanaKey, isKatakanaName, isStrongPassword, genUserId } from "@/lib/security";
import { callAppsScript } from "@/lib/admin-shared";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Row = { rowIndex: number; data: string[] };

function genId(): string {
  return `acc_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export async function POST(request: Request) {
  const rl = rateLimit(`member-register:${clientIp(request.headers)}`, { limit: 8, windowMs: 10 * 60_000, lockMs: 20 * 60_000 });
  if (!rl.ok) return tooMany(rl.retryAfter);

  let body: { name?: string; password?: string; password2?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "リクエスト形式が不正です。" }, { status: 400 });
  }

  const name = String(body.name ?? "").normalize("NFKC").trim().replace(/\s+/g, "　");
  const password = body.password ?? "";
  const password2 = body.password2 ?? "";

  if (!isKatakanaName(name)) {
    return Response.json({ ok: false, error: "氏名は全角カタカナで入力してください（例：ヤマダ　タロウ）。漢字・ひらがな・英数字は使えません。" }, { status: 400 });
  }
  if (name.length > 40) {
    return Response.json({ ok: false, error: "氏名が長すぎます。" }, { status: 400 });
  }
  if (!isStrongPassword(password)) {
    return Response.json({ ok: false, error: "パスワードは8文字以上で、英字と数字の両方を含めてください。" }, { status: 400 });
  }
  if (password !== password2) {
    return Response.json({ ok: false, error: "確認用パスワードが一致しません。" }, { status: 400 });
  }

  const key = kanaKey(name);

  // ── 名簿(members)に載っている人かを確認（載っていなければ登録不可）──
  const mList = await callAppsScript({ op: "list", sheet: "members" });
  if (!mList.ok) return Response.json({ ok: false, error: mList.error }, { status: mList.status });
  const members = (mList.data as { rows?: Row[] }).rows ?? [];
  // members 列: [id, name, nickname, jerseyNumber, position, joinedDate, active, kana]
  const hit = members.find(r => {
    const kana = kanaKey(r.data[7] ?? "");
    const nm = kanaKey(r.data[1] ?? "");
    return (kana && kana === key) || (nm && nm === key);
  });
  if (!hit) {
    return Response.json({
      ok: false,
      error: "この氏名はチーム名簿に見つかりませんでした。登録できるのは名簿に登録済みのメンバーのみです。入力（カタカナ表記）をご確認のうえ、それでも登録できない場合は管理者にご連絡ください。",
    }, { status: 403 });
  }
  const memberId = hit.data[0] ?? "";

  // ── 既存アカウントの重複チェック ──
  const aList = await callAppsScript({ op: "list", sheet: "accounts" });
  if (!aList.ok) return Response.json({ ok: false, error: aList.error }, { status: aList.status });
  const accounts = (aList.data as { rows?: Row[] }).rows ?? [];
  // accounts 列: [id, name, nameKey, hash, salt, status, createdAt, memberId, userId]
  const dup = accounts.find(r => (r.data[7] ?? "") === memberId && (r.data[5] ?? "") !== "rejected");
  if (dup) {
    return Response.json({
      ok: false,
      error: "このメンバーのアカウントはすでに作成されています。ユーザーIDが分からない場合は管理者にご確認ください。",
    }, { status: 409 });
  }

  // ── ユーザーIDを重複しないように発行 ──
  const used = new Set(accounts.map(r => (r.data[8] ?? "").toUpperCase()).filter(Boolean));
  let userId = "";
  for (let i = 0; i < 40; i++) {
    const cand = genUserId();
    if (!used.has(cand.toUpperCase())) { userId = cand; break; }
  }
  if (!userId) {
    return Response.json({ ok: false, error: "ユーザーIDの発行に失敗しました。もう一度お試しください。" }, { status: 500 });
  }

  const { salt, hash } = hashPassword(password);
  const row = [
    genId(), name, nameKey(name), hash, salt, "approved",
    new Date().toISOString().slice(0, 19).replace("T", " "), memberId, userId,
  ];

  const res = await callAppsScript({ op: "append", sheet: "accounts", row });
  if (!res.ok) return Response.json({ ok: false, error: res.error }, { status: res.status });

  return Response.json({ ok: true, userId, name });
}
