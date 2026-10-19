/**
 * 博多ルーキーリーグの案内
 *
 * 当チームが主催するリーグ。2026年11月の設立に向けて加盟チームを募集中。
 * 内容は src/data/league.ts にまとめてあるので、予定が変わったらそちらを直す。
 *
 * チームのメンバー募集（休止中）と紛らわしくならないよう、
 * 「募集しているのはチームであって選手ではない」と分かる書き方にしている。
 */
import {
  LEAGUE,
  LEAGUE_CONDITIONS,
  LEAGUE_RECRUIT_OPEN,
  LEAGUE_SCHEDULE,
  LEAGUE_SITE_URL,
  LEAGUE_WHY,
} from "@/data/league";

const NAVY = "#0b1e3f";
const GOLD = "#d4a82a";
const RED = "#d10024";

export default function LeagueSection({ xUrl }: { xUrl: string }) {
  return (
    <section id="league" style={{ background: NAVY, position: "relative", overflow: "hidden" }}>
      {/* 背景の大きな文字。装飾なので読み上げ対象から外す */}
      <div
        aria-hidden
        style={{
          position: "absolute", right: -40, top: -30,
          fontFamily: "var(--font-oswald),sans-serif", fontWeight: 700,
          fontSize: "clamp(160px,26vw,420px)", lineHeight: 1,
          color: "rgba(255,255,255,0.035)", userSelect: "none", pointerEvents: "none",
        }}
      >
        {LEAGUE.abbr}
      </div>

      <div className="max-w-[1280px] mx-auto px-5 md:px-8 py-14 md:py-24 relative">
        {/* 見出し */}
        <div className="reveal" style={{ marginBottom: 34 }}>
          <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 10.5, color: GOLD, letterSpacing: "0.35em", fontWeight: 700, marginBottom: 12 }}>
            {LEAGUE.nameEn}
          </p>
          <h2 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: "clamp(26px,3.6vw,44px)", fontWeight: 900, color: "#fff", lineHeight: 1.22 }}>
            <span style={{ color: GOLD }}>2026年11月</span>、<br className="md:hidden" />
            {LEAGUE.name}を設立します。
          </h2>
          <p style={{ marginTop: 18, fontSize: 14.5, color: "rgba(255,255,255,0.72)", lineHeight: 2, maxWidth: 760 }}>
            {LEAGUE_WHY}
          </p>
        </div>

        {/* 募集中であることを、いちばん目立つ形で出す */}
        {LEAGUE_RECRUIT_OPEN && (
          <div
            className="reveal"
            style={{ background: "#fff", padding: "26px 28px", borderLeft: `6px solid ${RED}`, marginBottom: 34 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
              <span style={{ background: RED, color: "#fff", fontSize: 11, fontWeight: 900, padding: "5px 12px", letterSpacing: "0.12em" }}>
                募集中
              </span>
              <p style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: "clamp(17px,2.2vw,22px)", fontWeight: 900, color: NAVY, lineHeight: 1.4 }}>
                加盟チームを募集しています
              </p>
            </div>
            <p style={{ fontSize: 13.5, color: "rgba(19,25,34,0.72)", lineHeight: 1.95, maxWidth: 760 }}>
              募集しているのは<strong style={{ color: NAVY }}>チーム単位での加盟</strong>です。
              設立して間もないチーム、初心者が多いチームを対象としています。
              ほかのリーグに所属していても加盟できます。
            </p>
            <p style={{ marginTop: 10, fontSize: 12.5, color: "rgba(19,25,34,0.55)", lineHeight: 1.9 }}>
              ※ 博多SKルーキーズの選手募集とは別のお話です。当チームの選手募集は休止中です。
            </p>
          </div>
        )}

        {/* 11月に何があるか */}
        <div className="reveal" style={{ marginBottom: 34 }}>
          <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 10, color: GOLD, letterSpacing: "0.35em", marginBottom: 16, fontWeight: 700 }}>
            SCHEDULE
          </p>
          <ol style={{ display: "grid", gap: 12 }}>
            {LEAGUE_SCHEDULE.map(s => (
              <li
                key={`${s.when}-${s.title}`}
                style={{
                  background: s.highlight ? "rgba(212,168,42,0.1)" : "rgba(255,255,255,0.045)",
                  border: `1px solid ${s.highlight ? "rgba(212,168,42,0.4)" : "rgba(255,255,255,0.12)"}`,
                  padding: "20px 22px",
                  display: "grid",
                  gap: 6,
                  gridTemplateColumns: "1fr",
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 12, color: GOLD, letterSpacing: "0.1em", fontWeight: 700, whiteSpace: "nowrap" }}>
                    {s.when}
                  </span>
                  <span style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: 16, fontWeight: 900, color: "#fff" }}>
                    {s.title}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.62)", lineHeight: 1.95 }}>{s.body}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* 加盟の条件 */}
        <div className="reveal" style={{ marginBottom: 30 }}>
          <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 10, color: GOLD, letterSpacing: "0.35em", marginBottom: 16, fontWeight: 700 }}>
            REQUIREMENTS
          </p>
          <dl style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
            {LEAGUE_CONDITIONS.map((c, i) => (
              <div
                key={c.label}
                style={{
                  // 画面が広ければ2列、狭ければ自然に折り返す
                  display: "flex", flexWrap: "wrap", gap: "4px 24px", padding: "16px 20px",
                  borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <dt style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)", fontWeight: 700, minWidth: 150, flexShrink: 0 }}>
                  {c.label}
                </dt>
                <dd style={{ flex: "1 1 260px" }}>
                  <span style={{ fontSize: 14.5, color: "#fff", fontWeight: 700 }}>{c.value}</span>
                  {c.note && (
                    <span style={{ display: "block", marginTop: 4, fontSize: 12.5, color: "rgba(255,255,255,0.5)", lineHeight: 1.85 }}>
                      {c.note}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <p style={{ marginTop: 12, fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.9 }}>
            ※ 条件を満たしているかは申請内容をもとに確認しますが、加盟の可否は運営で判断します。
            迷われる場合も、まずはご相談ください。
          </p>
        </div>

        {/* 連絡先 */}
        <div className="reveal" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {LEAGUE_SITE_URL && (
            <a
              href={LEAGUE_SITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 26px",
                background: GOLD, color: NAVY, textDecoration: "none",
                fontSize: 13.5, fontWeight: 900, letterSpacing: "0.06em", whiteSpace: "nowrap",
              }}
            >
              リーグ公式サイト →
            </a>
          )}
          <a
            href="#contact"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 26px",
              background: LEAGUE_SITE_URL ? "rgba(255,255,255,0.06)" : GOLD,
              color: LEAGUE_SITE_URL ? "#fff" : NAVY,
              border: LEAGUE_SITE_URL ? "1px solid rgba(255,255,255,0.25)" : "none",
              textDecoration: "none", fontSize: 13.5, fontWeight: 900,
              letterSpacing: "0.06em", whiteSpace: "nowrap",
            }}
          >
            加盟について相談する →
          </a>
          <a
            href={xUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 26px",
              color: "#fff", textDecoration: "none", fontSize: 13.5, fontWeight: 700,
              letterSpacing: "0.06em", whiteSpace: "nowrap",
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.25)",
            }}
          >
            XのDMで聞く →
          </a>
        </div>

        <p style={{ marginTop: 20, fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.9 }}>
          主催・運営：{LEAGUE.organizer}　／　お問い合わせは種別「練習試合・リーグのご相談」をお選びください。
        </p>
      </div>
    </section>
  );
}
