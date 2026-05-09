import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getBlogs, getBlogBySlug, blogPosts } from "@/data/blog";

const TEAM_NAME_JP = "博多SKルーキーズ";
const TEAM_NAME_EN = "HAKATA SK ROOKIES";
const X_URL = "https://x.com/SK_rookies_FK";

// シート由来データなので 5 分の ISR で再検証
export const revalidate = 300;

export async function generateStaticParams() {
  // 静的フォールバック分だけビルド時に prerender。
  // シートで追加された slug は dynamicParams=true（既定）でオンデマンド生成される。
  return blogPosts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogBySlug(slug);
  if (!post) return { title: "記事が見つかりません | 博多SKルーキーズ" };
  return {
    title: `${post.title} | 博多SKルーキーズ`,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date.replace(/\./g, "-"),
    },
  };
}

/** 段落prefix（■・Q.A.【】――）を保持したままインライン markdown を許可する軽量レンダラ。 */
function renderInline(s: string): string {
  // & < > " ' をエスケープ
  let r = s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  // [text](url)
  r = r.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t: string, u: string) => {
    const safe = /^(https?:|mailto:)/i.test(u) || u.startsWith("/") || u.startsWith("#") ? u : "#";
    const ext = /^https?:/i.test(safe);
    return `<a href="${safe}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ""} class="md-link">${t}</a>`;
  });
  // **bold**
  r = r.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return r;
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post, all] = await Promise.all([getBlogBySlug(slug), getBlogs()]);
  if (!post) notFound();

  const others = all.filter((p) => p.slug !== slug).slice(0, 3);
  const blocks = post.content.split(/\r?\n/).filter(b => b.length > 0);

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
          <Link href="/blog" className="ml-auto flex items-center font-bold text-[13px] text-navy hover:text-red transition-colors" style={{ textDecoration: "none" }}>
            ← ブログ一覧
          </Link>
        </div>
      </header>

      <main className="bg-white">
        <article>
          <header className="bg-navy text-white relative overflow-hidden" style={{ borderBottom: "4px solid #d10024" }}>
            <div className="field-grid absolute inset-0" />
            <div className="max-w-[820px] mx-auto px-5 md:px-8 py-14 md:py-20 relative">
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 12, color: "rgba(255,255,255,0.55)", letterSpacing: "0.1em" }}>{post.date}</span>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", background: "#d10024", color: "#fff", padding: "3px 10px" }}>{post.category}</span>
              </div>
              <h1 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: "clamp(22px,3vw,36px)", fontWeight: 900, lineHeight: 1.35 }}>{post.title}</h1>
            </div>
          </header>

          <div className="max-w-[820px] mx-auto px-5 md:px-8 py-12 md:py-16">
            {blocks.map((block, i) => {
              if (block === "――") {
                return <hr key={i} style={{ border: "none", borderTop: "1px solid #e0dcd4", margin: "28px 0" }} />;
              }
              if (/^【.+】$/.test(block)) {
                return <h2 key={i} style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: 18, fontWeight: 900, color: "#0b1e3f", marginTop: 28, marginBottom: 12, borderLeft: "4px solid #d10024", paddingLeft: 12 }}>{block.replace(/^【|】$/g, "")}</h2>;
              }
              if (block.startsWith("■")) {
                return <h3 key={i} style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: 15, fontWeight: 900, color: "#0b1e3f", marginTop: 20, marginBottom: 8 }} dangerouslySetInnerHTML={{ __html: renderInline(block) }} />;
              }
              if (block.startsWith("・")) {
                return <p key={i} className="news-body" style={{ fontSize: 15, lineHeight: 2, color: "#3a3f4a", marginLeft: 14, marginBottom: 4 }} dangerouslySetInnerHTML={{ __html: renderInline(block) }} />;
              }
              if (/^Q\. /.test(block)) {
                return <p key={i} className="news-body" style={{ fontSize: 14, fontWeight: 700, color: "#0b1e3f", marginTop: 16, marginBottom: 4 }} dangerouslySetInnerHTML={{ __html: renderInline(block) }} />;
              }
              if (/^A\. /.test(block)) {
                return <p key={i} className="news-body" style={{ fontSize: 14, lineHeight: 1.95, color: "#3a3f4a", marginBottom: 12 }} dangerouslySetInnerHTML={{ __html: renderInline(block) }} />;
              }
              return <p key={i} className="news-body" style={{ fontSize: 15, lineHeight: 2, color: "#3a3f4a", marginBottom: 16 }} dangerouslySetInnerHTML={{ __html: renderInline(block) }} />;
            })}
          </div>

          {/* Recruit CTA */}
          <div className="bg-base border-t border-b border-line">
            <div className="max-w-[820px] mx-auto px-5 md:px-8 py-12 text-center">
              <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, letterSpacing: "0.4em", color: "#d10024", marginBottom: 10 }}>MEMBER WANTED</p>
              <p style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: "clamp(18px,2.2vw,24px)", fontWeight: 900, color: "#0b1e3f", marginBottom: 16, lineHeight: 1.5 }}>
                一緒に野球を楽しむ仲間を<br className="md:hidden" />募集しています。
              </p>
              <p style={{ fontSize: 14, color: "#5b6373", lineHeight: 1.9, marginBottom: 22 }}>福岡市で草野球を始めたい方、ぜひお気軽にご応募ください。</p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                <Link href="/#recruit" className="bg-red hover:bg-red-2 transition-colors" style={{ display: "inline-flex", alignItems: "center", padding: "12px 24px", color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 700, letterSpacing: "0.1em" }}>
                  メンバー募集を見る →
                </Link>
                <a href={X_URL} target="_blank" rel="noopener noreferrer" className="hover:border-navy transition-colors" style={{ display: "inline-flex", alignItems: "center", padding: "12px 24px", border: "1px solid #d8d4cb", color: "#0b1e3f", textDecoration: "none", fontSize: 13, fontWeight: 700, letterSpacing: "0.1em" }}>
                  公式Xをフォロー →
                </a>
              </div>
            </div>
          </div>

          {/* Other posts */}
          {others.length > 0 && (
            <section className="max-w-[1280px] mx-auto px-5 md:px-8 py-14 md:py-20">
              <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, letterSpacing: "0.45em", color: "#d10024", marginBottom: 10 }}>RELATED</p>
              <h2 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: "clamp(20px,2.5vw,28px)", fontWeight: 900, color: "#0b1e3f", marginBottom: 24 }}>他の記事</h2>
              <div className="grid gap-5 grid-cols-1 md:grid-cols-3">
                {others.map((p) => (
                  <Link key={p.slug} href={`/blog/${p.slug}`}
                    className="block bg-white border border-line-2 hover:border-red transition-all hover:-translate-y-1 hover:shadow-lg"
                    style={{ textDecoration: "none", padding: "22px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#0b1e3f", letterSpacing: "0.08em" }}>{p.date}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", background: "#0b1e3f", color: "#fff", padding: "2px 8px" }}>{p.category}</span>
                    </div>
                    <h3 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: 15, fontWeight: 900, color: "#0b1e3f", lineHeight: 1.45 }}>{p.title}</h3>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </article>
      </main>
    </>
  );
}
