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
    a: "中央区の舞鶴公園野球場、博多区の山王公園野球場・東平尾公園 ベスト電器スタジアム野球場をメインに、その都度空いている市内のグラウンドを予約して活動します。市内・近郊からアクセスしやすい場所を選ぶので、福岡市の各区・糸島・春日・大野城・粕屋エリアからの参加もOKです。",
  },
  {
    q: "費用はいくらかかりますか？",
    a: "月会費500円（2026年8月分より1,000円に改定。半年プラン選択中の既存メンバーは10月末まで現行プラン適用）と、活動参加ごとのグラウンド代（2時間練習で1人400円、4時間練習で1人500円・人数に関わらず一律）が基本費用です。2026年5月15日以降の新規入団者は入会費2,000円が必要です。また、安全のため2026年6月15日以降は全メンバーにスポーツ集団保険（年2,000円）への加入が義務となります。ユニフォーム購入の強制や高額な年会費はありません。",
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
    <section id="faq" className="sec sec-hair" style={{ background: "#fff" }}>
      <div className="sec-in">
        <div className="center" style={{ marginBottom: "clamp(34px, 4.6vw, 56px)" }}>
          <h2 className="t-head reveal">よくある質問</h2>
          <p className="t-sub reveal" style={{ marginTop: 16, maxWidth: 620, marginLeft: "auto", marginRight: "auto" }}>
            ほかに気になることがあれば、
            <a href="#contact" className="link-more" style={{ fontSize: "inherit" }}>お問い合わせ</a>
            {" "}か{" "}
            <a href={X_URL} target="_blank" rel="noopener noreferrer" className="link-more" style={{ fontSize: "inherit" }}>XのDM</a>
            {" "}までどうぞ。
          </p>
        </div>

        <div className="rows reveal">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={i} style={{ borderBottom: "1px solid var(--hair)" }}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  style={{
                    width: "100%", display: "flex", alignItems: "flex-start", gap: 18,
                    padding: "20px 2px", background: "transparent", border: "none",
                    cursor: "pointer", textAlign: "left",
                  }}
                >
                  <span style={{
                    flex: 1, fontSize: 17, lineHeight: 1.55, letterSpacing: "-0.01em",
                    color: isOpen ? "var(--accent)" : "var(--ink)",
                    transition: "color .2s",
                  }}>
                    {f.q}
                  </span>
                  {/* 開閉の印。プラスを回転させて×にする */}
                  <span style={{
                    flexShrink: 0, marginTop: 4, width: 15, height: 15, position: "relative",
                    color: isOpen ? "var(--accent)" : "var(--ink-3)",
                    transform: isOpen ? "rotate(45deg)" : "none",
                    transition: "transform .3s var(--ease-out), color .2s",
                  }}>
                    <span style={{ position: "absolute", left: 0, top: 7, width: 15, height: 1.5, background: "currentColor" }} />
                    <span style={{ position: "absolute", left: 7, top: 0, width: 1.5, height: 15, background: "currentColor" }} />
                  </span>
                </button>

                <div style={{
                  overflow: "hidden",
                  maxHeight: isOpen ? 600 : 0,
                  transition: "max-height .4s cubic-bezier(0.4,0,0.2,1)",
                }}>
                  <p className="t-body" style={{ padding: "0 34px 24px 2px" }}>{f.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
