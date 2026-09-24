/**
 * 総合ランキング — 打撃・投球・守備・出席をまとめて「チームへの貢献度」を出す。
 *
 * 考え方:
 *  - 草野球は絶対的な基準が当てにならないので、すべてチーム内の相対評価にする。
 *    チーム平均をちょうど50点として、上下に散らす。
 *  - 記録が少ないほど数字は大きく振れる。1打数1安打で満点になっては困るので、
 *    出場が少ない選手は点数を50（＝平均）へ寄せる（寄せ方＝信頼度）。
 *    規定打数で切り捨てるのではなく、記録が増えるほど本来の点数に近づく形にする。
 *  - やっていない部門は0点にせず、計算から外す。
 *    投手をやらない選手が投球0点で不利になるのはおかしいため、
 *    その人が実際に出た部門だけで重みを配分し直す。
 *  - 何がどう効いたか画面に出せるよう、部門ごとの点数も返す。
 */

/** 総合ランキングに使う、選手1人ぶんの入力 */
export type OverallInput = {
  id: string;
  /** 打撃: OPS と打席数 */
  batting?: { ops: number; pa: number };
  /** 投球: 防御率と、投げたアウト数 */
  pitching?: { era: number; ipOuts: number };
  /** 守備: 守備率と守備機会 */
  fielding?: { rate: number; chances: number };
  /** 捕手: 盗塁阻止率と盗塁企図数 */
  catching?: { rate: number; sba: number };
  /** 出席: 参加した回数と対象回数 */
  attendance?: { attended: number; total: number };
};

export type CategoryKey = "batting" | "pitching" | "fielding" | "catching" | "attendance";

export type OverallScore = {
  id: string;
  /** 総合点（0〜100・チーム平均が50） */
  total: number;
  /** 部門ごとの点数（その選手が出ている部門だけ） */
  parts: { key: CategoryKey; label: string; score: number; detail: string; weight: number }[];
  /** 点数の確からしさ。記録が少ないほど低い（0〜1） */
  reliability: number;
};

/**
 * 部門ごとの重み（合計100）。
 *
 * 出席を重めに取っている。チームに来ている回数そのものが貢献であり、
 * ここを軽くすると「ほとんど参加していないが1打数1安打の人」が
 * 上位に来てしまうため。
 */
const WEIGHT: Record<CategoryKey, number> = {
  batting: 35,
  pitching: 20,
  fielding: 15,
  catching: 10,
  attendance: 20,
};

/**
 * 点数が本来の値に届くまでに必要な記録量。
 * これに満たないうちは、点数を平均（50）側へ寄せる。
 */
const FULL: Record<CategoryKey, number> = {
  batting: 20,    // 打席
  pitching: 21,   // アウト（7回）
  fielding: 15,   // 守備機会
  catching: 8,    // 盗塁企図
  attendance: 5,  // 対象回数
};

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const stdev = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, v) => s + (v - m) ** 2, 0) / xs.length);
};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * チーム内の位置を0〜100点にする。平均が50点。
 * ばらつき（標準偏差）を物差しに使い、1つぶん上なら65点あたりになる。
 */
function relativeScore(value: number, teamMean: number, spread: number, higherIsBetter: boolean): number {
  if (spread <= 0) return 50;                       // 全員同じならみんな平均点
  const z = (value - teamMean) / spread;
  return clamp(50 + (higherIsBetter ? z : -z) * 15, 0, 100);
}

/** 記録が少ないぶん、点数を平均へ寄せる（regression to the mean） */
function shrink(score: number, n: number, full: number): { score: number; reliability: number } {
  const reliability = clamp(n / full, 0, 1);
  return { score: 50 + (score - 50) * reliability, reliability };
}

/**
 * 全員の総合点を出す。
 * チーム平均を基準にするため、必ず全員ぶんまとめて渡すこと。
 */
/**
 * チーム平均を出すときに、最低限必要な記録量。
 * 1打数1安打（OPS 2.000）のような値が混ざるとチーム平均が跳ね上がり、
 * 本来上位のはずの選手が平均以下に見えてしまうため、基準作りからは除く。
 */
const BASE_MIN: Record<CategoryKey, number> = {
  batting: 5, pitching: 6, fielding: 5, catching: 3, attendance: 1,
};

/**
 * 比べる相手がいないときに使う、おおまかな一般的水準。
 *
 * 投手が1人しかいないチームでは「チーム内の投球の平均」が作れない。
 * そのまま全員50点にすると、防御率1.80のエースがまったく評価されない。
 * そういう場合だけ、この目安と比べる。
 * 草野球のだいたいの水準であって厳密なものではないので、
 * チームの実感と合わなければここの数字を変えればよい。
 */
const ABSOLUTE: Record<CategoryKey, { m: number; s: number }> = {
  batting: { m: 0.700, s: 0.220 },     // OPS
  pitching: { m: 4.50, s: 2.00 },      // 防御率
  fielding: { m: 0.930, s: 0.060 },    // 守備率
  catching: { m: 0.300, s: 0.150 },    // 盗塁阻止率
  attendance: { m: 0.700, s: 0.220 },  // 出席率
};

