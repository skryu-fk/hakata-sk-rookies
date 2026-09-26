import type { Metadata } from "next";
import Link from "next/link";
import { getBlogs } from "@/data/blog";
import SiteHeader from "@/components/SiteHeader";
import PageHero from "@/components/PageHero";


// シート由来データなので 5 分の ISR で再検証
export const revalidate = 300;

export const metadata: Metadata = {
  title: "ブログ・コラム | 博多SKルーキーズ（福岡市の草野球チーム）",
  description:
    "福岡市の草野球チーム『博多SKルーキーズ』のブログ。チームの活動報告、草野球を始めたい初心者向けのお役立ち情報、代表コラムなどを発信中。",
  alternates: { canonical: "/blog" },
};

export default async function BlogIndex() {
  const posts = await getBlogs();
  return (
    <>
      <SiteHeader />

      <main className="bg-base">
        <PageHero title="ブログ・コラム" sub="チームの活動や、野球を始める人に向けた記事をまとめています。" />

        <section className="max-w-[1280px] mx-auto px-5 md:px-8 py-14 md:py-20">
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`}
                className="block bg-white border border-line-2 hover:border-red transition-all hover:-translate-y-1 hover:shadow-lg"
                style={{ textDecoration: "none", padding: "28px 26px", display: "flex", flexDirection: "column", gap: 12, minHeight: 240 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 12, color: "#0b1e3f", letterSpacing: "0.08em" }}>{p.date}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", background: "#d10024", color: "#fff", padding: "3px 10px" }}>{p.category}</span>
                </div>
                <h2 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: 17, fontWeight: 900, color: "#0b1e3f", lineHeight: 1.45, marginTop: 4 }}>{p.title}</h2>
                <p style={{ fontSize: 13, color: "#5b6373", lineHeight: 1.85, flex: 1 }}>{p.excerpt}</p>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#d10024", letterSpacing: "0.08em", marginTop: 4 }}>続きを読む →</span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
