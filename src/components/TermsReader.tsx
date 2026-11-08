"use client";

import { useEffect, useState } from "react";
import { renderMarkdown } from "@/lib/markdown";

/**
 * アプリの中で規約を読む画面
 *
 * 同意する前に全文を読んでもらうための全画面。外部のページやPDFに飛ばさず、
 * アプリの中で開いて閉じれば元の場所に戻る。
 *
 * PDFを画像にして並べる案もあったが、10ページ分の画像は数MBになり、
 * スマホでは拡大しないと読めない。本文は配布用PDFと同じ
 * docs/team-rules-2026.md から来ているので、中身は紙とまったく同じ。
 * 白い紙の上に組んで、紙の規約を見ているのと同じ見え方にしている。
 */
export default function TermsReader({ onClose }: { onClose: () => void }) {
  const [md, setMd] = useState("");
  const [meta, setMeta] = useState<{ version: string; effectiveDate: string; pdf: string; pdfName: string } | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/terms")
      .then(r => r.json())
      .then(d => {
        if (d?.ok) { setMd(d.md ?? ""); setMeta({ version: d.version, effectiveDate: d.effectiveDate, pdf: d.pdf, pdfName: d.pdfName }); }
        else setErr("規約を読み込めませんでした。");
      })
      .catch(() => setErr("規約を読み込めませんでした。"));
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "#0b1e3f", display: "flex", flexDirection: "column" }}>
      {/* 見出しと閉じる */}
      <div style={{
        flexShrink: 0, paddingTop: "env(safe-area-inset-top)",
        background: "#0b1e3f", borderBottom: "3px solid #d10024",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 14, color: "#fff", whiteSpace: "nowrap" }}>チーム規約</div>
            <div style={{ fontSize: 10.5, color: "#E5B84B", letterSpacing: "0.08em" }}>
              {meta ? `${meta.version}・施行日 ${meta.effectiveDate}` : "TEAM RULES"}
            </div>
          </div>
          <button onClick={onClose} style={{
            marginLeft: "auto", flexShrink: 0, cursor: "pointer",
            background: "#E5B84B", border: "none", borderRadius: 8,
            padding: "9px 16px", fontSize: 13, fontWeight: 800, color: "#0b1e3f",
          }}>
            閉じる
          </button>
        </div>
      </div>

      {/* 本文（白い紙） */}
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "14px 10px 40px" }}>
        {err ? (
          <p style={{ color: "#fff", textAlign: "center", padding: 40, fontSize: 14 }}>{err}</p>
        ) : !md ? (
          <p style={{ color: "rgba(255,255,255,0.6)", textAlign: "center", padding: 40, fontSize: 14 }}>読み込み中…</p>
        ) : (
          <>
            <article style={{
              background: "#fff", color: "#1b1f26", borderRadius: 10,
              padding: "22px 18px", maxWidth: 760, margin: "0 auto",
            }}>
              <h1 style={{
                fontFamily: "var(--font-zen),sans-serif", fontWeight: 900, fontSize: 20,
                color: "#0b1e3f", margin: "0 0 4px",
              }}>
                博多SKルーキーズ チーム規約
              </h1>
              <div style={{ height: 3, background: "#d10024", width: 54, marginBottom: 16 }} />
              {renderMarkdown(md)}
            </article>
            {meta && (
              <div style={{ maxWidth: 760, margin: "14px auto 0", textAlign: "center" }}>
                <a href={meta.pdf} download={meta.pdfName} target="_blank" rel="noopener noreferrer"
                  style={{
                    display: "inline-block", padding: "11px 20px", borderRadius: 9,
                    border: "1px solid rgba(255,255,255,0.3)", color: "#fff",
                    textDecoration: "none", fontSize: 13, fontWeight: 700,
                  }}>
                  印刷用のPDFをダウンロード →
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
