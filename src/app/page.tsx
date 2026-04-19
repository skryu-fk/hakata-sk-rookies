import Link from "next/link";
import RecruitForm from "@/components/RecruitForm";

const TEAM_NAME_JP = "博多SKルーキーズ";
const TEAM_NAME_EN = "HAKATA SK ROOKIES";
const X_URL = "https://x.com/"; // TODO: 公式X作成後に差し替え

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <About />
        <Activity />
        <Recruit />
        <FormSection />
      </main>
      <Footer />
    </>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur bg-navy/85 text-cream border-b border-white/10">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link href="#top" className="flex items-center gap-3">
          <span className="ball w-8 h-8 inline-block" />
          <span className="font-display tracking-widest text-xl">
            {TEAM_NAME_EN}
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm">
          <a href="#about" className="hover:text-gold transition">ABOUT</a>
          <a href="#activity" className="hover:text-gold transition">ACTIVITY</a>
          <a href="#recruit" className="hover:text-gold transition">RECRUIT</a>
          <a href="#form" className="hover:text-gold transition">CONTACT</a>
        </nav>
        <a
          href="#form"
          className="hidden md:inline-flex items-center gap-2 bg-red hover:bg-red-2 transition px-4 py-2 text-sm font-bold tracking-wide"
        >
          応募する →
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden bg-navy text-cream"
    >
      <div className="absolute inset-0 field-grid opacity-60" />
      <div
        className="absolute -top-32 -right-32 w-[520px] h-[520px] rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #c1121f 0%, transparent 60%)" }}
      />
      <div
        className="absolute -bottom-40 -left-32 w-[520px] h-[520px] rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #d4a017 0%, transparent 60%)" }}
      />

      <div className="relative max-w-6xl mx-auto px-5 pt-20 pb-28 md:pt-28 md:pb-40">
        <div className="grid md:grid-cols-[1.4fr_1fr] gap-12 items-center">
          <div className="reveal">
            <p className="font-display tracking-[0.4em] text-gold text-sm md:text-base mb-4">
              FUKUOKA · SANDLOT BASEBALL CLUB
            </p>
            <h1 className="font-display text-6xl md:text-8xl leading-[0.9] tracking-wide">
              {TEAM_NAME_EN}
            </h1>
            <p className="mt-3 text-2xl md:text-3xl font-bold tracking-wider">
              {TEAM_NAME_JP}
            </p>
            <div className="stitch my-8 max-w-md" />
            <p className="text-lg md:text-xl leading-relaxed text-cream/90 max-w-xl">
              野球、はじめよう。<br />
              福岡市を拠点に、初心者中心で「全力で楽しむ」草野球チーム。
              バットを握ったことがなくても大歓迎。
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href="#form"
                className="bg-red hover:bg-red-2 transition px-7 py-4 font-bold tracking-wider shadow-lg shadow-red/30"
              >
                ▶ メンバーに応募する
              </a>
              <a
                href="#about"
                className="border-2 border-cream/40 hover:border-cream px-7 py-4 font-bold tracking-wider transition"
              >
                チームを知る
              </a>
            </div>

            <div className="mt-10 flex flex-wrap gap-6 text-sm text-cream/70">
              <Stat label="拠点" value="福岡市" />
              <Stat label="対象年齢" value="10代〜40代" />
              <Stat label="経験" value="初心者歓迎" />
            </div>
          </div>

          <div className="hidden md:flex justify-center reveal" style={{ animationDelay: "0.2s" }}>
            <div className="relative">
              <div className="ball w-72 h-72" />
              <div
                className="absolute -bottom-6 -right-6 w-28 h-28 diamond bg-red/90 grid place-items-center"
              >
                <span
                  className="font-display text-cream text-3xl"
                  style={{ transform: "rotate(-45deg)" }}
                >
                  PLAY
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="stitch" />
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs uppercase tracking-widest text-cream/50">{label}</span>
      <span className="text-cream font-bold text-lg">{value}</span>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  light = false,
}: {
  eyebrow: string;
  title: string;
  light?: boolean;
}) {
  return (
    <div className="mb-12">
      <p
        className={`font-display tracking-[0.4em] text-sm mb-3 ${
          light ? "text-gold" : "text-red"
        }`}
      >
        {eyebrow}
      </p>
      <h2
        className={`text-3xl md:text-5xl font-black tracking-wide ${
          light ? "text-cream" : "text-navy"
        }`}
      >
        {title}
      </h2>
    </div>
  );
}

function About() {
  return (
    <section id="about" className="py-24 md:py-32 bg-cream">
      <div className="max-w-6xl mx-auto px-5">
        <SectionHeading eyebrow="ABOUT US" title="俺たちのチームについて" />

        <div className="grid md:grid-cols-3 gap-6">
          <Card
            num="01"
            title="初心者中心"
            body="バットの握り方から、グラブの使い方まで。経験者がゼロから教えます。「やってみたかった」を全力で応援。"
          />
          <Card
            num="02"
            title="全力で楽しむ"
            body="勝ち負けより、まず楽しむこと。声を出して、笑って、汗をかく。それが俺たちのスタイル。"
          />
          <Card
            num="03"
            title="フラットな空気"
            body="10代から40代までごちゃ混ぜ。年齢も職業も関係なく、グラウンドではみんな対等。"
          />
        </div>
      </div>
    </section>
  );
}

function Card({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <div className="relative bg-white border border-ink/10 p-8 shadow-sm hover:shadow-xl transition-shadow group">
      <span className="num-badge absolute -top-4 -left-2 bg-navy text-cream px-3 py-1 text-sm tracking-widest">
        {num}
      </span>
      <h3 className="text-2xl font-black text-navy mb-3 group-hover:text-red transition-colors">
        {title}
      </h3>
      <p className="text-ink/75 leading-relaxed">{body}</p>
    </div>
  );
}

