import type { Metadata } from "next";
import Image from "next/image";
import { SPONSORS } from "@/data/sponsors";
import SiteHeader from "@/components/SiteHeader";

// お問い合わせフォームで「スポンサーの相談」を最初から選択した状態で開く
const CONTACT_HREF = "/?inquiry=sponsor#contact";

export const metadata: Metadata = {
  title: "スポンサー募集 | 博多SKルーキーズ",
  description:
    "福岡市の草野球チーム「博多SKルーキーズ」のスポンサー募集ページ。個人応援 一口1,000円〜、店舗・企業様向けプランは年1万円から。サイト・SNSでのご紹介、ユニフォームへのロゴ掲出など。",
  alternates: { canonical: "/sponsor" },
  openGraph: {
    title: "スポンサー募集 | 博多SKルーキーズ",
    description: "福岡で活動する草野球チームを一緒に盛り上げてくださるスポンサー様を募集しています。",
    images: ["/uniform/poster.png"],
  },
};

type Plan = {
  key: string;
  name: string;
  en: string;
  price: string;
  unit: string;
  note: string;
  forWho: string;
  perks: string[];
  featured?: boolean;
};

const PLANS: Plan[] = [
  {
    key: "individual",
    name: "個人応援",
    en: "SUPPORTER",
    price: "1,000",
    unit: "円〜 / 一口",
    note: "何口でも・一度きりでもOK",
    forWho: "個人でチームを応援したい方",
    perks: [
      "活動報告でお名前を掲載（ご希望の方のみ）",
      "チームからのお礼メッセージ",
    ],
  },
  {
    key: "supporter",
    name: "サポーター",
    en: "BRONZE",
    price: "10,000",
    unit: "円 / 年",
    note: "月あたり 約830円",
    forWho: "まずは気軽に応援したい店舗様",
    perks: [
      "公式サイトのスポンサー欄にロゴ＆リンク掲載",
      "公式X（@SK_rookies_FK）でご紹介",
      "活動報告での感謝紹介",
    ],
  },
  {
    key: "partner",
    name: "パートナー",
    en: "SILVER",
    price: "30,000",
    unit: "円 / 年",
    note: "月あたり 2,500円",
    forWho: "地域の方にしっかりPRしたい店舗・企業様",
    perks: [
      "サポーターの内容すべて",
      "公式Instagram（@hakata_sk_rookies）でもご紹介",
      "試合告知・試合当日のPR",
    ],
  },
  {
    key: "official",
    name: "公式パートナー",
    en: "GOLD",
    price: "50,000",
    unit: "円〜 / 年",
    note: "月あたり 約4,170円〜",
    forWho: "チームと一緒に歩んでいただける企業様",
    perks: [
      "パートナーの内容すべて",
      "ユニフォーム・備品へのロゴ掲出（位置はご相談）",
      "公式サイトに専用の紹介枠を設置",
      "「公式パートナー」としてご紹介",
    ],
    featured: true,
  },
];

const REASONS: { title: string; body: string }[] = [
  {
    title: "福岡・博多の地元チーム",
    body: "福岡市内のグラウンドを拠点に活動しています。地域のお客様へ、身近なかたちで貴店・貴社をご紹介できます。",
  },
  {
    title: "10代〜40代の幅広い世代",
    body: "初心者から経験者まで、幅広い年代のメンバーが在籍。SNS世代を中心に、口コミでの広がりも期待できます。",
  },
  {
    title: "大きな目標に向かって成長中",
    body: "「みずほPayPayドーム福岡での試合」を目標に掲げ、新リーグの立ち上げにも取り組んでいます。成長していくチームを一緒に応援していただけます。",
  },
];

const STEPS: { title: string; body: string }[] = [
  { title: "フォームからご相談", body: "お問い合わせフォームで「スポンサーの相談をしたい」を選んで送信してください。" },
  { title: "内容のすり合わせ", body: "ご希望のプランや掲載内容、金額について、チーム担当者からご連絡します。" },
  { title: "ロゴ・情報のご提供", body: "掲載用のロゴデータや紹介文、リンク先などをご共有いただきます。" },
  { title: "掲載スタート", body: "サイト・SNSでのご紹介を開始します。掲載後は活動報告でもお知らせします。" },
];

const FAQS: { q: string; a: string }[] = [
  { q: "個人でも応援できますか？", a: "はい。「個人応援」として一口1,000円から受け付けています。一度きりのご支援でも大歓迎です。" },
  { q: "掲載期間はどのくらいですか？", a: "店舗・企業様向けプランは1年単位が基本です。期間や開始時期はご相談に応じます。" },
  { q: "お金ではなく、物品やサービスでの協賛はできますか？", a: "もちろん可能です。ボールやバットなどの道具、飲食・施設のご提供なども大変ありがたいです。内容に応じてご紹介方法をご相談させてください。" },
  { q: "記載以外の内容でも相談できますか？", a: "はい。ご予算やご希望に合わせて柔軟に対応します。まずはお気軽にご相談ください。" },
];

