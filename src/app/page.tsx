import Image from "next/image";
import Link from "next/link";
import HeroSection from "@/components/HeroSection";
import FaqSection from "@/components/FaqSection";
import ScrollReveal from "@/components/ScrollReveal";
import RecruitForm from "@/components/RecruitForm";
import MobileMenu from "@/components/MobileMenu";
import PracticeCalendar from "@/components/PracticeCalendar";
import { getNews, type NewsItem } from "@/data/news";
import { SPONSORS } from "@/data/sponsors";
import { getBlogs, type BlogPost } from "@/data/blog";
import { getPractices, PRACTICE_TYPE_COLOR, type Practice } from "@/data/practices";

/**
 * 公式サイト トップページ。
 *
 * 見せ方の方針（2026.09 リニューアル）:
 *  - 白を基調にして、余白で区切る。枠線・色面で囲わない。
 *  - 1セクション＝1メッセージ。見出しは短く、説明は1〜2文に絞る。
 *  - 色はSKレッド1色だけをリンクとボタンに使う。
 *  - 見せ場（アプリ・目標）だけ黒の全面にして緩急をつける。
 *  - 絵文字アイコン・流れるテロップ・光る装飾は置かない。
 */

/** Googleスプレッドシート（ISR）由来のデータは5分で再検証 */
export const revalidate = 300;

const JIMOTY_URL = "https://jmty.jp/fukuoka/com-spo/article-1okvug";
const LABOLA_URL = "https://labola.jp/recruit/show/AZ2l6St6f3L-ncVW9EwL";

const TEAM_NAME_JP = "博多SKルーキーズ";
const TEAM_NAME_EN = "HAKATA SK ROOKIES";
const X_URL = "https://x.com/SK_rookies_FK";
const IG_HANDLE = "hakata_sk_rookies";
const IG_URL = `https://www.instagram.com/${IG_HANDLE}/`;
const LINE_URL = "https://line.me/ti/g/-buBk3SbuY";
const FOUNDED = "2026";
const MEMBER_COUNT = Number(process.env.NEXT_PUBLIC_MEMBER_COUNT ?? 13);

/* ── アイコン ─────────────────────────────────────────── */
function XIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
      <path d="M18.244 2H21l-6.52 7.45L22.5 22h-6.18l-4.84-6.32L5.91 22H3.15l6.98-7.97L1.5 2h6.34l4.38 5.79L18.244 2z" />
    </svg>
  );
}
function IGIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" ry="5" />
      <path d="M16 11.37a4 4 0 1 1-7.914 1.173A4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}
function LINEIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
      <path d="M12 2C6.486 2 2 5.589 2 10c0 3.953 3.564 7.273 8.443 7.91.327.07.772.214.885.491.102.252.066.65.033.905l-.143.86c-.043.252-.2.985.864.537 1.064-.448 5.732-3.376 7.819-5.78C21.36 13.292 22 11.71 22 10c0-4.411-4.486-8-10-8zM7.32 12.81H5.272a.43.43 0 0 1-.43-.43V8.292a.43.43 0 0 1 .858 0v3.66H7.32a.43.43 0 0 1 0 .859zm1.694-.43a.43.43 0 0 1-.86 0V8.292a.43.43 0 0 1 .86 0v4.088zm4.917 0a.43.43 0 0 1-.43.43.428.428 0 0 1-.343-.171L11.062 9.78v2.6a.43.43 0 0 1-.86 0V8.292a.43.43 0 0 1 .43-.43c.13 0 .258.064.343.172l2.097 2.86V8.292a.43.43 0 0 1 .859 0v4.088zm3.301-2.473a.43.43 0 0 1 0 .859h-1.617v1.184h1.617a.43.43 0 0 1 0 .86h-2.046a.43.43 0 0 1-.43-.43V8.292a.43.43 0 0 1 .43-.43h2.046a.43.43 0 0 1 0 .859h-1.617v1.186h1.617z" />
    </svg>
  );
}

