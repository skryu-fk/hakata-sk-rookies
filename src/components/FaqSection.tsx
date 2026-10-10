"use client";

import { useState } from "react";
import {
  MANAGER_OPEN,
  RECRUIT_OPEN,
  RECRUIT_PAUSED_SINCE,
  RECRUIT_PAUSE_PENDING,
  RECRUIT_PAUSE_REASON,
  RECRUIT_PAUSE_RESUME,
} from "@/data/recruit";

const X_URL = "https://x.com/SK_rookies_FK";

/** マネージャーを募集している間だけ、FAQの先頭に出す項目 */
const MANAGER_FAQS = [
  {
    q: "マネージャーは募集していますか？",
    a: "はい、積極的に募集しています。選手（プレイヤー）の募集は休止していますが、マネージャーは別枠で受け付けています。お問い合わせフォームの「ご相談内容」で「マネージャー応募」を選んでご連絡ください。",
  },
  {
    q: "マネージャーは何をするんですか？",
    a: "主に3つです。①撮影 — 練習や試合の写真・動画を撮って、サイトやSNSでの発信に使います（スマホでOK）。②イベントの企画 — ごはん会・合宿・応援企画など、チームが盛り上がることを一緒に考えます。③選手データの管理 — スコアや打率などの記録をメンバー専用アプリに入力します。全部を一人でやる必要はなく、できることからで大丈夫です。",
  },
  {
    q: "マネージャーも費用がかかりますか？",
    a: "月会費はいただきません。入会費（選手は2,000円）も免除です。ご負担いただくのは、参加した日のグラウンド代（1人500〜800円）だけです。",
  },
  {
    q: "野球を知らなくてもマネージャーはできますか？",
    a: "できます。野球の経験・知識は必要ありません。記録のつけ方は入ってから教えますし、代表自身も初心者スタートなので「分からない」が当たり前の雰囲気です。男女は問いません。",
  },
];

/** 選手の募集を休止している間だけ、FAQに出す項目 */
const PAUSE_FAQ = {
  q: "いま選手（プレイヤー）として応募できますか？",
  a: `できません。${RECRUIT_PAUSED_SINCE}より、${RECRUIT_PAUSE_REASON}${RECRUIT_PAUSE_PENDING}${RECRUIT_PAUSE_RESUME}なお、マネージャーのご応募・練習試合のご相談・スポンサー・道具のご支援・チームへのご質問は、休止中も受け付けています。`,
};

