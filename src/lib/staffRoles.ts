/**
 * 首脳陣の権限
 *
 * ── 考え方 ──
 * コーチはすでにメンバーアカウント（ユーザーID＋パスワード）を持っている。
 * 首脳陣用に別のログインを作ると、退団・改名のたびに2か所直すことになり、
 * 必ずどこかで食い違う。そこで accounts に「役割」を足すだけにして、
 * ログインとデータは今までどおり1本にしている。
 *
 * ── 権限の確認は必ずサーバー側で ──
 * 画面を出し分けるだけでは、APIを直接叩かれたら素通りしてしまう。
 * can() はサーバー側のAPIでも必ず通すこと。
 */

/** 権限レベル。数字が大きいほど強い */
export const LEVEL = {
  NONE: 0,       // 首脳陣ではない（ふつうのメンバー）
  COACH: 1,      // 各ポジションコーチ
  CAPTAIN: 2,    // キャプテン・総合コーチ
  VICE: 3,       // 副代表
  OWNER: 4,      // 代表（最高管理者）
} as const;

export type StaffLevel = 0 | 1 | 2 | 3 | 4;

export const LEVEL_LABEL: Record<StaffLevel, string> = {
  0: "メンバー",
  1: "コーチ",
  2: "キャプテン・総合コーチ",
  3: "副代表",
  4: "代表",
};

/** 担当分野。選手の担当分け・評価項目の出し分けに使う */
export const AREAS = ["投手", "捕手", "内野", "外野", "全体", "トレーナー"] as const;
export type StaffArea = (typeof AREAS)[number];

/** 担当分野 → その分野が見る守備位置 */
export const AREA_POSITIONS: Record<StaffArea, string[]> = {
  投手: ["投手"],
  捕手: ["捕手"],
  内野: ["一塁手", "二塁手", "三塁手", "遊撃手"],
  外野: ["左翼手", "中堅手", "右翼手"],
  全体: [],       // 空 = 全員が担当
  トレーナー: [], // 空 = 全員が担当
};

/** ログインしている首脳陣の情報 */
export type StaffUser = {
  /** accounts の id。代表がパスワードで入っているときは "owner" */
  accountId: string;
  /** 表示名 */
  name: string;
  /** 紐づく名簿の memberId（無いこともある） */
  memberId: string;
  level: StaffLevel;
  /** 役職名。例「投手コーチ」。未設定ならレベル名を使う */
  title: string;
  area: StaffArea;
};

/* ── できること ───────────────────────────────────────── */

/**
 * 操作の種類。画面の出し分けとAPIの許可判定で同じものを使う。
 * 「見える＝できる」にしないため、閲覧と編集を分けている。
 */
export type Permission =
  | "player.view"          // 選手情報を見る
  | "player.evaluate"      // 技術評価・指導記録を付ける
  | "player.editProfile"   // 選手の重要情報を変える
  | "practice.create"      // 練習メニューを作る
  | "practice.publish"     // 練習メニューをメンバーに公開する
  | "order.create"         // オーダー案を作る
  | "order.decide"         // オーダーを確定する
  | "report.create"        // 指導レポートを書く
  | "report.viewAll"       // 全員のレポートを見る
  | "report.publish"       // レポートを選手本人に公開する
  | "meeting.join"         // 首脳陣会議に参加する
  | "meeting.decide"       // 決定事項を記録する
  | "approval.request"     // 代表に承認を申請する
  | "approval.decide"      // 承認・差し戻し・却下する
  | "analysis.view"        // チーム分析を見る
  | "staff.manage"         // 首脳陣の追加・解任・権限変更
  | "audit.view";          // 操作履歴を見る

/** 権限 → それに必要な最低レベル */
const REQUIRED: Record<Permission, StaffLevel> = {
  "player.view": 1,
  "player.evaluate": 1,
  "player.editProfile": 4,   // 重要情報の変更は代表だけ
  "practice.create": 1,      // コーチは「提案」として作れる
  "practice.publish": 4,     // メンバーへの公開は代表の承認が要る
  "order.create": 2,
  "order.decide": 4,
  "report.create": 1,
  "report.viewAll": 2,
  "report.publish": 4,
  "meeting.join": 1,
  "meeting.decide": 3,
  "approval.request": 1,
  "approval.decide": 4,
  "analysis.view": 1,
  "staff.manage": 4,
  "audit.view": 4,
};

