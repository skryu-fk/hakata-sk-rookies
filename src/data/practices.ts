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

export type PracticeType = "球場練習" | "キャッチボール" | "試合" | "練習試合" | "全体練習";
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
  球場練習: "#d10024",     // 赤
  キャッチボール: "#d4a82a", // 金（公園練習）
  試合: "#4a90e2",          // 青（公式戦・対外試合）
  練習試合: "#9b59b6",      // 紫（他チームとの非公式戦）
  全体練習: "#27ae60",      // 緑（全員集合での合同練習）
};

export const PRACTICE_TYPE_LABEL: Record<PracticeType, string> = {
  球場練習: "球場練習",
  キャッチボール: "公園練習",
  試合: "試合",
  練習試合: "練習試合",
  全体練習: "全体練習",
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

/**
 * 練習種別を決定する。
 * type 列に明示的に書かれていればそれを優先：
 *   "試合" / "match"        → 試合
 *   "練習試合" / "scrim"    → 練習試合
 *   "全体練習" / "team"     → 全体練習
 *   "球場練習" / "field"    → 球場練習
 *   "キャッチボール"/"公園練習" → キャッチボール
 * それ以外（空 or 認識できない値）は place（開催場所）ベース：
 *   - "球場" "野球場" を含む場合 → 球場練習
 *   - それ以外                  → 公園練習（キャッチボール扱い）
 */
function resolveType(typeColumn: string, place: string): PracticeType {
  const t = typeColumn.trim();
  if (t === "試合" || t === "match") return "試合";
  if (t === "練習試合" || t === "scrim" || t === "practice-game") return "練習試合";
  if (t === "全体練習" || t === "team" || t === "全体") return "全体練習";
  if (t === "球場練習" || t === "field") return "球場練習";
  if (t === "キャッチボール" || t === "公園練習" || t === "公園" || t === "park") return "キャッチボール";
  // フォールバック: place ベース。"野球場" は "球場" にマッチするので /球場/ で両方拾える
  if (/球場/.test(place)) return "球場練習";
  return "キャッチボール"; // = 公園練習
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
  // gviz の暴発（存在しないシート名でデフォルトシートを返却）対策。
  // 「明らかに別シート(news/blog/tweets)の見出し」のときだけ拒否する。
  // これで practices シートのヘッダーが日本語でも空でも通る。
  const header = (rows[0] ?? []).map(c => c.toLowerCase().trim());
  const looksLikeOtherSheet =
    // news: date|category|title
    (header[1] === "category" && header[2] === "title") ||
    // blog: date|category|title|excerpt|content|slug
    header[3] === "excerpt" ||
    // tweets: date|text|url
    (header[1] === "text" && header[2] === "url");
  if (looksLikeOtherSheet) return practices;
  const parsed = rows.slice(1)
    .map<Practice | null>(r => {
      const date = normalizeDate(r[0] ?? "");
      const place = (r[2] ?? "").trim();
      if (!date || !place) return null;
      return {
        date,
        type: resolveType(r[1] ?? "", place),
        place,
        status: normalizeStatus(r[3] ?? ""),
        time: (r[4] ?? "").trim() || undefined,
        note: (r[5] ?? "").trim() || undefined,
      };
    })
    .filter((p): p is Practice => p !== null);
  return parsed.length > 0 ? parsed : practices;
}