const faqs = [
  ...(MANAGER_OPEN ? MANAGER_FAQS : []),
  ...(RECRUIT_OPEN ? [] : [PAUSE_FAQ]),
  {
    q: "本当に未経験・初心者でも大丈夫ですか？",
    a: "大丈夫です。福岡市でもっとも初心者が始めやすい草野球チームを目指しています。代表自身も野球未経験からのスタートで、みんなで少しずつ覚えながら楽しんでいくスタイルなので、ルールを知らない段階でも気後れなく参加できます。",
  },
  {
    q: "福岡市のどこで活動していますか？",
    a: "中央区の舞鶴公園野球場、博多区の山王公園野球場・東平尾公園 ベスト電器スタジアム野球場をメインに、その都度空いている市内のグラウンドを予約して活動します。市内・近郊からアクセスしやすい場所を選ぶので、福岡市の各区・糸島・春日・大野城・粕屋エリアからの参加もOKです。",
  },
  {
    q: "費用はいくらかかりますか？",
    a: "月会費500円（2026年8月分より1,000円に改定。半年プラン選択中の既存メンバーは10月末まで現行プラン適用）と、活動参加ごとのグラウンド代（人数に関わらず1人一律で2時間600円・4時間700円／中学生・高校生は時間に関係なく一律500円／試合の日は1人+100円）が基本費用です。2026年5月15日以降の新規入団者は入会費2,000円が必要です。また、安全のため2026年6月15日以降は全メンバーにスポーツ集団保険（年2,000円）への加入が義務となります。ユニフォーム購入の強制や高額な年会費はありません。",
  },
  {
    q: "道具は何が必要ですか？",
    a: "まずはグローブだけ用意してもらえればOKです。バット・ボール・ベースなどはチームで用意します。グローブもこれから買う方は、スポーツ量販店で3,000〜5,000円の初心者用で十分です。",
  },
  {
    q: "何歳まで参加できますか？10代や40代でも浮きませんか？",
    a: "10代〜40代までの幅広い年齢を想定しています。代表は19歳ですが、社会人・主婦・学生など多様な年齢のメンバーを歓迎しています。野球は世代を超えて楽しめるスポーツなので、年齢差は全く気にしなくて大丈夫です。",
  },
  {
    q: "女性も参加できますか？マネージャー希望でもOK？",
    a: "もちろんです。男女問わず歓迎します。とくにマネージャー（撮影・イベント企画・選手データの管理）は現在積極的に募集しており、月会費・入会費もいただきません。プレイヤーとしてのご参加は、いまは募集を休止しています。",
  },
  {
    q: "代表が19歳（10代）と若いけど、20代〜40代でも大丈夫？",
    a: "全く問題ありません。代表が10代だからといって遠慮する必要はないです。フラットに「野球を楽しむ仲間」として接するので、変に気を遣う必要はありません。むしろ社会人としての経験や野球の知識をシェアしてもらえると助かります。",
  },
  {
    q: "活動はどれくらいの頻度ですか？",
    a: "キャッチボール中心の公園練習が週1〜2回、野球場を借りてのノック・バッティング練習が月3〜4回あります。平日夜・週末どちらも活動予定で、仕事や学業と両立しやすいペースを意識しています。毎回参加できなくても問題ありません。直近の日程はサイト内の「スケジュール」セクションでご確認ください。",
  },
  {
    q: "経験者だけど入れますか？",
    a: "大歓迎です。「みんなで教え合う」スタイルなので、経験者の方には得意なところを共有してもらえると助かります。本気で上手くなりたい方も、久しぶりに野球したい方も、どちらも居場所があります。",
  },
  {
    q: "見学だけでもできますか？",
    a: RECRUIT_OPEN
      ? "もちろん可能です。応募フォームかX（@SK_rookies_FK）のDMで「見学希望」とお伝えください。次回の活動日時と場所をご案内します。"
      : "申し訳ありません。選手の募集を休止している間は、見学・体験参加のお受付もできません。再開しだい、このサイトのお知らせと公式X（@SK_rookies_FK）でご案内しますので、よろしければフォローしてお待ちください。なお、マネージャーをご希望の方は別途受け付けていますので、お気軽にご連絡ください。",
  },
  {
    q: "対戦相手（他のチーム）も募集していますか？",
    a: "募集しています！メンバーも集まり、いよいよ実戦へ。練習試合の対戦相手を募集中です。日程などのご相談は、X（@SK_rookies_FK）のDM、または公式サイトのお問い合わせフォーム（ご相談内容「練習試合・リーグのご相談」）からお気軽にどうぞ。設立2年以内のチーム限定リーグの創設も進めており、その詳細もこちらで承ります。",
  },
  {
    q: "メンバー専用の公式アプリがあるって本当ですか？",
    a: "はい。博多SKルーキーズには、他チームにはまずないメンバー専用の公式アプリがあります。打率・防御率・守備率などの成績管理に加え、独自開発AI「SKドッパミンAI」で自分のバッティング／ピッチングフォームを動画から診断（点数・改善点・推定スイング速度）。試合のライブスコア記録、練習日程・出欠・通知にも対応しています。アプリはメンバー専用（パスワード制）で、個人情報は厳重に保護。入団後にご案内します。",
  },
  {
    q: "リーグを作るって聞きました。本当ですか？",
    a: "はい。今あるリーグは強豪・古参チームが多く、立ち上げたばかりのチームは練習試合でしか実戦を積めないのが現状です。そこで「設立2年以内のチーム限定」の公式リーグを、2026年9月の立ち上げをめどに準備しています。他のリーグに所属していても参加OK。興味のあるチーム様は、X（@SK_rookies_FK）のDM、または公式サイトのお問い合わせフォーム（ご相談内容「練習試合・リーグのご相談」）までご連絡ください。",
  },
];

