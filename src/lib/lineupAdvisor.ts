/**
 * スタメン・打順のおすすめを作る。
 *
 * 材料は2つ:
 *  1. 試合の記録（打率・長打・盗塁・守備率・防御率など）
 *  2. 管理者がつけた選手評価（打撃・走塁・守備・投球・チームワークの5段階）
 *
 * 草野球は試合数が少なく、記録だけでは判断できない。
 * 逆に評価だけでは主観に寄る。そこで、記録が溜まっている選手は記録を重く、
 * まだ少ない選手は評価を重く見る形で混ぜる。
 *
 * 外部APIは使わず、すべてこの中の計算で完結する。
 */

/* ── 入力 ─────────────────────────────────────────────── */
export type AdvisorPlayer = {
  id: string;
  name: string;
  /** 名簿に登録されたポジション（例: 遊撃手）。"未定" や空でもよい */
  position: string;
  batting?: { ab: number; h: number; doubles: number; triples: number; hr: number; bb: number; hbp: number; so: number; sb: number; cs: number };
  pitching?: { ipOuts: number; er: number; hits: number; bb: number; so: number };
  fielding?: { po: number; a: number; e: number };
  catching?: { sba: number; cs: number };
  /** 管理者の評価（1〜5）。0 は未評価 */
  evals?: { batting: number; running: number; fielding: number; pitching: number; teamwork: number };
  /** 出席率 0〜1（参加できる人かどうか） */
  attendRate?: number;
};

/* ── 出力 ─────────────────────────────────────────────── */
export type Ability = {
  /** 出塁（四球を選べるか・アウトにならないか） */
  onbase: number;
  /** 長打 */
  power: number;
  /** 走塁 */
  speed: number;
  /** 守備 */
  defense: number;
  /** 投球 */
  pitching: number;
  /** 捕手適性 */
  catcher: number;
  /** チームワーク */
  teamwork: number;
  /** この選手の数値がどれだけ記録に基づいているか 0〜1（低いほど評価頼み） */
  fromStats: number;
  /** 記録も評価も無い＝判断材料がまったく無い選手 */
  unknown: boolean;
};

export type StarterSlot = {
  order: number;        // 打順 1〜
  position: string;     // 守備位置
  player: AdvisorPlayer;
  ability: Ability;
  /** なぜこの打順・位置なのか */
  reason: string;
};

export type BenchPlayer = {
  player: AdvisorPlayer;
  ability: Ability;
  /** 控えでの使いどころ */
  role: string;
};

export type LineupSuggestion = {
  starters: StarterSlot[];
  bench: BenchPlayer[];
  /** 判断材料の不足など、鵜呑みにしないための注意 */
  notes: string[];
};

/* ── 守備位置を埋める順番 ──
 * 守るのが難しい順。難しいところから埋めないと、
 * 守備が上手い選手が一塁に回ってしまう。 */
const SPECTRUM = ["投手", "捕手", "遊撃手", "中堅手", "二塁手", "三塁手", "右翼手", "左翼手", "一塁手"];

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const stdev = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, v) => s + (v - m) ** 2, 0) / xs.length);
};

/** 5段階評価 → 0〜100（3が50点） */
const starTo100 = (star: number) => (star > 0 ? clamp(25 * (star - 1), 0, 100) : 50);

/**
 * 比べる相手がチームにいないときに使う、おおまかな水準。
 * 捕手が1人しかいないチームでは「チーム内の捕手の平均」が作れず、
 * 阻止率58%の正捕手が平凡な50点になってしまうため。
 */
const ABSOLUTE = {
  obp: { m: 0.320, s: 0.090 },
  iso: { m: 0.080, s: 0.060 },
  era: { m: 4.50, s: 2.00 },
  fld: { m: 0.930, s: 0.060 },
  cat: { m: 0.300, s: 0.150 },
};

/** チーム内での位置を0〜100にする。平均が50。 */
function relative(value: number, m: number, s: number, higherIsBetter: boolean): number {
  if (s <= 0) return 50;
  const z = (value - m) / s;
  return clamp(50 + (higherIsBetter ? z : -z) * 16, 0, 100);
}

