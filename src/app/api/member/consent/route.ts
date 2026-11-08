/**
 * /api/member/consent — チーム規約への同意を、アプリから署名して提出する。
 *   GET  → { ok, current }  … ログイン中の本人の、いちばん新しい同意
 *   POST → 同意を1件追記する
 *
 * 本人の特定はセッションCookie(sub=アカウントID)。他人の名前では出せない。
 * 選び直した場合も上書きせず追記し、最新の行を現在の同意として扱う
 * （規約第21条5項「選んだあとでも、いつでも変更できます」に合わせる）。
 *
 * 署名は手書きの画像（PNG）。Supabase Storage に上げて URL を保存する。
 * Storage が使えない構成のときだけ、データURLのまま列に入れる。
 */
import { readSession, readCookie, MEMBER_COOKIE, sameOrigin, crossOriginDenied } from "@/lib/security";
import { callAppsScript } from "@/lib/admin-shared";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";
import { supabaseEnabled, uploadImage } from "@/lib/supabaseData";
import {
  CONSENT_DOC_VERSION, AGE_BANDS, INSURANCE_CHOICES, NAME_CHOICES, PHOTO_CHOICES,
} from "@/data/consent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Row = { rowIndex: number; data: string[] };

/** consents の列（supabaseData.ts の COLUMNS.consents と同じ並び） */
const COL = {
  id: 0, accountId: 1, userId: 2, memberId: 3, memberName: 4,
  docVersion: 5, agreedAt: 6, ageBand: 7, insurance: 8,
  nameDisclosure: 9, registeredName: 10, photo: 11, signature: 12,
  guardianName: 13, guardianRelation: 14, guardianContact: 15, guardianSignature: 16,
  device: 17, createdAt: 18,
} as const;
const NCOL = 19;

/** 署名画像の上限。Storage が無いときは列に直接入るので、シートの上限より十分小さくする */
const MAX_SIGNATURE_CHARS = 300_000;

async function currentAccount(headers: Headers) {
  const sess = readSession(readCookie(headers, MEMBER_COOKIE), "member");
  if (!sess?.sub) return null;
  const list = await callAppsScript({ op: "list", sheet: "accounts" });
  if (!list.ok) return { error: list.error, status: list.status } as const;
  const rows = (list.data as { rows?: Row[] }).rows ?? [];
  const acc = rows.find(r => (r.data[0] ?? "") === sess.sub);
  return acc ? ({ acc } as const) : null;
}

function toView(d: string[]) {
  return {
    docVersion: d[COL.docVersion] ?? "",
    agreedAt: d[COL.agreedAt] ?? "",
    ageBand: d[COL.ageBand] ?? "",
    insurance: d[COL.insurance] ?? "",
    nameDisclosure: d[COL.nameDisclosure] ?? "",
    registeredName: d[COL.registeredName] ?? "",
    photo: d[COL.photo] ?? "",
    guardianName: d[COL.guardianName] ?? "",
    guardianRelation: d[COL.guardianRelation] ?? "",
    hasSignature: !!(d[COL.signature] ?? ""),
  };
}

export async function GET(request: Request) {
  const found = await currentAccount(request.headers);
  if (!found) return Response.json({ ok: false, error: "ログインが必要です。" }, { status: 401 });
  if ("error" in found) return Response.json({ ok: false, error: found.error }, { status: found.status });

  const accountId = found.acc.data[0] ?? "";
  const list = await callAppsScript({ op: "list", sheet: "consents" });
  if (!list.ok) {
    // consents シート/テーブルがまだ無い場合もここに来る。未同意として扱う。
    return Response.json({ ok: true, current: null, docVersion: CONSENT_DOC_VERSION });
  }
  const mine = ((list.data as { rows?: Row[] }).rows ?? [])
    .filter(r => (r.data[COL.accountId] ?? "") === accountId)
    .sort((a, b) => (a.data[COL.agreedAt] ?? "").localeCompare(b.data[COL.agreedAt] ?? ""));
  const latest = mine.at(-1);

  return Response.json({
    ok: true,
    docVersion: CONSENT_DOC_VERSION,
    current: latest ? toView(latest.data) : null,
  });
}

