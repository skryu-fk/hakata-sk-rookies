/**
 * /api/line/register — 「LINEで新規登録」の下調べ。
 *   POST { name } → { ok, token }
 *
 * LINEへ送り出す前に、登録できる人かどうかをここで確かめる。
 * LINEの同意画面を通ったあとで「名簿にありません」と言われると、
 * 何がだめだったのか分からないまま往復させることになるため。
 *
 * 氏名はURLに乗せない。確かめた結果として名簿のメンバーID（m_… のような
 * 符号）だけを署名付きの短命な引換券に入れ、戻ってきたときに氏名を引き直す。
 * URLは履歴にもログにも残るので、そこに本名を置かない。
 */
import {
  signValue, kanaKey, isKatakanaName, sameOrigin, crossOriginDenied,
} from "@/lib/security";
import { callAppsScript } from "@/lib/admin-shared";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";
import { lineEnabled } from "@/lib/lineAuth";
import { supabaseEnabled, columnExists } from "@/lib/supabaseData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Row = { rowIndex: number; data: string[] };

/** 引換券の有効時間。LINEの同意画面で迷っても足りる長さ */
const TICKET_SECONDS = 10 * 60;

export async function POST(request: Request) {
  if (!sameOrigin(request)) return crossOriginDenied();

  const rl = rateLimit(`line-register:${clientIp(request.headers)}`, {
    limit: 8, windowMs: 10 * 60_000, lockMs: 20 * 60_000,
  });
  if (!rl.ok) return tooMany(rl.retryAfter);

  if (!lineEnabled()) {
    return Response.json({ ok: false, error: "LINEでの登録はいま使えません。" }, { status: 503 });
  }

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "リクエスト形式が不正です。" }, { status: 400 });
  }

  const name = String(body.name ?? "").normalize("NFKC").trim().replace(/\s+/g, "　");
  if (!isKatakanaName(name)) {
    return Response.json({
      ok: false,
      error: "氏名は全角カタカナで入力してください（例：ヤマダ　タロウ）。漢字・ひらがな・英数字は使えません。",
    }, { status: 400 });
  }
  if (name.length > 40) {
    return Response.json({ ok: false, error: "氏名が長すぎます。" }, { status: 400 });
  }

  /*
   * LINEのユーザーIDを入れる列がまだ無いと、登録はできても紐づけが落ちる。
   * パスワードも無いアカウントができて、誰も入れなくなるので先に止める。
   */
  if (supabaseEnabled() && !(await columnExists("accounts", "line_user_id"))) {
    return Response.json({
      ok: false,
      error: "LINEでの登録は準備中です。お手数ですが、パスワードを作って登録してください。",
    }, { status: 503 });
  }

  const key = kanaKey(name);

  // ── 名簿に載っている人か（載っていなければ登録できない）──
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

  // ── すでにアカウントがある人は、登録ではなくログイン ──
  const aList = await callAppsScript({ op: "list", sheet: "accounts" });
  if (!aList.ok) return Response.json({ ok: false, error: aList.error }, { status: aList.status });
  const accounts = (aList.data as { rows?: Row[] }).rows ?? [];
  // accounts 列: [id, name, nameKey, hash, salt, status, createdAt, memberId, userId, ...]
  const dup = accounts.find(r => (r.data[7] ?? "") === memberId && (r.data[5] ?? "") !== "rejected");
  if (dup) {
    return Response.json({
      ok: false,
      error: "このメンバーのアカウントはすでに作成されています。ログイン画面からお入りください。ユーザーIDが分からない場合は「ユーザーID・パスワードを忘れた場合」からご連絡ください。",
    }, { status: 409 });
  }

  return Response.json({
    ok: true,
    token: signValue({ k: "line-reg", m: memberId }, TICKET_SECONDS),
  });
}
