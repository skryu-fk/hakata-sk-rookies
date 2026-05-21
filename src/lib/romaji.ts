/**
 * 「canonical なヘボン式ローマ字」から、IME入力で受理される全バリエーションを生成する。
 *
 * 受理する代替表記:
 *   - 長音「ー」：母音二重 ↔ 「-」（カーブ → "kaabu" / "ka-bu"）
 *   - 撥音「ん」：「n」 ↔ 「nn」（本塁打 → "honruida" / "honnruida"／"hon"が末尾なら "hon"/"honn"）
 *     ※ 「ん」の後ろが母音/y のときは "n" のみ（ambiguity 回避）
 *   - ヘボン式 ↔ 訓令式:
 *       chi ↔ ti, shi ↔ si, tsu ↔ tu, ji ↔ zi, fu ↔ hu
 *       sha/shu/sho/she ↔ sya/syu/syo/sye
 *       cha/chu/cho/che ↔ tya/tyu/tyo/tye
 *       ja/ju/jo/je ↔ jya/jyu/jyo/jye ↔ zya/zyu/zyo/zye
 *   - 促音「っ」(直前の子音二重) の拗音バリアント:
 *       ccha ↔ tcha ↔ ttya, sshi ↔ ssi, ttsu ↔ ttu, jji ↔ zzi 等
 */

type Rule = [pattern: string, alternatives: string[]];

/**
 * パターンは「ascii で書いた標準ヘボン式」上の連続した部分文字列を受理形に展開する。
 * 長いパターンから順に試す。
 */
const RULES: Rule[] = [
  // ── ッ + 拗音（4文字）──
  ["ccha", ["ccha", "tcha", "ttya"]],
  ["cchu", ["cchu", "tchu", "ttyu"]],
  ["ccho", ["ccho", "tcho", "ttyo"]],
  ["cche", ["cche", "tche", "ttye"]],
  ["cchi", ["cchi", "tti"]],
  ["ssha", ["ssha", "ssya"]],
  ["sshu", ["sshu", "ssyu"]],
  ["ssho", ["ssho", "ssyo"]],
  ["sshe", ["sshe", "ssye"]],
  ["sshi", ["sshi", "ssi"]],
  ["ttsu", ["ttsu", "ttu"]],
  ["jja",  ["jja", "jjya", "zzya"]],
  ["jju",  ["jju", "jjyu", "zzyu"]],
  ["jjo",  ["jjo", "jjyo", "zzyo"]],
  ["jji",  ["jji", "zzi"]],
  // ── 拗音 (3文字) ──
  ["sha", ["sha", "sya"]],
  ["shu", ["shu", "syu"]],
  ["sho", ["sho", "syo"]],
  ["she", ["she", "sye"]],
  ["cha", ["cha", "tya"]],
  ["chu", ["chu", "tyu"]],
  ["cho", ["cho", "tyo"]],
  ["che", ["che", "tye"]],
  // ── 訓令⇔ヘボン (3文字) ──
  ["chi", ["chi", "ti"]],
  ["shi", ["shi", "si"]],
  ["tsu", ["tsu", "tu"]],
  // ── ji / zi 系 (2文字) ──
  ["ja",  ["ja", "jya", "zya"]],
  ["ju",  ["ju", "jyu", "zyu"]],
  ["jo",  ["jo", "jyo", "zyo"]],
  ["je",  ["je", "jye", "zye"]],
  ["ji",  ["ji", "zi"]],
  // ── fu / hu ──
  ["fu",  ["fu", "hu"]],
  // ── 長音 (母音 + ー) — canonical 上は母音二重で書く ──
  ["aa",  ["aa", "a-"]],
  ["ii",  ["ii", "i-"]],
  ["uu",  ["uu", "u-"]],
  ["ee",  ["ee", "e-"]],
  ["oo",  ["oo", "o-"]],
];

/** canonical 文字列から、受理される全バリエーションを生成する。 */
export function generateRomajiVariants(canonical: string): string[] {
  const src = canonical.toLowerCase();
  let variants: string[] = [""];
  let i = 0;
  while (i < src.length) {
    let matched = false;
    for (const [pat, alts] of RULES) {
      if (src.startsWith(pat, i)) {
        const next: string[] = [];
        for (const v of variants) {
          for (const a of alts) next.push(v + a);
        }
        variants = next;
        i += pat.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // ── ん（n） 単体の判定: 次が母音/y なら n のみ、それ以外は n / nn ──
    if (src[i] === "n") {
      const next = src[i + 1];
      const acceptDouble = !next || !"aiueoy".includes(next);
      const alts = acceptDouble ? ["n", "nn"] : ["n"];
      const out: string[] = [];
      for (const v of variants) for (const a of alts) out.push(v + a);
      variants = out;
      i++;
      continue;
    }

    // それ以外は1文字そのまま
    const ch = src[i];
    variants = variants.map(v => v + ch);
    i++;
  }
  // 重複除去
  return [...new Set(variants)];
}

/**
 * いま入力中の文字列に最も合った「視覚表示用のローマ字」を返す。
 *   - input が空 → canonical
 *   - input で始まる variant が1つだけ → それ
 *   - 複数ある場合は canonical を優先、なければ最短のもの
 *   - どれにも一致しない（タイプミス）→ canonical
 */
export function pickVisualVariant(
  input: string,
  variants: string[],
  canonical: string
): string {
  if (!input) return canonical;
  const matches = variants.filter(v => v.startsWith(input));
  if (matches.length === 0) return canonical;
  if (matches.includes(canonical)) return canonical;
  // 短い順
  return matches.slice().sort((a, b) => a.length - b.length)[0];
}
