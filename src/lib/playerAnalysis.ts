/**
 * 選手分析エンジン（SKドッパミンAI / 成績分析）
 *
 * 蓄積した打撃・投球・守備・捕手・出欠データから、選手ごとの
 * 強み・課題・練習メニュー・評価の目安を組み立てる。
 * 外部APIは一切使わず、すべてこの中の計算だけで完結する。
 *
 * 設計方針:
 *  - チーム内の平均と比べて判定する（草野球は絶対的な基準が当てにならないため）。
 *  - 記録数が少ないときは数字が大きく振れる。信頼度を必ず添え、
 *    サンプルが足りない項目については断定しない。
 *  - 出力はそのまま画面に出せる日本語にする。
 */

/* ── 入力の型 ───────────────────────────────────────── */
export type BattingLine = {
  games: number; ab: number; h: number; doubles: number; triples: number; hr: number;
  rbi: number; bb: number; so: number; hbp: number; sb: number; cs: number;
};
export type PitchingLine = {
  appearances: number; ipOuts: number; hits: number; runs: number; er: number;
  so: number; bb: number; hbp: number;
};
export type FieldingLine = { games: number; po: number; a: number; e: number };
export type CatchingLine = { games: number; sba: number; cs: number };
export type AttendanceLine = { attended: number; total: number };

export type PlayerInput = {
  id: string;
  name: string;
  position?: string;
  batting?: BattingLine;
  pitching?: PitchingLine;
  fielding?: FieldingLine;
  catching?: CatchingLine;
  attendance?: AttendanceLine;
};

/* ── 出力の型 ───────────────────────────────────────── */
export type Insight = {
  /** strength=強み, issue=課題, note=補足 */
  kind: "strength" | "issue" | "note";
  title: string;
  detail: string;
  /** 根拠になった数値（例: "打率 .340 / チーム平均 .268"） */
  evidence?: string;
};
export type Drill = { title: string; detail: string };
export type Reliability = "low" | "medium" | "high";

export type PlayerAnalysis = {
  id: string;
  name: string;
  /** 一言まとめ */
  headline: string;
  /** 打者/投手タイプのラベル（例: "ミート型"） */
  type: string;
  reliability: Reliability;
  reliabilityNote: string;
  strengths: Insight[];
  issues: Insight[];
  drills: Drill[];
  /** 管理者の★評価の目安（1〜5、0は判断材料なし） */
  ratingSuggestion: { batting: number; running: number; fielding: number; pitching: number; teamwork: number };
  /** 主要指標（画面表示用） */
  metrics: { label: string; value: string; vsTeam?: string }[];
};

/* ── チーム基準値 ───────────────────────────────────── */
export type TeamBaseline = {
  avg: number; obp: number; slg: number; ops: number; iso: number;
  bbRate: number; kRate: number;
  era: number; whip: number; k9: number; bb9: number;
  fieldRate: number;
  attendRate: number;
  /** 基準値の算出に使えた人数（少なすぎる場合は比較を控える） */
  battersCounted: number;
  pitchersCounted: number;
};

const ZERO_BASELINE: TeamBaseline = {
  avg: 0, obp: 0, slg: 0, ops: 0, iso: 0, bbRate: 0, kRate: 0,
  era: 0, whip: 0, k9: 0, bb9: 0, fieldRate: 0, attendRate: 0,
  battersCounted: 0, pitchersCounted: 0,
};

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/* ── 指標の計算 ─────────────────────────────────────── */
export function battingMetrics(b: BattingLine) {
  const pa = b.ab + b.bb + b.hbp;
  const singles = Math.max(0, b.h - b.doubles - b.triples - b.hr);
  const tb = singles + b.doubles * 2 + b.triples * 3 + b.hr * 4;
  const avg = b.ab > 0 ? b.h / b.ab : 0;
  const obp = pa > 0 ? (b.h + b.bb + b.hbp) / pa : 0;
  const slg = b.ab > 0 ? tb / b.ab : 0;
  const sbAtt = b.sb + b.cs;
  return {
    pa, avg, obp, slg,
    ops: obp + slg,
    iso: slg - avg,                                  // 純粋な長打力
    bbRate: pa > 0 ? b.bb / pa : 0,                  // 四球率＝選球眼
    kRate: pa > 0 ? b.so / pa : 0,                   // 三振率
    sbRate: sbAtt > 0 ? b.sb / sbAtt : 0,
    sbAtt,
  };
}