function Activity() {
  return (
    <section id="activity" className="py-24 md:py-32 bg-navy text-cream relative overflow-hidden">
      <div className="absolute inset-0 field-grid opacity-50" />
      <div className="relative max-w-6xl mx-auto px-5">
        <SectionHeading eyebrow="ACTIVITY" title="活動内容" light />

        <div className="grid md:grid-cols-2 gap-10">
          <InfoBlock
            label="活動エリア"
            main="福岡市内のグラウンド"
            sub="市内および近郊の野球場・河川敷を中心に活動予定。"
          />
          <InfoBlock
            label="活動頻度"
            main="月2〜3回 / 主に週末"
            sub="参加は出れる時だけでOK。無理なく続けられるペースを大事に。"
          />
          <InfoBlock
            label="練習内容"
            main="基礎練習 + 試合形式"
            sub="キャッチボール・打撃・走塁の基本から、紅白戦・対戦相手との練習試合まで。"
          />
          <InfoBlock
            label="費用"
            main="参加費 数百円〜（実費)"
            sub="グラウンド代を割り勘するイメージ。道具のレンタルも相談可。"
          />
        </div>

        <p className="mt-10 text-sm text-cream/60">
          ※ 活動詳細は調整中の項目もあります。応募時に最新情報をお伝えします。
        </p>
      </div>
    </section>
  );
}

function InfoBlock({ label, main, sub }: { label: string; main: string; sub: string }) {
  return (
    <div className="border-l-4 border-red pl-6">
      <p className="font-display tracking-[0.3em] text-gold text-xs mb-2">{label}</p>
      <p className="text-2xl md:text-3xl font-black mb-2">{main}</p>
      <p className="text-cream/70 leading-relaxed">{sub}</p>
    </div>
  );
}

function Recruit() {
  return (
    <section id="recruit" className="py-24 md:py-32 bg-cream-2">
      <div className="max-w-6xl mx-auto px-5">
        <SectionHeading eyebrow="RECRUITMENT" title="こんな人を募集中" />

        <div className="grid md:grid-cols-2 gap-10 items-start">
          <ul className="space-y-5">
            {[
              "野球をやってみたい初心者（最重要！）",
              "10代〜40代までの男女",
              "福岡市内・近郊に通える人",
              "とにかく元気で、声を出せる人",
              "経験者でも、初心者と一緒に楽しめる人",
              "学生も社会人も、ブランクある人もOK",
            ].map((item) => (
              <li key={item} className="flex items-start gap-4">
                <span className="mt-2 inline-block w-3 h-3 bg-red rotate-45 flex-shrink-0" />
                <span className="text-lg text-ink/85">{item}</span>
              </li>
            ))}
          </ul>

          <div className="bg-navy text-cream p-8 md:p-10 relative overflow-hidden">
            <div
              className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-30 blur-2xl"
              style={{ background: "#c1121f" }}
            />
            <p className="font-display tracking-[0.3em] text-gold text-xs mb-3">
              MESSAGE
            </p>
            <p className="text-2xl md:text-3xl font-black leading-snug mb-5">
              「やってみたい」<br />
              その一歩を、ここで。
            </p>
            <p className="text-cream/80 leading-relaxed">
              代表は今年19歳。チームを立ち上げたばかりで、メンバーも一緒に作っていくフェーズです。
              「未経験だし…」「下手だし…」は気にしないでOK。
              まずは気軽に応募・質問してください。
            </p>
            <a
              href="#form"
              className="mt-8 inline-flex items-center gap-2 bg-red hover:bg-red-2 transition px-6 py-3 font-bold tracking-wider"
            >
              応募フォームへ →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function FormSection() {
  return (
    <section id="form" className="py-24 md:py-32 bg-cream">
      <div className="max-w-3xl mx-auto px-5">
        <SectionHeading eyebrow="JOIN US" title="応募・お問い合わせ" />
        <p className="text-ink/75 mb-10 leading-relaxed">
          下記フォームから応募・質問を受け付けています。3日以内に返信します。
          X（Twitter）の DM でもOK。
        </p>
        <RecruitForm />
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-navy text-cream/80 pt-16 pb-8">
      <div className="max-w-6xl mx-auto px-5">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-8">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="ball w-10 h-10 inline-block" />
              <div>
                <p className="font-display tracking-widest text-2xl text-cream">
                  {TEAM_NAME_EN}
                </p>
                <p className="text-sm">{TEAM_NAME_JP} / 福岡市</p>
              </div>
            </div>
            <p className="text-sm text-cream/60 max-w-md leading-relaxed">
              福岡市を拠点に活動する、初心者中心の草野球チーム。
              一緒に野球を楽しむ仲間を募集中です。
            </p>
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            <a
              href={X_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-cream/30 hover:border-cream px-5 py-2.5 transition"
            >
              <XLogo /> X でフォロー
            </a>
            <a
              href="#form"
              className="inline-flex items-center gap-2 bg-red hover:bg-red-2 transition px-5 py-2.5 font-bold"
            >
              応募する →
            </a>
          </div>
        </div>

        <div className="stitch my-10 opacity-60" />

        <p className="text-xs text-cream/50 text-center">
          © {new Date().getFullYear()} {TEAM_NAME_EN}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

function XLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden>
      <path d="M18.244 2H21l-6.52 7.45L22.5 22h-6.18l-4.84-6.32L5.91 22H3.15l6.98-7.97L1.5 2h6.34l4.38 5.79L18.244 2z" />
    </svg>
  );
}
