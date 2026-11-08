import { TERMS, INSURANCE_FEE_TEXT } from "@/data/terms";

/**
 * アプリから出す「チーム規約への同意」の中身
 *
 * 紙の同意書（docs/rules-change-consent-2026.md）と同じ選択肢をここに置き、
 * アプリの画面・保存するデータ・管理画面の表示がすべてここを参照する。
 * 紙とアプリで選択肢がずれると、どちらで出したかによって同意の内容が
 * 変わってしまうため、文言を直すときは紙の .md も一緒に直すこと。
 *
 * ── 法的な位置づけ ──
 *   加入契約書 第12条第3項（初版）／第20条第3項（第2版）は、契約内容の変更に
 *   「書面による合意」を求めている。アプリからの同意は電磁的記録なので、
 *   CONSENT_ELECTRONIC の一文に同意してもらうことで書面に代える。
 *   本人の特定はログイン中のアカウント、日時はサーバー側の時刻、
 *   意思表示は手書き署名の画像で残す。
 */

/** いま有効な同意書の版。規約を改定したらここを上げる（過去の同意は残る） */
export const CONSENT_DOC_VERSION = "2026-12-01-v2";

export const CONSENT_ELECTRONIC =
  "この画面での同意（電磁的記録）をもって、メンバー加入契約書が求める「書面による合意」に代えることに同意します。";

/** 同意の前に読んで確認してもらうこと。紙の同意書の確認項目と同じ */
export const CONSENT_POINTS: { text: string; article: string }[] = [
  { text: "月会費は月額1,000円で、原則として毎月初めに支払うこと。球場代にナイター料金があること", article: "第5条・第6条" },
  { text: "スポーツ安全保険への加入は任意で、未加入の場合はけがをしてもチームが責任を負わないこと", article: "第9条" },
  { text: "医療費助成では、他人にけがをさせた場合などの賠償はまかなえないこと", article: "第9条4項" },
  { text: "無断欠席・無断遅刻はなるべくしないこと。連絡が遅れても必ず伝えること", article: "第11条" },
  { text: "リーグ戦のメンバー登録がされるとは限らないこと", article: "第13条" },
  { text: "退団は申し出た月の翌月1日に成立すること", article: "第19条" },
  { text: "規約に違反した場合、リーグ戦出場停止または強制退団となる場合があること", article: "第18条" },
];

export type ChoiceSet<T extends string> = { value: T; label: string; note?: string }[];

export type AgeBand = "adult" | "minor";
export const AGE_BANDS: ChoiceSet<AgeBand> = [
  { value: "adult", label: "満18歳以上" },
  { value: "minor", label: "満18歳未満", note: "保護者の同意が必要です" },
];

export type Insurance = "join" | "own" | "student" | "none";
export const INSURANCE_CHOICES: ChoiceSet<Insurance> = [
  { value: "join", label: `スポーツ安全保険に加入する`, note: INSURANCE_FEE_TEXT },
  { value: "own", label: "すでに個人で傷害保険に加入している" },
  { value: "student", label: "中学生・高校生のため加入しない", note: "福岡市の子ども医療費助成を利用します" },
  { value: "none", label: "加入しない", note: "けがをしてもチームが責任を負わないことを理解しています" },
];

export type NameDisclosure = "real" | "alias" | "private";
export const NAME_CHOICES: ChoiceSet<NameDisclosure> = [
  { value: "real", label: "本名を公開してよい" },
  { value: "alias", label: "登録名でなら公開してよい", note: "ニックネーム・イニシャルなど" },
  { value: "private", label: "公開しないでほしい" },
];

export type Photo = "ok" | "blurred" | "no";
export const PHOTO_CHOICES: ChoiceSet<Photo> = [
  { value: "ok", label: "掲載してよい" },
  { value: "blurred", label: "顔が分からない写り方なら掲載してよい" },
  { value: "no", label: "掲載しないでほしい" },
];

/** 保存されている値を日本語に戻す（管理画面の一覧で使う） */
export function labelOf<T extends string>(set: ChoiceSet<T>, value: string): string {
  return set.find(c => c.value === value)?.label ?? value ?? "";
}

export const CONSENT_INTRO =
  `「博多SKルーキーズ チーム規約（${TERMS.version}・施行日${TERMS.effectiveDate}）」の全文を読み、`
  + "内容を理解したうえで、これに同意します。あわせて、メンバー加入契約書の定めにより、"
  + `${TERMS.effectiveDate}をもって同契約書 第3条から第11条までが本規約の定めに置き換わることに合意します。`;

/** 氏名の公開は、あとからいつでも変えられる（規約第21条5項） */
export const CONSENT_CHANGEABLE =
  "氏名・写真の公開については、あとからいつでもこの画面で選び直せます。公開しなくてもリーグ戦には出場できます。";