/**
 * 基準値づくりに使う値を集める。
 * 記録が少ない選手は基準から外し、それでも2人以上そろわなければ
 * 記録のある全員で作る。1人も比べる相手がいなければ一般的水準を使う。
 */
function baseValues(all: { v: number; n: number }[], min: number, key: CategoryKey): { m: number; s: number } {
  const ok = all.filter(x => x.n >= min).map(x => x.v);
  const list = ok.length >= 2 ? ok : all.map(x => x.v);
  if (list.length < 2) return ABSOLUTE[key];
  const s = stdev(list);
  // 全員が同じ値ならチーム内では差が付かない。一般的水準で見る。
  return s > 0 ? { m: mean(list), s } : ABSOLUTE[key];
}

export function computeOverall(players: OverallInput[]): Map<string, OverallScore> {
  // ── 部門ごとのチーム平均とばらつき ──
  const base = {
    batting: baseValues(
      players.filter(p => p.batting && p.batting.pa > 0).map(p => ({ v: p.batting!.ops, n: p.batting!.pa })),
      BASE_MIN.batting, "batting"),
    pitching: baseValues(
      players.filter(p => p.pitching && p.pitching.ipOuts > 0).map(p => ({ v: p.pitching!.era, n: p.pitching!.ipOuts })),
      BASE_MIN.pitching, "pitching"),
    fielding: baseValues(
      players.filter(p => p.fielding && p.fielding.chances > 0).map(p => ({ v: p.fielding!.rate, n: p.fielding!.chances })),
      BASE_MIN.fielding, "fielding"),
    catching: baseValues(
      players.filter(p => p.catching && p.catching.sba > 0).map(p => ({ v: p.catching!.rate, n: p.catching!.sba })),
      BASE_MIN.catching, "catching"),
    attendance: baseValues(
      players.filter(p => p.attendance && p.attendance.total > 0)
        .map(p => ({ v: p.attendance!.attended / p.attendance!.total, n: p.attendance!.total })),
      BASE_MIN.attendance, "attendance"),
  };

  const out = new Map<string, OverallScore>();

  for (const p of players) {
    const parts: OverallScore["parts"] = [];
    const rels: number[] = [];

    const add = (
      key: CategoryKey, label: string, value: number, n: number,
      higherIsBetter: boolean, detail: string,
    ) => {
      if (n <= 0) return;
      const raw = relativeScore(value, base[key].m, base[key].s, higherIsBetter);
      const { score, reliability } = shrink(raw, n, FULL[key]);
      parts.push({ key, label, score: Math.round(score), detail, weight: WEIGHT[key] });
      rels.push(reliability);
    };

    if (p.batting) {
      add("batting", "打撃", p.batting.ops, p.batting.pa, true,
        `OPS ${p.batting.ops.toFixed(3).replace(/^0/, "")}（${p.batting.pa}打席）`);
    }
    if (p.pitching) {
      add("pitching", "投球", p.pitching.era, p.pitching.ipOuts, false,
        `防御率 ${p.pitching.era.toFixed(2)}（${Math.floor(p.pitching.ipOuts / 3)}.${p.pitching.ipOuts % 3}回）`);
    }
    if (p.fielding) {
      add("fielding", "守備", p.fielding.rate, p.fielding.chances, true,
        `守備率 ${p.fielding.rate.toFixed(3).replace(/^0/, "")}（${p.fielding.chances}機会）`);
    }
    if (p.catching) {
      add("catching", "捕手", p.catching.rate, p.catching.sba, true,
        `阻止率 ${(p.catching.rate * 100).toFixed(1)}%（${p.catching.sba}企図）`);
    }
    if (p.attendance && p.attendance.total > 0) {
      const rate = p.attendance.attended / p.attendance.total;
      add("attendance", "出席", rate, p.attendance.total, true,
        `${p.attendance.attended}/${p.attendance.total}回（${Math.round(rate * 100)}%）`);
    }

    // 出ていない部門は「平均（50点）」として数える。
    // 出ている部門だけで割ると、守備しかしていない選手が守備の点だけで
    // 上位に来てしまう。情報が無い部門は有利にも不利にもしない、が正しい。
    const wAll = Object.values(WEIGHT).reduce((a, b) => a + b, 0);
    const wUsed = parts.reduce((s, x) => s + x.weight, 0);
    const total = parts.length > 0
      ? Math.round((parts.reduce((s, x) => s + x.score * x.weight, 0) + 50 * (wAll - wUsed)) / wAll)
      : 0;

    out.set(p.id, {
      id: p.id,
      total,
      parts,
      reliability: rels.length ? rels.reduce((a, b) => a + b, 0) / rels.length : 0,
    });
  }

  return out;
}