/** data URL の手書き署名を保存して、列に入れる文字列（URL）を返す */
async function storeSignature(dataUrl: string, who: string): Promise<string> {
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl.trim());
  if (!m) throw new Error("署名の形式が正しくありません。");
  if (dataUrl.length > MAX_SIGNATURE_CHARS) throw new Error("署名の画像が大きすぎます。書き直してください。");
  if (!supabaseEnabled()) return dataUrl;   // 保存先が無い構成では、そのまま残す

  const bytes = Buffer.from(m[1], "base64");
  const file = new File([new Uint8Array(bytes)], `consent-${who}-${Date.now()}.png`, { type: "image/png" });
  return await uploadImage(file);
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return crossOriginDenied();
  const rl = rateLimit(`member-consent:${clientIp(request.headers)}`, { limit: 10, windowMs: 10 * 60_000 });
  if (!rl.ok) return tooMany(rl.retryAfter);

  const found = await currentAccount(request.headers);
  if (!found) return Response.json({ ok: false, error: "ログインが必要です。" }, { status: 401 });
  if ("error" in found) return Response.json({ ok: false, error: found.error }, { status: found.status });

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "リクエスト形式が不正です。" }, { status: 400 });
  }

  const str = (k: string) => String(body[k] ?? "").trim();
  const pick = <T extends string>(set: { value: T }[], k: string): T | null => {
    const v = str(k);
    return set.some(c => c.value === v) ? (v as T) : null;
  };

  if (body.confirmed !== true || body.electronic !== true) {
    return Response.json({ ok: false, error: "確認事項すべてにチェックしてください。" }, { status: 400 });
  }
  const ageBand = pick(AGE_BANDS, "ageBand");
  const insurance = pick(INSURANCE_CHOICES, "insurance");
  const nameDisclosure = pick(NAME_CHOICES, "nameDisclosure");
  const photo = pick(PHOTO_CHOICES, "photo");
  if (!ageBand || !insurance || !nameDisclosure || !photo) {
    return Response.json({ ok: false, error: "選択していない項目があります。" }, { status: 400 });
  }

  const registeredName = str("registeredName");
  if (nameDisclosure === "alias" && !registeredName) {
    return Response.json({ ok: false, error: "公開してよい登録名を入力してください。" }, { status: 400 });
  }
  if (registeredName.length > 20) {
    return Response.json({ ok: false, error: "登録名は20文字以内にしてください。" }, { status: 400 });
  }

  const guardianName = str("guardianName");
  const guardianRelation = str("guardianRelation");
  const guardianContact = str("guardianContact");
  if (ageBand === "minor" && (!guardianName || !guardianContact || !str("guardianSignature"))) {
    return Response.json(
      { ok: false, error: "18歳未満の方は、保護者の氏名・連絡先・署名が必要です。" },
      { status: 400 },
    );
  }
  if (!str("signature")) {
    return Response.json({ ok: false, error: "署名を書いてください。" }, { status: 400 });
  }

  let signature = "";
  let guardianSignature = "";
  try {
    signature = await storeSignature(str("signature"), "self");
    if (ageBand === "minor") guardianSignature = await storeSignature(str("guardianSignature"), "guardian");
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }

  const acc = found.acc.data;
  const now = new Date();
  const agreedAt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo", dateStyle: "short", timeStyle: "medium",
  }).format(now).replace(" ", "T");

  const row = Array<string>(NCOL).fill("");
  row[COL.id] = `CNS-${now.getTime().toString(36).toUpperCase()}`;
  row[COL.accountId] = acc[0] ?? "";
  row[COL.userId] = acc[8] ?? "";
  row[COL.memberId] = acc[7] ?? "";
  row[COL.memberName] = acc[1] ?? "";
  row[COL.docVersion] = CONSENT_DOC_VERSION;
  row[COL.agreedAt] = agreedAt;
  row[COL.ageBand] = ageBand;
  row[COL.insurance] = insurance;
  row[COL.nameDisclosure] = nameDisclosure;
  row[COL.registeredName] = nameDisclosure === "alias" ? registeredName : "";
  row[COL.photo] = photo;
  row[COL.signature] = signature;
  row[COL.guardianName] = guardianName;
  row[COL.guardianRelation] = guardianRelation;
  row[COL.guardianContact] = guardianContact;
  row[COL.guardianSignature] = guardianSignature;
  // どの端末から出したかだけ残す。IPアドレスは保存しない
  row[COL.device] = (request.headers.get("user-agent") ?? "").slice(0, 180);
  row[COL.createdAt] = agreedAt;

  const res = await callAppsScript({ op: "append", sheet: "consents", row });
  if (!res.ok) return Response.json({ ok: false, error: res.error }, { status: res.status });

  return Response.json({ ok: true, current: toView(row) });
}
