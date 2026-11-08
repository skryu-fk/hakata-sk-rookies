import fs from "node:fs";
import path from "node:path";
import { TERMS } from "@/data/terms";

/**
 * /api/terms — チーム規約の本文（Markdown）を返す。
 *
 * メンバー専用アプリの同意画面で、規約をアプリの中に出すために使う。
 * 本文の原本は docs/team-rules-2026.md ひとつだけで、
 * /terms のページ・配布用PDF・この API がすべてそこから作られる。
 *
 * force-static にしてあるので、ビルドのときに1回だけファイルを読み、
 * あとは静的なJSONとして配られる（公開後にファイルを探しにいかない）。
 */
export const dynamic = "force-static";

export function GET() {
  const md = fs.readFileSync(
    path.join(process.cwd(), "docs", "team-rules-2026.md"),
    "utf8",
  );
  return Response.json({
    ok: true,
    md,
    version: TERMS.version,
    effectiveDate: TERMS.effectiveDate,
    pdf: TERMS.rulesPdf,
    pdfName: TERMS.rulesPdfName,
  });
}