/* ── セクションの見出し ──
   英字ラベル（ALL CAPS）は置かない。見出しと1行の説明だけ。 */
function Head({ title, sub, center = true }: { title: string; sub?: string; center?: boolean }) {
  return (
    <div className={center ? "center" : ""} style={{ marginBottom: "clamp(34px, 4.6vw, 56px)" }}>
      <h2 className="t-head reveal">{title}</h2>
      {sub && (
        <p className="t-sub reveal" style={{ marginTop: 16, maxWidth: 620, ...(center ? { marginLeft: "auto", marginRight: "auto" } : {}) }}>
          {sub}
        </p>
      )}
    </div>
  );
}

/* ── ヘッダー ──
   Apple のように細く、半透明で、文字は小さく。 */
function Header() {
  const nav: [string, string][] = [
    ["#about", "チーム"],
    ["#activity", "活動"],
    ["#schedule", "日程"],
    ["#app", "アプリ"],
    ["#vision", "目標"],
    ["#sponsors", "スポンサー"],
    ["#contact", "お問い合わせ"],
  ];
  return (
    <header
      style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "saturate(180%) blur(20px)",
        WebkitBackdropFilter: "saturate(180%) blur(20px)",
        borderBottom: "1px solid rgba(0,0,0,0.08)",
      }}
    >
      <div className="sec-in-wide" style={{ height: 52, display: "flex", alignItems: "center", gap: 16 }}>
        <a href="#top" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", flexShrink: 0 }}>
          <Image src="/sk_logo_crop.png" alt={TEAM_NAME_JP} width={46} height={38} className="object-contain" style={{ width: 34, height: "auto" }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.01em" }}>{TEAM_NAME_JP}</span>
        </a>

        <nav className="hidden lg:flex" style={{ gap: 24, marginLeft: "auto", alignItems: "center" }}>
          {nav.map(([href, label]) => (
            <a key={href} href={href} style={{ fontSize: 13, color: "var(--ink)", textDecoration: "none", opacity: 0.82 }}>
              {label}
            </a>
          ))}
          <a href="#contact" className="cta" style={{ fontSize: 13, padding: "7px 16px" }}>応募する</a>
        </nav>

        {/* display はクラス側に任せる。インラインで display を書くと lg:hidden が効かない */}
        <div className="lg:hidden flex items-center gap-2.5" style={{ marginLeft: "auto" }}>
          <a href="#contact" className="cta" style={{ fontSize: 13, padding: "7px 15px" }}>応募</a>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}

