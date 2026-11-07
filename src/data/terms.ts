import { FEE_SENTENCE } from "@/data/fees";

/**
 * チーム規約まわりの数字と文言
 *
 * 規約の本文そのものは docs/team-rules-2026.md にあり、/terms のページと
 * 配布用PDFはどちらもそのファイルから作っている。
 *
 * 会費と保険の扱いはここに集約する。以前は活動概要・FAQ・特定商取引法の
 * 表記に直書きされていて、月会費を500円から1,000円に変えたときに直し漏れ、
 * 保険の「全員必須」も古いまま残っていた。
 * なお**グラウンド代は src/data/fees.ts** にある（管理画面の集金計算と
 * 同じ数字を使うため）。ここでは FEE_SENTENCE を借りてくるだけにする。
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
  // 新しく入団する人が記入する書類。規約（第2版）を前提に初版を作り直したもので、
  // 本文は docs/membership-agreement-2026.md が原本。
  agreementPdf: "/docs/hakata-sk-rookies-membership-agreement-v2.pdf",
  agreementPdfName: "博多SKルーキーズ_メンバー加入契約書_第2版.pdf",
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
export const INSURANCE_FEE_TEXT = "年額2,000円程度・加入区分や年度によって異なります";
export const INSURANCE_SUMMARY =
  "スポーツ安全保険への加入は任意です。中学生・高校生は、福岡市の子ども医療費助成があるため加入は不要です。加入していない方がけがをした場合、チームは責任を負いません。";

const yen = (n: number) => `${n.toLocaleString()}円`;

/** 活動概要・FAQ・特定商取引法の表記で使う、費用のひとまとめの説明 */
export const FEE_SUMMARY =
  `月会費${yen(MONTHLY_FEE)}が基本の会費です。${FEE_SENTENCE}`
  + `${JOIN_FEE_SINCE}以降の新規入団者は入会費${yen(JOIN_FEE)}（初回のみ）が必要です。`
  + `スポーツ安全保険（${INSURANCE_FEE_TEXT}）への加入は任意で、中学生・高校生は福岡市の子ども医療費助成があるため加入不要です。`
  + `ユニフォーム購入の強制や高額な年会費はありません。`;

/** 見出しなどに出す短い表記 */
export const FEE_SHORT = `入会費 ¥${JOIN_FEE.toLocaleString()} + 月額 ¥${MONTHLY_FEE.toLocaleString()}`;
