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

/**
 * 練習・試合の予定を追加・編集する場所。
 * 終了した予定は削除せず残してOK（カレンダーは月送りで参照可能）。
 */
export const practices: Practice[] = [
  {
    date: "2026-04-21",
    place: "東平尾公園",
    type: "キャッチボール",
    status: "tentative",
    note: "天候・参加人数によっては中止の可能性あり",
  },
];
