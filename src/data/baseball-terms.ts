/**
 * 野球用語タイピング用辞書。
 * 「日本語の単語を見せて、対応するローマ字を打つ」寿司打スタイル。
 *   - word   : 表示する日本語（カタカナ or 漢字）
 *   - romaji : タイピング対象（半角小文字 a-z のみ）
 *   - hint   : 意味/補足（クイズモードのお題、タイピングモードのサブ表示）
 *   - cat    : カテゴリ
 *
 * 長音「ー」は母音を二重に（例：カーブ → kaabu）、促音「っ」は次の子音を二重に（例：ピッチャー → picchaa）、
 * 撥音「ん」は n 一文字、で統一しています。
 */

export type Category =
  | "投球" | "打撃" | "守備" | "走塁"
  | "ポジション" | "用具" | "戦術" | "ルール" | "一般";

export type BaseballTerm = {
  word: string;
  romaji: string;
  hint: string;
  cat: Category;
};

export const TERMS: BaseballTerm[] = [
  // ── 投球 ──
  { word: "ストレート",     romaji: "sutoreeto",     hint: "変化しないまっすぐな速球",                   cat: "投球" },
  { word: "カーブ",         romaji: "kaabu",         hint: "曲がりながら落ちる変化球",                   cat: "投球" },
  { word: "スライダー",     romaji: "suraidaa",      hint: "横に滑るように曲がる変化球",                 cat: "投球" },
  { word: "フォーク",       romaji: "fooku",         hint: "指の間に挟んで落とすボール",                 cat: "投球" },
  { word: "シンカー",       romaji: "shinkaa",       hint: "沈むような変化球",                           cat: "投球" },
  { word: "シュート",       romaji: "shuuto",        hint: "投手の利き腕方向に切れ込む球",               cat: "投球" },
  { word: "チェンジアップ", romaji: "chenjiappu",    hint: "球速を落として打者のタイミングを外す球",     cat: "投球" },
  { word: "速球",           romaji: "sokkyuu",       hint: "ストレート系の速いボール",                   cat: "投球" },
  { word: "ストライク",     romaji: "sutoraiku",     hint: "ストライクゾーンを通った投球",               cat: "投球" },
  { word: "ボール",         romaji: "booru",         hint: "ストライクゾーンを外れた投球",               cat: "投球" },
  { word: "暴投",           romaji: "boutou",        hint: "捕手が捕れない位置への投球",                 cat: "投球" },

  // ── 打撃 ──
  { word: "ホームラン",     romaji: "hoomuran",      hint: "本塁打。一発で塁を全部回るヒット",           cat: "打撃" },
  { word: "本塁打",         romaji: "honruida",      hint: "ホームラン",                                 cat: "打撃" },
  { word: "ヒット",         romaji: "hitto",         hint: "安打。打者が出塁する打撃",                   cat: "打撃" },
  { word: "二塁打",         romaji: "niruida",       hint: "ツーベースヒット",                           cat: "打撃" },
  { word: "三塁打",         romaji: "sanruida",      hint: "スリーベースヒット",                         cat: "打撃" },
  { word: "バント",         romaji: "banto",         hint: "バットを当てて転がす打撃",                   cat: "打撃" },
  { word: "ファウル",       romaji: "fauru",         hint: "ラインの外側に飛んだ打球",                   cat: "打撃" },
  { word: "フライ",         romaji: "furai",         hint: "高く打ち上げる打球",                         cat: "打撃" },
  { word: "ゴロ",           romaji: "goro",          hint: "地面を転がる打球",                           cat: "打撃" },
  { word: "ライナー",       romaji: "rainaa",        hint: "低く強い打球",                               cat: "打撃" },
  { word: "三振",           romaji: "sanshin",       hint: "ストライク3つで打者アウト",                  cat: "打撃" },
  { word: "四球",           romaji: "shikyuu",       hint: "ボール4つで出塁。フォアボール",              cat: "打撃" },
  { word: "デッドボール",   romaji: "deddobooru",    hint: "投球が体に当たって出塁",                     cat: "打撃" },
  { word: "犠打",           romaji: "gida",          hint: "自分が打ち取られて走者を進める",             cat: "打撃" },
  { word: "満塁本塁打",     romaji: "manruihonruida",hint: "走者満塁時のホームラン",                     cat: "打撃" },

  // ── 走塁 ──
  { word: "盗塁",           romaji: "tourui",        hint: "投球の隙に次の塁へ走る",                     cat: "走塁" },
  { word: "タッチアップ",   romaji: "tacchiappu",    hint: "捕球後に進塁する戦術",                       cat: "走塁" },
  { word: "ランナー",       romaji: "rannaa",        hint: "塁にいる攻撃側の選手",                       cat: "走塁" },
  { word: "アウト",         romaji: "auto",          hint: "攻撃が3回で交代する判定",                    cat: "走塁" },
  { word: "セーフ",         romaji: "seefu",         hint: "塁に到達した判定",                           cat: "走塁" },

  // ── ポジション ──（カタカナ：漢字をヒントに）
  { word: "ピッチャー",     romaji: "picchaa",       hint: "投手",                                       cat: "ポジション" },
  { word: "キャッチャー",   romaji: "kyacchaa",      hint: "捕手",                                       cat: "ポジション" },
  { word: "ショート",       romaji: "shooto",        hint: "遊撃手",                                     cat: "ポジション" },
  { word: "ファースト",     romaji: "faasuto",       hint: "一塁手",                                     cat: "ポジション" },
  { word: "セカンド",       romaji: "sekando",       hint: "二塁手",                                     cat: "ポジション" },
  { word: "サード",         romaji: "saado",         hint: "三塁手",                                     cat: "ポジション" },
  { word: "レフト",         romaji: "refuto",        hint: "左翼手",                                     cat: "ポジション" },
  { word: "センター",       romaji: "sentaa",        hint: "中堅手",                                     cat: "ポジション" },
  { word: "ライト",         romaji: "raito",         hint: "右翼手",                                     cat: "ポジション" },
  { word: "内野",           romaji: "naiya",         hint: "内野手の守備範囲",                           cat: "ポジション" },
  { word: "外野",           romaji: "gaiya",         hint: "外野手の守備範囲",                           cat: "ポジション" },
  { word: "バッテリー",     romaji: "batterii",      hint: "投手と捕手のコンビ",                         cat: "ポジション" },

  // ── 守備 ──
  { word: "ダブルプレー",   romaji: "daburupuree",   hint: "1つのプレーで2アウト。併殺",                 cat: "守備" },
  { word: "併殺",           romaji: "heisatsu",      hint: "ダブルプレー",                               cat: "守備" },
  { word: "エラー",         romaji: "eraa",          hint: "捕球・送球ミス",                             cat: "守備" },
  { word: "牽制",           romaji: "kensei",        hint: "塁にいる走者を狙う送球",                     cat: "守備" },

  // ── 用具 ──
  { word: "グローブ",       romaji: "guroobu",       hint: "野球用の革手袋",                             cat: "用具" },
  { word: "ミット",         romaji: "mitto",         hint: "捕手・一塁手専用の捕球具",                   cat: "用具" },
  { word: "バット",         romaji: "batto",         hint: "打撃で使う木製・金属の棒",                   cat: "用具" },
  { word: "ヘルメット",     romaji: "herumetto",     hint: "打者・走者がかぶる頭部防具",                 cat: "用具" },
  { word: "スパイク",       romaji: "supaiku",       hint: "底に鋲のついた野球シューズ",                 cat: "用具" },

  // ── 戦術 ──
  { word: "代打",           romaji: "daida",         hint: "打者を交代させる戦術",                       cat: "戦術" },
  { word: "代走",           romaji: "daisou",        hint: "走者を交代させる戦術",                       cat: "戦術" },
  { word: "リリーフ",       romaji: "ririifu",       hint: "途中で投げる救援投手",                       cat: "戦術" },
  { word: "クローザー",     romaji: "kuroozaa",      hint: "試合最終回を任される投手",                   cat: "戦術" },

  // ── 一般・ルール ──
  { word: "イニング",       romaji: "iningu",        hint: "回。攻守交代で1回",                          cat: "ルール" },
  { word: "審判",           romaji: "shinpan",       hint: "ジャッジを下す人。アンパイア",               cat: "一般" },
  { word: "ベンチ",         romaji: "benchi",        hint: "試合中の控え席。ダグアウト",                 cat: "一般" },
  { word: "ブルペン",       romaji: "burupen",       hint: "投手の練習エリア",                           cat: "一般" },
  { word: "マウンド",       romaji: "maundo",        hint: "投手の立つ盛り土",                           cat: "一般" },
  { word: "ダイヤモンド",   romaji: "daiyamondo",    hint: "本塁〜各塁を結ぶ正方形",                     cat: "一般" },
  { word: "監督",           romaji: "kantoku",       hint: "チームを指揮する人",                         cat: "一般" },
  { word: "完全試合",       romaji: "kanzenjiai",    hint: "無走者・無失点で勝った試合",                 cat: "投球" },
];