/** その人がその操作をしてよいか。画面でもAPIでも必ずこれを通す */
export function can(user: Pick<StaffUser, "level"> | null, perm: Permission): boolean {
  if (!user) return false;
  return user.level >= REQUIRED[perm];
}

/** 首脳陣として入れるか（レベル1以上） */
export function isStaff(user: Pick<StaffUser, "level"> | null): boolean {
  return !!user && user.level >= LEVEL.COACH;
}

/**
 * その選手が自分の担当か。
 * 全体・トレーナー・レベル2以上は全員を担当とみなす。
 */
export function isMyPlayer(user: StaffUser, position: string): boolean {
  if (user.level >= LEVEL.CAPTAIN) return true;
  const positions = AREA_POSITIONS[user.area] ?? [];
  if (positions.length === 0) return true;
  return positions.includes(position);
}

/* ── 評価項目（担当分野ごとに変える） ─────────────────── */

export type EvalItem = { key: string; label: string };

const COMMON_ITEMS: EvalItem[] = [
  { key: "batting", label: "打撃" },
  { key: "running", label: "走塁" },
  { key: "judgement", label: "判断力" },
  { key: "teamwork", label: "チームワーク" },
];

/** 守備位置ごとの評価項目。共通項目はどの位置でも最後に付く */
export const POSITION_ITEMS: Record<string, EvalItem[]> = {
  投手: [
    { key: "velocity", label: "球速" },
    { key: "control", label: "制球力" },
    { key: "breaking", label: "変化球" },
    { key: "stamina", label: "スタミナ" },
    { key: "form", label: "投球フォーム" },
  ],
  捕手: [
    { key: "catching", label: "キャッチング" },
    { key: "blocking", label: "ブロッキング" },
    { key: "throwing", label: "スローイング" },
    { key: "lead", label: "リード" },
  ],
  内野: [
    { key: "fielding", label: "捕球" },
    { key: "throwAccuracy", label: "送球" },
    { key: "range", label: "守備範囲" },
    { key: "footwork", label: "フットワーク" },
  ],
  外野: [
    { key: "readFly", label: "打球判断" },
    { key: "range", label: "守備範囲" },
    { key: "throwAccuracy", label: "送球精度" },
    { key: "fielding", label: "捕球能力" },
  ],
};

/** 守備位置 → 担当分野 */
export function areaOfPosition(position: string): StaffArea {
  for (const area of ["投手", "捕手", "内野", "外野"] as StaffArea[]) {
    if ((AREA_POSITIONS[area] ?? []).includes(position)) return area;
  }
  return "全体";
}

/** その選手に付ける評価項目（守備位置に応じて変わる） */
export function evalItemsFor(position: string): EvalItem[] {
  const area = areaOfPosition(position);
  return [...(POSITION_ITEMS[area] ?? []), ...COMMON_ITEMS];
}

/* ── accounts の行から読み取る ─────────────────────────── */

/** accounts 列: [id, name, name_key, hash, salt, status, created_at, member_id, user_id, role, staff_title, staff_area] */
export function staffFromAccountRow(row: string[]): StaffUser | null {
  const level = Number(row[9] ?? "0");
  if (!Number.isFinite(level) || level < 1 || level > 4) return null;
  const area = (row[11] ?? "全体") as StaffArea;
  return {
    accountId: row[0] ?? "",
    name: row[1] ?? "",
    memberId: row[7] ?? "",
    level: level as StaffLevel,
    title: (row[10] ?? "").trim() || LEVEL_LABEL[level as StaffLevel],
    area: AREAS.includes(area) ? area : "全体",
  };
}

/** 代表がパスワードで入っているときの扱い（最高権限） */
export const OWNER_USER: StaffUser = {
  accountId: "owner",
  name: "代表",
  memberId: "",
  level: 4,
  title: "代表",
  area: "全体",
};
