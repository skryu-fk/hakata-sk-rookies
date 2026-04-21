/**
 * 練習・試合スケジュールデータ
 *
 * 編集方法（推奨・pushなし）:
 *   Google スプレッドシートの "practices" シートを編集。
 *   セットアップは src/lib/sheets.ts のコメント参照。
 *
 * 下の practices 配列はフォールバック。
 */

import { fetchSheetCSV } from "@/lib/sheets";

export type PracticeType = "球場練習" | "キャッチボール" | "試合";
export type PracticeStatus = "scheduled" | "tentative" | "canceled";

export type Practice = {
  /** ISO date "YYYY-MM-DD"（日本時間ベース） */
  date: string;
  /** 開始〜終了。例: "18:30〜20:30" */
  time?: string;
  /** 場所。例: "東平尾公園" */
  place: string;
  type: PracticeType;
  status: PracticeStatus;
  /** 備考（中止の可能性・持ち物など） */
  note?: string;
};

export const PRACTICE_TYPE_COLOR: Record<PracticeType, string> = {
  球場練習: "#d10024",
  キャッチボール: "#d4a82a",
  試合: "#4a90e2",
};

export const PRACTICE_TYPE_LABEL: Record<PracticeType, string> = {
  球場練習: "球場練習",
  キャッチボール: "公園練習",
  試合: "試合",
};

/** フォールバック */
export const practices: Practice[] = [
  {
    date: "2026-04-21",
    place: "東平尾公園",
    type: "キャッチボール",
    status: "tentative",
    note: "天候・参加人数によっては中止の可能性あり",
  },
];

function normalizeType(v: string): PracticeType {
  const t = v.trim();
  if (t === "球場練習" || t === "field") return "球場練習";
  if (t === "試合" || t === "match") return "試合";
  return "キャッチボール"; // 公園練習／キャッチボール／その他はまとめてキャッチボール
}

function normalizeStatus(v: string): PracticeStatus {
  const t = v.trim().toLowerCase();
  if (t === "canceled" || t === "中止" || t === "cancel") return "canceled";
  if (t === "tentative" || t === "未定" || t === "tentative?" ) return "tentative";
  return "scheduled";
}

function normalizeDate(v: string): string {
  // "YYYY-MM-DD" / "YYYY.MM.DD" / "YYYY/MM/DD" → "YYYY-MM-DD"
  const t = v.trim().replace(/[./]/g, "-");
  // "2026-4-21" → "2026-04-21"
  const m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return "";
  return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

/** スプレッドシートから最新の練習予定を取得。失敗時は静的配列にフォールバック。 */
export async function getPractices(): Promise<Practice[]> {
  const rows = await fetchSheetCSV("practices");
  if (rows.length <= 1) return practices;
  const parsed = rows.slice(1)
    .map<Practice | null>(r => {
      const date = normalizeDate(r[0] ?? "");
      const place = (r[2] ?? "").trim();
      if (!date || !place) return null;
      return {
        date,
        type: normalizeType(r[1] ?? ""),
        place,
        status: normalizeStatus(r[3] ?? ""),
        time: (r[4] ?? "").trim() || undefined,
        note: (r[5] ?? "").trim() || undefined,
      };
    })
    .filter((p): p is Practice => p !== null);
  return parsed.length > 0 ? parsed : practices;
}
