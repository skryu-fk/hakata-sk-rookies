import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { blogPosts } from "@/data/blog";

const TEAM_NAME_JP = "博多SKルーキーズ";
const TEAM_NAME_EN = "HAKATA SK ROOKIES";

export const metadata: Metadata = {
  title: "ブログ・コラム | 博多SKルーキーズ（福岡市の草野球チーム）",
  description:
    "福岡市の草野球チーム『博多SKルーキーズ』のブログ。チームの活動報告、草野球を始めたい初心者向けのお役立ち情報、代表コラムなどを発信中。",
  alternates: { canonical: "/blog" },
};

export default function BlogIndex() {
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
          <Link href="/" className="ml-auto flex items-center font-bold text-[13px] text-navy hover:text-red transition-colors" style={{ textDecoration: "none" }}>
            ← トップへ戻る
          </Link>
        </div>
      </header>

      <main className="bg-base">
        <section className="bg-navy text-white relative overflow-hidden" style={{ borderBottom: "4px solid #d10024" }}>
          <div className="field-grid absolute inset-0" />
          <div className="max-w-[1280px] mx-auto px-5 md:px-8 py-16 md:py-24 relative">
            <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d10024", letterSpacing: "0.45em", marginBottom: 10 }}>BLOG</p>
            <h1 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: "clamp(28px,4vw,48px)", fontWeight: 900, lineHeight: 1.2 }}>
              ブログ・コラム
            </h1>
            <p className="mt-5 text-white/60 text-[15px] leading-[1.9] max-w-2xl">
              福岡市で草野球を始めたい方に向けたお役立ち情報、活動報告、代表のコラムなど。野球・チームづくりに関する記事をゆるく投稿していきます。
            </p>
          </div>
        </section>

        <section className="max-w-[1280px] mx-auto px-5 md:px-8 py-14 md:py-20">
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {blogPosts.map((p) => (
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
