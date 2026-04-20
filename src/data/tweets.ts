/**
 * X（Twitter）ツイート掲載データ
 *
 * 追加方法:
 *   1. 下の tweets 配列の一番上に新しい項目を追加
 *   2. url はツイート個別ページのURL（https://x.com/SK_rookies_FK/status/...）
 *   3. 保存 → commit & push で反映
 *
 * GitHubから編集する場合:
 *   https://github.com/skryu-fk/hakata-sk-rookies/edit/main/src/data/tweets.ts
 */

export type Tweet = {
  date: string;
  text: string;
  url?: string;
};

export const tweets: Tweet[] = [
  {
    date: "2026.04.20",
    text:
      "公式サイトが完成しました！ 博多SKルーキーズのメンバー募集、活動内容、FAQなど全部載せています。福岡市で草野球始めたい方、ぜひ覗いてみてください⚾ https://hakata-sk-rookies-v2y8.vercel.app",
  },
  {
    date: "2026.04.20",
    text:
      "博多SKルーキーズ、公式X始動しました！ 福岡市を拠点に10代〜40代、初心者中心で動く新しい草野球チームです。活動報告・募集情報・雑談までゆるく発信していきます。よろしくお願いします🙇",
  },
  {
    date: "2026.04.19",
    text:
      "メンバーを5名ほど募集しています！ 野球未経験もOK、経験者も歓迎、10代〜40代どなたでも。月500円＋グラウンド代実費のみ。グローブだけあれば始められます。気になる方はDMお待ちしてます⚾",
  },
];
