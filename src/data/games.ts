/**
 * 試合データ（公式サイト用の読み込み）
 *
 * 管理画面の「スコアボード」で記録した試合（games）をそのまま公開サイトで使う。
 * 二重入力を避けるため、公開用に別のデータは持たない。
 *
 * 行を試合に組み立てる処理そのものは src/lib/gameRows.ts にある。
 * 公式アプリ（/stats）も同じものを使うので、どちらか片方だけ直って
 * 表示がズレる、ということが起きないようにしている。
 */

import { fetchSheetCSV } from "@/lib/sheets";
import { parseGames, decorateGames, type Game } from "@/lib/gameRows";

export {
  SHOW_PLAYER_NAMES,
  isLive,
  isScheduled,
  isFinal,
  isOurTeam,
  total,
  outcome,
  record,
} from "@/lib/gameRows";
export type { Game, GameOutcome } from "@/lib/gameRows";

/**
 * 試合を新しい順で返す。
 * games が未設定・空のときは空配列（セクションごと出さない判断に使う）。
 */
export async function getGames(): Promise<Game[]> {
  const rows = await fetchSheetCSV("games");
  if (rows.length <= 1) return [];
  // 別シートが返ってきたとき用の見出しチェック
  const header = (rows[0] ?? []).map(c => c.toLowerCase().trim());
  if (!header.includes("home_scores") && !header.includes("away_scores")) return [];

  const games = parseGames(rows);
  if (games.length === 0) return [];

  const [practices, tweets, opponents, batting, probables, pitching] = await Promise.all([
    safeRows("practices"),
    safeRows("tweets"),
    safeRows("opponents"),
    // 本塁打は本数だけでも出すので、名前を出さない設定でも読む
    safeRows("batting"),
    safeRows("probables"),
    safeRows("pitching"),
  ]);
  decorateGames(games, { practices, tweets, opponents, batting, probables, pitching });
  return games;
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
