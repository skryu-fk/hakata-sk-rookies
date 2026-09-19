/**
 * 公式スポンサー（パートナー）の情報。
 * トップページのスポンサー欄と、/sponsor（スポンサー募集ページ）の両方で使う。
 * ここに追加すれば両方に反映される。
 */
export type Sponsor = {
  key: string;
  name: string;
  reading?: string;    // 読み方（例: "オーヴァーン"）
  tagline: string;     // 短いタグライン（例: "APPAREL BRAND"）
  logo: string;        // /sponsors/xxx.png
  url: string;
  body: string;        // 紹介文（"\n\n" で段落区切り）
  slogan?: string;     // スローガン（強調表示）
  sloganJp?: string;   // スローガン日本語
  badge?: string;      // 例: "公式パートナー"
  highlight?: {        // 強調アナウンス（新作リリース等）
    label: string;
    title: string;
    body: string;
  };
};

export const SPONSORS: Sponsor[] = [
  {
    key: "ovrn",
    name: "OVRN.",
    reading: "オーヴァーン",
    tagline: "APPAREL BRAND",
    logo: "/sponsors/ovrn.png",
    url: "https://ovrnofficial.base.shop/",
    body:
      "「Over + Own」を由来とする、ストリートブランド。" +
      "「他人の真似ではなく、自分を超えていくこと」 をテーマに、自分らしく生きようとする人の姿をファッションで表現しています。\n\n" +
      "誰もが自由に自分を表現できる場所をつくりたいという想いから生まれたOVRN.は、トレンドのコピーではなく、リアルに毎日着られるストリートを軸に、" +
      "シルエット・素材・グラフィックの一つひとつにこだわって 自分を貫ける一着 をデザイン。" +
      "これまでにリリースしたアイテムは販売開始と同時に即完売するものも多く、コアなファンを獲得してきました。\n\n" +
      "妥協のないクオリティを担保するため、専属工場と直接連携。素材選びからパターン、縫製まで一切手を抜かず、1着ごとに納得のいく品質で仕上げています。",
    slogan: "Go OVR your limit.",
    sloganJp: "自分の軸を曲げずに、限界を越えていけ。",
    badge: "公式パートナー",
    highlight: {
      label: "RESTART — COMING THIS SUMMER",
      title: "OVRN. が、ついに再始動。",
      body:
        "一時期活動を休止していたOVRN.が、2026年夏、新作コレクションのドロップとともに再始動します。" +
        "ブランド休止期間中に積み重ねたデザインの研磨と素材リサーチを経て、これまで以上にコンセプトを研ぎ澄ました渾身のラインナップを準備中。" +
        "リリースの詳細は、公式ショップおよびSNSで随時告知予定。続報をお楽しみに。",
    },
  },
];
