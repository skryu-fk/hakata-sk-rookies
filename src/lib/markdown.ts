/**
 * 軽量Markdownレンダラ。
 * news / blog 本文をスプレッドシートや管理画面から書く前提で、
 * XSSを避けつつ最低限の装飾だけサポート:
 *   - **bold**       → <strong>
 *   - [text](url)    → <a>（外部URLのみ）
 *   - 改行           → <br/>
 *   - 空行           → 段落区切り <p>
 *
 * 完全なMarkdownライブラリを使うと bundle が膨らむので、必要最小限を自前実装。
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** http(s)/mailto/相対パスのみ許可。それ以外は#にフォールバック（javascript:対策） */
function safeUrl(u: string): string {
  const t = u.trim();
  if (/^(https?:|mailto:)/i.test(t)) return t;
  if (t.startsWith("/") || t.startsWith("#")) return t;
  return "#";
}

function renderInline(text: string): string {
  let s = escapeHtml(text);
  // [text](url) — escapeHtml 後なので " は &quot; だが正規表現は元テキスト基準でOK
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, txt: string, url: string) => {
    const safe = safeUrl(url);
    const ext = /^https?:/i.test(safe);
    return `<a href="${safe}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ""} class="md-link">${txt}</a>`;
  });
  // **bold**
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return s;
}

/** 本文をHTML文字列に。 */
export function renderMarkdown(body: string): string {
  if (!body) return "";
  // 段落 = 1行以上の空行で区切り
  const paragraphs = body.replace(/\r\n/g, "\n").split(/\n\s*\n/);
  return paragraphs
    .filter(p => p.trim().length > 0)
    .map(p => {
      const lines = p
        .split("\n")
        .map(line => renderInline(line))
        .join("<br/>");
      return `<p>${lines}</p>`;
    })
    .join("\n");
}
