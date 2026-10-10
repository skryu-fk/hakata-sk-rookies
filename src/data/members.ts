/**
 * メンバー人数
 *
 * 公式サイトのヒーローに出る「◯名」。
 * これまでは環境変数（NEXT_PUBLIC_MEMBER_COUNT）に手で書いた数字だったため、
 * 入団・退団のたびに直し忘れて実際とズレていた（25人いるのにサイトは22人、など）。
 *
 * 管理画面の名簿がそのまま正になるよう、ここで数えて出す。
 * 名前などの個人情報はサーバー内で数えるだけで、ブラウザには人数しか渡さない。
 */

import { fetchSheetCSV } from "@/lib/sheets";

/** 名簿が読めなかったときに使う数。環境変数があればそれを優先する */
const FALLBACK = Number(process.env.NEXT_PUBLIC_MEMBER_COUNT ?? 13);

/**
 * 在籍中のメンバー数を返す。
 * 名簿が読めないときは環境変数の値にフォールバックするので、
 * 一時的にデータベースが落ちても「0名」とは出ない。
 */
export async function getMemberCount(): Promise<number> {
  try {
    const rows = await fetchSheetCSV("members");
    if (rows.length <= 1) return FALLBACK;

    // 別のシートが返ってきていないか、見出しで確かめる
    const header = (rows[0] ?? []).map(c => c.toLowerCase().trim());
    const looksLikeMembers =
      header.includes("name") || header.some(h => h.includes("名前"));
    if (!looksLikeMembers) return FALLBACK;

    // 退団した人（active が FALSE）は数えない。名前が空の行も飛ばす。
    const count = rows.slice(1).filter(r => {
      const name = (r[1] ?? "").trim();
      if (!name) return false;
      const active = (r[6] ?? "TRUE").toString().trim().toUpperCase();
      return active !== "FALSE";
    }).length;

    return count > 0 ? count : FALLBACK;
  } catch {
    return FALLBACK;
  }
}
