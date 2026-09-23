/**
 * /api/member/poll-vote — メンバーが、管理者の作った投票に回答する。
 *   POST { pollId, choice }
 *
 * 誰として投票するかはセッションCookie(sub=アカウントID)から決める。
 * リクエストの memberId は受け取らない（受け取ると他人になりすまして
 * 投票できてしまうため）。1人1票で、押し直すと前の回答を上書きする。
 */
import { readSession, readCookie, MEMBER_COOKIE } from "@/lib/security";
import { callAppsScript } from "@/lib/admin-shared";
import { parseOptions } from "@/lib/polls";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Row = { rowIndex: number; data: string[] };
const rowsOf = (r: { data: unknown }) => ((r.data as { rows?: Row[] }).rows ?? []);

export async function POST(request: Request) {
  const rl = rateLimit(`poll-vote:${clientIp(request.headers)}`, { limit: 40, windowMs: 60_000 });
  if (!rl.ok) return tooMany(rl.retryAfter);

  const sess = readSession(readCookie(request.headers, MEMBER_COOKIE), "member");
  if (!sess?.sub) return Response.json({ ok: false, error: "ログインが必要です。" }, { status: 401 });

  let body: { pollId?: string; choice?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "リクエスト形式が不正です。" }, { status: 400 });
  }
  const pollId = (body.pollId ?? "").trim();
  const choice = (body.choice ?? "").trim();
  if (!pollId || !choice) {
    return Response.json({ ok: false, error: "入力が不正です。" }, { status: 400 });
  }

  // ── 本人の名簿メンバーを特定する ──
  const accList = await callAppsScript({ op: "list", sheet: "accounts" });
  if (!accList.ok) return Response.json({ ok: false, error: accList.error }, { status: accList.status });
  const acc = rowsOf(accList).find(r => (r.data[0] ?? "") === sess.sub);
  if (!acc) return Response.json({ ok: false, error: "ログインが必要です。" }, { status: 401 });
  const memberId = acc.data[7] ?? "";
  if (!memberId) {
    return Response.json({ ok: false, error: "名簿と連携されていないため投票できません。管理者にご連絡ください。" }, { status: 400 });
  }

  const memList = await callAppsScript({ op: "list", sheet: "members" });
  if (!memList.ok) return Response.json({ ok: false, error: memList.error }, { status: memList.status });
  const me = rowsOf(memList).find(r => (r.data[0] ?? "") === memberId);
  const memberName = me?.data[1] ?? acc.data[1] ?? "";

  // ── 投票が受付中で、選択肢が実在するか確認する ──
  const pollList = await callAppsScript({ op: "list", sheet: "polls" });
  if (!pollList.ok) return Response.json({ ok: false, error: pollList.error }, { status: pollList.status });
  const poll = rowsOf(pollList).find(r => (r.data[0] ?? "") === pollId);
  if (!poll) return Response.json({ ok: false, error: "投票が見つかりません。" }, { status: 404 });
  if ((poll.data[4] ?? "") !== "open") {
    return Response.json({ ok: false, error: "この投票は締め切られています。" }, { status: 400 });
  }
  const deadline = (poll.data[5] ?? "").slice(0, 10);
  if (deadline && new Date().toISOString().slice(0, 10) > deadline) {
    return Response.json({ ok: false, error: "この投票は締切を過ぎています。" }, { status: 400 });
  }
  const options = parseOptions(poll.data[2] ?? "").map(o => o.label);
  if (!options.includes(choice)) {
    return Response.json({ ok: false, error: "選択肢が不正です。" }, { status: 400 });
  }

  // ── 1人1票。すでに入れていれば書き換える ──
  const voteList = await callAppsScript({ op: "list", sheet: "poll_votes" });
  if (!voteList.ok) return Response.json({ ok: false, error: voteList.error }, { status: voteList.status });
  const mine = rowsOf(voteList).find(r => (r.data[1] ?? "") === pollId && (r.data[2] ?? "") === memberId);

  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const row = [mine?.data[0] || `pv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    pollId, memberId, memberName, choice, mine?.data[5] || now];

  const res = mine
    ? await callAppsScript({ op: "update", sheet: "poll_votes", rowIndex: mine.rowIndex, row })
    : await callAppsScript({ op: "append", sheet: "poll_votes", row });
  if (!res.ok) return Response.json({ ok: false, error: res.error }, { status: res.status });

  return Response.json({ ok: true, choice });
}
