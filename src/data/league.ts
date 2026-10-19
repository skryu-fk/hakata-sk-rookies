/**
 * 博多ルーキーリーグ（HAKATA ROOKIE LEAGUE）の情報
 *
 * 当チームが主催するリーグ。公式サイトは別に用意してあるが、
 * チームの公式サイトからも分かるようにここにまとめている。
 *
 * 予定が変わったらここだけ直せば、トップページの表示も追従する。
 * リーグ規約の原本はリーグ側のプロジェクト（hakata-rookie-league）にある。
 */

/** リーグ公式サイト。公開したらここに URL を入れると、各所のボタンが有効になる */
export const LEAGUE_SITE_URL = "https://hakata-rookie-league.vercel.app";

/** 加盟チームを募集しているか */
export const LEAGUE_RECRUIT_OPEN = true;

export const LEAGUE = {
  name: "博多ルーキーリーグ",
  nameEn: "HAKATA ROOKIE LEAGUE",
  abbr: "HRL",
  organizer: "博多SKルーキーズ",
  founded: "2026年11月",
  preLeague: "2027年2月〜3月",
} as const;

/** 11月に何をするか。トップページに時系列で出す */
export const LEAGUE_SCHEDULE: { when: string; title: string; body: string; highlight?: boolean }[] = [
  {
    when: "2026年11月",
    title: "リーグ設立",
    body: "博多ルーキーリーグを正式に設立します。加盟チームの募集もここから本格的に始めます。",
    highlight: true,
  },
  {
    when: "2026年11月",
    title: "第1回 加盟チーム代表者会議",
    body: "加盟が決まったチームの代表者にお集まりいただき、大会方式・競技規則・費用・日程を話し合って決めます。規約もこの会議での承認をもって施行します。",
  },
  {
    when: "2026年11月",
    title: "親善試合",
    body: "リーグ戦の前に、加盟チーム同士の親善試合を予定しています。顔合わせを兼ねて、まずは気楽に一戦。日程が決まりしだいお知らせします。",
  },
  {
    when: "2027年2月〜3月",
    title: "プレリーグ開幕",
    body: "原則4チーム（最大6チーム）・2回総当たりで、初年度のプレリーグを開催します。7イニング制、勝利3点・引き分け1点です。",
  },
];

/** 加盟の条件。リーグ規約 第4条・第6条・第12条・第27条 に対応 */
export const LEAGUE_CONDITIONS: { label: string; value: string; note?: string }[] = [
  { label: "チーム設立", value: "申請時点で1年以内", note: "一度加盟すれば、1年を過ぎても継続できます。" },
  { label: "初心者・育成対象", value: "登録選手の30%以上", note: "50%以上を推奨しています。" },
  { label: "登録人数", value: "9名以上（推奨12名以上）", note: "リーグ登録は最大20名までです。" },
  { label: "活動エリア", value: "福岡市および近郊" },
  { label: "年間加盟費", value: "5,000円", note: "ほかに球場代・審判費は対戦する2チームで折半します。" },
];

/** なぜ作るのか。1文で言い切る */
export const LEAGUE_WHY =
  "今あるリーグは強豪・古参チームばかりで、立ち上げたばかりのチームは練習試合でしか実戦を積めないのが現状です。だから、同じスタートラインに立つチーム同士で本気の公式戦ができる場所を、自分たちで作ることにしました。";
