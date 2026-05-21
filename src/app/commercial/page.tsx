import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

const TEAM_NAME_JP = "博多SKルーキーズ";
const TEAM_NAME_EN = "HAKATA SK ROOKIES";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記 | 博多SKルーキーズ",
  description:
    "博多SKルーキーズの特定商取引法に基づく表記。運営者・所在地・連絡先・販売価格・支払い方法等の表示。",
  alternates: { canonical: "/commercial" },
  robots: { index: true, follow: true },
};

const rows: { label: string; value: React.ReactNode }[] = [
  { label: "団体名 / 運営者", value: "博多SKルーキーズ（HAKATA SK ROOKIES）" },
  { label: "運営責任者", value: "柏木 海斗（代表）" },
  {
    label: "所在地",
    value: (
      <>
        〒812-0011<br />
        福岡県福岡市博多区博多駅前1丁目23番2号<br />
        ParkFront博多駅前1丁目 5F-B
      </>
    ),
  },
  {
    label: "電話番号",
    value: (
      <>
        本サイト上での電話番号の公開はしておりません。<br />
        必要な場合は、本ページ末尾のお問い合わせ先よりご請求いただければ、合理的な期間内に開示いたします。
      </>
    ),
  },
  {
    label: "お問い合わせ",
    value: (
      <>
        本サイトの<Link href="/#contact" style={{ color: "#d10024", fontWeight: 700 }}>お問い合わせフォーム</Link>または、
        公式X（<a href="https://x.com/SK_rookies_FK" target="_blank" rel="noopener noreferrer" style={{ color: "#d10024", fontWeight: 700 }}>@SK_rookies_FK</a>）／
        公式Instagram（<a href="https://www.instagram.com/hakata_sk_rookies/" target="_blank" rel="noopener noreferrer" style={{ color: "#d10024", fontWeight: 700 }}>@hakata_sk_rookies</a>）のDMよりお願いします。原則3日以内に返信いたします。
      </>
    ),
  },
  {
    label: "販売価格 / 会費",
    value: (
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        <li><strong>入会費</strong>：2,000円（2026年5月15日以降に新規入団される方のみ／既存メンバーは対象外）</li>
        <li><strong>月会費</strong>：500円／月</li>
        <li><strong>練習参加費</strong>：1人400円／回（参加人数に関わらず一律）</li>
        <li><strong>既存メンバー向け選択プラン</strong>：月額500円のほか、運営協力として半年一括3,000円プランを選択可能</li>
      </ul>
    ),
  },
  {
    label: "支払い方法",
    value: (
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        <li>PayPay 送金</li>
        <li>現金（手渡し）</li>
        <li>銀行口座への振込（口座情報は加入時に個別にご案内）</li>
      </ul>
    ),
  },
  {
    label: "支払い時期",
    value: (
      <>
        入会費：入団時に一括お支払いいただきます。<br />
        月会費：当月末日までにお支払いください。<br />
        練習参加費：活動当日にお支払いいただきます。
      </>
    ),
  },
  {
    label: "サービスの提供時期",
    value: "入会手続き完了後、直近の練習日からご参加いただけます。",
  },
  {
    label: "返金・キャンセル",
    value: (
      <>
        既にお支払いいただいた入会費・月会費・練習参加費は、原則として返金いたしません。
        ただし、重複入金・チーム側の都合による中止等の場合はこの限りではありません。退団は当チームの「メンバー加入契約書」第9条に基づきお手続きください。
      </>
    ),
  },
  {
    label: "その他",
    value: (
      <>
        本表記は、特定商取引法第11条に基づく表示を任意で行うものです。
        当チームは営利を目的とする事業者ではありませんが、会費等の金銭授受がある運営の透明性を確保するため掲載しています。
      </>
    ),
  },
];

export default function CommercialPage() {
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

      <main className="bg-white">
        <div className="bg-navy text-white relative overflow-hidden" style={{ borderBottom: "4px solid #d10024" }}>
          <div className="field-grid absolute inset-0" />
          <div className="max-w-[820px] mx-auto px-5 md:px-8 py-12 md:py-16 relative">
            <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d4a82a", letterSpacing: "0.4em", marginBottom: 10 }}>LEGAL — COMMERCIAL TRANSACTIONS</p>
            <h1 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: "clamp(22px,3.2vw,32px)", fontWeight: 900, lineHeight: 1.35 }}>
              特定商取引法に基づく表記
            </h1>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 14 }}>
              最終更新日：2026年5月18日
            </p>
          </div>
        </div>

        <article className="max-w-[820px] mx-auto px-5 md:px-8 py-12 md:py-16">
          <div style={{ border: "1px solid #e0dcd4" }}>
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-1 md:[grid-template-columns:200px_1fr]" style={{ borderBottom: i < rows.length - 1 ? "1px solid #e0dcd4" : "none" }}>
                <div style={{ background: "#0b1e3f", color: "#fff", padding: "16px 20px", fontFamily: "var(--font-zen),sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "0.04em", borderLeft: "4px solid #d10024" }}>
                  {r.label}
                </div>
                <div style={{ background: "#fefcfa", padding: "18px 24px", fontSize: 14, lineHeight: 1.95, color: "#1f2734" }}>
                  {r.value}
                </div>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 24, fontSize: 12, color: "#5b6373", lineHeight: 1.85 }}>
            本表記の内容に変更があった場合は、本サイトの「お知らせ」にて告知いたします。
          </p>
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
