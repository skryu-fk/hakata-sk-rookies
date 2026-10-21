/**
 * 緊急メンテナンス
 *
 * 時間で自動的に始まり、自動的に終わる。戻し忘れが起きないようにするため、
 * 手で切り替える方式にはしていない。
 *
 * 時刻は UTC で書く。Vercel のサーバーは UTC で動くので、
 * 日本時間のまま書くとずれる。対応は次のとおり。
 *   日本時間 = UTC + 9時間
 *   10/21 23:00 JST = 10/21 14:00 UTC
 *   10/22 01:00 JST = 10/21 16:00 UTC
 *
 * 予定より早く開けたい／延ばしたいときは、Vercel の環境変数 MAINTENANCE に
 * "off"（即時解除）または "on"（時間に関係なく継続）を入れる。
 *
 * リーグ公式サイト（hakata-rookie-league）にも同じ仕組みを入れてあり、
 * 時間もそろえてある。片方だけ直すとずれるので注意。
 */

export const MAINTENANCE = {
  /** 開始（UTC） */
  from: "2026-10-21T14:00:00Z",
  /** 終了（UTC） */
  to: "2026-10-21T16:00:00Z",
  /** 画面に出す日本時間の表記 */
  fromLabel: "10月21日（火）23:00",
  toLabel: "10月22日（水）1:00",
  reason: "セキュリティ強化作業のため",
  detail:
    "近年、生成AIの悪用によるサイバー攻撃と情報漏えいが増えています。" +
    "メンバーの個人情報や成績をお預かりしている以上、被害が出てから動くのでは遅いと考え、" +
    "先回りしてシステム全体の守りを固める作業を行っています。",
} as const;

/**
 * いまメンテナンス中かどうか。
 *
 * @param now   判定に使う時刻（試験用に差し替えられるようにしてある）
 * @param flag  環境変数 MAINTENANCE の値
 */
export function inMaintenance(now: Date = new Date(), flag = process.env.MAINTENANCE): boolean {
  const f = (flag ?? "").trim().toLowerCase();
  if (f === "off") return false;
  if (f === "on") return true;

  const t = now.getTime();
  return t >= Date.parse(MAINTENANCE.from) && t < Date.parse(MAINTENANCE.to);
}

/**
 * メンテナンス中でも通す道。
 *
 * 作業をする側（管理者・首脳陣）の画面は開けておく。いずれも認証で
 * 守られているため、公開されるわけではない。
 * 画面だけ通しても、その画面が呼ぶ API を止めると操作できないので、
 * 対応する API もあわせて通す。
 *
 * メンバー向けの公式アプリ（/stats）と、それが使う /api/member・
 * /api/push は、お知らせのとおり停止する。
 */
const ALLOWED = ["/admin", "/staff", "/api/admin", "/api/staff"];

export function isAllowedDuringMaintenance(path: string): boolean {
  return ALLOWED.some(p => path === p || path.startsWith(`${p}/`));
}

/**
 * メンテナンス中に返す画面。
 *
 * 外部のCSSやJavaScriptを読み込まない1枚のHTMLにしてある。
 * 作業でサーバー側を止めていても、これだけは必ず出せるようにするため。
 */
export function maintenanceHtml(): string {
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>メンテナンス中 | 博多SKルーキーズ</title>
<style>
  :root {
    --navy: #0b1e3f;
    --gold: #d4a82a;
    --red: #d10024;
    --line: rgba(255,255,255,0.14);
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    background: var(--navy);
    background-image:
      linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 42%),
      linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(0,0,0,0.3) 100%);
    color: #fff;
    font-family: system-ui, -apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif;
    font-feature-settings: "palt";
    line-height: 1.9;
  }
  .wrap { width: 100%; max-width: 560px; text-align: center; }
  .logo { height: 66px; width: auto; margin-bottom: 26px; }
  .badge {
    display: inline-block;
    padding: 7px 16px;
    background: var(--red);
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.12em;
    margin-bottom: 18px;
  }
  h1 { margin: 0 0 18px; font-size: 25px; font-weight: 900; line-height: 1.4; }
  p { margin: 0 0 16px; font-size: 14px; color: rgba(255,255,255,0.72); text-align: left; }
  .box {
    margin: 28px 0 0;
    padding: 20px 22px;
    border: 1px solid var(--line);
    border-left: 4px solid var(--gold);
    text-align: left;
  }
  .row { display: flex; gap: 14px; padding: 7px 0; font-size: 14px; }
  .row dt { flex: 0 0 92px; color: rgba(255,255,255,0.5); font-weight: 700; }
  .row dd { margin: 0; font-weight: 700; }
  .note { margin-top: 26px; font-size: 12.5px; color: rgba(255,255,255,0.45); text-align: left; }
  .note a { color: var(--gold); }
  @media (max-width: 480px) {
    h1 { font-size: 21px; }
    .row { flex-direction: column; gap: 2px; }
    .row dt { flex: none; }
  }
</style>
</head>
<body>
  <main class="wrap">
    <img class="logo" src="/sk_logo_crop.png" alt="博多SKルーキーズ">
    <div class="badge">緊急メンテナンス中</div>
    <h1>ただいまメンテナンスを行っています</h1>

    <p>${MAINTENANCE.reason}、一時的にサイトと公式アプリを停止しています。
    ご不便をおかけして申し訳ありません。</p>

    <p>${MAINTENANCE.detail}</p>

    <dl class="box">
      <div class="row"><dt>作業時間</dt><dd>${MAINTENANCE.fromLabel} 〜 ${MAINTENANCE.toLabel}</dd></div>
      <div class="row"><dt>再開予定</dt><dd>${MAINTENANCE.toLabel} ごろ</dd></div>
      <div class="row"><dt>対象</dt><dd>公式サイト・公式アプリ（成績・AI診断）</dd></div>
    </dl>

    <p class="note">
      作業が早く終わった場合は、予定より前に再開します。
      最新の状況は公式X
      <a href="https://x.com/SK_rookies_FK" target="_blank" rel="noopener">@SK_rookies_FK</a>
      でお知らせします。<br>
      博多SKルーキーズ
    </p>
  </main>
</body>
</html>`;
}

/** メンテナンス中の応答。503 と Retry-After を返す */
export function maintenanceResponse(): Response {
  const retryAfter = Math.max(
    60,
    Math.round((Date.parse(MAINTENANCE.to) - Date.now()) / 1000),
  );
  return new Response(maintenanceHtml(), {
    status: 503,
    headers: {
      "content-type": "text/html; charset=utf-8",
      // 一時的な停止であることを検索エンジンに伝える。
      // 404 や 200 で返すと、掲載順位が下がったり誤って登録されたりする
      "retry-after": String(retryAfter),
      "cache-control": "no-store",
    },
  });
}
