import Image from "next/image";
import Link from "next/link";
import RecruitForm from "@/components/RecruitForm";

const TEAM_NAME_JP = "博多SKルーキーズ";
const TEAM_NAME_EN = "HAKATA SK ROOKIES";
const X_URL = "https://x.com/SK_rookies_FK";
const FOUNDED = "2026";

export default function Home() {
  return (
    <>
      <TopBar />
      <Header />
      <main className="flex-1">
        <Hero />
        <Ticker />
        <NewsSection />
        <ScheduleSection />
        <AboutSection />
        <ActivitySection />
        <RecruitSection />
        <FaqSection />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}

/* ───────────────────────────────────────── TOP BAR */

function TopBar() {
  return (
    <div className="bg-navy text-white/80 text-xs">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 h-8 flex items-center justify-between">
        <p className="tracking-wider">
          福岡市拠点 / 草野球チーム / EST. {FOUNDED}
        </p>
        <div className="hidden md:flex items-center gap-4">
          <a href={X_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white inline-flex items-center gap-1">
            <XIcon /> 公式X
          </a>
          <span className="text-white/30">|</span>
          <a href="#contact" className="hover:text-white">お問い合わせ</a>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────── HEADER */

function Header() {
  return (
    <header className="sticky top-0 z-50 bg-base-2 border-b-4 border-red shadow-sm">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 flex items-center justify-between">
        <Link href="#top" className="flex items-center gap-3 py-3">
          <Logo className="w-24 h-24 md:w-28 md:h-28" priority />
          <div className="leading-tight">
            <p className="font-bold text-lg md:text-xl tracking-wider text-navy">
              {TEAM_NAME_JP}
            </p>
            <p className="font-display text-[10px] md:text-xs tracking-[0.25em] text-muted uppercase">
              {TEAM_NAME_EN}
            </p>
          </div>
        </Link>
        <nav className="hidden lg:flex items-stretch h-full text-sm font-bold">
          <NavTab href="#news">お知らせ</NavTab>
          <NavTab href="#schedule">試合情報</NavTab>
          <NavTab href="#about">チーム紹介</NavTab>
          <NavTab href="#activity">活動概要</NavTab>
          <NavTab href="#recruit">メンバー募集</NavTab>
          <NavTab href="#faq">FAQ</NavTab>
          <NavTab href="#contact" highlight>お問い合わせ</NavTab>
        </nav>
        <a
          href="#recruit"
          className="lg:hidden bg-red text-white px-4 py-2 text-sm font-bold tracking-wide"
        >
          募集 →
        </a>
      </div>
    </header>
  );
}

function NavTab({
  href,
  children,
  highlight = false,
}: {
  href: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  if (highlight) {
    return (
      <a
        href={href}
        className="bg-red hover:bg-red-2 text-white px-5 py-5 transition-colors flex items-center"
      >
        {children}
      </a>
    );
  }
  return (
    <a
      href={href}
      className="px-5 py-5 hover:text-red transition-colors flex items-center border-b-2 border-transparent hover:border-red text-ink"
    >
      {children}
    </a>
  );
}

/* ───────────────────────────────────────── LOGO */

function Logo({
  className = "",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/logo.png"
      alt={`${TEAM_NAME_JP} ロゴ`}
      width={512}
      height={512}
      className={`object-contain ${className}`}
      priority={priority}
    />
  );
}

/* ───────────────────────────────────────── HERO */

function Hero() {
  return (
    <section
      id="top"
      className="relative bg-navy text-white overflow-hidden"
    >
      <div className="absolute inset-0 field-grid opacity-60" />
      <div
        className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-15 blur-3xl"
        style={{ background: "radial-gradient(circle, #d10024 0%, transparent 60%)" }}
      />

      {/* Diagonal red accent block */}
      <div className="absolute top-0 right-0 h-full w-[35%] hidden md:block">
        <div className="absolute top-0 right-0 h-full w-full diag-stripe opacity-15" />
        <div
          className="absolute top-0 right-0 h-full w-full bg-red"
          style={{ clipPath: "polygon(60% 0, 100% 0, 100% 100%, 80% 100%)" }}
        />
      </div>

      <div className="relative max-w-[1280px] mx-auto px-4 md:px-6 py-16 md:py-28">
        <div className="grid md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-8 reveal">
            <div className="inline-flex items-center gap-3 bg-red px-4 py-1.5 text-xs md:text-sm font-bold tracking-widest mb-6">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              MEMBER WANTED — メンバー募集中
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-[1.05] tracking-tight">
              野球で、<br />
              <span className="text-gold">福岡</span>を、<br />
              熱くする。
            </h1>

            <p className="mt-8 text-xl md:text-2xl font-bold tracking-wider">
              {TEAM_NAME_JP}
              <span className="block font-display text-sm md:text-base text-white/60 tracking-[0.3em] mt-2">
                {TEAM_NAME_EN} — FUKUOKA SANDLOT BASEBALL CLUB
              </span>
            </p>

            <div className="mt-10 max-w-2xl text-base md:text-lg leading-relaxed text-white/85">
              代表も初心者。
              10代から40代まで、年齢も経験も関係なく、
              野球を全力で楽しむ仲間を募集中。バットを握ったことがなくても大歓迎です。
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <a
                href="#recruit"
                className="bg-red hover:bg-red-2 transition-colors px-7 py-4 text-white font-bold tracking-wider shadow-xl shadow-red/30 inline-flex items-center gap-2"
              >
                <span>メンバーに応募する</span>
                <span className="text-xl">→</span>
              </a>
              <a
                href="#about"
                className="border-2 border-white/40 hover:border-white px-7 py-4 font-bold tracking-wider transition-colors"
              >
                チームを知る
              </a>
            </div>
          </div>

          <div className="hidden md:flex md:col-span-4 justify-center reveal" style={{ animationDelay: "0.15s" }}>
            <div className="relative">
              <Logo className="w-[28rem] h-[28rem] lg:w-[32rem] lg:h-[32rem] drop-shadow-2xl" priority />
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-base-2 text-navy px-4 py-1 font-display text-sm tracking-widest border-2 border-navy">
                EST. {FOUNDED}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────── TICKER */

function Ticker() {
  const items = [
    "メンバー募集中",
    "初心者大歓迎",
    "対戦相手も募集",
    "福岡市拠点",
    "経験者も歓迎",
    `EST. ${FOUNDED}`,
  ];
  const repeated = [...items, ...items, ...items];
  return (
    <div className="bg-red text-white py-3 overflow-hidden border-b-4 border-navy">
      <div className="ticker-track">
        {repeated.map((t, i) => (
          <span key={i} className="font-ticker text-lg md:text-xl tracking-[0.15em] inline-flex items-center gap-12">
            {t}
            <span className="text-white/50">●</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────────────────────── SECTION HEADING */

function SectionTitle({
  jp,
  en,
}: {
  jp: string;
  en: string;
}) {
  return (
    <div className="mb-10 md:mb-14">
      <p className="font-display text-xs md:text-sm tracking-[0.4em] text-red mb-2 uppercase">
        {en}
      </p>
      <h2 className="section-bar text-3xl md:text-5xl font-black tracking-wide text-navy leading-tight">
        {jp}
      </h2>
    </div>
  );
}

/* ───────────────────────────────────────── NEWS */

const news = [
  {
    date: "2026.04.19",
    cat: "サイト",
    title: "公式サイトを開設しました。",
  },
  {
    date: "2026.04.19",
    cat: "募集",
    title: "メンバー募集を開始。10代〜40代まで初心者中心。",
  },
  {
    date: "2026.04.19",
    cat: "対戦",
    title: "対戦相手チーム・個人も同時募集中です。",
  },
];

function NewsSection() {
  return (
    <section id="news" className="bg-base-2 border-b border-line">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-16 md:py-24">
        <SectionTitle jp="お知らせ" en="News" />

        <ul className="divide-y divide-line border-t border-b border-line">
          {news.map((n, i) => (
            <li
              key={i}
              className="grid grid-cols-12 gap-3 md:gap-6 py-5 items-center hover:bg-base transition-colors"
            >
              <span className="col-span-4 md:col-span-2 font-display text-navy text-base md:text-lg tracking-wider">
                {n.date}
              </span>
              <span className="col-span-3 md:col-span-2">
                <span className="inline-block bg-navy text-white text-xs px-3 py-1 font-bold tracking-wider">
                  {n.cat}
                </span>
              </span>
              <span className="col-span-12 md:col-span-8 text-base md:text-lg font-bold text-ink mt-2 md:mt-0">
                {n.title}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────── SCHEDULE */

function ScheduleSection() {
  return (
    <section id="schedule" className="bg-base border-b border-line">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-16 md:py-24">
        <SectionTitle jp="試合・対戦相手募集" en="Schedule & Wanted" />

        <div className="grid md:grid-cols-12 gap-6 md:gap-10">
          {/* Schedule placeholder */}
          <div className="md:col-span-7">
            <div className="bg-base-2 border border-line">
              <div className="bg-navy text-white px-5 py-3 flex items-center justify-between">
                <p className="font-bold tracking-wider text-sm">直近の試合</p>
                <p className="font-display text-xs tracking-widest text-white/60">UPCOMING</p>
              </div>
              <div className="px-6 py-16 text-center">
                <p className="font-display text-7xl md:text-8xl text-navy/15 leading-none mb-4 tracking-wider">
                  COMING<br />SOON
                </p>
                <p className="text-muted mb-2 text-sm">
                  まだ試合の予定はありません
                </p>
                <p className="text-ink leading-relaxed max-w-md mx-auto text-sm">
                  最初の一戦に向けて準備中。決まり次第こちらでお知らせします。
                </p>
              </div>
              <div className="border-t border-line px-5 py-3 flex justify-between text-xs text-muted">
                <span>戦績: <span className="font-display text-base text-navy">0勝 0敗 0分</span></span>
                <span className="font-display tracking-widest">— —</span>
              </div>
            </div>
          </div>

          {/* 対戦相手募集 */}
          <div className="md:col-span-5">
            <div className="bg-navy text-white p-6 md:p-8 h-full relative overflow-hidden">
              <div
                className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20 blur-2xl"
                style={{ background: "#d10024" }}
              />
              <div className="relative">
                <p className="font-display text-xs tracking-[0.3em] text-gold mb-3">WANTED</p>
                <h3 className="text-2xl md:text-3xl font-black leading-snug mb-4">
                  対戦相手、<br />
                  募集してます。
                </h3>
                <p className="text-white/85 leading-relaxed mb-6 text-sm">
                  福岡市内・近郊で練習試合をしてくださるチーム・個人を探しています。
                  レベル不問、ゆるく楽しめる相手大歓迎。
                </p>
                <ul className="space-y-2 mb-6 text-sm">
                  <li className="flex gap-2"><span className="text-red">●</span>福岡市内・近郊のチーム</li>
                  <li className="flex gap-2"><span className="text-red">●</span>レベル・経験は不問</li>
                  <li className="flex gap-2"><span className="text-red">●</span>個人参加も相談可能</li>
                </ul>
                <a
                  href="#contact"
                  className="inline-flex items-center gap-2 bg-red hover:bg-red-2 transition-colors px-5 py-3 font-bold tracking-wider"
                >
                  対戦の相談 →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────── ABOUT */

function AboutSection() {
  const stories = [
    {
      no: "01",
      head: "みんなで教え合う",
      body: "代表自身も野球初心者。経験者・未経験者がフラットに教え合うスタイルです。「分からない」を気軽に言える空気を大切に。経験者の加入も大歓迎。",
    },
    {
      no: "02",
      head: "全力で楽しむ",
      body: "勝ち負けより、まず楽しむこと。声を出して、笑って、汗をかく。それが、俺たちのスタイル。",
    },
    {
      no: "03",
      head: "フラットな空気",
      body: "10代から40代までごちゃ混ぜ。年齢も職業も関係なく、グラウンドの上ではみんな対等。",
    },
  ];

  return (
    <section id="about" className="bg-base-2 border-b border-line">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-16 md:py-24">
        <SectionTitle jp="チーム紹介" en="About the Team" />

        <div className="grid md:grid-cols-3 gap-6">
          {stories.map((s) => (
            <div key={s.no} className="bg-base p-7 border-t-4 border-red relative">
              <p className="font-display text-5xl text-navy/15 absolute top-4 right-5 leading-none">
                {s.no}
              </p>
              <p className="font-display text-xs tracking-[0.3em] text-red mb-3">
                POINT {s.no}
              </p>
              <h3 className="text-xl md:text-2xl font-black text-navy mb-3 leading-tight">
                {s.head}
              </h3>
              <p className="text-ink/80 leading-relaxed text-[15px]">{s.body}</p>
            </div>
          ))}
        </div>

        {/* Founder note */}
        <div className="mt-12 bg-navy text-white p-6 md:p-10 grid md:grid-cols-12 gap-6 md:gap-10 items-center">
          <div className="md:col-span-3 flex md:justify-center">
            <Logo className="w-44 h-44 md:w-60 md:h-60" />
          </div>
          <div className="md:col-span-9">
            <p className="font-display text-xs tracking-[0.3em] text-gold mb-3">
              代表からのメッセージ
            </p>
            <p className="text-xl md:text-2xl font-bold leading-relaxed mb-4">
              「未経験だし…」「下手だし…」は気にしないでOK。
            </p>
            <p className="text-white/80 leading-relaxed text-[15px]">
              代表は今年19歳・自身も野球初心者です。チームを立ち上げたばかりで、
              メンバーみんなで作っていくフェーズ。経験者の方は、一緒に教える側として
              加わってくれると嬉しいです。まずは気軽に応募・質問してください。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────── ACTIVITY */

function ActivitySection() {
  const rows = [
    { label: "活動エリア", main: "福岡市内のグラウンド", sub: "市内および近郊の野球場・河川敷を中心に活動予定。" },
    { label: "活動頻度", main: "月 2〜3回 / 主に週末", sub: "参加は出れる時だけでOK。無理なく続けられるペースを大事に。" },
    { label: "練習内容", main: "基礎練習 + 試合形式", sub: "キャッチボール・打撃・走塁の基本から、紅白戦・他チームとの練習試合まで。" },
    {
      label: "費用",
      main: "月額 ¥500 + 都度 数百円",
      sub: "チーム運営費として月額500円。加えて活動ごとにグラウンド代を割り勘で数百円いただきます。",
    },
    {
      label: "装備",
      main: "グローブ持参推奨",
      sub: "チーム共通の防具はまだ揃っていません。可能な範囲でグローブだけでもご用意ください。バット・ボールはチーム側で準備します。",
    },
  ];

  return (
    <section id="activity" className="bg-base border-b border-line">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-16 md:py-24">
        <SectionTitle jp="活動概要" en="Activity" />

        <div className="border border-line overflow-hidden">
          {rows.map((r, i) => (
            <div
              key={r.label}
              className={`grid grid-cols-1 md:grid-cols-12 ${i !== rows.length - 1 ? "border-b border-line" : ""}`}
            >
              <div className="md:col-span-3 bg-navy text-white px-5 md:px-6 py-3 md:py-7 flex md:items-center border-l-4 border-red">
                <p className="font-bold text-base md:text-lg tracking-wider">
                  {r.label}
                </p>
              </div>
              <div className="md:col-span-9 bg-base-2 px-5 md:px-8 py-5 md:py-7">
                <p className="text-xl md:text-2xl font-black text-navy mb-1.5 leading-tight">
                  {r.main}
                </p>
                <p className="text-muted text-sm leading-relaxed">{r.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────── RECRUIT */

function RecruitSection() {
  const targets = [
    "野球をやってみたい初心者（代表も初心者）",
    "経験者も大歓迎（一緒に教え合える人）",
    "10代〜40代までの男女",
    "福岡市内・近郊に通える人",
    "とにかく元気で、声を出せる人",
    "学生も社会人も、ブランクある人もOK",
  ];

  return (
    <section id="recruit" className="bg-base-2 border-b border-line relative overflow-hidden">
      {/* Diagonal accent */}
      <div className="absolute top-0 right-0 w-1/3 h-1 bg-red" />

      <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-16 md:py-24">
        <SectionTitle jp="メンバー募集" en="Recruit" />

        <div className="grid md:grid-cols-12 gap-8 md:gap-12">
          <div className="md:col-span-7">
            <p className="text-xl md:text-2xl font-bold text-navy mb-6">
              こんな人を、待っています。
            </p>
            <ul className="border-t border-line">
              {targets.map((item, i) => (
                <li key={item} className="flex items-start gap-4 py-4 border-b border-line">
                  <span className="font-display text-red text-2xl leading-none w-10 flex-shrink-0 pt-1">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-base md:text-lg text-ink leading-snug font-bold pt-1">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-5">
            <div className="bg-base p-6 md:p-8 border border-line">
              <p className="font-display text-xs tracking-[0.3em] text-red mb-3">
                APPLY NOW
              </p>
              <p className="text-2xl md:text-3xl font-black text-navy leading-snug mb-4">
                応募は<br />
                かんたん3ステップ。
              </p>
              <ol className="space-y-4 mb-8">
                <Step n="1" t="フォームから連絡" d="下のフォーム or X DM で応募ください。" />
                <Step n="2" t="代表から返信" d="3日以内に詳細をお返しします。" />
                <Step n="3" t="グラウンドへ" d="次回の活動に参加してみてください！" />
              </ol>
              <a
                href="#contact"
                className="block bg-red hover:bg-red-2 text-white text-center px-6 py-4 font-bold tracking-wider transition-colors"
              >
                応募フォームへ →
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Step({ n, t, d }: { n: string; t: string; d: string }) {
  return (
    <li className="flex gap-4">
      <span className="font-display bg-navy text-white w-8 h-8 grid place-items-center text-lg flex-shrink-0">
        {n}
      </span>
      <div>
        <p className="font-bold text-navy">{t}</p>
        <p className="text-muted text-sm">{d}</p>
      </div>
    </li>
  );
}

/* ───────────────────────────────────────── FAQ */

const faqs = [
  {
    q: "本当に未経験・初心者でも大丈夫ですか？",
    a: "大丈夫です。福岡市でもっとも初心者が始めやすい草野球チームを目指しています。代表自身も野球未経験からのスタートで、キャッチボールもまだ覚えている最中です。「経験者がゼロから教える」のではなく、みんなで少しずつ覚えながら楽しんでいくスタイルなので、ルールを知らない段階でも気後れなく参加できます。学生時代に少し触った程度、ブランク10年以上、完全にゼロ — どの段階の方でも歓迎します。",
  },
  {
    q: "福岡市のどこで活動していますか？",
    a: "福岡市内の公営グラウンド（雁の巣・西南杜の湖畔公園・美野島公園など）を中心に、その都度空いている場所を予約して活動します。市内・近郊からアクセスしやすい場所を選ぶので、福岡市中央区・博多区・早良区・南区・東区・西区・城南区、どこからでも通えます。糸島・春日・大野城・粕屋エリアからの参加もOKです。",
  },
  {
    q: "費用はいくらかかりますか？",
    a: "月額500円のチーム費と、活動日ごとのグラウンド代の実費シェア（1回あたり数百円程度）のみです。福岡市周辺の草野球チームの中でも、かなり安く始められる金額設定にしています。ユニフォーム購入や入会金、高い年会費などはありません。",
  },
  {
    q: "道具は何が必要ですか？",
    a: "まずは **グローブだけ** 用意してもらえればOKです。バット・ボール・ベースなどはチームで用意します。防具（ヘルメット・キャッチャー防具など）は現在整備中で、試合が本格化する段階で揃えていきます。グローブもこれから買う方は、スポーツ量販店で3,000〜5,000円の初心者用で十分です。",
  },
  {
    q: "何歳まで参加できますか？10代や40代でも浮きませんか？",
    a: "10代〜40代までの幅広い年齢を想定しています。代表は19歳ですが、社会人・主婦・学生など多様な年齢のメンバーを歓迎しています。野球は世代を超えて楽しめるスポーツなので、年齢差は全く気にしなくて大丈夫です。",
  },
  {
    q: "女性も参加できますか？",
    a: "もちろんです。男女問わず、野球を楽しみたい方はどなたでも歓迎します。女性の初心者メンバーも大歓迎です。",
  },
  {
    q: "活動はどれくらいの頻度ですか？",
    a: "月2〜3回、主に週末（土日祝）の活動を予定しています。仕事や学業と両立しやすいペースを意識しているので、毎週出られなくても問題ありません。活動日時はXアカウント（@SK_rookies_FK）と、このサイトのお知らせ欄でお知らせします。",
  },
  {
    q: "経験者だけど入れますか？",
    a: "大歓迎です。経験者がゼロから教える体制ではなく「みんなで教え合う」スタイルなので、経験者の方には得意なところを共有してもらえると助かります。本気で上手くなりたい方も、久しぶりに野球したい方も、どちらも居場所があります。",
  },
  {
    q: "見学だけでもできますか？",
    a: "もちろん可能です。応募フォームかX（@SK_rookies_FK）のDMで「見学希望」とお伝えください。次回の活動日時と場所をご案内します。実際の雰囲気を見てから判断してもらってOKです。",
  },
  {
    q: "対戦相手（他のチーム）も募集していますか？",
    a: "はい、対戦相手チームも同時に募集しています。福岡市内・近郊の草野球チームで練習試合・親善試合をしてくださるチームがあれば、ぜひお問い合わせください。初心者が多いチーム同士だと特に助かります。",
  },
];

function FaqSection() {
  return (
    <section id="faq" className="bg-base border-b border-line">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-16 md:py-24">
        <SectionTitle jp="よくある質問" en="FAQ" />
        <p className="text-muted text-base md:text-lg leading-relaxed mb-10 max-w-3xl">
          福岡市で草野球を始めたい初心者の方から、よくいただく質問をまとめました。
          他に気になることがあれば、<a href="#contact" className="text-red font-bold underline decoration-dotted underline-offset-4 hover:text-red-2">お問い合わせフォーム</a>
          か X（<a href="https://x.com/SK_rookies_FK" target="_blank" rel="noopener noreferrer" className="text-red font-bold underline decoration-dotted underline-offset-4 hover:text-red-2">@SK_rookies_FK</a>）
          までお気軽にどうぞ。
        </p>

        <div className="border-t border-line">
          {faqs.map((f, i) => (
            <details
              key={f.q}
              className="group border-b border-line"
            >
              <summary className="flex items-start gap-4 md:gap-6 py-5 md:py-6 cursor-pointer list-none select-none hover:bg-base-2 transition-colors px-3 md:px-4">
                <span className="font-display text-red text-xl md:text-2xl leading-none w-10 md:w-14 flex-shrink-0 pt-1">
                  Q{String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 text-base md:text-xl font-bold text-navy leading-snug pt-0.5">
                  {f.q}
                </span>
                <span className="font-display text-navy text-2xl md:text-3xl flex-shrink-0 leading-none pt-1 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <div className="px-3 md:px-4 pb-6 md:pb-8 pl-14 md:pl-20">
                <p className="text-ink text-base leading-relaxed">
                  {f.a}
                </p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────── CONTACT */

function ContactSection() {
  return (
    <section id="contact" className="bg-base border-b border-line">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-16 md:py-24">
        <SectionTitle jp="お問い合わせ" en="Contact" />

        <div className="grid md:grid-cols-12 gap-8 md:gap-12">
          <div className="md:col-span-4">
            <p className="text-ink leading-relaxed mb-6 text-[15px]">
              下記フォームから、応募・質問・対戦相手の相談などを受け付けています。
              3日以内に返信します。X（Twitter）の DM でも結構です。
            </p>

            <div className="bg-base-2 border border-line p-5 mb-4">
              <p className="font-display text-xs tracking-[0.3em] text-red mb-2">SNS</p>
              <a
                href={X_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-bold text-navy hover:text-red transition-colors"
              >
                <XIcon /> @SK_rookies_FK
              </a>
              <p className="text-xs text-muted mt-2">
                最新情報・活動報告はXで発信中。お気軽にフォロー&DMください。
              </p>
            </div>

            <div className="bg-base-2 border border-line p-5">
              <p className="font-display text-xs tracking-[0.3em] text-red mb-2">RESPONSE</p>
              <p className="font-bold text-navy">原則3日以内に返信</p>
              <p className="text-xs text-muted mt-1">
                返信が遅い場合はメール再送 or DMください。
              </p>
            </div>
          </div>
          <div className="md:col-span-8">
            <RecruitForm />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────── FOOTER */

function Footer() {
  return (
    <footer className="bg-navy text-white">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 pt-14 pb-8">
        <div className="grid md:grid-cols-12 gap-10 mb-10">
          <div className="md:col-span-5">
            <div className="flex items-center gap-4 mb-4">
              <Logo className="w-32 h-32" />
              <div>
                <p className="font-bold text-xl tracking-wider">{TEAM_NAME_JP}</p>
                <p className="font-display text-xs tracking-[0.3em] text-white/60 uppercase">
                  {TEAM_NAME_EN}
                </p>
              </div>
            </div>
            <p className="text-white/70 leading-relaxed text-sm max-w-md">
              福岡市を拠点に活動する、初心者中心の草野球チーム。
              一緒に野球を楽しむ仲間と、対戦相手を募集中です。
            </p>
          </div>

          <div className="md:col-span-3">
            <p className="font-display text-xs tracking-[0.3em] text-gold mb-4">MENU</p>
            <ul className="space-y-2 text-sm">
              <li><a href="#news" className="hover:text-red transition-colors">お知らせ</a></li>
              <li><a href="#schedule" className="hover:text-red transition-colors">試合情報</a></li>
              <li><a href="#about" className="hover:text-red transition-colors">チーム紹介</a></li>
              <li><a href="#activity" className="hover:text-red transition-colors">活動概要</a></li>
              <li><a href="#recruit" className="hover:text-red transition-colors">メンバー募集</a></li>
              <li><a href="#contact" className="hover:text-red transition-colors">お問い合わせ</a></li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <p className="font-display text-xs tracking-[0.3em] text-gold mb-4">TEAM INFO</p>
            <dl className="space-y-2 text-sm">
              <Info label="拠点" value="福岡市" />
              <Info label="設立" value={`${FOUNDED}年`} />
              <Info label="代表" value="19歳・初心者" />
              <Info label="対象" value="10代〜40代 / 初心者中心" />
            </dl>
            <a
              href={X_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 border border-white/30 hover:border-white px-4 py-2 transition-colors text-sm"
            >
              <XIcon /> 公式X
            </a>
          </div>
        </div>

        <div className="diag-stripe h-1 mb-6 opacity-60" />

        <div className="flex flex-col md:flex-row justify-between items-center text-xs text-white/50 gap-2">
          <p>© {new Date().getFullYear()} {TEAM_NAME_JP} / {TEAM_NAME_EN}. All rights reserved.</p>
          <p className="font-display tracking-[0.3em]">FUKUOKA — EST. {FOUNDED}</p>
        </div>
      </div>
    </footer>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="text-white/50 w-16">{label}</dt>
      <dd className="text-white">{value}</dd>
    </div>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden>
      <path d="M18.244 2H21l-6.52 7.45L22.5 22h-6.18l-4.84-6.32L5.91 22H3.15l6.98-7.97L1.5 2h6.34l4.38 5.79L18.244 2z" />
    </svg>
  );
}
