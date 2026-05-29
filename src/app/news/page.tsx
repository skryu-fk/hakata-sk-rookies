import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getNews, CATEGORY_STYLES } from "@/data/news";

const TEAM_NAME_JP = "博多SKルーキーズ";
const TEAM_NAME_EN = "HAKATA SK ROOKIES";

// シート由来データなので 5 分の ISR で再検証
export const revalidate = 300;

export const metadata: Metadata = {
  title: "お知らせ一覧 | 博多SKルーキーズ",
  description:
    "博多SKルーキーズの過去のお知らせ一覧。チーム運営の重要なご案内・募集情報・活動報告などをまとめて確認できます。",
  alternates: { canonical: "/news" },
};

export default async function NewsIndexPage() {
  const news = await getNews();

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white" style={{ borderBottom: "3px solid #d10024", boxShadow: "0 1px 0 #e0dcd4" }}>
        <div className="max-w-[1280px] mx-auto px-5 md:px-8 flex items-stretch" style={{ height: 68 }}>
          <Link href="/" className="flex items-center gap-3 flex-shrink-0 pr-4 md:pr-6" style={{ textDecoration: "none", borderRight: "1px solid #f0ece6" }}>
            <Image src="/logo.png" alt={TEAM_NAME_JP} width={48} height={48} className="object-contain" priority />
            <div style={{ lineHeight: 1 }}>
              <div style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 900, fontSize: 16, color: "#0b1e3f", letterSpacing: "0.04em" }}>{TEAM_NAME_JP}</div>
              <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 10, color: "#aaa", letterSpacing: "0.3em", marginTop: 3 }}>{TEAM_NAME_EN}</div>
            </div>
          </Link>
          <Link href="/" className="ml-auto flex items-center font-bold text-[13px] text-navy hover:text-red transition-colors" style={{ textDecoration: "none" }}>
            ← トップへ戻る
          </Link>
        </div>
      </header>

      <main className="bg-white">
        {/* Hero */}
        <section className="bg-navy text-white relative overflow-hidden" style={{ borderBottom: "4px solid #d10024" }}>
          <div className="field-grid absolute inset-0" />
          <div className="max-w-[1080px] mx-auto px-5 md:px-8 py-12 md:py-16 relative">
            <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d10024", letterSpacing: "0.45em", marginBottom: 10 }}>NEWS</p>
            <h1 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: "clamp(28px,4vw,42px)", fontWeight: 900, lineHeight: 1.2 }}>
              お知らせ一覧
            </h1>
            <p className="mt-5 text-white/65 text-[14px] leading-[1.9] max-w-2xl">
              重要なご連絡・募集・活動報告など、これまで掲載したお知らせを新しい順にまとめています。
              全 <span style={{ fontFamily: "var(--font-oswald),sans-serif", color: "#d4a82a", fontWeight: 700, fontSize: 16 }}>{news.length}</span> 件。
            </p>
          </div>
        </section>

        {/* List */}
        <section className="max-w-[1080px] mx-auto px-5 md:px-8 py-12 md:py-16">
          {news.length === 0 ? (
            <p style={{ padding: "32px 0", textAlign: "center", color: "#5b6373", fontSize: 14 }}>
              まだお知らせがありません。
            </p>
          ) : (
            <div>
              {news.map((n, i) => {
                const cs = CATEGORY_STYLES[n.category] as string;
                const hasBody = !!n.body;
                const isImportant = n.category === "重要";
                const inner = (
                  <>
                    <span className="order-1" style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 15, color: isImportant ? "#d10024" : "#0b1e3f", letterSpacing: "0.06em", fontWeight: isImportant ? 700 : 400 }}>{n.date}</span>
                    <span className={`order-2 inline-flex items-center gap-1 text-xs font-bold tracking-wider px-2.5 py-1 ${cs}`}>
                      {isImportant && <span aria-hidden style={{ fontSize: 12, lineHeight: 1 }}>⚠</span>}
                      {n.category}
                    </span>
                    <span className="order-3 basis-full md:basis-auto font-bold text-ink text-[15px] leading-snug" style={{ color: isImportant ? "#0b1e3f" : undefined }}>
                      {n.title}
                      {hasBody && <span className="ml-2 text-red text-xs font-bold tracking-wider">詳しく →</span>}
                    </span>
                  </>
                );
                const cls = `news-row flex flex-wrap md:grid md:items-center gap-x-6 gap-y-2 px-2 md:px-4 py-4 md:py-5 border-t border-line-2 md:[grid-template-columns:160px_88px_1fr] ${isImportant ? "news-row-important" : ""}`;
                return hasBody ? (
                  <Link key={n.slug} href={`/news/${n.slug}`} className={cls} style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}>
                    {inner}
                  </Link>
                ) : (
                  <div key={n.slug || i} className={cls}>
                    {inner}
                  </div>
                );
              })}
              <div className="border-t border-line-2" />
            </div>
          )}

          <div className="mt-10 text-center">
            <Link href="/" style={{ display: "inline-flex", alignItems: "center", padding: "12px 28px", border: "1px solid #d8d4cb", color: "#0b1e3f", textDecoration: "none", fontFamily: "var(--font-zen),sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: "0.1em" }}>
              ← トップへ戻る
            </Link>
          </div>
        </section>
      </main>

      <footer style={{ background: "#060f20", color: "#fff" }}>
        <div style={{ height: 4, background: "linear-gradient(90deg,#d10024,#a80019 50%,#d10024)" }} />
        <div className="max-w-[1280px] mx-auto px-5 md:px-8 py-8 text-center text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>
          © {new Date().getFullYear()} {TEAM_NAME_JP} / {TEAM_NAME_EN}
        </div>
      </footer>
    </>
  );
}
