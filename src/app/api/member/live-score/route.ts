/**
 * /api/member/live-score — アプリのスコアラーがつけている試合の点数を、
 * そのまま公式サイトに出すための保存口。
 *
 *   POST { date, opponentId, isHome, ourScores[], oppScores[],
 *          ourHits, oppHits, ourErrors, oppErrors, inning }
 *
 * ── 考え方 ──
 * 点数（チームの記録）はライブで公開する。個人成績（打撃・投球）は
 * 今までどおり /api/member/score から承認待ちに積まれ、管理者の承認を経る。
 * この口で作る行は必ず status="live" で、「確定」にできるのは管理者だけ。
 * そうしないと、承認を通さずに戦績が増やせてしまう。
 *
 * games の列の約束:
 *   home_* は必ず自チーム、away_* は必ず相手。
 *   実際にホームだったかどうかは is_home に持つ（表示の上下はこれで決める）。
 */
import { ensureMemberAuth, callAppsScript } from "@/lib/admin-shared";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const OUR_TEAM = "SK ROOKIES";
/** 1試合の回数の上限。異常な値で巨大な行を作られないようにする */
const MAX_INNINGS = 15;

function genId(): string {
  return `g_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** 非負整数の配列に正規化する */
function cleanScores(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, MAX_INNINGS).map(x => {
    const n = Number(x);
    return Number.isFinite(n) && n >= 0 ? Math.min(99, Math.floor(n)) : 0;
  });
}

function cleanCount(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.min(999, Math.floor(n)) : 0;
}

export async function POST(request: Request) {
  // ライブ中は何度も送られてくるので、上限は多めにしつつ歯止めは掛ける
  const rl = rateLimit(`live-score:${clientIp(request.headers)}`, { limit: 120, windowMs: 60_000 });
  if (!rl.ok) return tooMany(rl.retryAfter);

  const authErr = ensureMemberAuth(request.headers);
  if (authErr) return authErr;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "リクエスト形式が不正です。" }, { status: 400 });
  }

  const date = String(body.date ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ ok: false, error: "日付が不正です。" }, { status: 400 });
  }

  const opponentId = String(body.opponentId ?? "").slice(0, 60);
  const opponentName = String(body.opponentName ?? "").trim().slice(0, 80) || "対戦相手";
  const isHome = body.isHome === false ? "0" : "1";
  const ourScores = cleanScores(body.ourScores);
  const oppScores = cleanScores(body.oppScores);
  const inning = String(body.inning ?? "").slice(0, 20);
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");

  // 同じ日の「ライブ中」の試合があれば上書きする。無ければ新しく作る。
  // 確定済み（status が live 以外）の試合は、アプリからは絶対に触らない。
  const list = await callAppsScript({ op: "list", sheet: "games" });
  if (!list.ok) return Response.json({ ok: false, error: list.error }, { status: list.status });

  const rows = (list.data as { rows?: { rowIndex: number; data: string[] }[] }).rows ?? [];
  const existing = rows.find(r => (r.data[1] ?? "").trim() === date && (r.data[14] ?? "") === "live");

  const id = existing ? (existing.data[0] || genId()) : genId();
  const row = [
    id,
    date,
    OUR_TEAM,
    opponentName,
    ourScores.join(","),
    oppScores.join(","),
    String(cleanCount(body.ourHits)),
    String(cleanCount(body.oppHits)),
    String(cleanCount(body.ourErrors)),
    String(cleanCount(body.oppErrors)),
    "",          // winner は確定時に管理者側で決める
    existing ? (existing.data[11] ?? "") : "",  // メモは管理者が書くので触らない
    opponentId,
    isHome,
    "live",
    inning,
    now,
  ];

  const res = existing
    ? await callAppsScript({ op: "update", sheet: "games", rowIndex: existing.rowIndex, row })
    : await callAppsScript({ op: "append", sheet: "games", row });

  if (!res.ok) return Response.json({ ok: false, error: res.error }, { status: res.status });
  return Response.json({ ok: true, id, created: !existing });
}