/**
 * 記録と評価を混ぜる。
 * 記録が少ないうちは評価を重く、増えるほど記録を重くする。
 * @param n     記録の量（打席数・イニング数など）
 * @param full  記録だけで判断してよいと考える量
 */
function blend(statScore: number | null, evalStar: number, n: number, full: number): { score: number; w: number } {
  const w = statScore === null ? 0 : clamp(n / full, 0, 1);
  const ev = starTo100(evalStar);
  if (statScore === null) return { score: ev, w: 0 };
  return { score: statScore * w + ev * (1 - w), w };
}

/** 全員ぶんの能力値を出す（チーム内の相対評価なので、まとめて計算する） */
export function computeAbilities(players: AdvisorPlayer[]): Map<string, Ability> {
  // ── 記録から率を出す ──
  const bat = new Map<string, { pa: number; obp: number; iso: number; sbRate: number; sbAtt: number }>();
  const pit = new Map<string, { outs: number; era: number; whip: number }>();
  const fld = new Map<string, { ch: number; rate: number }>();
  const cat = new Map<string, { sba: number; rate: number }>();

  for (const p of players) {
    if (p.batting) {
      const b = p.batting;
      const pa = b.ab + b.bb + b.hbp;
      if (pa > 0) {
        const singles = Math.max(0, b.h - b.doubles - b.triples - b.hr);
        const tb = singles + b.doubles * 2 + b.triples * 3 + b.hr * 4;
        const avg = b.ab > 0 ? b.h / b.ab : 0;
        const slg = b.ab > 0 ? tb / b.ab : 0;
        const att = b.sb + b.cs;
        bat.set(p.id, {
          pa,
          obp: (b.h + b.bb + b.hbp) / pa,
          iso: slg - avg,
          sbRate: att > 0 ? b.sb / att : 0,
          sbAtt: att,
        });
      }
    }
    if (p.pitching && p.pitching.ipOuts > 0) {
      const ip = p.pitching.ipOuts / 3;
      pit.set(p.id, {
        outs: p.pitching.ipOuts,
        era: (p.pitching.er * 9) / ip,
        whip: (p.pitching.hits + p.pitching.bb) / ip,
      });
    }
    if (p.fielding) {
      const ch = p.fielding.po + p.fielding.a + p.fielding.e;
      if (ch > 0) fld.set(p.id, { ch, rate: (p.fielding.po + p.fielding.a) / ch });
    }
    if (p.catching && p.catching.sba > 0) {
      cat.set(p.id, { sba: p.catching.sba, rate: p.catching.cs / p.catching.sba });
    }
  }

  // ── チームの基準（記録が少ない選手は基準づくりから外す） ──
  const base = (vals: { v: number; n: number }[], min: number, fallback: { m: number; s: number }) => {
    const ok = vals.filter(x => x.n >= min).map(x => x.v);
    const list = ok.length >= 2 ? ok : vals.map(x => x.v);
    if (list.length < 2) return fallback;           // 比べる相手がいない
    const s = stdev(list);
    return s > 0 ? { m: mean(list), s } : fallback; // 全員同じ値でも差が付かない
  };
  const bOBP = base([...bat.values()].map(x => ({ v: x.obp, n: x.pa })), 5, ABSOLUTE.obp);
  const bISO = base([...bat.values()].map(x => ({ v: x.iso, n: x.pa })), 5, ABSOLUTE.iso);
  const bERA = base([...pit.values()].map(x => ({ v: x.era, n: x.outs })), 6, ABSOLUTE.era);
  const bFLD = base([...fld.values()].map(x => ({ v: x.rate, n: x.ch })), 5, ABSOLUTE.fld);
  const bCAT = base([...cat.values()].map(x => ({ v: x.rate, n: x.sba })), 3, ABSOLUTE.cat);

  const out = new Map<string, Ability>();
  for (const p of players) {
    const e = p.evals ?? { batting: 0, running: 0, fielding: 0, pitching: 0, teamwork: 0 };
    const b = bat.get(p.id), pi = pit.get(p.id), f = fld.get(p.id), c = cat.get(p.id);

    const onbase = blend(b ? relative(b.obp, bOBP.m, bOBP.s, true) : null, e.batting, b?.pa ?? 0, 25);
    const power = blend(b ? relative(b.iso, bISO.m, bISO.s, true) : null, e.batting, b?.pa ?? 0, 25);
    // 走塁は盗塁の記録が少ないので、評価を軸にして盗塁成功率で補正する
    const speedStat = b && b.sbAtt >= 2 ? clamp(30 + b.sbRate * 60 + Math.min(b.sbAtt, 8) * 2, 0, 100) : null;
    const speed = blend(speedStat, e.running, b?.sbAtt ?? 0, 8);
    const defense = blend(f ? relative(f.rate, bFLD.m, bFLD.s, true) : null, e.fielding, f?.ch ?? 0, 18);
    const pitching = blend(pi ? relative(pi.era, bERA.m, bERA.s, false) : null, e.pitching, pi?.outs ?? 0, 24);
    // 捕手適性は、盗塁阻止率があればそれを、無ければ守備評価で代用する
    const catcher = c
      ? blend(relative(c.rate, bCAT.m, bCAT.s, true), e.fielding, c.sba, 8)
      : { score: starTo100(e.fielding), w: 0 };

    const hasEval = Object.values(e).some(v => v > 0);
    const hasStats = !!(b || pi || f || c);
    out.set(p.id, {
      onbase: onbase.score, power: power.score, speed: speed.score,
      defense: defense.score, pitching: pitching.score, catcher: catcher.score,
      teamwork: starTo100(e.teamwork),
      fromStats: mean([onbase.w, power.w, defense.w]),
      unknown: !hasEval && !hasStats,
    });
  }
  return out;
}

