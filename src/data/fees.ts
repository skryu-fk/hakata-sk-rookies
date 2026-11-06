/**
 * 費用（グラウンド代）
 *
 * 金額は公式サイトのFAQ・活動概要・特商法ページ・チーム規約（/terms）と、
 * 管理画面の集金画面に出てくる。値上げのたびに直し漏れが出ると
 * 「サイトの金額と実際が違う」ことになるので、金額と計算はこの1ファイルに
 * 集約し、各所はここを参照するだけにしている。
 *
 * ── 2026年12月改定（チーム規約 第2版 第6条） ──
 *   日中 2時間   一般 600円   / 中高生 500円
 *   日中 4時間   一般 700円   / 中高生 500円
 *   ナイター     一般 1,000円 / 中高生 700円   ← 新設
 *   試合         上記にかかわらず 1人 +100円（日中・ナイターとも）
 *
 * 金額を変えるときは、規約第24条3項により施行日の1か月以上前の告知が必要。
 * docs/team-rules-2026.md の第6条も必ず一緒に直すこと。
 */

/** 改定日。お知らせに出す用 */
export const FEE_REVISED_ON = "2026年12月";

/** 練習の区分。ナイターは照明を使う時間帯の活動 */
export type PracticeLength = "h2" | "h4" | "night";

export const PRACTICE_LENGTH_LABEL: Record<PracticeLength, string> = {
  h2: "日中 2時間",
  h4: "日中 4時間",
  night: "ナイター",
};

/** グラウンド代（1人あたり・円） */
export const GROUND_FEE = {
  /** 一般（社会人・大学生など） */
  adult: { h2: 600, h4: 700, night: 1000 },
  /** 中学生・高校生。日中は時間に関係なく一律、ナイターのみ別 */
  student: { h2: 500, h4: 500, night: 700 },
  /** 試合の日は時間・学生を問わず上乗せ */
  gameExtra: 100,
} as const;

/** 1人あたりのグラウンド代を出す */
export function groundFee(opts: {
  hours: PracticeLength;
  isGame?: boolean;
  isStudent?: boolean;
}): number {
  const base = (opts.isStudent ? GROUND_FEE.student : GROUND_FEE.adult)[opts.hours];
  return base + (opts.isGame ? GROUND_FEE.gameExtra : 0);
}

/** 画面に出す料金表。順番もこのまま使う */
export const FEE_TABLE: { label: string; adult: number; student: number }[] =
  (["h2", "h4", "night"] as PracticeLength[]).map(h => ({
    label: PRACTICE_LENGTH_LABEL[h] + (h === "night" ? "練習" : "の練習"),
    adult: GROUND_FEE.adult[h],
    student: GROUND_FEE.student[h],
  }));

const yen = (n: number) => `${n.toLocaleString()}円`;

/** 「日中2時間600円／日中4時間700円／ナイター1,000円」のような短い表記（一般の額） */
export const FEE_SHORT = (["h2", "h4", "night"] as PracticeLength[])
  .map(h => `${PRACTICE_LENGTH_LABEL[h]}${yen(GROUND_FEE.adult[h])}`)
  .join("／");

/** 学生の扱いを一言で */
export const FEE_STUDENT_NOTE =
  `中学生・高校生は日中${yen(GROUND_FEE.student.h2)}・ナイター${yen(GROUND_FEE.student.night)}`;

/** 試合の上乗せを一言で */
export const FEE_GAME_NOTE = `試合の日は1人 +${yen(GROUND_FEE.gameExtra)}`;

/** 公式サイト向けの一文（FAQ・活動概要・規約ページで共通に使う） */
export const FEE_SENTENCE =
  `活動参加ごとのグラウンド代は、人数に関わらず1人一律で${FEE_SHORT}です。` +
  `${FEE_STUDENT_NOTE}。${FEE_GAME_NOTE}（日中・ナイターとも、学生も同じ）。` +
  `公園でのキャッチボール練習など、球場を借りない活動は無料です。`;