export default function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="bg-base border-b border-line">
      <div className="max-w-[1280px] mx-auto px-5 md:px-8 py-14 md:py-24">
        {/* Section title */}
        <div className="mb-14 reveal">
          <div className="section-ghost text-navy/5 mb-[-18px]" style={{ fontSize: "clamp(72px,12vw,140px)" }}>FAQ</div>
          <div>
            <p className="font-display text-[11px] tracking-[0.45em] text-red uppercase mb-2.5">FAQ</p>
            <h2 className="font-sans font-black text-navy" style={{ fontSize: "clamp(26px,3.5vw,42px)" }}>よくある質問</h2>
            <div className="w-11 h-1 bg-red mt-3.5 rounded-sm" />
          </div>
        </div>

        <p className="reveal text-muted text-[15px] leading-relaxed mb-11 max-w-lg" style={{ marginTop: -28 }}>
          他に気になることは
          <a href="#contact" className="text-red font-bold underline decoration-dotted underline-offset-4">お問い合わせフォーム</a>か
          <a href={X_URL} target="_blank" rel="noopener noreferrer" className="text-red font-bold underline decoration-dotted underline-offset-4">X（@SK_rookies_FK）</a>
          までお気軽にどうぞ。
        </p>

        {/* 入団・費用・見学などの回答は「選手を募集している前提」で書かれているため、
            休止中はここで一度まとめてお断りしておく（回答ごとに注記を足すより読みやすい） */}
        {!RECRUIT_OPEN && (
          <div className="reveal mb-8 text-[13.5px] leading-[1.95]" style={{ background: "#f5f2ec", borderLeft: "4px solid #d10024", padding: "16px 20px", color: "#3a3f4a", maxWidth: 760 }}>
            <p className="font-bold text-navy mb-1">
              {MANAGER_OPEN ? "マネージャーは募集中／選手の募集は休止中です" : "現在、新規メンバーの募集は休止しています"}
            </p>
            入団・費用・道具・見学などについての以下の回答は、<strong>選手</strong>として参加する場合のもので、募集を再開したときのご案内です。いまはお受付ができませんので、ご了承ください。
            {MANAGER_OPEN && <><a href="#manager" className="text-red font-bold underline decoration-dotted underline-offset-4" style={{ marginLeft: 4 }}>マネージャー募集について →</a></>}
            <a href="#recruit" className="text-red font-bold underline decoration-dotted underline-offset-4" style={{ marginLeft: 4 }}>選手の募集状況 →</a>
          </div>
        )}

        <div style={{ borderTop: "2px solid #0b1e3f" }}>
          {faqs.map((f, i) => (
            <div key={i} className="reveal border-b border-line" style={{ animationDelay: `${i * 40}ms` }}>
              {/* Question row */}
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-start gap-5 text-left transition-colors"
                style={{
                  padding: "22px 16px",
                  background: open === i ? "rgba(209,0,36,0.03)" : "transparent",
                  border: "none", cursor: "pointer",
                }}>
                {/* Q badge */}
                <div style={{
                  width: 44, height: 44, flexShrink: 0,
                  background: open === i ? "#d10024" : "#0b1e3f",
                  display: "grid", placeItems: "center",
                  fontFamily: "var(--font-oswald), sans-serif",
                  fontSize: 13, color: "#fff", letterSpacing: "0.05em",
                  transition: "background 0.2s",
                }}>
                  Q{String(i + 1).padStart(2, "0")}
                </div>
                {/* Text */}
                <span className="flex-1 font-sans font-bold pt-2.5 leading-snug transition-colors"
                  style={{ fontSize: "clamp(14px,1.5vw,17px)", color: open === i ? "#d10024" : "#0b1e3f" }}>
                  {f.q}
                </span>
                {/* Toggle */}
                <div style={{
                  width: 32, height: 32, flexShrink: 0, marginTop: 6,
                  border: `2px solid ${open === i ? "#d10024" : "#d8d4cb"}`,
                  borderRadius: "50%", display: "grid", placeItems: "center",
                  color: open === i ? "#d10024" : "#aaa",
                  fontSize: 18, fontWeight: 700,
                  transform: open === i ? "rotate(45deg)" : "none",
                  transition: "all 0.25s cubic-bezier(0.2,0.8,0.2,1)",
                }}>+</div>
              </button>
              {/* Answer */}
              <div style={{
                overflow: "hidden",
                maxHeight: open === i ? 500 : 0,
                transition: "max-height 0.4s cubic-bezier(0.4,0,0.2,1)",
              }}>
                <div className="pb-7 pl-4 pr-4 pt-2 md:pl-20">
                  <p className="text-[15px] leading-[1.95]" style={{ color: "#3a3f4a", borderLeft: "3px solid rgba(209,0,36,0.2)", paddingLeft: 16 }}>
                    {f.a}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