/* ── 守備位置ごとに、何を重く見るか ── */
const POS_WEIGHT: Record<string, { defense: number; pitching?: number; catcher?: number; speed?: number }> = {
  投手: { defense: 0.15, pitching: 0.85 },
  捕手: { defense: 0.35, catcher: 0.65 },
  遊撃手: { defense: 0.75, speed: 0.25 },
  中堅手: { defense: 0.6, speed: 0.4 },
  二塁手: { defense: 0.8, speed: 0.2 },
  三塁手: { defense: 0.9 },
  右翼手: { defense: 0.85 },
  左翼手: { defense: 0.9 },
  一塁手: { defense: 1.0 },
};

function posScore(pos: string, a: Ability, p: AdvisorPlayer): number {
  const w = POS_WEIGHT[pos] ?? { defense: 1 };
  let s = a.defense * w.defense;
  if (w.pitching) s += a.pitching * w.pitching;
  if (w.catcher) s += a.catcher * w.catcher;
  if (w.speed) s += a.speed * w.speed;
  // 本人の登録ポジションなら、慣れているぶん上乗せする
  if (p.position === pos) s += 18;
  // 投手・捕手は誰でもできるわけではないので、登録が違うと下げる
  if ((pos === "投手" || pos === "捕手") && p.position !== pos) s -= 14;
  return s;
}

/* ── 打順ごとに、何を重く見るか ── */
const ORDER_WEIGHT: { onbase: number; power: number; speed: number }[] = [
  { onbase: 0.60, power: 0.10, speed: 0.30 }, // 1番 塁に出る
  { onbase: 0.50, power: 0.25, speed: 0.25 }, // 2番 つなぐ
  { onbase: 0.40, power: 0.45, speed: 0.15 }, // 3番 打てる
  { onbase: 0.25, power: 0.75, speed: 0.00 }, // 4番 返す
  { onbase: 0.35, power: 0.60, speed: 0.05 }, // 5番
  { onbase: 0.45, power: 0.45, speed: 0.10 }, // 6番
  { onbase: 0.50, power: 0.30, speed: 0.20 }, // 7番
  { onbase: 0.50, power: 0.40, speed: 0.10 }, // 8番
  { onbase: 0.45, power: 0.20, speed: 0.35 }, // 9番 第二の1番
];
/** 埋める順番。打線の軸から先に決める。 */
const ORDER_PRIORITY = [3, 0, 2, 1, 4, 5, 6, 7, 8];

