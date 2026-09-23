/**
 * Supabase データアクセス層。
 *
 * Apps Script（スプレッドシート）と「まったく同じ入出力」で動く差し替え部品。
 * 画面側は今までどおり { op, sheet, row, rowIndex } を渡すだけでよく、
 * このファイルが SQL に読み替える。
 *
 * - 行の識別子(rowIndex)には row_id を使う。スプレッドシートと違い
 *   追加しても番号がずれないため、「編集したら別の行が書き換わる」事故が起きない。
 * - 値はすべて text。アプリ側で数値変換しているため型崩れの心配がない。
 * - 使うのはサーバー専用の SERVICE ROLE キー。ブラウザには絶対に渡さない。
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** シート名 → 列の並び（スプレッドシートの列順と1対1で対応させる） */
const COLUMNS: Record<string, string[]> = {
  members: ["id", "name", "nickname", "jersey_number", "position", "joined_date", "active", "kana"],
  attendance: ["date", "member_id", "member_name", "status", "note"],
  batting: ["date", "member_id", "member_name", "opponent", "at_bats", "hits", "doubles", "triples", "hr", "rbi", "bb", "so", "hbp", "sh", "sb", "cs"],
  pitching: ["date", "member_id", "member_name", "opponent", "ip_outs", "hits", "runs", "er", "so", "bb", "hbp"],
  catching: ["date", "member_id", "member_name", "opponent", "sba", "cs"],
  fielding: ["date", "member_id", "member_name", "opponent", "po", "assists", "errors"],
  practices: ["date", "type", "place", "status", "time", "note"],
  participants: ["date", "member_id", "member_name", "note"],
  probables: ["date", "opponent", "member_id", "member_name", "note"],
  announcements: ["date", "category", "title", "body"],
  settings: ["setting_key", "value", "note"],
  pending: ["id", "kind", "date", "opponent", "member_id", "member_name", "data", "created_at_text"],
  accounts: ["id", "name", "name_key", "hash", "salt", "status", "created_at_text", "member_id", "user_id"],
  lineups: ["id", "date", "team", "batting_order", "member_id", "member_name", "position"],
  games: ["id", "date", "home_team", "away_team", "home_scores", "away_scores", "home_hits", "away_hits", "home_errors", "away_errors", "winner", "note"],
  payments: ["id", "date", "member_id", "member_name", "amount", "note"],
  news: ["date", "category", "title", "body", "slug"],
  tweets: ["date", "text", "url"],
  blog: ["date", "category", "title", "excerpt", "content", "slug"],
  subscriptions: ["endpoint", "p256dh", "auth", "label", "created_at_text"],
  evaluations: ["id", "member_id", "member_name", "date", "batting", "running", "fielding", "pitching", "teamwork", "comment", "created_at_text"],
  // image は後から足した列。並びを崩さないよう末尾に置いている。
  polls: ["id", "question", "options", "note", "status", "deadline", "created_at_text", "image"],
  poll_votes: ["id", "poll_id", "member_id", "member_name", "choice", "created_at_text"],
};

export const SUPABASE_TABLES = Object.keys(COLUMNS);

