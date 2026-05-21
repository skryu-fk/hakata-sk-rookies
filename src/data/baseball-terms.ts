/**
 * 野球用語タイピングゲーム用の単語辞書。
 * 入力は半角英字（IME不要）でできるように、英語の野球用語にしています。
 * 各エントリにはタイピング対象の英単語と、ヒントとなる日本語説明を入れる。
 */

export type BaseballTerm = {
  /** タイピング対象（半角大文字） */
  word: string;
  /** ヒント表示（日本語の意味） */
  hint: string;
  /** カテゴリ */
  cat: "投球" | "打撃" | "守備" | "走塁" | "ポジション" | "用具" | "戦術" | "ルール" | "一般";
};

export const TERMS: BaseballTerm[] = [
  // 投球
  { word: "FASTBALL",  hint: "変化しないまっすぐな速球",                cat: "投球" },
  { word: "CURVE",     hint: "曲がりながら落ちる変化球",                cat: "投球" },
  { word: "SLIDER",    hint: "横に滑るように曲がる変化球",              cat: "投球" },
  { word: "FORKBALL",  hint: "指の間に挟んで落とすボール",              cat: "投球" },
  { word: "CHANGEUP",  hint: "球速を落として打者のタイミングを外す球",  cat: "投球" },
  { word: "SHUTO",     hint: "右投手の場合、右に切れ込む球",            cat: "投球" },
  { word: "SINKER",    hint: "沈むような変化球",                        cat: "投球" },
  { word: "CUTTER",    hint: "ボール1個分だけ滑るカット系の球",          cat: "投球" },
  { word: "STRIKE",    hint: "ストライクゾーンを通った球",              cat: "投球" },
  { word: "BALL",      hint: "ストライクゾーンを外れた投球",            cat: "投球" },
  { word: "WILDPITCH", hint: "暴投。捕手が取れない位置への投球",        cat: "投球" },

  // 打撃
  { word: "HOMERUN",   hint: "本塁打。一発で塁を全部回るヒット",        cat: "打撃" },
  { word: "SINGLE",    hint: "一塁打。1つ進めるヒット",                 cat: "打撃" },
  { word: "DOUBLE",    hint: "二塁打",                                  cat: "打撃" },
  { word: "TRIPLE",    hint: "三塁打",                                  cat: "打撃" },
  { word: "BUNT",      hint: "バットを当てて転がす打撃",                cat: "打撃" },
  { word: "FOUL",      hint: "ファウル。ラインの外側に飛んだ打球",      cat: "打撃" },
  { word: "LINER",     hint: "ライナー。低く強い打球",                  cat: "打撃" },
  { word: "FLY",       hint: "フライ。高く打ち上げる打球",              cat: "打撃" },
  { word: "GROUNDER",  hint: "ゴロ。地面を転がる打球",                  cat: "打撃" },
  { word: "STRIKEOUT", hint: "三振",                                    cat: "打撃" },
  { word: "WALK",      hint: "四球。投球4つでボール判定→出塁",         cat: "打撃" },
  { word: "HITBYPITCH",hint: "デッドボール。投球が体に当たって出塁",   cat: "打撃" },
  { word: "SACRIFICE", hint: "犠打。自分が打ち取られて走者を進める",    cat: "打撃" },

  // 走塁
  { word: "STEAL",     hint: "盗塁。投球の隙に次の塁へ走る",            cat: "走塁" },
  { word: "TAGUP",     hint: "タッチアップ。捕球後に進塁する戦術",      cat: "走塁" },
  { word: "RUNNER",    hint: "走者。塁にいる攻撃側の選手",              cat: "走塁" },
  { word: "BASE",      hint: "塁。一・二・三・本塁の4つ",               cat: "走塁" },
  { word: "OUT",       hint: "アウト。3つで攻守交代",                   cat: "走塁" },
  { word: "SAFE",      hint: "セーフ。塁に到達した判定",                cat: "走塁" },

  // ポジション
  { word: "PITCHER",   hint: "投手",                                    cat: "ポジション" },
  { word: "CATCHER",   hint: "捕手",                                    cat: "ポジション" },
  { word: "SHORTSTOP", hint: "遊撃手",                                  cat: "ポジション" },
  { word: "FIRSTBASE", hint: "一塁手",                                  cat: "ポジション" },
  { word: "SECONDBASE",hint: "二塁手",                                  cat: "ポジション" },
  { word: "THIRDBASE", hint: "三塁手",                                  cat: "ポジション" },
  { word: "LEFTFIELD", hint: "左翼手（レフト）",                        cat: "ポジション" },
  { word: "CENTER",    hint: "中堅手（センター）",                      cat: "ポジション" },
  { word: "RIGHTFIELD",hint: "右翼手（ライト）",                        cat: "ポジション" },
  { word: "OUTFIELD",  hint: "外野",                                    cat: "ポジション" },
  { word: "INFIELD",   hint: "内野",                                    cat: "ポジション" },
  { word: "BATTERY",   hint: "投手と捕手のコンビ",                      cat: "ポジション" },

  // 守備
  { word: "DOUBLEPLAY",hint: "ダブルプレー。1つのプレーで2アウト",      cat: "守備" },
  { word: "TRIPLEPLAY",hint: "トリプルプレー。1つのプレーで3アウト",    cat: "守備" },
  { word: "ERROR",     hint: "エラー。捕球・送球ミス",                  cat: "守備" },
  { word: "ASSIST",    hint: "アシスト。送球など補助的な好プレー",      cat: "守備" },
  { word: "PUTOUT",    hint: "刺殺。直接アウトを取った守備記録",        cat: "守備" },
  { word: "PICKOFF",   hint: "けん制。塁にいる走者を狙う送球",          cat: "守備" },
  { word: "RELAY",     hint: "中継プレー",                              cat: "守備" },

  // 用具
  { word: "GLOVE",     hint: "グローブ",                                cat: "用具" },
  { word: "MITT",      hint: "ミット（捕手・一塁手用）",                cat: "用具" },
  { word: "BAT",       hint: "バット",                                  cat: "用具" },
  { word: "HELMET",    hint: "打者のヘルメット",                        cat: "用具" },
  { word: "CLEATS",    hint: "スパイクシューズ",                        cat: "用具" },
  { word: "ROSIN",     hint: "ロジンバッグ。投手が滑り止めに使う",      cat: "用具" },

  // 戦術・ルール・一般
  { word: "INNING",    hint: "回。攻守交代で1回",                       cat: "ルール" },
  { word: "UMPIRE",    hint: "審判",                                    cat: "一般" },
  { word: "DUGOUT",    hint: "ベンチ。試合中の控え席",                  cat: "一般" },
  { word: "BULLPEN",   hint: "ブルペン。投手の練習エリア",              cat: "一般" },
  { word: "LINEUP",    hint: "打順表",                                  cat: "戦術" },
  { word: "PINCHHIT",  hint: "代打",                                    cat: "戦術" },
  { word: "PINCHRUN",  hint: "代走",                                    cat: "戦術" },
  { word: "RELIEF",    hint: "リリーフ投手",                            cat: "戦術" },
  { word: "CLOSER",    hint: "抑え投手。試合最終回を任される",          cat: "戦術" },
  { word: "MOUND",     hint: "マウンド。投手の立つ盛り土",              cat: "一般" },
  { word: "DIAMOND",   hint: "ダイヤモンド。本塁〜各塁を結ぶ正方形",    cat: "一般" },
  { word: "GRANDSLAM", hint: "満塁本塁打",                              cat: "打撃" },
  { word: "NOHIT",     hint: "ノーヒットノーラン",                      cat: "投球" },
  { word: "PERFECTGAME", hint: "完全試合（無走者・無失点）",            cat: "投球" },
];