/* ── チーム紹介 ── */
function AboutSection() {
  const points: [string, string][] = [
    ["みんなで教え合う", "代表自身も野球初心者です。経験者も未経験者もフラットに教え合うので、「分からない」を言いやすい空気があります。"],
    ["勝ち負けより、楽しむ", "声を出して、笑って、汗をかく。うまくなるのはそのあとで大丈夫です。"],
    ["年齢も職業も関係なし", "10代から40代までごちゃ混ぜ。グラウンドの上ではみんな対等です。"],
  ];
  return (
    <section id="about" className="sec sec-hair" style={{ background: "#fff" }}>
      <div className="sec-in">
        <Head
          title="初心者でも、大丈夫です。"
          sub="経験がないと居づらいのではないか——その心配がいらないチームを作っています。"
        />
        <div style={{ display: "grid", gap: 26, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          {points.map(([t, d], i) => (
            <div key={t} className="reveal" data-delay={String(i * 90)}>
              <h3 className="t-head-sm">{t}</h3>
              <p className="t-body" style={{ marginTop: 10 }}>{d}</p>
            </div>
          ))}
        </div>

        <div className="panel reveal" style={{ marginTop: "clamp(36px, 5vw, 60px)" }}>
          <p className="t-head-sm">「未経験だし…」は、気にしなくていい。</p>
          <p className="t-body" style={{ marginTop: 14 }}>
            代表は19歳。普段はボートレーサーを目指して修行中で、野球も初心者からのスタートです。
            チームを立ち上げたばかりで、メンバーみんなで作っていくフェーズ。
            経験者の方は、一緒に教える側として加わってくれると嬉しいです。
          </p>
          <p className="t-caption" style={{ marginTop: 16 }}>代表 柏木 海斗</p>
        </div>
      </div>
    </section>
  );
}

/* ── 活動概要 ── */
function ActivitySection() {
  const rows: [string, string, string][] = [
    ["活動エリア", "福岡市内のグラウンド", "市内および近郊の野球場・河川敷を中心に活動します。"],
    ["主な球場", "舞鶴公園 / 山王公園 / 東平尾公園", "中央区の舞鶴公園野球場、博多区の山王公園野球場、東平尾公園 ベスト電器スタジアム野球場がメインです。"],
    ["活動頻度", "週1〜2回 ＋ 月3〜4回", "公園でのキャッチボールが週1〜2回、球場を借りての練習が月3〜4回。平日夜・週末どちらもあります。"],
    ["参加", "出られる時だけでOK", "毎回参加できなくても問題ありません。"],
    ["練習内容", "基礎練習 ＋ 試合形式", "キャッチボール・打撃・走塁の基本から、紅白戦・他チームとの練習試合まで。"],
    ["持ち物", "グローブだけご用意ください", "チーム共通の防具はまだ揃っていません。バット・ボールはチーム側で準備します。"],
    ["費用", "入会費 ¥2,000 ＋ 月額 ¥500", "ほかにスポーツ保険料 ¥2,000／年、グラウンド代（2時間 ¥400／4時間 ¥500）。月会費は2026年8月分より ¥1,000 に改定します。"],
  ];
  return (
    <section id="activity" className="sec sec-gray">
      <div className="sec-in">
        <Head title="活動のこと" sub="どこで、どれくらい、いくらで。先に知っておきたいことをまとめました。" />
        <div className="rows reveal">
          {rows.map(([label, value, note]) => (
            <div key={label} className="row-item">
              <div className="t-caption" style={{ paddingTop: 3 }}>{label}</div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.01em" }}>{value}</div>
                <p className="t-body" style={{ marginTop: 6, fontSize: 15 }}>{note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 日程 ── */
function practiceLabel(t: Practice["type"]) {
  return t === "キャッチボール" ? "公園練習" : t;
}

function ScheduleSection({ practices }: { practices: Practice[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = practices
    .filter(p => p.date >= today && p.status !== "canceled")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  return (
    <section id="schedule" className="sec sec-hair" style={{ background: "#fff" }}>
      <div className="sec-in">
        <Head
          title="練習は、週に1〜2回。"
          sub="公園でのキャッチボールが中心。球場を借りての練習は月に3〜4回です。"
        />

        <div className="reveal" style={{ marginBottom: 34 }}>
          <PracticeCalendar practices={practices} />
        </div>

        <h3 className="t-head-sm reveal" style={{ marginBottom: 16 }}>近日の予定</h3>
        {upcoming.length === 0 ? (
          <p className="t-body reveal">
            次の練習日は調整中です。決まり次第ここに掲載します。
            見学のご希望は、Xのダイレクトメッセージかお問い合わせからどうぞ。
          </p>
        ) : (
          <div className="rows reveal">
            {upcoming.map(p => (
              <div key={p.date + p.place} className="row-item" style={{ gridTemplateColumns: "84px 1fr" }}>
                <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 17, color: "var(--ink)" }}>
                  {p.date.slice(5).replace("-", ".")}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: PRACTICE_TYPE_COLOR[p.type], flexShrink: 0 }} />
                    <span style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>{practiceLabel(p.type)}</span>
                    {p.status === "tentative" && <span className="t-caption">（予定）</span>}
                  </div>
                  <p className="t-body" style={{ marginTop: 5, fontSize: 15 }}>
                    {p.place}{p.time ? ` ・ ${p.time}` : ""}{p.note ? ` ・ ${p.note}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="cta-row reveal" style={{ marginTop: 28 }}>
          <a href="#contact" className="link-more">見学を申し込む</a>
        </div>
      </div>
    </section>
  );
}

/* ── お知らせ ── */
function NewsSection({ news }: { news: NewsItem[] }) {
  const shown = news.slice(0, 5);
  return (
    <section id="news" className="sec-tight sec-gray">
      <div className="sec-in">
        <Head title="お知らせ" center={false} />
        <div className="rows reveal" style={{ marginTop: -18 }}>
          {shown.map(n => {
            const body = (
              <>
                <div className="t-caption" style={{ fontFamily: "var(--font-oswald),sans-serif", paddingTop: 3 }}>
                  {n.date.replace(/-/g, ".")}
                  {n.category === "重要" && (
                    <span style={{ color: "var(--accent)", marginLeft: 10, fontFamily: "var(--font-zen),sans-serif" }}>重要</span>
                  )}
                </div>
                <div style={{ fontSize: 16, color: "var(--ink)", lineHeight: 1.6 }}>{n.title}</div>
              </>
            );
            return n.body ? (
              <Link key={n.slug} href={`/news/${n.slug}`} className="row-item" style={{ textDecoration: "none" }}>
                {body}
              </Link>
            ) : (
              <div key={n.slug} className="row-item">{body}</div>
            );
          })}
        </div>
        <div style={{ marginTop: 22 }}>
          <Link href="/news" className="link-more reveal">すべてのお知らせ</Link>
        </div>
      </div>
    </section>
  );
}

/* ── メンバー専用アプリ（黒の見せ場） ── */
function AppSection() {
  const features: [string, string][] = [
    ["SKドッパミンAI", "スイングや投球フォームを撮るだけで、骨格をもとに解析。点数と改善点が出ます。動画は端末の中だけで処理します。"],
    ["成績アプリ", "打率・防御率・OPS・守備率に加えて、WAR・wRC+ などの指標まで自動で集計。試合別でも通算でも見られます。"],
    ["ライブスコア記録", "試合の打席・走者・カウントをその場で記録。承認したものが成績へ反映されます。"],
    ["日程・出欠・投票", "練習日程の確認、参加の投票、運営からの投票やお知らせ。チームの「今」が手元にあります。"],
  ];
  return (
    <section id="app" className="sec sec-dark">
      <div className="sec-in center">
        <h2 className="t-head reveal">メンバー専用アプリ。</h2>
        <p className="t-sub reveal" style={{ marginTop: 16, maxWidth: 640, marginLeft: "auto", marginRight: "auto" }}>
          成績の集計も、フォームの解析も、日程の連絡も。
          草野球チームとしては珍しい環境を、自分たちで作っています。
        </p>
      </div>

      <div className="sec-in" style={{ marginTop: "clamp(44px, 6vw, 72px)" }}>
        <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))" }}>
          {features.map(([t, d], i) => (
            <div key={t} className="panel reveal" data-delay={String(i * 90)}>
              <h3 className="t-head-sm">{t}</h3>
              <p className="t-body" style={{ marginTop: 10, fontSize: 15 }}>{d}</p>
            </div>
          ))}
        </div>

        <div className="center" style={{ marginTop: 34 }}>
          <p className="t-caption reveal">
            アプリはメンバー専用です。入団後にご案内します。
          </p>
          <div className="cta-row center reveal" style={{ marginTop: 16, justifyContent: "center" }}>
            <Link href="/stats" className="link-more">メンバーの方はこちら</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── 目標 ── */
function VisionSection() {
  return (
    <section id="vision" className="sec sec-hair" style={{ background: "#fff" }}>
      <div className="sec-in">
        <Head title="本気で、追いかけています。" sub="立ち上げたばかりのチームだからこそ、大きな目標を掲げています。" />

        <div style={{ display: "grid", gap: "clamp(28px, 4vw, 48px)" }}>
          <div className="reveal">
            <p className="t-caption" style={{ fontFamily: "var(--font-oswald),sans-serif", letterSpacing: "0.2em", marginBottom: 8 }}>GOAL</p>
            <h3 className="t-head-sm">みずほPayPayドーム福岡で試合する</h3>
            <p className="t-body" style={{ marginTop: 10 }}>
              福岡のシンボルであるあの場所のグラウンドに立つ。
              いまはまだ立ち上がったばかりの小さなチームですが、本気でその舞台を目指して一歩ずつ積み上げます。
            </p>
          </div>

          <div className="reveal" data-delay="120">
            <p className="t-caption" style={{ fontFamily: "var(--font-oswald),sans-serif", letterSpacing: "0.2em", marginBottom: 8 }}>LEAGUE</p>
            <h3 className="t-head-sm">設立2年以内のチーム限定リーグを作る</h3>
            <p className="t-body" style={{ marginTop: 10 }}>
              いまあるリーグは強豪・古参チームばかりで、立ち上げたばかりのチームは練習試合でしか実戦を積めません。
              だからこそ「設立して2年以内のチーム限定」の公式リーグを準備しています。
              他のリーグに所属していても加入できます。
            </p>
          </div>
        </div>

        <div className="panel reveal" style={{ marginTop: "clamp(36px, 5vw, 60px)" }}>
          <h3 className="t-head-sm">練習試合の対戦相手を募集しています</h3>
          <p className="t-body" style={{ marginTop: 12 }}>
            日程などのご相談は、公式XのDMかお問い合わせフォーム（種別「練習試合・リーグのご相談」）からどうぞ。
            リーグの詳細についても、そちらで承ります。
          </p>
          <div className="cta-row" style={{ marginTop: 20 }}>
            <a href={X_URL} target="_blank" rel="noopener noreferrer" className="link-more">XのDMで相談する</a>
            <a href="#contact" className="link-more">お問い合わせフォーム</a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── メンバー募集 ── */
function RecruitSection() {
  const who = [
    "野球をやってみたい初心者（代表も初心者です）",
    "経験者の方（一緒に教え合える方）",
    "10代〜40代の男女",
    "福岡市内・近郊に通える方",
    "学生・社会人・ブランクのある方",
  ];
  const steps: [string, string][] = [
    ["応募する", "下のフォーム、またはXのDMからご連絡ください。"],
    ["返信を待つ", "3日以内に代表から詳細をお返しします。"],
    ["グラウンドへ", "次回の活動に参加してみてください。見学だけでも大丈夫です。"],
  ];
  return (
    <section id="recruit" className="sec sec-gray">
      <div className="sec-in">
        <Head title="こんな人を、待っています。" />

        <ul className="rows reveal" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {who.map(w => (
            <li key={w} className="row-item" style={{ display: "block", fontSize: 17, color: "var(--ink)", lineHeight: 1.6 }}>
              {w}
            </li>
          ))}
        </ul>

        <h3 className="t-head-sm reveal" style={{ marginTop: "clamp(44px, 6vw, 72px)", marginBottom: 22 }}>
          応募は3ステップです。
        </h3>
        <div style={{ display: "grid", gap: 22, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {steps.map(([t, d], i) => (
            <div key={t} className="reveal" data-delay={String(i * 90)}>
              <div style={{
                fontFamily: "var(--font-oswald),sans-serif", fontSize: 13,
                color: "var(--accent)", letterSpacing: "0.1em", marginBottom: 8,
              }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <h4 style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.01em" }}>{t}</h4>
              <p className="t-body" style={{ marginTop: 7, fontSize: 15 }}>{d}</p>
            </div>
          ))}
        </div>

        <div className="cta-row reveal" style={{ marginTop: 34 }}>
          <a href="#contact" className="cta">応募フォームへ</a>
          <a href={X_URL} target="_blank" rel="noopener noreferrer" className="link-more">XのDMで聞く</a>
        </div>
      </div>
    </section>
  );
}

/* ── 支援のお願い ── */
function SupportSection() {
  return (
    <section id="support" className="sec sec-hair" style={{ background: "#fff" }}>
      <div className="sec-in">
        <Head
          title="支えてくださる方を探しています。"
          sub="立ち上がったばかりのチームです。道具でも、応援でも、どんな形でも助かります。"
        />
        <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))" }}>
          <div className="panel reveal">
            <h3 className="t-head-sm">スポンサー</h3>
            <p className="t-body" style={{ marginTop: 12, fontSize: 15 }}>
              福岡の地域店舗・個人スポンサー様を募集しています。
              ユニフォームへのロゴ掲出、サイト・Xでのご紹介、試合当日のPRなど、
              ご予算に合わせてご相談いただけます。
            </p>
            <div style={{ marginTop: 18 }}>
              <Link href="/sponsor" className="link-more">プランと料金を見る</Link>
            </div>
          </div>

          <div className="panel reveal" data-delay="120">
            <h3 className="t-head-sm">道具のお裾分け</h3>
            <p className="t-body" style={{ marginTop: 12, fontSize: 15 }}>
              使っていないボール・バット・ベース・防具などがあれば、譲っていただけると大変助かります。
              「ちょうど処分しようと思ってた」くらいの気軽さで大丈夫です。
            </p>
            <div style={{ marginTop: 18 }}>
              <a href="#contact" className="link-more">支援について相談する</a>
            </div>
          </div>
        </div>
        <p className="t-caption reveal" style={{ marginTop: 22 }}>
          ご支援いただいた方は、サイトとXで感謝とともにご紹介させていただきます。
        </p>
      </div>
    </section>
  );
}

/* ── 公式スポンサー ── */
function SponsorsSection() {
  return (
    <section id="sponsors" className="sec sec-gray">
      <div className="sec-in-wide">
        <Head title="公式スポンサー" sub="活動を応援してくださっているパートナー様です。心より感謝申し上げます。" />
        <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          {SPONSORS.map((s, i) => (
            <a
              key={s.key}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="panel panel-plain reveal"
              data-delay={String(i * 100)}
              style={{ textDecoration: "none", color: "inherit", display: "block" }}
            >
              <div style={{ display: "grid", placeItems: "center", minHeight: 140, marginBottom: 20 }}>
                <Image src={s.logo} alt={s.name} width={280} height={140} className="object-contain max-w-full h-auto" style={{ maxHeight: 96 }} />
              </div>
              <p className="t-caption" style={{ fontFamily: "var(--font-oswald),sans-serif", letterSpacing: "0.18em" }}>{s.tagline}</p>
              <h3 className="t-head-sm" style={{ marginTop: 7 }}>
                {s.name}
                {s.reading && <span style={{ fontSize: 14, fontWeight: 400, color: "var(--ink-3)", marginLeft: 8 }}>{s.reading}</span>}
              </h3>
              {s.slogan && <p className="t-body" style={{ marginTop: 10, fontSize: 15 }}>{s.slogan}</p>}
              <span className="link-more" style={{ marginTop: 16, fontSize: 15 }}>サイトを見る</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── ブログ ── */
function BlogPreview({ posts }: { posts: BlogPost[] }) {
  if (posts.length === 0) return null;
  return (
    <section id="blog" className="sec-tight sec-hair" style={{ background: "#fff" }}>
      <div className="sec-in">
        <Head title="ブログ" center={false} />
        <div className="rows reveal" style={{ marginTop: -18 }}>
          {posts.slice(0, 3).map(p => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="row-item" style={{ textDecoration: "none" }}>
              <div className="t-caption" style={{ fontFamily: "var(--font-oswald),sans-serif", paddingTop: 3 }}>
                {p.date.replace(/-/g, ".")}
              </div>
              <div>
                <div style={{ fontSize: 16, color: "var(--ink)", lineHeight: 1.6 }}>{p.title}</div>
                {p.excerpt && <p className="t-body" style={{ marginTop: 5, fontSize: 14 }}>{p.excerpt}</p>}
              </div>
            </Link>
          ))}
        </div>
        <div style={{ marginTop: 22 }}>
          <Link href="/blog" className="link-more reveal">記事の一覧</Link>
        </div>
      </div>
    </section>
  );
}

/* ── お問い合わせ ── */
function ContactSection() {
  const links: [string, React.ReactNode][] = [
    ["X（旧Twitter）", <a key="x" href={X_URL} target="_blank" rel="noopener noreferrer" className="link-more" style={{ fontSize: 15 }}><XIcon size={13} />&nbsp;@SK_rookies_FK</a>],
    ["Instagram", <a key="i" href={IG_URL} target="_blank" rel="noopener noreferrer" className="link-more" style={{ fontSize: 15 }}><IGIcon size={14} />&nbsp;@{IG_HANDLE}</a>],
    ["グループLINE", <a key="l" href={LINE_URL} target="_blank" rel="noopener noreferrer" className="link-more" style={{ fontSize: 15 }}><LINEIcon size={16} />&nbsp;メンバー用の連絡網</a>],
    ["ジモティー", <a key="j" href={JIMOTY_URL} target="_blank" rel="noopener noreferrer" className="link-more" style={{ fontSize: 15 }}>募集ページ</a>],
    ["Labola", <a key="la" href={LABOLA_URL} target="_blank" rel="noopener noreferrer" className="link-more" style={{ fontSize: 15 }}>募集ページ</a>],
    ["郵便物", <span key="p" className="t-body" style={{ fontSize: 15 }}>〒812-0011 福岡市博多区博多駅前1-23-2<br />ParkFront博多駅前1丁目 5F-B</span>],
  ];
  return (
    <section id="contact" className="sec sec-gray">
      <div className="sec-in">
        <Head
          title="まずは、気軽に。"
          sub="応募・質問・スポンサー・道具のご支援まで、こちらで受け付けています。3日以内にお返事します。"
        />

        <div className="panel panel-plain reveal" style={{ marginBottom: 34 }}>
          <RecruitForm />
        </div>

        <h3 className="t-head-sm reveal" style={{ marginBottom: 6 }}>ほかの連絡先</h3>
        <div className="rows reveal">
          {links.map(([label, node]) => (
            <div key={label} className="row-item">
              <div className="t-caption" style={{ paddingTop: 4 }}>{label}</div>
              <div>{node}</div>
            </div>
          ))}
        </div>

        <p className="t-caption reveal" style={{ marginTop: 22 }}>
          女性はプレイヤーでもマネージャーでも歓迎です。代表は19歳ですが、年齢差はまったく気にしていません。
        </p>
      </div>
    </section>
  );
}

/* ── フッター ── */
function Footer() {
  const menu: [string, string][] = [
    ["#about", "チーム紹介"], ["#activity", "活動概要"], ["#schedule", "日程"],
    ["#app", "公式アプリ"], ["#vision", "目標"], ["#recruit", "メンバー募集"],
    ["#sponsors", "スポンサー"], ["#contact", "お問い合わせ"],
  ];
  const sub: [string, string][] = [
    ["/news", "お知らせ"], ["/blog", "ブログ"], ["/uniform", "ユニフォーム"],
    ["/sponsor", "スポンサー募集"], ["/stats", "メンバー成績アプリ"],
    ["/privacy", "プライバシーポリシー"], ["/commercial", "特定商取引法に基づく表記"],
  ];
  return (
    <footer style={{ background: "#f5f5f7", borderTop: "1px solid var(--hair)" }}>
      <div className="sec-in-wide" style={{ paddingTop: 44, paddingBottom: 36 }}>
        <div style={{ display: "grid", gap: 30, gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Image src="/sk_logo_crop.png" alt={TEAM_NAME_JP} width={54} height={44} className="object-contain" style={{ width: 38, height: "auto" }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{TEAM_NAME_JP}</p>
                <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 10, letterSpacing: "0.24em", color: "var(--ink-3)", marginTop: 2 }}>{TEAM_NAME_EN}</p>
              </div>
            </div>
            <p className="t-caption" style={{ maxWidth: 280 }}>
              福岡市を拠点に活動する、初心者中心の草野球チームです。
            </p>
            <div style={{ display: "flex", gap: 14, marginTop: 16 }}>
              <a href={X_URL} target="_blank" rel="noopener noreferrer" aria-label="X" style={{ color: "var(--ink-2)" }}><XIcon size={16} /></a>
              <a href={IG_URL} target="_blank" rel="noopener noreferrer" aria-label="Instagram" style={{ color: "var(--ink-2)" }}><IGIcon size={16} /></a>
              <a href={LINE_URL} target="_blank" rel="noopener noreferrer" aria-label="LINE" style={{ color: "var(--ink-2)" }}><LINEIcon size={17} /></a>
            </div>
          </div>

          <div>
            <p className="t-caption" style={{ marginBottom: 12, color: "var(--ink)" }}>サイト内</p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 9 }}>
              {menu.map(([h, l]) => (
                <li key={h}><a href={h} style={{ fontSize: 13, color: "var(--ink-2)", textDecoration: "none" }}>{l}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <p className="t-caption" style={{ marginBottom: 12, color: "var(--ink)" }}>ページ</p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 9 }}>
              {sub.map(([h, l]) => (
                <li key={h}><Link href={h} style={{ fontSize: 13, color: "var(--ink-2)", textDecoration: "none" }}>{l}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <p className="t-caption" style={{ marginBottom: 12, color: "var(--ink)" }}>チーム情報</p>
            <dl style={{ margin: 0, display: "grid", gap: 9 }}>
              {[
                ["拠点", "福岡市"],
                ["設立", `${FOUNDED}年`],
                ["代表", "柏木 海斗"],
                ["対象", "10代〜40代 / 初心者中心"],
              ].map(([l, v]) => (
                <div key={l} style={{ display: "flex", gap: 12 }}>
                  <dt className="t-caption" style={{ width: 34, flexShrink: 0 }}>{l}</dt>
                  <dd style={{ fontSize: 13, color: "var(--ink-2)", margin: 0 }}>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div style={{ marginTop: 34, paddingTop: 18, borderTop: "1px solid var(--hair)", display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between" }}>
          <span className="t-caption">© {new Date().getFullYear()} {TEAM_NAME_JP}</span>
          <span className="t-caption" style={{ fontFamily: "var(--font-oswald),sans-serif", letterSpacing: "0.2em" }}>FUKUOKA — EST. {FOUNDED}</span>
        </div>
      </div>
    </footer>
  );
}

/* ── ページ ───────────────────────────────────────────── */
export default async function Home() {
  const [news, practices, blogs] = await Promise.all([getNews(), getPractices(), getBlogs()]);
  return (
    <>
      <ScrollReveal />
      <Header />
      <main id="top">
        <HeroSection memberCount={MEMBER_COUNT} />
        <AboutSection />
        <ActivitySection />
        <ScheduleSection practices={practices} />
        <NewsSection news={news} />
        <AppSection />
        <VisionSection />
        <RecruitSection />
        <SupportSection />
        <SponsorsSection />
        <FaqSection />
        <BlogPreview posts={blogs} />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
