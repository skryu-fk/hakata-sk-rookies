import type { Metadata } from "next";
import Link from "next/link";
import { getNews } from "@/data/news";
import SiteHeader from "@/components/SiteHeader";
import PageHero from "@/components/PageHero";

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
      <SiteHeader />

      <main className="bg-white">
        <PageHero title="お知らせ一覧" sub={<>重要なご連絡・募集・活動報告など、これまでのお知らせを新しい順にまとめています。全 {news.length} 件。</>} />

        {/* 一覧 */}
        <section className="sec-tight" style={{ background: "#fff" }}>
          <div className="sec-in">
            {news.length === 0 ? (
              <p className="t-body center" style={{ padding: "32px 0" }}>まだお知らせがありません。</p>
            ) : (
              <div className="rows">
                {news.map((n, i) => {
                  const isImportant = n.category === "重要";
                  const inner = (
                    <>
                      <div className="t-caption" style={{ fontFamily: "var(--font-oswald),sans-serif", paddingTop: 3 }}>
                        {n.date}
                        <span style={{ fontFamily: "var(--font-zen),sans-serif", marginLeft: 10, color: isImportant ? "var(--accent)" : "var(--ink-3)" }}>
                          {n.category}
                        </span>
                      </div>
                      <div style={{ fontSize: 16, color: "var(--ink)", lineHeight: 1.6 }}>{n.title}</div>
                    </>
                  );
                  return n.body ? (
                    <Link key={n.slug} href={`/news/${n.slug}`} className="row-item" style={{ textDecoration: "none" }}>
                      {inner}
                    </Link>
                  ) : (
                    <div key={n.slug || i} className="row-item">{inner}</div>
                  );
                })}
              </div>
            )}

            <div className="center" style={{ marginTop: 34 }}>
              <Link href="/" className="link-more">トップへ戻る</Link>
            </div>
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