/**
 * 打順の理由を、その選手の実際の数値から作る。
 * 決め打ちの文章だと「足があるので9番に」と書いたのに
 * 実際は足が遅い、といった食い違いが起きるため。
 */
function reasonFor(idx: number, a: Ability): string {
  const hi = (v: number) => v >= 62;
  const ok = (v: number) => v >= 52;
  switch (idx) {
    case 0:
      if (hi(a.onbase) && hi(a.speed)) return "出塁率が高く足もある。先頭打者向き";
      if (hi(a.onbase)) return "塁に出られるので先頭に";
      if (hi(a.speed)) return "足があるので、出たときに次へつなげる先頭に";
      return "この打線では、もっとも塁に出られる選手";
    case 1:
      if (hi(a.onbase) && ok(a.power)) return "出塁もでき、長打も期待できる2番";
      if (hi(a.onbase)) return "つなぎ役。塁に出て1番を返す2番";
      return "送りバントや進塁打も任せられる2番";
    case 2:
      if (hi(a.power) && hi(a.onbase)) return "打率・長打ともに高い。打線の中心";
      if (hi(a.onbase)) return "打撃が安定している3番";
      return "上位を回すつなぎの3番";
    case 3:
      if (hi(a.power)) return "長打力がチームで最も高い。4番";
      if (ok(a.power)) return "長打を期待できるので4番";
      return "打線の中ではもっとも長打が見込める4番";
    case 4:
      if (hi(a.power)) return "4番に続く長打力。5番";
      return "4番の後ろで走者を返す5番";
    case 5:
      if (ok(a.onbase) && ok(a.power)) return "打撃のバランスが良い6番";
      return "下位の起点になる6番";
    case 6:
      if (hi(a.onbase)) return "下位でも塁に出られるので7番";
      return "7番。守備を優先した並び";
    case 7:
      if (hi(a.speed)) return "足があるので、上位につなぐ8番";
      return "8番。ここで塁に出ると上位が生きる";
    default:
      if (hi(a.speed)) return "足があるので、もう一人の1番として9番に";
      if (ok(a.onbase)) return "塁に出られるので、9番から上位につなぐ";
      return "9番。守備での貢献を優先した並び";
  }
}

/** 控えでの使いどころを、実際の数値から決める */
function benchRole(p: AdvisorPlayer, a: Ability): string {
  if (a.unknown) return "記録も評価もまだありません。まずは出場機会を増やしたい選手";
  const cands = [
    { k: "代走", v: a.speed },
    { k: "代打", v: (a.onbase + a.power) / 2 },
    { k: "守備固め", v: a.defense },
    // 投手登録なら、投球を実力として拾いやすくする
    { k: "リリーフ", v: a.pitching + (p.position === "投手" ? 12 : 0) },
  ];
  const top = cands.sort((x, y) => y.v - x.v)[0];
  if (top.v < 52) return "まずは出場機会を増やして、記録を溜めたい選手";
  switch (top.k) {
    case "代走": return "足が武器。終盤の代走で効く";
    case "代打": return "打撃が良い。ここぞの代打に";
    case "守備固め": return "守備が堅い。リードしている終盤の守備固めに";
    default: return "投げられる。継投の二番手に";
  }
}

/**
 * スタメンと打順のおすすめを作る。
 * @param players 候補になる選手（出られない人はあらかじめ除いておく）
 * @param size    スタメンの人数（9人でなくてもよい）
 */
