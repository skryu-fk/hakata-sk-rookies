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
