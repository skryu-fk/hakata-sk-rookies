/**
 * チーム規約まわりの数字と文言
 *
 * 規約の本文そのものは docs/team-rules-2026.md にあり、/terms のページと
 * 配布用PDFはどちらもそのファイルから作っている。
 *
 * ただし費用の金額は、規約だけでなく活動概要・FAQ・特定商取引法の表記にも
 * 出てくる。以前は3か所に直書きされていて、月会費を500円から1,000円に
 * 変えたときに直し漏れていた（保険の「義務」も同じく古いままだった）。
 * 金額まわりはここに集めて、各所はここを参照する。
 *
 * ── 変えるとき ──
 *   金額を変える場合、規約第24条3項により施行日の1か月以上前に告知が必要。
 *   docs/team-rules-2026.md の該当条文も必ず一緒に直すこと。
 */

export const TERMS = {
  /** 第2版の施行日 */
  effectiveDate: "2026年12月1日",
  version: "第2版",
  // ファイル名は半角にしておく（URLに日本語が入ると共有時に化けるため）。
  // 保存されるときの名前は、リンク側の download 属性で日本語に戻している。
  rulesPdf: "/docs/hakata-sk-rookies-team-rules-v2.pdf",
  rulesPdfName: "博多SKルーキーズ_チーム規約_第2版.pdf",
  consentPdf: "/docs/hakata-sk-rookies-rules-consent.pdf",
  consentPdfName: "博多SKルーキーズ_規約改定の同意書.pdf",
} as const;

/* ── 費用 ─────────────────────────────────────────────── */

/** 月会費（2026年8月分より1,000円） */
export const MONTHLY_FEE = 1000;

/** 入会費。2026年5月15日以降に入団した人のみ、初回だけ */
export const JOIN_FEE = 2000;
export const JOIN_FEE_SINCE = "2026年5月15日";

/**
 * スポーツ安全保険
 *
 * 2026年12月1日の規約改定で「全員必須」から「任意」に変えた。
 * 中学生・高校生は、福岡市の子ども医療費助成（高校生世代まで、通院は
 * 1医療機関あたり月500円まで・入院は自己負担なし）があるため加入不要。
 */
export const INSURANCE_REQUIRED = false;
export const INSURANCE_FEE_TEXT = "年額2,000円程度（加入区分・年度によって異なります）";
export const INSURANCE_SUMMARY =
  "スポーツ安全保険への加入は任意です。中学生・高校生は、福岡市の子ども医療費助成があるため加入は不要です。加入していない方がけがをした場合、チームは責任を負いません。";

/** グラウンド代。1人あたり・活動1回ごと。参加人数が何人でも金額は変わらない */
export const GROUND_FEES: { label: string; adult: number; student: number }[] = [
  { label: "日中の練習（2時間）", adult: 600, student: 500 },
  { label: "日中の練習（4時間）", adult: 700, student: 500 },
  { label: "ナイター練習", adult: 1000, student: 700 },
];

/** 試合の日は、上の金額に全員一律この額を足す */
export const GAME_SURCHARGE = 100;

const yen = (n: number) => `${n.toLocaleString()}円`;

/** 活動概要・FAQ・特定商取引法の表記で使う、費用のひとまとめの説明 */
export const FEE_SUMMARY =
  `月会費${yen(MONTHLY_FEE)}と、活動に参加した回ごとのグラウンド代（1人あたり`
  + GROUND_FEES.map(g => `${g.label} 一般${yen(g.adult)}・中高生${yen(g.student)}`).join("／")
  + `／試合の日は全員一律+${yen(GAME_SURCHARGE)}）が基本費用です。`
  + `${JOIN_FEE_SINCE}以降の新規入団者は入会費${yen(JOIN_FEE)}（初回のみ）が必要です。`
  + `スポーツ安全保険（${INSURANCE_FEE_TEXT}）への加入は任意で、中学生・高校生は福岡市の子ども医療費助成があるため加入不要です。`
  + `ユニフォーム購入の強制や高額な年会費はありません。`;

/** 見出しなどに出す短い表記 */
export const FEE_SHORT = `入会費 ¥${JOIN_FEE.toLocaleString()} + 月額 ¥${MONTHLY_FEE.toLocaleString()}`;