export function suggestLineup(players: AdvisorPlayer[], size = 9): LineupSuggestion {
  const notes: string[] = [];
  const abilities = computeAbilities(players);
  const ab = (p: AdvisorPlayer) => abilities.get(p.id)!;

  if (players.length === 0) {
    return { starters: [], bench: [], notes: ["候補になる選手がいません。名簿と出欠をご確認ください。"] };
  }
  if (players.length < size) {
    notes.push(`候補が${players.length}人しかいないため、${players.length}人ぶんだけ組んでいます。`);
    size = players.length;
  }

  // ── 1) 守備位置を割り当てる ──
  // 判断材料がまったく無い選手は、実績のある選手より後ろに回す。
  // （全員50点扱いのままだと、平均以下と分かっている選手より上に来てしまう）
  const ordered = [...players].sort((a, b) => Number(ab(a).unknown) - Number(ab(b).unknown));
  const positions = SPECTRUM.slice(0, size);
  const remaining = [...ordered];
  const assigned: { pos: string; player: AdvisorPlayer }[] = [];

  const take = (i: number, pos: string) => {
    assigned.push({ pos, player: remaining[i] });
    remaining.splice(i, 1);
  };

  // 1-a) まずは名簿どおりの守備位置に置く。
  //      本人が普段守っている場所を勝手に動かすと、現場の感覚と食い違うため。
  for (const pos of positions) {
    const cands = remaining
      .map((p, i) => ({ p, i }))
      .filter(x => x.p.position === pos);
    if (cands.length === 0) continue;
    // 同じ登録が複数いる場合は、その位置に向いている方を先に置く
    const best = cands.reduce((x, y) => (posScore(pos, ab(y.p), y.p) > posScore(pos, ab(x.p), x.p) ? y : x));
    take(best.i, pos);
  }

  // 1-b) 空いた位置を、向いている順に埋める
  for (const pos of positions) {
    if (assigned.some(a => a.pos === pos)) continue;
    if (remaining.length === 0) break;
    let best = 0, bestScore = -Infinity;
    remaining.forEach((p, i) => {
      let sc = posScore(pos, ab(p), p);
      if (ab(p).unknown) sc -= 25;  // 未知の選手をいきなり難所に置かない
      if (sc > bestScore) { bestScore = sc; best = i; }
    });
    take(best, pos);
  }

  // ── 2) 打順を決める（打線の軸から先に） ──
  const pool = [...assigned];
  const slots: (StarterSlot | null)[] = new Array(size).fill(null);

  for (const idx of ORDER_PRIORITY) {
    if (idx >= size || pool.length === 0) continue;
    const w = ORDER_WEIGHT[idx];
    let best = 0, bestScore = -Infinity;
    pool.forEach((x, i) => {
      const a = ab(x.player);
      const s = a.onbase * w.onbase + a.power * w.power + a.speed * w.speed;
      if (s > bestScore) { bestScore = s; best = i; }
    });
    const picked = pool.splice(best, 1)[0];
    slots[idx] = {
      order: idx + 1,
      position: picked.pos,
      player: picked.player,
      ability: ab(picked.player),
      reason: reasonFor(idx, ab(picked.player)),
    };
  }
  // 余り（size が9より多い場合など）は前から詰める
  let cursor = 0;
  for (const x of pool) {
    while (cursor < size && slots[cursor]) cursor++;
    if (cursor >= size) break;
    slots[cursor] = {
      order: cursor + 1, position: x.pos, player: x.player,
      ability: ab(x.player), reason: "下位打線でつなぐ",
    };
  }
  const starters = slots.filter((s): s is StarterSlot => !!s);

  // ── 3) 控えの使いどころ ──
  const bench: BenchPlayer[] = remaining
    .sort((a, b) => (ab(b).onbase + ab(b).power) - (ab(a).onbase + ab(a).power))
    .map(p => ({ player: p, ability: ab(p), role: benchRole(p, ab(p)) }));

  // ── 4) 鵜呑みにしないための注意 ──
  const lowData = players.filter(p => ab(p).fromStats < 0.3).length;
  if (lowData > players.length / 2) {
    notes.push("試合の記録がまだ少ないため、多くを選手評価から判断しています。試合を重ねると精度が上がります。");
  }
  const noEval = players.filter(p => !p.evals || Object.values(p.evals).every(v => !v)).length;
  if (noEval > 0) {
    notes.push(`${noEval}人が未評価です。「選手評価」タブで評価を付けると、おすすめの精度が上がります。`);
  }
  if (!players.some(p => p.position === "投手")) {
    notes.push("名簿に投手登録の選手がいません。投手は守備評価から推定しています。");
  }
  if (!players.some(p => p.position === "捕手")) {
    notes.push("名簿に捕手登録の選手がいません。捕手は守備評価から推定しています。");
  }
  notes.push("あくまで記録と評価から機械的に出した案です。当日の調子や相手との相性は考慮していません。");

  return { starters, bench, notes };
}