export function pitchingMetrics(p: PitchingLine) {
  const ip = p.ipOuts / 3;
  return {
    ip,
    era: ip > 0 ? (p.er * 9) / ip : 0,
    whip: ip > 0 ? (p.hits + p.bb) / ip : 0,
    k9: ip > 0 ? (p.so * 9) / ip : 0,
    bb9: ip > 0 ? (p.bb * 9) / ip : 0,
    kbb: p.bb > 0 ? p.so / p.bb : p.so > 0 ? Infinity : 0,
  };
}

export function fieldingRate(f: FieldingLine) {
  const chances = f.po + f.a + f.e;
  return { chances, rate: chances > 0 ? (f.po + f.a) / chances : 0 };
}

/** チーム全体の平均値を作る。規定に満たない選手は基準値から除く。 */
export function buildTeamBaseline(players: PlayerInput[]): TeamBaseline {
  const batters = players
    .map(p => (p.batting ? battingMetrics(p.batting) : null))
    .filter((m): m is NonNullable<typeof m> => !!m && m.pa >= 5);
  const pitchers = players
    .map(p => (p.pitching ? pitchingMetrics(p.pitching) : null))
    .filter((m): m is NonNullable<typeof m> => !!m && m.ip >= 2);
  const fielders = players
    .map(p => (p.fielding ? fieldingRate(p.fielding) : null))
    .filter((m): m is NonNullable<typeof m> => !!m && m.chances >= 3);
  const attends = players
    .map(p => p.attendance)
    .filter((a): a is AttendanceLine => !!a && a.total > 0)
    .map(a => a.attended / a.total);

  if (batters.length === 0 && pitchers.length === 0) {
    return { ...ZERO_BASELINE, attendRate: mean(attends) };
  }
  return {
    avg: mean(batters.map(b => b.avg)),
    obp: mean(batters.map(b => b.obp)),
    slg: mean(batters.map(b => b.slg)),
    ops: mean(batters.map(b => b.ops)),
    iso: mean(batters.map(b => b.iso)),
    bbRate: mean(batters.map(b => b.bbRate)),
    kRate: mean(batters.map(b => b.kRate)),
    era: mean(pitchers.map(p => p.era)),
    whip: mean(pitchers.map(p => p.whip)),
    k9: mean(pitchers.map(p => p.k9)),
    bb9: mean(pitchers.map(p => p.bb9)),
    fieldRate: mean(fielders.map(f => f.rate)),
    attendRate: mean(attends),
    battersCounted: batters.length,
    pitchersCounted: pitchers.length,
  };
}

/* ── 表示用フォーマット ─────────────────────────────── */
const f3 = (v: number) => (Number.isFinite(v) ? v.toFixed(3).replace(/^0/, "") : "—");
const f2 = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : "—");
const pct = (v: number) => (Number.isFinite(v) ? `${(v * 100).toFixed(1)}%` : "—");

/** 守備率を★に変換する（守備率は .900 前後が普通なので、その範囲で刻む） */
function fieldingStar(rate: number): number {
  if (rate >= 0.980) return 5;
  if (rate >= 0.940) return 4;
  if (rate >= 0.890) return 3;
  if (rate >= 0.820) return 2;
  return 1;
}

/** 1〜5 に収める */
const clamp5 = (v: number) => Math.max(1, Math.min(5, Math.round(v)));

/**
 * 比率を★に変換する。
 * 平均ちょうどで3、平均の±spread で 1 / 5 に振り切る。
 */
function toStar(value: number, teamAvg: number, spread: number, higherIsBetter = true): number {
  if (!Number.isFinite(value) || teamAvg <= 0 || spread <= 0) return 0;
  const diff = (value - teamAvg) / spread;
  return clamp5(3 + (higherIsBetter ? diff : -diff) * 2);
}

