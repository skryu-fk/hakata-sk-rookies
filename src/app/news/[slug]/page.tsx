import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getNews, getNewsBySlug, CATEGORY_STYLES } from "@/data/news";
import { renderMarkdown } from "@/lib/markdown";

const TEAM_NAME_JP = "博多SKルーキーズ";
const TEAM_NAME_EN = "HAKATA SK ROOKIES";

// シート由来データなので 5 分の ISR で再検証
export const revalidate = 300;

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const item = await getNewsBySlug(slug);
  if (!item) return { title: "お知らせが見つかりません | 博多SKルーキーズ" };
  const desc = (item.body ?? item.title).replace(/\s+/g, " ").slice(0, 120);
  return {
    title: `${item.title} | 博多SKルーキーズ`,
    description: desc,
    alternates: { canonical: `/news/${item.slug}` },
    openGraph: {
      title: item.title,
      description: desc,
      type: "article",
      publishedTime: item.date.replace(/\./g, "-"),
    },
  };
}

export default async function NewsDetailPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const [item, allNews] = await Promise.all([getNewsBySlug(slug), getNews()]);
  if (!item) notFound();

  const others = allNews.filter(n => n.slug !== slug).slice(0, 5);
  const cs = CATEGORY_STYLES[item.category];
  const bodyHtml = item.body ? renderMarkdown(item.body) : "";

  return (
    <>
      <header className="sticky top-0 z-50 bg-white" style={{ borderBottom: "3px solid #d10024", boxShadow: "0 1px 0 #e0dcd4" }}>
        <div className="max-w-[1280px] mx-auto px-5 md:px-8 flex items-stretch" style={{ height: 68 }}>
          <Link href="/" className="flex items-center gap-3 flex-shrink-0 pr-4 md:pr-6" style={{ textDecoration: "none", borderRight: "1px solid #f0ece6" }}>
            <Image src="/logo.png" alt={TEAM_NAME_JP} width={48} height={48} className="object-contain" priority />
            <div style={{ lineHeight: 1 }}>
              <div style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 900, fontSize: 16, color: "#0b1e3f", letterSpacing: "0.04em" }}>{TEAM_NAME_JP}</div>
              <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 10, color: "#aaa", letterSpacing: "0.3em", marginTop: 3 }}>{TEAM_NAME_EN}</div>
            </div>
          </Link>
          <Link href="/#news" className="ml-auto flex items-center font-bold text-[13px] text-navy hover:text-red transition-colors" style={{ textDecoration: "none" }}>
            ← お知らせ一覧
          </Link>
        </div>
      </header>

      <main className="bg-white">
        <article>
          <div className="bg-navy text-white relative overflow-hidden" style={{ borderBottom: "4px solid #d10024" }}>
            <div className="field-grid absolute inset-0" />
            <div className="max-w-[820px] mx-auto px-5 md:px-8 py-12 md:py-16 relative">
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 14, color: "#d4a82a", letterSpacing: "0.18em" }}>{item.date}</span>
                <span className={`text-xs font-bold tracking-wider px-3 py-1 ${cs}`}>{item.category}</span>
              </div>
              <h1 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: "clamp(22px,3.4vw,34px)", fontWeight: 900, lineHeight: 1.35, color: "#fff" }}>
                {item.title}
              </h1>
            </div>
          </div>

          <div className="max-w-[820px] mx-auto px-5 md:px-8 py-12 md:py-16">
            {bodyHtml ? (
              <div
                className="news-body"
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />
            ) : (
              <p style={{ fontSize: 15, color: "#5b6373", lineHeight: 1.9 }}>
                このお知らせには本文がまだありません。
              </p>
            )}
          </div>
        </article>

        {others.length > 0 && (
          <section className="bg-base border-t border-line">
            <div className="max-w-[820px] mx-auto px-5 md:px-8 py-12 md:py-16">
              <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d10024", letterSpacing: "0.4em", marginBottom: 14 }}>OTHER NEWS</p>
              <h2 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: 22, fontWeight: 900, color: "#0b1e3f", marginBottom: 18 }}>その他のお知らせ</h2>
              <div>
                {others.map(n => {
                  const ocs = CATEGORY_STYLES[n.category];
                  const inner = (
                    <>
                      <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 14, color: "#0b1e3f", letterSpacing: "0.06em" }}>{n.date}</span>
                      <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 ${ocs}`}>{n.category}</span>
                      <span className="font-bold text-ink text-[14px] leading-snug">{n.title}</span>
                    </>
                  );
                  const cls = "flex flex-wrap items-center gap-x-4 gap-y-1 px-2 py-3 border-t border-line-2";
                  return n.body ? (
                    <Link key={n.slug} href={`/news/${n.slug}`} className={cls + " hover:bg-white transition-colors"} style={{ textDecoration: "none", color: "inherit" }}>
                      {inner}
                    </Link>
                  ) : (
                    <div key={n.slug} className={cls}>{inner}</div>
                  );
                })}
                <div className="border-t border-line-2" />
              </div>
            </div>
          </section>
        )}
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
