/**
 * /api/member/score — スコアラーが記録した結果を「承認待ち(pending)」に送る。
 *   POST { kind, date, opponent, memberId, memberName, data }
 *     kind = "batting" | "pitching"
 *     data = 数値フィールドのオブジェクト（kind により内容が異なる）
 *
 * ここでは本反映せず pending シートへ積むだけ。管理者が承認すると batting/pitching に反映。
 * 認証はメンバーセッション Cookie。
 */
import { ensureMemberAuth, callAppsScript } from "@/lib/admin-shared";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FIELDS: Record<string, string[]> = {
  batting: ["atBats", "hits", "doubles", "triples", "hr", "rbi", "bb", "so", "hbp", "sh", "sb", "cs"],
  pitching: ["ipOuts", "hits", "runs", "er", "so", "bb", "hbp"],
};

function genId(): string {
  return `pd_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export async function POST(request: Request) {
  const rl = rateLimit(`member-score:${clientIp(request.headers)}`, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) return tooMany(rl.retryAfter);

  const authErr = ensureMemberAuth(request.headers);
  if (authErr) return authErr;

  let body: { kind?: string; date?: string; opponent?: string; memberId?: string; memberName?: string; data?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "リクエスト形式が不正です。" }, { status: 400 });
  }

  const kind = (body.kind ?? "").trim();
  const date = (body.date ?? "").trim();
  if (!FIELDS[kind]) return Response.json({ ok: false, error: "種別が不正です。" }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Response.json({ ok: false, error: "日付が不正です。" }, { status: 400 });
  if (!body.memberId) return Response.json({ ok: false, error: "選手が未指定です。" }, { status: 400 });

  // data を許可フィールドのみ・非負整数に正規化
  const clean: Record<string, number> = {};
  for (const f of FIELDS[kind]) {
    const n = Number((body.data ?? {})[f]);
    clean[f] = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  }

  const row = [
    genId(),
    kind,
    date,
    (body.opponent ?? "").toString().slice(0, 80),
    body.memberId.toString().slice(0, 60),
    (body.memberName ?? "").toString().slice(0, 60),
    JSON.stringify(clean),
    new Date().toISOString().slice(0, 19).replace("T", " "),
  ];

  const res = await callAppsScript({ op: "append", sheet: "pending", row });
  if (!res.ok) return Response.json({ ok: false, error: res.error }, { status: res.status });
  return Response.json({ ok: true });
}