/* ── 本体 ───────────────────────────────────────────── */
export function analyzePlayer(p: PlayerInput, team: TeamBaseline): PlayerAnalysis {
  const strengths: Insight[] = [];
  const issues: Insight[] = [];
  const drills: Drill[] = [];
  const metrics: PlayerAnalysis["metrics"] = [];
  const rating = { batting: 0, running: 0, fielding: 0, pitching: 0, teamwork: 0 };

  const b = p.batting ? battingMetrics(p.batting) : null;
  const pi = p.pitching ? pitchingMetrics(p.pitching) : null;
  const fd = p.fielding ? fieldingRate(p.fielding) : null;
  const ct = p.catching;
  const at = p.attendance;

  /* ── 信頼度 ── */
  const pa = b?.pa ?? 0;
  const ip = pi?.ip ?? 0;
  const reliability: Reliability = pa >= 40 || ip >= 15 ? "high" : pa >= 15 || ip >= 5 ? "medium" : "low";
  const reliabilityNote =
    reliability === "high" ? "記録が十分にあり、傾向として信頼できます。"
    : reliability === "medium" ? "ある程度の記録が集まっています。試合を重ねると精度が上がります。"
    : "まだ記録が少ないため、数字が大きく振れます。参考程度にご覧ください。";

  let type = "データ蓄積中";

  /* ── 打撃 ── */
  if (b && b.pa > 0) {
    metrics.push({ label: "打率", value: f3(b.avg), vsTeam: team.avg > 0 ? `チーム平均 ${f3(team.avg)}` : undefined });
    metrics.push({ label: "出塁率", value: f3(b.obp), vsTeam: team.obp > 0 ? `チーム平均 ${f3(team.obp)}` : undefined });
    metrics.push({ label: "OPS", value: f3(b.ops), vsTeam: team.ops > 0 ? `チーム平均 ${f3(team.ops)}` : undefined });
    metrics.push({ label: "長打力(ISO)", value: f3(b.iso) });
    metrics.push({ label: "四球率", value: pct(b.bbRate) });
    metrics.push({ label: "三振率", value: pct(b.kRate) });

    // 打者タイプの判定（サンプルが最低限あるときだけ）
    if (b.pa >= 10) {
      const contact = b.avg >= team.avg;
      const power = b.iso >= Math.max(team.iso, 0.08);
      const eye = b.bbRate >= Math.max(team.bbRate, 0.08);
      type = power && contact ? "中軸型（打てて長打もある）"
        : power ? "長距離型（一発がある）"
        : contact ? "ミート型（当てるのがうまい）"
        : eye ? "出塁型（四球で塁に出る）"
        : "育成中（これから伸びるタイプ）";
    }

    if (b.pa >= 10) {
      if (b.avg > team.avg + 0.030) {
        strengths.push({ kind: "strength", title: "ミート力が高い", detail: "チーム平均を上回る打率。ボールに当てる技術が安定しています。", evidence: `打率 ${f3(b.avg)}（チーム平均 ${f3(team.avg)}）` });
      }
      if (b.iso > Math.max(team.iso + 0.030, 0.100)) {
        strengths.push({ kind: "strength", title: "長打力がある", detail: "単打だけでなく、長打で走者を還せるタイプです。", evidence: `ISO ${f3(b.iso)}（長打率−打率）` });
      }
      if (b.bbRate > Math.max(team.bbRate + 0.04, 0.10)) {
        strengths.push({ kind: "strength", title: "選球眼が良い", detail: "ボール球に手を出さず、四球でも出塁できています。", evidence: `四球率 ${pct(b.bbRate)}` });
      }
      if (b.obp > team.obp + 0.030) {
        strengths.push({ kind: "strength", title: "出塁能力が高い", detail: "安打・四球を合わせて塁に出る力があり、上位打線向きです。", evidence: `出塁率 ${f3(b.obp)}（チーム平均 ${f3(team.obp)}）` });
      }

      if (b.kRate > Math.max(team.kRate + 0.07, 0.25)) {
        issues.push({ kind: "issue", title: "三振が多い", detail: "追い込まれてからの対応に課題。2ストライク後はコンパクトに当てにいく意識を。", evidence: `三振率 ${pct(b.kRate)}` });
        drills.push({ title: "2ストライク想定のティー打撃", detail: "バットを短く持ち、センター方向から逆方向へ弾き返す練習を1日30スイング。当てることを最優先に。" });
      }
      if (b.bbRate < Math.min(team.bbRate - 0.03, 0.04) && b.pa >= 15) {
        issues.push({ kind: "issue", title: "早打ちの傾向", detail: "四球が少なく、初球から手を出しがち。球を見る意識で出塁率が上がります。", evidence: `四球率 ${pct(b.bbRate)}` });
        drills.push({ title: "ボール球を見送る練習", detail: "フリー打撃で『ストライクゾーンの球だけ振る』ルールを課す。見送った球のコースを声に出して確認。" });
      }
      if (b.avg >= team.avg && b.iso < 0.060 && b.pa >= 15) {
        issues.push({ kind: "issue", title: "長打が出ていない", detail: "当てる力はあるので、次は強い打球を。体重移動と下半身の使い方が伸びしろです。", evidence: `ISO ${f3(b.iso)}` });
        drills.push({ title: "体重移動を意識したロングティー", detail: "後ろ足から前足へ体重を移しながら、遠くへ飛ばす意識で20スイング。打球の高さより強さを重視。" });
      }
      if (b.avg < team.avg - 0.040 && b.pa >= 15) {
        issues.push({ kind: "issue", title: "打率が伸び悩んでいる", detail: "まずはミートの確率を上げるところから。スイングを小さくして確実性を優先しましょう。", evidence: `打率 ${f3(b.avg)}（チーム平均 ${f3(team.avg)}）` });
        drills.push({ title: "置きティーでミート集中", detail: "止まったボールをバットの芯で捉える練習。毎回どこに当たったかを確認しながら50球。" });
      }
    }

    rating.batting = b.pa >= 10 && team.ops > 0 ? toStar(b.ops, team.ops, 0.250) : 0;

    /* ── 走塁 ── */
    if (b.sbAtt > 0) {
      metrics.push({ label: "盗塁成功率", value: pct(b.sbRate), vsTeam: `${p.batting!.sb}/${b.sbAtt}` });
      if (b.sbAtt >= 3) {
        if (b.sbRate >= 0.75) {
          strengths.push({ kind: "strength", title: "走塁の判断が良い", detail: "盗塁の成功率が高く、仕掛けどころを理解できています。", evidence: `盗塁成功率 ${pct(b.sbRate)}（${p.batting!.sb}/${b.sbAtt}）` });
        } else if (b.sbRate < 0.5) {
          issues.push({ kind: "issue", title: "盗塁の成功率が低い", detail: "走る判断とスタートのタイミングを見直しましょう。失敗が多いと逆にチームの得点機会を減らします。", evidence: `盗塁成功率 ${pct(b.sbRate)}（${p.batting!.sb}/${b.sbAtt}）` });
          drills.push({ title: "スタート練習", detail: "投手のクセを見る／一歩目を速くする練習。塁上でのリードの幅も一定にする。" });
        }
        rating.running = clamp5(1 + b.sbRate * 4);
      }
    }
  }

  /* ── 投球 ── */
  if (pi && pi.ip > 0) {
    metrics.push({ label: "防御率", value: f2(pi.era), vsTeam: team.era > 0 ? `チーム平均 ${f2(team.era)}` : undefined });
    metrics.push({ label: "WHIP", value: f2(pi.whip) });
    metrics.push({ label: "K/9", value: f2(pi.k9) });
    metrics.push({ label: "BB/9", value: f2(pi.bb9) });

    if (pi.ip >= 3) {
      if (team.era > 0 && pi.era < team.era - 1.0) {
        strengths.push({ kind: "strength", title: "失点を抑えられている", detail: "チーム平均より良い防御率。試合を作れる投手です。", evidence: `防御率 ${f2(pi.era)}（チーム平均 ${f2(team.era)}）` });
      }
      if (pi.k9 >= Math.max(team.k9 + 1.5, 6)) {
        strengths.push({ kind: "strength", title: "奪三振能力が高い", detail: "自分でアウトを取れるので、ピンチでも崩れにくいタイプです。", evidence: `K/9 ${f2(pi.k9)}` });
      }
      if (pi.bb9 <= Math.min(team.bb9 - 1.0, 3.0)) {
        strengths.push({ kind: "strength", title: "制球が安定している", detail: "四球が少なく、味方の守備のリズムを作れています。", evidence: `BB/9 ${f2(pi.bb9)}` });
      }
      if (pi.bb9 >= Math.max(team.bb9 + 1.5, 5.0)) {
        issues.push({ kind: "issue", title: "四球が多い", detail: "自滅につながりやすい部分。ストライク先行を最優先に組み立てましょう。", evidence: `BB/9 ${f2(pi.bb9)}` });
        drills.push({ title: "ストライク先行の投球練習", detail: "『初球はど真ん中』と決めて20球。フォームを固めるため、全力の8割の力で投げる。" });
      }
      if (pi.whip >= Math.max(team.whip + 0.35, 1.7)) {
        issues.push({ kind: "issue", title: "走者を出しすぎている", detail: "1イニングあたりの出塁を減らせば失点は自然に減ります。まずは四球から。", evidence: `WHIP ${f2(pi.whip)}` });
      }
      rating.pitching = team.era > 0 ? toStar(pi.era, team.era, 2.0, false) : 0;
    }
  }

  /* ── 守備 ── */
  if (fd && fd.chances > 0) {
    metrics.push({ label: "守備率", value: f3(fd.rate), vsTeam: `失策 ${p.fielding!.e}` });
    if (fd.chances >= 5) {
      if (fd.rate >= 0.950 && p.fielding!.e === 0) {
        strengths.push({ kind: "strength", title: "守備が堅い", detail: "失策なく確実にアウトを取れています。守備の要として計算できます。", evidence: `守備率 ${f3(fd.rate)}（守備機会 ${fd.chances}）` });
      } else if (fd.rate < 0.850) {
        issues.push({ kind: "issue", title: "守備の安定性に課題", detail: "捕球と送球を確実に。難しい打球より、まず基本の打球を100%処理できるように。", evidence: `守備率 ${f3(fd.rate)}（失策 ${p.fielding!.e}）` });
        drills.push({ title: "正面のゴロ捕球を反復", detail: "緩いゴロを低い姿勢で捕り、ステップして送球する流れを1日50本。範囲を広げるより、まず確実性を優先。" });
      }
      rating.fielding = fieldingStar(fd.rate);
    }
  }

  /* ── 捕手 ── */
  if (ct && ct.sba > 0) {
    const csRate = ct.cs / ct.sba;
    metrics.push({ label: "盗塁阻止率", value: pct(csRate), vsTeam: `${ct.cs}/${ct.sba}` });
    if (ct.sba >= 3) {
      if (csRate >= 0.35) {
        strengths.push({ kind: "strength", title: "盗塁を刺せる", detail: "強肩と素早い送球で、相手の足を止められています。", evidence: `阻止率 ${pct(csRate)}（${ct.cs}/${ct.sba}）` });
      } else if (csRate < 0.15) {
        issues.push({ kind: "issue", title: "盗塁を許しやすい", detail: "捕ってから投げるまでの時間短縮がカギ。送球の正確さも合わせて磨きましょう。", evidence: `阻止率 ${pct(csRate)}（${ct.cs}/${ct.sba}）` });
        drills.push({ title: "捕球〜送球のタイム計測", detail: "捕ってから二塁到達までを計測し、毎回タイムを記録。まずは素早く握り替える動作から。" });
      }
      if (rating.fielding === 0) rating.fielding = clamp5(1 + csRate * 6);
    }
  }

  /* ── 練習参加（チームワークの目安） ── */
  if (at && at.total > 0) {
    const rate = at.attended / at.total;
    metrics.push({ label: "練習参加率", value: pct(rate), vsTeam: `${at.attended}/${at.total} 回` });
    if (rate >= 0.8) {
      strengths.push({ kind: "strength", title: "練習への参加率が高い", detail: "継続して顔を出してくれています。チームにとって大きな戦力です。", evidence: `参加率 ${pct(rate)}（${at.attended}/${at.total}）` });
    } else if (rate < 0.4 && at.total >= 5) {
      issues.push({ kind: "note", title: "練習参加が少なめ", detail: "予定が合わないだけかもしれません。参加しやすい日程を一度聞いてみるとよさそうです。", evidence: `参加率 ${pct(rate)}（${at.attended}/${at.total}）` });
    }
    rating.teamwork = clamp5(1 + rate * 4);
  }

  /* ── まとめ ── */
  let headline: string;
  if (!b?.pa && !pi?.ip) {
    headline = `${p.name} さんの記録はまだありません。試合の記録が入ると分析できます。`;
    type = "データなし";
  } else if (strengths.length > 0) {
    headline = `${strengths[0].title}のが持ち味。${issues[0] ? `次の課題は「${issues[0].title}」です。` : "この調子で記録を伸ばしていきましょう。"}`;
  } else if (issues.length > 0) {
    headline = `まずは「${issues[0].title}」の改善から。練習メニューを用意しました。`;
  } else {
    headline = "大きな偏りはなく、バランス良くプレーできています。";
  }

  // 練習メニューが空なら、汎用の底上げメニューを提案する
  if (drills.length === 0 && (b?.pa ?? 0) > 0) {
    drills.push({ title: "素振り＋ティー打撃", detail: "毎日50スイング。フォームを一定に保ち、同じ場所でミートできる感覚を作る。" });
  }

  return {
    id: p.id,
    name: p.name,
    headline,
    type,
    reliability,
    reliabilityNote,
    // 指摘を取りこぼすと改善の機会を失うため、多めに残す
    strengths: strengths.slice(0, 5),
    issues: issues.slice(0, 6),
    drills: drills.slice(0, 4),
    ratingSuggestion: rating,
    metrics,
  };
}
