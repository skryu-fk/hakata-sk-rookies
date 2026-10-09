/**
 * 試合データ（スコアボード・日程・結果）
 *
 * 管理画面の「スコアボード」で記録した試合（games）をそのまま公開サイトで使う。
 * 二重入力を避けるため、公開用に別のデータは持たない。
 *
 *   games      … 回ごとの得点・安打・失策・勝者
 *   practices  … 同じ日付の行から球場名を拾う（games に球場の列がないため）
 *   batting    … 同じ日付の行から本塁打を拾う
 *   probables  … 予告先発。無ければ pitching で一番長く投げた人を先発とみなす
 *   tweets     … 同じ日付の投稿があれば「当日の投稿を見る」を出す
 */

import { fetchSheetCSV } from "@/lib/sheets";

/**
 * 試合結果の詳細に選手名（先発・本塁打）を載せるか。
 *
 * 公開サイトはこれまで individual の名前をいっさい出していないので、
 * 載せたくない場合はここを false にすれば、スコアだけの表示に戻る。
 */
export const SHOW_PLAYER_NAMES = true;

export type Game = {
  id: string;
  /** ISO date "YYYY-MM-DD" */
  date: string;
  /** 上段に出る相手チーム */
  awayTeam: string;
  /** 下段に出る自チーム */
  homeTeam: string;
  awayScores: number[];
  homeScores: number[];
  awayHits: number;
  homeHits: number;
  awayErrors: number;
  homeErrors: number;
  winner: string;
  note: string;
  /** practices から拾った球場名 */
  place?: string;
  /** practices から拾った開始時刻 */
  time?: string;
  /** 先発投手（SHOW_PLAYER_NAMES が false なら空） */
  starter?: string;
  /** 本塁打。"山田 2号" の形 */
  homeRuns: string[];
  /** 当日のXの投稿 */
  tweetUrl?: string;
};

export type GameOutcome = "win" | "lose" | "draw";

/** 自チームかどうか。管理画面では "SK ROOKIES" が既定だが、表記ゆれに備える */
export function isOurTeam(name: string): boolean {
  return /sk|ルーキーズ|rookies|博多/i.test(name);
}

export function total(scores: number[]): number {
  return scores.reduce((a, b) => a + b, 0);
}

/** 自チームから見た勝敗。自チームが home 側である前提（管理画面がそうなっている） */
export function outcome(g: Game): GameOutcome {
  const h = total(g.homeScores);
  const a = total(g.awayScores);
  if (h > a) return "win";
  if (h < a) return "lose";
  return "draw";
}

/** 通算成績。指定した試合まで（含む）の勝-敗-分 */
export function record(games: Game[]): { win: number; lose: number; draw: number } {
  const r = { win: 0, lose: 0, draw: 0 };
  for (const g of games) {
    const o = outcome(g);
    if (o === "win") r.win++;
    else if (o === "lose") r.lose++;
    else r.draw++;
  }
  return r;
}

function num(v: string | undefined): number {
  const n = Number((v ?? "").trim());
  return Number.isFinite(n) ? n : 0;
}

