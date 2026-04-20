"use client";

import { useState } from "react";

const X_URL = "https://x.com/SK_rookies_FK";

const faqs = [
  {
    q: "本当に未経験・初心者でも大丈夫ですか？",
    a: "大丈夫です。福岡市でもっとも初心者が始めやすい草野球チームを目指しています。代表自身も野球未経験からのスタートで、みんなで少しずつ覚えながら楽しんでいくスタイルなので、ルールを知らない段階でも気後れなく参加できます。",
  },
  {
    q: "福岡市のどこで活動していますか？",
    a: "福岡市内の公営グラウンド（雁の巣・西南杜の湖畔公園・美野島公園など）を中心に、その都度空いている場所を予約して活動します。市内・近郊からアクセスしやすい場所を選ぶので、福岡市の各区・糸島・春日・大野城・粕屋エリアからの参加もOKです。",
  },
  {
    q: "費用はいくらかかりますか？",
    a: "月額500円のチーム費と、活動日ごとのグラウンド代の実費シェア（1回あたり数百円程度）のみです。ユニフォーム購入や入会金、高い年会費などはありません。",
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
    a: "もちろんです。男女問わず、野球を楽しみたい方はどなたでも歓迎します。プレイヤーとしてだけでなく、スコア記録・撮影・練習サポートなどを担当してくれるマネージャーとしての参加も大歓迎です。",
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
    a: "もちろん可能です。応募フォームかX（@SK_rookies_FK）のDMで「見学希望」とお伝えください。次回の活動日時と場所をご案内します。",
  },
  {
    q: "対戦相手（他のチーム）も募集していますか？",
    a: "現在はメンバー集めと道具・防具の準備に専念しているため、対戦相手の募集は一時停止中です。人数と装備が整ったタイミングで、福岡市内・近郊の草野球チーム様に練習試合をお願いしていく予定です。",
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
