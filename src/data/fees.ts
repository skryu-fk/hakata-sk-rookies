/**
 * 費用（グラウンド代）
 *
 * 金額は公式サイトのFAQ・活動概要・特商法ページ・マネージャー募集・
 * 検索結果用の構造化データ、そして管理画面の集金画面に出てくる。
 * 値上げのたびに直し漏れが出ると「サイトの金額と実際が違う」ことになるので、
 * 金額と計算はこの1ファイルに集約し、各所はここを参照するだけにしている。
 *
 * ── 2026年10月改定 ──
 *   一般   2時間 600円 / 4時間 700円
 *   学生   中学生・高校生は時間に関係なく一律 500円
 *   試合   上記にかかわらず 1人 +100円
 */

/** 改定日。お知らせに出す用 */
export const FEE_REVISED_ON = "2026年10月";

/** グラウンド代（1人あたり・円） */
export const GROUND_FEE = {
  /** 一般（社会人・大学生など） */
  adult: { h2: 600, h4: 700 },
  /** 中学生・高校生は時間に関係なく一律 */
  student: 500,
  /** 試合の日は時間・学生を問わず上乗せ */
  gameExtra: 100,
} as const;

export type PracticeLength = "h2" | "h4";

/**
 * 1人あたりのグラウンド代を出す。
 * 学生は時間に関係なく一律なので、hours は見ない。
 */
export function groundFee(opts: {
  hours: PracticeLength;
  isGame?: boolean;
  isStudent?: boolean;
}): number {
  const base = opts.isStudent ? GROUND_FEE.student : GROUND_FEE.adult[opts.hours];
  return base + (opts.isGame ? GROUND_FEE.gameExtra : 0);
}

/** 画面に出す料金表。順番もこのまま使う */
export const FEE_TABLE: { label: string; adult: number; student: number }[] = [
  { label: "2時間練習", adult: GROUND_FEE.adult.h2, student: GROUND_FEE.student },
  { label: "4時間練習", adult: GROUND_FEE.adult.h4, student: GROUND_FEE.student },
  { label: "2時間（試合）", adult: GROUND_FEE.adult.h2 + GROUND_FEE.gameExtra, student: GROUND_FEE.student + GROUND_FEE.gameExtra },
  { label: "4時間（試合）", adult: GROUND_FEE.adult.h4 + GROUND_FEE.gameExtra, student: GROUND_FEE.student + GROUND_FEE.gameExtra },
];

/** 「2時間600円／4時間700円」のような短い表記 */
export const FEE_SHORT = `2時間${GROUND_FEE.adult.h2}円／4時間${GROUND_FEE.adult.h4}円`;

/** 学生の扱いを一言で */
export const FEE_STUDENT_NOTE = `中学生・高校生は時間に関係なく一律${GROUND_FEE.student}円`;

/** 試合の上乗せを一言で */
export const FEE_GAME_NOTE = `試合の日は1人 +${GROUND_FEE.gameExtra}円`;

/** 公式サイト向けの一文（FAQ・活動概要・構造化データで共通に使う） */
export const FEE_SENTENCE =
  `活動参加ごとのグラウンド代は、人数に関わらず1人一律で${FEE_SHORT}です。` +
  `${FEE_STUDENT_NOTE}。${FEE_GAME_NOTE}（学生も同じ）。`;
