/**
 * /api/member/profile — ログイン中の本人のマイページ情報。
 *   GET                    → { name(ログイン本名), linked, memberId, memberName, nickname }
 *   POST { name, nickname } → 連携済みなら「名簿の表示名/ニックネーム」を更新
 *
 * 本人特定はセッションCookie(sub=アカウントID)で行うため、他人のデータは編集できない。
 * パスワードは一切扱わない（表示も変更もしない）。
 * 表示名の変更は「連携済みの名簿メンバー(members)」の name 列だけを書き換える
 * （＝成績にひも付いた表示名。ログイン用の本名やパスワードには触れない）。
 */
import { readSession, readCookie, MEMBER_COOKIE } from "@/lib/security";
import { callAppsScript } from "@/lib/admin-shared";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Row = { rowIndex: number; data: string[] };

const POSITIONS: string[] = ["投手", "捕手", "一塁手", "二塁手", "三塁手", "遊撃手", "左翼手", "中堅手", "右翼手", "指名打者", "未定"];

async function currentAccount(headers: Headers) {
  const sess = readSession(readCookie(headers, MEMBER_COOKIE), "member");
  if (!sess?.sub) return null;
  const list = await callAppsScript({ op: "list", sheet: "accounts" });
  if (!list.ok) return { error: list.error, status: list.status } as const;
  const rows = (list.data as { rows?: Row[] }).rows ?? [];
  const acc = rows.find(r => (r.data[0] ?? "") === sess.sub);
  return acc ? ({ acc } as const) : null;
}

export async function GET(request: Request) {
  const found = await currentAccount(request.headers);
  if (!found) return Response.json({ ok: false, error: "ログインが必要です。" }, { status: 401 });
  if ("error" in found) return Response.json({ ok: false, error: found.error }, { status: found.status });

  const acc = found.acc;
  const memberId = acc.data[7] ?? "";
  let memberName = "";
  let nickname = "";
  let jerseyNumber = "";
  let position = "";
  let joinedDate = "";
  if (memberId) {
    const ml = await callAppsScript({ op: "list", sheet: "members" });
    if (ml.ok) {
      // members 列: [id, name, nickname, jerseyNumber, position, joinedDate, active, kana]
      const m = ((ml.data as { rows?: Row[] }).rows ?? []).find(r => (r.data[0] ?? "") === memberId);
      if (m) {
        memberName = m.data[1] ?? "";
        nickname = m.data[2] ?? "";
        jerseyNumber = m.data[3] ?? "";
        position = m.data[4] ?? "";
        joinedDate = m.data[5] ?? "";
      }
    }
  }
  return Response.json({
    ok: true,
    name: acc.data[1] ?? "",
    linked: !!memberId,
    memberId,
    memberName,
    nickname,
    jerseyNumber,
    position,
    joinedDate,
  });
}

export async function POST(request: Request) {
  const rl = rateLimit(`member-profile:${clientIp(request.headers)}`, { limit: 20, windowMs: 10 * 60_000 });
  if (!rl.ok) return tooMany(rl.retryAfter);

  const found = await currentAccount(request.headers);
  if (!found) return Response.json({ ok: false, error: "ログインが必要です。" }, { status: 401 });
  if ("error" in found) return Response.json({ ok: false, error: found.error }, { status: found.status });

  const memberId = found.acc.data[7] ?? "";
  if (!memberId) {
    return Response.json({ ok: false, error: "まだ名簿と連携されていません。管理者に連携を依頼してください。" }, { status: 409 });
  }

  let body: { name?: string; nickname?: string; jerseyNumber?: string; position?: string; joinedDate?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "リクエスト形式が不正です。" }, { status: 400 });
  }
  const name = (body.name ?? "").trim();
  const nickname = (body.nickname ?? "").trim();
  const jerseyNumber = (body.jerseyNumber ?? "").trim();
  const position = (body.position ?? "").trim();
  const joinedDate = (body.joinedDate ?? "").trim();
  if (name.length < 1 || name.length > 40) {
    return Response.json({ ok: false, error: "名前は1〜40文字で入力してください。" }, { status: 400 });
  }
  if (nickname.length > 20) {
    return Response.json({ ok: false, error: "ニックネームは20文字以内にしてください。" }, { status: 400 });
  }
  if (jerseyNumber && !/^\d{1,3}$/.test(jerseyNumber)) {
    return Response.json({ ok: false, error: "背番号は3桁までの数字で入力してください。" }, { status: 400 });
  }
  if (position && !POSITIONS.includes(position)) {
    return Response.json({ ok: false, error: "ポジションの指定が不正です。" }, { status: 400 });
  }
  if (joinedDate && !/^\d{4}-\d{2}-\d{2}$/.test(joinedDate)) {
    return Response.json({ ok: false, error: "加入日の形式が不正です。" }, { status: 400 });
  }

  // 連携先の名簿メンバー行を取得し、name / nickname 列だけ書き換える（他列は保持）。
  const ml = await callAppsScript({ op: "list", sheet: "members" });
  if (!ml.ok) return Response.json({ ok: false, error: ml.error }, { status: ml.status });
  const target = ((ml.data as { rows?: Row[] }).rows ?? []).find(r => (r.data[0] ?? "") === memberId);
  if (!target) return Response.json({ ok: false, error: "連携先のメンバーが見つかりません。" }, { status: 404 });

  // members 列: [id, name, nickname, jerseyNumber, position, joinedDate, active, kana]
  // 本人が編集できるのはこの5項目だけ。active(現役/休止) などは管理者のみが変更できる。
  const next = target.data.slice();
  while (next.length < 8) next.push("");
  next[1] = name;
  next[2] = nickname;
  next[3] = jerseyNumber;
  next[4] = position || (next[4] ?? "");
  if (joinedDate) next[5] = joinedDate;
  const res = await callAppsScript({ op: "update", sheet: "members", rowIndex: target.rowIndex, row: next });
  if (!res.ok) return Response.json({ ok: false, error: res.error }, { status: res.status });

  return Response.json({ ok: true, name, nickname, jerseyNumber, position, joinedDate });
}