function normalizeDate(v: string): string {
  const t = (v ?? "").trim().replace(/[./]/g, "-");
  const m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return "";
  return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

/** "3,0,1,0" → [3,0,1,0]。空文字は空配列 */
function parseScores(v: string): number[] {
  const t = (v ?? "").trim();
  if (!t) return [];
  return t.split(",").map(s => num(s));
}

/**
 * 試合を新しい順で返す。
 * games シートが未設定・空のときは空配列（セクションごと出さない判断に使う）。
 */
export async function getGames(): Promise<Game[]> {
  const rows = await fetchSheetCSV("games");
  if (rows.length <= 1) return [];
  // 別シートが返ってきたとき用の見出しチェック
  const header = (rows[0] ?? []).map(c => c.toLowerCase().trim());
  if (!header.includes("home_scores") && !header.includes("away_scores")) return [];

  const games = rows.slice(1)
    .map<Game | null>(r => {
      const date = normalizeDate(r[1] ?? "");
      if (!date) return null;
      return {
        id: (r[0] ?? "").trim(),
        date,
        homeTeam: (r[2] ?? "").trim() || "SK ROOKIES",
        awayTeam: (r[3] ?? "").trim() || "対戦相手",
        homeScores: parseScores(r[4] ?? ""),
        awayScores: parseScores(r[5] ?? ""),
        homeHits: num(r[6]),
        awayHits: num(r[7]),
        homeErrors: num(r[8]),
        awayErrors: num(r[9]),
        winner: (r[10] ?? "").trim(),
        note: (r[11] ?? "").trim(),
        homeRuns: [],
      };
    })
    .filter((g): g is Game => g !== null)
    .sort((a, b) => b.date.localeCompare(a.date));

  await decorate(games);
  return games;
}

/** 他のシートから球場・先発・本塁打・当日の投稿を補う。失敗しても試合自体は出す */
async function decorate(games: Game[]): Promise<void> {
  if (games.length === 0) return;
  const dates = new Set(games.map(g => g.date));

  const [practices, tweets, batting, probables, pitching] = await Promise.all([
    safeRows("practices"),
    safeRows("tweets"),
    SHOW_PLAYER_NAMES ? safeRows("batting") : Promise.resolve([]),
    SHOW_PLAYER_NAMES ? safeRows("probables") : Promise.resolve([]),
    SHOW_PLAYER_NAMES ? safeRows("pitching") : Promise.resolve([]),
  ]);

  // 球場・時刻（試合の行を優先し、無ければ同じ日のどれか）
  const place = new Map<string, { place: string; time: string; isGame: boolean }>();
  for (const r of practices) {
    const d = normalizeDate(r[0] ?? "");
    if (!dates.has(d)) continue;
    const type = (r[1] ?? "").trim();
    const isGame = type === "試合" || type === "練習試合";
    const prev = place.get(d);
    if (prev && prev.isGame && !isGame) continue;
    place.set(d, { place: (r[2] ?? "").trim(), time: (r[4] ?? "").trim(), isGame });
  }

  // 当日のXの投稿
  const tweet = new Map<string, string>();
  for (const r of tweets) {
    const d = normalizeDate(r[0] ?? "");
    const url = (r[2] ?? "").trim();
    if (dates.has(d) && url && !tweet.has(d)) tweet.set(d, url);
  }

  // 本塁打。年ごとに通算して「N号」を出すため、日付の古い順に数える
  const hrByDate = new Map<string, string[]>();
  if (SHOW_PLAYER_NAMES) {
    const seasonCount = new Map<string, number>(); // "2026|山田" → 本数
    const hits = batting
      .map(r => ({ date: normalizeDate(r[0] ?? ""), name: (r[2] ?? "").trim(), hr: num(r[8]) }))
      .filter(b => b.date && b.name && b.hr > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
    for (const b of hits) {
      const key = `${b.date.slice(0, 4)}|${b.name}`;
      const list: string[] = [];
      for (let i = 0; i < b.hr; i++) {
        const n = (seasonCount.get(key) ?? 0) + 1;
        seasonCount.set(key, n);
        list.push(`${b.name} ${n}号`);
      }
      if (dates.has(b.date)) {
        hrByDate.set(b.date, [...(hrByDate.get(b.date) ?? []), ...list]);
      }
    }
  }

  // 先発。予告先発があればそれ、無ければ一番長く投げた人
  const starter = new Map<string, string>();
  for (const r of probables) {
    const d = normalizeDate(r[0] ?? "");
    const name = (r[3] ?? "").trim();
    if (dates.has(d) && name && !starter.has(d)) starter.set(d, name);
  }
  const longest = new Map<string, { name: string; outs: number }>();
  for (const r of pitching) {
    const d = normalizeDate(r[0] ?? "");
    if (!dates.has(d) || starter.has(d)) continue;
    const name = (r[2] ?? "").trim();
    const outs = num(r[4]);
    const prev = longest.get(d);
    if (name && (!prev || outs > prev.outs)) longest.set(d, { name, outs });
  }

  for (const g of games) {
    const p = place.get(g.date);
    if (p) { g.place = p.place || undefined; g.time = p.time || undefined; }
    g.tweetUrl = tweet.get(g.date);
    g.homeRuns = hrByDate.get(g.date) ?? [];
    g.starter = starter.get(g.date) ?? longest.get(g.date)?.name;
  }
}

/** 1シート読む。読めなければ空配列（補足情報なので試合表示は止めない） */
async function safeRows(sheet: string): Promise<string[][]> {
  try {
    const rows = await fetchSheetCSV(sheet);
    return rows.length > 1 ? rows.slice(1) : [];
  } catch {
    return [];
  }
}
