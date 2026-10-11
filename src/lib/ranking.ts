/**
 * ランキングの並べ方。
 *
 * ── なぜ「率」だけで並べないのか ──
 * 1打数1安打は打率10割だが、それが一番の打者ということにはならない。
 * かといって「チーム平均に寄せる」だけでは足りない。寄せ算はあくまで
 * 平均に近づけるだけなので、少ない打数で打っている人は平均より上に残り、
 * 結局いつまでも上位に居座ってしまう（3打数3安打が1位になる、など）。
 *
 * そこで、並び順は次の2つを足した「総合スコア」で決める。
 *
 *   ① 確かな打率 … チームの標準的な打数ぶんだけ平均に寄せた率。
 *                   記録が増えるほど本来の率に近づく。
 *   ② 出場ボーナス … 打数がチームで一番多い人を満点とした加点。
 *                   たくさん打席に立って結果を出していることを評価する。
 *
 * さらに「規定打数」も、チームで一番打っている人を基準に決める。
 * 試合をこなすほど自然に上がるので、数試合しか出ていない人が
 * タイトル争いに混ざることがなくなる。
 *
 * 画面に出す数字（打率・防御率など）は本物のまま。これは並び順にだけ使う。
 */

/** 規定の下限。これ以下にはしない（記録が少ない立ち上げ期に全員が規定外になるのを防ぐ） */
export const MIN_QUALIFY = {
  ab: 3,        // 打撃：規定打数
  ipOuts: 3,    // 投手：1回（3アウト）
  sba: 3,       // 捕手：盗塁企図3回
  chances: 3,   // 守備：守備機会3回
};

/**
 * 出場ボーナスの大きさ。
 * チーム最多の人が満点（この値ぶん加点）、半分なら半分の加点。
 * 打率でいえば「1割ぶんの価値」くらいに効かせている。
 */
export const VOLUME_WEIGHT = {
  ab: 0.100,
  ipOuts: 0.60,   // 防御率は単位が大きいので、率に合わせて大きめ
  sba: 0.100,
  chances: 0.060, // 守備率は差が小さいので控えめ
};

/** チーム最多の何割で規定に届くか */
const QUALIFY_RATIO = 0.4;
/** 平均に寄せる重みの下限。記録が少ないうちに寄せ算が効かなくなるのを防ぐ */
const MIN_PRIOR = 8;

/** チーム全体を見て決まる、並べ替えの基準 */
export type RankBasis = {
  /** 平均に寄せる重み（回数と同じ単位）。チームの標準的な回数 */
  prior: number;
  /** チーム最多の回数。出場ボーナスの満点 */
  maxN: number;
  /** 規定。これ未満は順位を付けない */
  qualify: number;
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const v = [...values].sort((a, b) => a - b);
  const mid = Math.floor(v.length / 2);
  return v.length % 2 === 1 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

/**
 * チーム全員の回数（打数など）から、並べ替えの基準をつくる。
 *
 * @param counts     全員の回数。0 の人は「まだ出ていない」ので基準づくりから外す
 * @param minQualify 規定の下限（MIN_QUALIFY の値）
 */
export function rankBasis(counts: number[], minQualify: number): RankBasis {
  const played = counts.filter(n => n > 0);
  const maxN = played.length > 0 ? Math.max(...played) : 0;
  return {
    prior: Math.max(MIN_PRIOR, median(played)),
    maxN,
    qualify: Math.max(minQualify, Math.round(maxN * QUALIFY_RATIO)),
  };
}

/**
 * 並べ替えに使う総合スコア。大きいほど上位（防御率など「小さいほど良い」ものは
 * lowerIsBetter を立てると、小さいほど上位になるよう符号を合わせる）。
 *
 * 例（チーム打率 .280、チーム最多28打数、標準20打数のとき）
 *   28打数11安打(.393) … 確かな打率 .346 ＋ ボーナス .100 ＝ .446  ← 1位
 *   12打数 6安打(.500) … 確かな打率 .363 ＋ ボーナス .043 ＝ .406
 *    3打数 3安打(1.000)… 確かな打率 .374 ＋ ボーナス .011 ＝ .385
 * 少ない打数で打っている人も評価はされるが、たくさん打っている人を超えない。
 */
export function rankScore(
  rate: number,
  n: number,
  teamRate: number,
  basis: RankBasis,
  volumeWeight: number,
  lowerIsBetter = false,
): number {
  // まだ記録が無い人は、並びの基準としてはチーム平均扱い
  if (n <= 0) return teamRate;

  // ① チームの標準的な回数ぶん、平均に寄せる
  const steady = (rate * n + teamRate * basis.prior) / (n + basis.prior);

  // ② 出場ボーナス。チーム最多の人が満点
  const share = basis.maxN > 0 ? Math.min(1, n / basis.maxN) : 0;
  const bonus = volumeWeight * share;

  // 防御率のように「小さいほど良い」ものは、ボーナスも引く向きにそろえる
  return lowerIsBetter ? steady - bonus : steady + bonus;
}

/**
 * 規定に達した人を先に、届いていない人を後ろに並べ替える。
 * どちらのグループも同じ指標で並べる。
 *
 * @param qualified 規定に達しているか
 * @param compare   並び順（規定内・規定外の両方に同じものを使う）
 * @returns ranked=並べ替え後の全員, qualifiedCount=規定に達した人数
 *          （ranked の先頭 qualifiedCount 人が順位付きの対象）
 */
export function splitByQualified<T>(
  list: T[],
  qualified: (x: T) => boolean,
  compare: (a: T, b: T) => number,
): { ranked: T[]; qualifiedCount: number } {
  const ok = list.filter(qualified).sort(compare);
  const ng = list.filter(x => !qualified(x)).sort(compare);
  return { ranked: [...ok, ...ng], qualifiedCount: ok.length };
}