/** Supabase が使える設定になっているか */
export function supabaseEnabled(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

let client: SupabaseClient | null = null;
function db(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return client;
}

type Ok = { ok: true; data: unknown };
type Err = { ok: false; status: number; error: string };
export type DataResult = Ok | Err;

function str(v: unknown): string {
  return v === null || v === undefined ? "" : String(v);
}

/** DBの1行 → スプレッドシート互換の { rowIndex, data[] } */
function toRow(sheet: string, rec: Record<string, unknown>) {
  const cols = COLUMNS[sheet];
  return { rowIndex: Number(rec.row_id), data: cols.map(c => str(rec[c])) };
}

/** 配列 → 列名付きオブジェクト（余った列は空文字で埋める） */
function toRecord(sheet: string, row: unknown[]): Record<string, string> {
  const cols = COLUMNS[sheet];
  const rec: Record<string, string> = {};
  cols.forEach((c, i) => { rec[c] = str(row[i]); });
  return rec;
}

async function listRows(sheet: string) {
  // スプレッドシート版は新しい行が上に来るため、同じ並び（新しい順）にする
  const { data, error } = await db().from(sheet).select("*").order("row_id", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(r => toRow(sheet, r as Record<string, unknown>));
}

/**
 * Apps Script と同じインターフェースのデータ操作。
 * op: list / listMany / append / update / delete / upsert
 */
export async function callSupabase(payload: Record<string, unknown>): Promise<DataResult> {
  const op = String(payload.op ?? "append");
  try {
    if (op === "listMany") {
      const names = (payload.sheets as string[] | undefined) ?? [];
      const sheets: Record<string, unknown> = {};
      // 1リクエストにつき並列で取得（SQLは速いので同時でも問題にならない）
      // 1つのテーブルの失敗で全体を落とさない。新しいテーブルを足した直後など、
      // まだ SQL を流していない状態でもアプリ全体が真っ白にならないようにする。
      await Promise.all(names.filter(n => COLUMNS[n]).map(async n => {
        try {
          sheets[n] = await listRows(n);
        } catch (e) {
          console.error(`[supabase] listMany: ${n} を読めませんでした`, e);
          sheets[n] = [];
        }
      }));
      return { ok: true, data: { ok: true, sheets } };
    }

    const sheet = String(payload.sheet ?? "");
    if (!COLUMNS[sheet]) return { ok: false, status: 400, error: "unknown sheet" };

    if (op === "list") {
      return { ok: true, data: { ok: true, rows: await listRows(sheet) } };
    }

    if (op === "append") {
      const row = payload.row as unknown[];
      if (!Array.isArray(row)) return { ok: false, status: 400, error: "row required" };
      const { error } = await db().from(sheet).insert(toRecord(sheet, row));
      if (error) throw new Error(error.message);
      return { ok: true, data: { ok: true } };
    }

    if (op === "update") {
      const rowIndex = Number(payload.rowIndex);
      const row = payload.row as unknown[];
      if (!Number.isFinite(rowIndex)) return { ok: false, status: 400, error: "bad rowIndex" };
      if (!Array.isArray(row)) return { ok: false, status: 400, error: "row required" };
      const { error } = await db().from(sheet).update(toRecord(sheet, row)).eq("row_id", rowIndex);
      if (error) throw new Error(error.message);
      return { ok: true, data: { ok: true } };
    }

    if (op === "delete") {
      const rowIndex = Number(payload.rowIndex);
      if (!Number.isFinite(rowIndex)) return { ok: false, status: 400, error: "bad rowIndex" };
      const { error } = await db().from(sheet).delete().eq("row_id", rowIndex);
      if (error) throw new Error(error.message);
      return { ok: true, data: { ok: true } };
    }

    if (op === "upsert") {
      // キー列の値で「あれば更新・なければ追加」（冪等）
      const keyCol = Number(payload.keyCol || 1);
      const keyVal = str(payload.keyVal);
      const row = payload.row as unknown[];
      if (!Array.isArray(row)) return { ok: false, status: 400, error: "row required" };
      const colName = COLUMNS[sheet][keyCol - 1];
      if (!colName) return { ok: false, status: 400, error: "bad keyCol" };
      const rec = toRecord(sheet, row);
      const { data: found, error: findErr } = await db().from(sheet).select("row_id").eq(colName, keyVal).limit(1);
      if (findErr) throw new Error(findErr.message);
      if (found && found.length > 0) {
        const { error } = await db().from(sheet).update(rec).eq("row_id", (found[0] as { row_id: number }).row_id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await db().from(sheet).insert(rec);
        if (error) throw new Error(error.message);
      }
      return { ok: true, data: { ok: true } };
    }

    return { ok: false, status: 400, error: "unknown op" };
  } catch (e) {
    console.error("[supabase] error:", e);
    return { ok: false, status: 502, error: `データベースエラー: ${(e as Error).message}` };
  }
}

/** 移行用: シートの全行をまとめて投入する（既存は消してから入れ直す） */
export async function replaceAll(sheet: string, rows: string[][]): Promise<number> {
  if (!COLUMNS[sheet]) throw new Error(`unknown sheet: ${sheet}`);
  // 既存を全削除（row_id は必ず0より大きいので全件が対象）
  const { error: delErr } = await db().from(sheet).delete().gt("row_id", 0);
  if (delErr) throw new Error(delErr.message);
  if (rows.length === 0) return 0;
  // スプレッドシートは新しい行が上。挿入順は逆にして row_id の並びを合わせる
  const recs = [...rows].reverse().map(r => toRecord(sheet, r));
  // 大量データでも詰まらないよう500件ずつ
  for (let i = 0; i < recs.length; i += 500) {
    const { error } = await db().from(sheet).insert(recs.slice(i, i + 500));
    if (error) throw new Error(error.message);
  }
  return rows.length;
}

/* ── 画像アップロード（Supabase Storage） ───────────────────────
 * 投票に添付する画像を置く場所。バケットは初回アップロード時に
 * 自動で作るので、管理画面から使う前に手作業で用意する必要はない。
 * 読み取りは公開（アプリから <img> で表示するため）、
 * 書き込みはサーバー側のサービスロール経由だけに限られる。          */
const BUCKET = "poll-images";
let bucketReady = false;

async function ensureBucket(): Promise<void> {
  if (bucketReady) return;
  const { data } = await db().storage.getBucket(BUCKET);
  if (!data) {
    const { error } = await db().storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 6 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    });
    // 同時に2つアップロードすると「既にある」で失敗しうるが、それは問題ない
    if (error && !/exist/i.test(error.message)) throw new Error(error.message);
  }
  bucketReady = true;
}

/** 画像を保存して、表示用のURLを返す */
export async function uploadImage(file: File): Promise<string> {
  await ensureBucket();
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const { error } = await db().storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return db().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
