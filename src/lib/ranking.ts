/**
 * ランキングの並べ方。
 *
 * 記録が1打数1安打だと打率10割になり、ランキングの上位が実態と合わなくなる。
 * 規定に届いた選手を上に、届いていない選手は順位を付けずに下へ並べる。
 * 成績自体は消さず、下に残して見られるようにする。
 */
export const QUALIFY = {
  ab: 3,        // 打撃：規定打数
  ipOuts: 3,    // 投手：1回（3アウト）
  sba: 3,       // 捕手：盗塁企図3回
  chances: 3,   // 守備：守備機会3回
};

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

/**
 * 並べ替えに使う「記録の多さを加味した率」。
 *
 * 3打数2安打も6打数4安打も打率は .667 だが、
 * 6打数のほうが確かなので上に来るべき。
 * そこで「チーム平均で PRIOR 回ぶん打った」と仮定して混ぜる。
 *   3打数2安打（チーム平均.300）… (2 + 0.3×6) ÷ (3 + 6) = .422
 *   6打数4安打                … (4 + 0.3×6) ÷ (6 + 6) = .483  ← こちらが上
 * 記録が増えるほど混ぜ物の影響が薄れ、本来の率に近づく。
 *
 * 画面に出す数字は本物の率のまま。これは並び順にだけ使う。
 *
 * @param rate     その選手の率（打率・守備率など）
 * @param n        その率のもとになった回数（打数・守備機会など）
 * @param teamRate チーム全体の率
 * @param prior    混ぜるチーム平均の重み（回数と同じ単位）
 */
export function rankingRate(rate: number, n: number, teamRate: number, prior: number): number {
  if (n <= 0) return teamRate;
  return (rate * n + teamRate * prior) / (n + prior);
}

/** 並べ替え用に混ぜるチーム平均の重み。大きいほど「記録の多さ」を重く見る。 */
export const PRIOR = {
  ab: 6,        // 打撃：6打数ぶん
  ipOuts: 9,    // 投手：3回ぶん
  sba: 3,       // 捕手：3企図ぶん
  chances: 6,   // 守備：6機会ぶん
};
