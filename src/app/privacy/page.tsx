import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import PageHero from "@/components/PageHero";

const TEAM_NAME_JP = "博多SKルーキーズ";
const TEAM_NAME_EN = "HAKATA SK ROOKIES";

export const metadata: Metadata = {
  title: "プライバシーポリシー | 博多SKルーキーズ",
  description:
    "博多SKルーキーズ（HAKATA SK ROOKIES）における個人情報の取り扱い方針について。",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

const sections: { h: string; body: React.ReactNode }[] = [
  {
    h: "1. 個人情報の取得",
    body: (
      <>
        当チーム（博多SKルーキーズ）は、メンバー応募・お問い合わせ・スポンサーご相談等にあたり、必要な範囲で次の個人情報を取得します。
        <ul>
          <li>お名前 / ニックネーム</li>
          <li>メールアドレス</li>
          <li>年齢・性別（任意）</li>
          <li>電話番号（メンバー加入時のみ）</li>
          <li>緊急連絡先（メンバー加入時のみ）</li>
          <li>居住地（都道府県・市区町村レベル）</li>
        </ul>
      </>
    ),
  },
  {
    h: "2. 利用目的",
    body: (
      <ul>
        <li>メンバー募集・運営に関するご案内</li>
        <li>練習・試合スケジュールおよびチーム連絡網の運用</li>
        <li>福岡市の公共スポーツ施設（野球場等）の利用申請時の名簿登録</li>
        <li>緊急時の連絡、保険手続き等の対応</li>
        <li>お問い合わせへの返信</li>
      </ul>
    ),
  },
  {
    h: "3. 第三者への提供",
    body: (
      <>
        取得した個人情報は、ご本人の同意なく第三者に提供しません。ただし、以下の場合を除きます。
        <ul>
          <li>法令に基づき開示が求められる場合</li>
          <li>福岡市の公共施設（野球場）の予約・利用申請にあたり氏名の登録が必須となる場合（行政機関への適切な提供）</li>
          <li>事前にご本人の同意を得て、スポンサー協力や合同イベント運営等の目的で提供する場合</li>
        </ul>
      </>
    ),
  },
  {
    h: "4. 開示・訂正・利用停止のご請求",
    body: (
      <>
        ご本人またはその代理人からご請求があった場合は、合理的な期間内に対応いたします。
        本ページ末尾の連絡先までご連絡ください。本人確認のうえ、対応します。
      </>
    ),
  },
  {
    h: "5. 個人情報の管理",
    body: (
      <>
        取得した個人情報は、漏洩・滅失・改ざんを防止するため適切に管理します。
        紙媒体（応募票・契約書類等）は施錠管理、電子データは代表者および運営担当者のみがアクセスできる形で管理しています。
        退団届の提出または利用目的が達成された個人情報は、合理的な期間内に廃棄します。
      </>
    ),
  },
  {
    h: "6. クッキー・アクセス解析について",
    body: (
      <>
        本サイト（hakata-sk-rookies）では、サイト改善のため Vercel が提供する匿名のアクセス解析を利用しています。
        この解析は <strong>クッキーを使用せず</strong>、訪問者個人を識別する情報は取得しません。
        ページごとの訪問数・参照元・国・デバイス種別といった統計のみを取得しています。
      </>
    ),
  },
  {
    h: "7. 本ポリシーの改定",
    body: (
      <>
        法令の改正やチーム運営の変更に応じて、本ポリシーを改定することがあります。
        重要な改定の場合は本サイトの「お知らせ」にて告知します。
      </>
    ),
  },
  {
    h: "8. 連絡先",
    body: (
      <>
        本ポリシーに関するお問い合わせ、開示等のご請求は下記までお願いします。
        <ul>
          <li><strong>団体名</strong>：博多SKルーキーズ（HAKATA SK ROOKIES）</li>
          <li><strong>個人情報保護管理者</strong>：代表 柏木 海斗</li>
          <li><strong>所在地</strong>：〒812-0011 福岡県福岡市博多区博多駅前1丁目23番2号 ParkFront博多駅前1丁目 5F-B</li>
          <li><strong>連絡方法</strong>：<Link href="/#contact" style={{ color: "#d10024", fontWeight: 700 }}>お問い合わせフォーム</Link>または各SNSのDMよりご連絡ください</li>
        </ul>
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />

      <main className="bg-white">
        <PageHero
          title="プライバシーポリシー"
          sub="博多SKルーキーズにおける個人情報の取り扱い方針です。最終更新日：2026年5月18日"
        />

        <article className="max-w-[820px] mx-auto px-5 md:px-8 py-12 md:py-16">
          {sections.map((s, i) => (
            <section key={i} style={{ marginBottom: 32 }}>
              <h2 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: 18, fontWeight: 900, color: "#0b1e3f", marginBottom: 12, borderLeft: "4px solid #d10024", paddingLeft: 12 }}>
                {s.h}
              </h2>
              <div className="legal-body" style={{ fontSize: 14.5, lineHeight: 1.95, color: "#1f2734" }}>
                {s.body}
              </div>
            </section>
          ))}
        </article>
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
