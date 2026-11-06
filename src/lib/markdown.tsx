/**
 * ちいさな Markdown レンダラ
 *
 * チーム規約は docs/team-rules-2026.md を唯一の原本にしている。
 * 同じファイルから配布用のPDFも作るので、サイト側に内容を書き写すと
 * かならず片方だけ古くなる（FAQと構造化データで実際に起きた）。
 * そのため、ここで .md をそのまま描画する。
 *
 * 対応する記法は、規約で使っているぶんだけ:
 *   # 〜 ###, 段落, - / 1. のリスト（3スペースでネスト）, | 表 |,
 *   > 引用, ---, **太字**, [リンク](URL)
 * これ以外を使いたくなったら、ここに足すこと。
 */
import Link from "next/link";
import type { ReactNode } from "react";

/* ── 行内の記法 ───────────────────────────────────────── */
function inline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  // **太字** と [リンク](URL) を同時に拾う
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      out.push(<strong key={`${keyPrefix}-b${i}`} className="font-bold text-navy">{m[1]}</strong>);
    } else {
      const href = m[3];
      const label = m[2];
      out.push(
        href.startsWith("/")
          ? <Link key={`${keyPrefix}-l${i}`} href={href} className="text-red font-bold underline decoration-dotted underline-offset-4">{label}</Link>
          : <a key={`${keyPrefix}-l${i}`} href={href} target="_blank" rel="noopener noreferrer" className="text-red font-bold underline decoration-dotted underline-offset-4">{label}</a>
      );
    }
    last = m.index + m[0].length;
    i += 1;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/* ── ブロック ─────────────────────────────────────────── */
type Row = string[];

function Table({ head, body, k }: { head: Row | null; body: Row[]; k: string }) {
  const ncol = Math.max(...[...(head ? [head] : []), ...body].map(r => r.length), 1);
  const pad = (r: Row) => [...r, ...Array(ncol).fill("")].slice(0, ncol);
  const showHead = !!head && head.some(h => h);
  return (
    <div className="overflow-x-auto my-5">
      <table className="w-full text-[13.5px]" style={{ borderCollapse: "collapse" }}>
        {showHead && (
          <thead>
            <tr>
              {pad(head).map((c, i) => (
                <th key={i} className="text-left font-bold text-white"
                  style={{ background: "#0b1e3f", border: "1px solid #c8c4bc", padding: "9px 12px" }}>
                  {inline(c, `${k}-h${i}`)}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {body.map((r, ri) => (
            <tr key={ri} style={{ background: ri % 2 ? "#faf8f5" : "#fff" }}>
              {pad(r).map((c, ci) => (
                <td key={ci} style={{ border: "1px solid #c8c4bc", padding: "9px 12px", lineHeight: 1.8, color: "#1b1f26" }}>
                  {inline(c, `${k}-${ri}-${ci}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function renderMarkdown(md: string): ReactNode[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  let k = 0;
  const key = () => `md${k++}`;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    if (!line) { i += 1; continue; }

    if (/^-{3,}$/.test(line)) {
      out.push(<hr key={key()} className="my-8" style={{ border: 0, borderTop: "1px solid #e0dcd4" }} />);
      i += 1;
      continue;
    }

    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const text = h[2];
      const id = key();
      if (level === 1) {
        // ページ側で見出しを出しているので、本文の h1 は出さない
        i += 1;
        continue;
      }
      if (level === 2) {
        out.push(
          <h2 key={id} className="font-sans font-black text-navy mt-10 mb-3"
            style={{ fontSize: "clamp(17px,2.2vw,22px)", lineHeight: 1.45, scrollMarginTop: 90 }}>
            {inline(text, id)}
          </h2>
        );
      } else {
        out.push(
          <h3 key={id} className="font-sans font-bold mt-6 mb-2"
            style={{ fontSize: 15, color: "#d10024", lineHeight: 1.5 }}>
            {inline(text, id)}
          </h3>
        );
      }
      i += 1;
      continue;
    }

    if (line.startsWith("|")) {
      const rows: Row[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(lines[i].trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim()));
        i += 1;
      }
      const isSep = rows.length >= 2 && rows[1].every(c => /^:?-{2,}:?$/.test(c || "-"));
      const id = key();
      out.push(<Table key={id} k={id} head={isSep ? rows[0] : null} body={isSep ? rows.slice(2) : rows} />);
      continue;
    }

    if (line.startsWith(">")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        buf.push(lines[i].replace(/^\s*>\s?/, ""));
        i += 1;
      }
      const id = key();
      out.push(
        <div key={id} className="my-5" style={{ background: "#f5f2ec", borderLeft: "4px solid #d10024", padding: "16px 20px" }}>
          {renderMarkdown(buf.join("\n"))}
        </div>
      );
      continue;
    }

    const li = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(raw);
    if (li) {
      const items: { depth: number; marker: string; text: string }[] = [];
      while (i < lines.length) {
        const m = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(lines[i]);
        if (!m) {
          // インデントされた続きの行は、直前の項目につなぐ
          if (items.length && lines[i].trim() && /^\s\s/.test(lines[i]) && !lines[i].trim().startsWith("|")) {
            items[items.length - 1].text += lines[i].trim();
            i += 1;
            continue;
          }
          break;
        }
        items.push({ depth: Math.floor(m[1].length / 3), marker: m[2], text: m[3] });
        i += 1;
      }
      const id = key();
      out.push(
        <ul key={id} className="my-3" style={{ listStyle: "none", padding: 0, margin: "10px 0" }}>
          {items.map((it, n) => (
            <li key={n} className="flex gap-2.5"
              style={{ marginLeft: it.depth * 18, marginBottom: 6, fontSize: 14.5, lineHeight: 1.95, color: "#1b1f26" }}>
              <span style={{ flexShrink: 0, color: it.marker === "-" || it.marker === "*" ? "#d10024" : "#0b1e3f", fontWeight: 700, minWidth: it.marker.length > 1 ? 20 : 10 }}>
                {it.marker === "-" || it.marker === "*" ? "・" : it.marker}
              </span>
              <span>{inline(it.text, `${id}-${n}`)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    const buf: string[] = [];
    while (i < lines.length && lines[i].trim()
      && !/^\s*(#{1,4}\s|[-*]\s|\d+\.\s|\||>|-{3,}$)/.test(lines[i])) {
      buf.push(lines[i].trim());
      i += 1;
    }
    const id = key();
    out.push(
      <p key={id} style={{ fontSize: 14.5, lineHeight: 1.95, color: "#1b1f26", margin: "0 0 12px" }}>
        {inline(buf.join(""), id)}
      </p>
    );
  }

  return out;
}