export default function SponsorPage() {
  return (
    <>
      <SiteHeader />

      <main style={{ background: "#f5f2ec" }}>
        {/* Hero */}
        <section style={{ background: "#fff", paddingTop: "clamp(46px, 7vw, 84px)", paddingBottom: "clamp(30px, 4.5vw, 52px)" }}>
          <div className="sec-in center">
            <h1 className="t-head">博多から、一緒に<br />大きな舞台へ。</h1>
            <p className="t-sub" style={{ marginTop: 18, maxWidth: 640, marginLeft: "auto", marginRight: "auto" }}>
              福岡市で活動する草野球チームです。活動を一緒に支えてくださるスポンサー様を募集しています。
              個人の方は一口1,000円から、店舗・企業様は年1万円からご参加いただけます。
            </p>
            <div className="cta-row center" style={{ marginTop: 30, justifyContent: "center" }}>
              <a href={CONTACT_HREF} className="cta">スポンサーの相談をする</a>
              <a href="#plans" className="link-more">プランを見る</a>
            </div>
          </div>
        </section>

        {/* 応援していただく理由 */}
        <section className="max-w-[1080px] mx-auto px-5 md:px-8 py-14 md:py-20">
          <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d10024", letterSpacing: "0.4em", marginBottom: 8 }}>WHY US</p>
          <h2 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: "clamp(22px,3.2vw,32px)", fontWeight: 900, color: "#0b1e3f", marginBottom: 32 }}>
            博多SKルーキーズについて
          </h2>
          <div className="grid gap-5 grid-cols-1 md:grid-cols-3">
            {REASONS.map((r, i) => (
              <div key={r.title} style={{ background: "#fff", border: "1px solid #e6e1d8", padding: "28px 24px" }}>
                <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 32, fontWeight: 700, color: "#d4a82a", lineHeight: 1 }}>
                  0{i + 1}
                </div>
                <h3 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: 17, fontWeight: 900, color: "#0b1e3f", margin: "14px 0 10px" }}>{r.title}</h3>
                <p style={{ fontSize: 14, color: "#5b6373", lineHeight: 1.9 }}>{r.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* プラン */}
        <section id="plans" style={{ background: "#fff", borderTop: "1px solid #e6e1d8", borderBottom: "1px solid #e6e1d8" }}>
          <div className="max-w-[1180px] mx-auto px-5 md:px-8 py-14 md:py-20">
            <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d10024", letterSpacing: "0.4em", marginBottom: 8 }}>PLANS</p>
            <h2 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: "clamp(22px,3.2vw,32px)", fontWeight: 900, color: "#0b1e3f", marginBottom: 10 }}>
              スポンサープラン
            </h2>
            <p style={{ fontSize: 14, color: "#5b6373", lineHeight: 1.9, marginBottom: 34 }}>
              ご予算やご希望に合わせてお選びいただけます。記載以外の内容もお気軽にご相談ください。
            </p>

            <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {PLANS.map(p => (
                <div
                  key={p.key}
                  style={{
                    position: "relative",
                    background: p.featured ? "#0b1e3f" : "#faf9f7",
                    color: p.featured ? "#fff" : "#131922",
                    border: p.featured ? "2px solid #d4a82a" : "1px solid #e6e1d8",
                    padding: "30px 22px 26px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {p.featured && (
                    <span style={{
                      position: "absolute", top: -12, left: 22,
                      background: "#d4a82a", color: "#0b1e3f",
                      fontSize: 11, fontWeight: 900, letterSpacing: "0.1em", padding: "4px 10px",
                    }}>
                      おすすめ
                    </span>
                  )}
                  <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, letterSpacing: "0.3em", color: p.featured ? "#d4a82a" : "#d10024" }}>{p.en}</p>
                  <h3 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: 20, fontWeight: 900, margin: "6px 0 14px" }}>{p.name}</h3>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 34, fontWeight: 700, lineHeight: 1 }}>¥{p.price}</span>
                    <span style={{ fontSize: 12.5, opacity: 0.75 }}>{p.unit}</span>
                  </div>
                  <p style={{ fontSize: 12, opacity: 0.6, marginTop: 6 }}>{p.note}</p>
                  <p style={{
                    fontSize: 12.5, marginTop: 16, padding: "8px 10px",
                    background: p.featured ? "rgba(255,255,255,0.08)" : "#fff",
                    border: p.featured ? "none" : "1px solid #ece7de",
                    lineHeight: 1.6,
                  }}>
                    {p.forWho}
                  </p>
                  <ul style={{ listStyle: "none", padding: 0, margin: "18px 0 0", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                    {p.perks.map(perk => (
                      <li key={perk} style={{ display: "flex", gap: 9, fontSize: 13.5, lineHeight: 1.65 }}>
                        <span style={{ color: p.featured ? "#d4a82a" : "#d10024", flexShrink: 0, fontWeight: 900 }}>✓</span>
                        <span style={{ opacity: 0.92 }}>{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <p style={{ fontSize: 12.5, color: "#8a8f99", marginTop: 20, lineHeight: 1.8 }}>
              ※ 金額は目安です。掲載内容・期間・物品でのご協賛など、ご相談に応じて調整します。<br />
              ※ ユニフォームへのロゴ掲出は、制作のタイミングや掲出位置によって別途ご相談となる場合があります。
            </p>
          </div>
        </section>

        {/* 現在のパートナー */}
        {SPONSORS.length > 0 && (
          <section className="max-w-[1080px] mx-auto px-5 md:px-8 py-14 md:py-20">
            <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d10024", letterSpacing: "0.4em", marginBottom: 8 }}>PARTNERS</p>
            <h2 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: "clamp(22px,3.2vw,32px)", fontWeight: 900, color: "#0b1e3f", marginBottom: 10 }}>
              応援してくださっているパートナー様
            </h2>
            <p style={{ fontSize: 14, color: "#5b6373", lineHeight: 1.9, marginBottom: 28 }}>
              トップページのスポンサー欄では、このようにロゴと紹介文を掲載しています。
            </p>
            <div className="grid gap-5 grid-cols-1 md:grid-cols-2">
              {SPONSORS.map(s => (
                <a
                  key={s.key}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 18, background: "#fff", border: "1px solid #e6e1d8", padding: "20px 22px", textDecoration: "none", color: "#131922" }}
                >
                  <div style={{ width: 84, height: 84, flexShrink: 0, background: "#faf9f7", border: "1px solid #ece7de", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Image src={s.logo} alt={s.name} width={72} height={72} className="object-contain" />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    {s.badge && (
                      <span style={{ display: "inline-block", fontSize: 10.5, fontWeight: 900, color: "#0b1e3f", background: "#d4a82a", padding: "2px 8px", letterSpacing: "0.08em", marginBottom: 6 }}>
                        {s.badge}
                      </span>
                    )}
                    <div style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: 18, fontWeight: 900 }}>{s.name}</div>
                    <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#8a8f99", letterSpacing: "0.2em", marginTop: 2 }}>{s.tagline}</div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ご相談の流れ */}
        <section style={{ background: "#fff", borderTop: "1px solid #e6e1d8", borderBottom: "1px solid #e6e1d8" }}>
          <div className="max-w-[1080px] mx-auto px-5 md:px-8 py-14 md:py-20">
            <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d10024", letterSpacing: "0.4em", marginBottom: 8 }}>FLOW</p>
            <h2 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: "clamp(22px,3.2vw,32px)", fontWeight: 900, color: "#0b1e3f", marginBottom: 32 }}>
              掲載までの流れ
            </h2>
            <ol className="grid gap-5 grid-cols-1 md:grid-cols-4" style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {STEPS.map((st, i) => (
                <li key={st.title} style={{ borderTop: "3px solid #d10024", paddingTop: 16 }}>
                  <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 13, color: "#d10024", letterSpacing: "0.2em" }}>STEP {i + 1}</div>
                  <h3 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: 16, fontWeight: 900, color: "#0b1e3f", margin: "8px 0" }}>{st.title}</h3>
                  <p style={{ fontSize: 13.5, color: "#5b6373", lineHeight: 1.85 }}>{st.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* よくある質問 */}
        <section className="max-w-[860px] mx-auto px-5 md:px-8 py-14 md:py-20">
          <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d10024", letterSpacing: "0.4em", marginBottom: 8 }}>FAQ</p>
          <h2 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: "clamp(22px,3.2vw,32px)", fontWeight: 900, color: "#0b1e3f", marginBottom: 26 }}>
            よくあるご質問
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {FAQS.map(f => (
              <details key={f.q} style={{ background: "#fff", border: "1px solid #e6e1d8", padding: "18px 22px" }}>
                <summary style={{ cursor: "pointer", fontWeight: 700, color: "#0b1e3f", fontSize: 15 }}>
                  <span style={{ color: "#d10024", marginRight: 8 }}>Q.</span>{f.q}
                </summary>
                <p style={{ fontSize: 14, color: "#5b6373", lineHeight: 1.9, marginTop: 12 }}>
                  <span style={{ color: "#d4a82a", fontWeight: 700, marginRight: 8 }}>A.</span>{f.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-navy text-white" style={{ borderTop: "4px solid #d10024" }}>
          <div className="max-w-[860px] mx-auto px-5 md:px-8 py-14 md:py-20 text-center">
            <h2 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: "clamp(22px,3.4vw,34px)", fontWeight: 900, lineHeight: 1.4 }}>
              一緒にチームを<br className="md:hidden" />盛り上げてください。
            </h2>
            <p style={{ fontSize: 14.5, color: "rgba(255,255,255,0.75)", lineHeight: 2, margin: "16px auto 30px", maxWidth: 560 }}>
              まずはお気軽にご相談ください。<br />
              フォームから送信いただければ、3日以内にチーム担当者よりご連絡します。
            </p>
            <a href={CONTACT_HREF} className="bg-red hover:bg-red-2 transition-colors" style={{ display: "inline-flex", alignItems: "center", padding: "17px 36px", color: "#fff", textDecoration: "none", fontSize: 15, fontWeight: 700, letterSpacing: "0.1em" }}>
              スポンサーの相談をする →
            </a>
          </div>
        </section>
      </main>
    </>
  );
}
