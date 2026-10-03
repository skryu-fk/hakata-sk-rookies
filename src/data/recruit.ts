/**
 * メンバー募集の状況
 *
 * 「募集中」という文言は、ヒーロー・ティッカー・ナビ・お問い合わせフォーム・
 * 検索結果用の説明文（metadata）と、サイトのあちこちに散らばっている。
 * 休止・再開のたびに一部だけ直し忘れると
 * 「サイトでは募集中なのに実際は休止中」という一番まずい状態になるので、
 * 状況と文言をこの1ファイルに集めて、各所はここを参照するだけにしている。
 *
 * ── 再開するとき ──
 *   RECRUIT_OPEN を true にするだけでよい。
 *   ヒーローのバッジ・ボタン、ティッカー、ナビ、募集セクション、
 *   お問い合わせフォームの注意書きが、すべて募集中の表示に戻る。
 */

/** 新規メンバーの募集を受け付けているか。false = 休止中 */
export const RECRUIT_OPEN: boolean = false;

/** 休止を発表した日 */
export const RECRUIT_PAUSED_SINCE = "2026年7月9日";

/** バッジ・ティッカーなど、短く出す場所の文言 */
export const RECRUIT_BADGE = RECRUIT_OPEN ? "メンバー募集中" : "メンバー募集 休止中";
export const RECRUIT_BADGE_EN = RECRUIT_OPEN ? "MEMBER WANTED" : "RECRUITMENT PAUSED";

/** 一文での説明。本文にも、検索結果に出る説明文にも使う */
export const RECRUIT_STATUS_LINE = RECRUIT_OPEN
  ? "一緒に野球を楽しむ仲間を募集中です。"
  : "現在、新規メンバーの募集は休止しています。";

/** 休止の理由 */
export const RECRUIT_PAUSE_REASON =
  "いま在籍しているメンバーの受け入れ体制を整えるため、新規メンバーの募集と体験参加の受付を当面の間休止しています。";

/** すでに申し込み済みだった方の扱い */
export const RECRUIT_PAUSE_PENDING =
  "休止前にすでに体験参加をお申し込みいただいていた方は、これまでどおり対応いたしますのでご安心ください。";

/** 再開のお知らせ方法 */
export const RECRUIT_PAUSE_RESUME =
  "再開の見通しが立つまでは、恐れ入りますが新しい入団・見学・体験参加のお受付はできません。再開が決まりしだい、このサイトのお知らせと公式X・Instagramでご案内します。";

/** 休止中でも受け付けている相談（お問い合わせフォームの「ご相談内容」と対応させている） */
export const RECRUIT_STILL_OPEN: { title: string; note: string }[] = [
  { title: "練習試合・リーグのご相談", note: "対戦相手は引き続き募集中です。" },
  { title: "スポンサーのご相談", note: "個人応援・店舗・企業様、いずれも受付中です。" },
  { title: "道具のご支援", note: "使っていない道具のお裾分けを歓迎しています。" },
  { title: "チームへのご質問", note: "再開時期のお問い合わせもお気軽にどうぞ。" },
];
