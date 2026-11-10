/**
 * /api/line/callback — LINEから戻ってくるところ。
 *
 * 流れ:
 *   1. state の署名を確かめる（なりすまし・改ざん防止）
 *   2. 認可コードをIDトークンに交換する
 *   3. IDトークンの署名・発行元・宛先・期限・nonce を確かめる
 *   4. mode=link     … state に入っているアカウントにLINEのユーザーIDを紐づける
 *      mode=login    … 紐づけ済みのアカウントを探し、ログインさせる
 *      mode=register … 名簿で確かめ済みのメンバーのアカウントを新しく作る
 *
 * ── Cookieに頼らない理由 ──
 * iPhoneのホーム画面に追加したアプリからLINEへ行くと、戻り先がSafariになる。
 * アプリとSafariはCookieの置き場が別なので、預けたCookieは読めない。
 * そこで state 自体に署名を付けて必要な情報を持たせ、
 * PKCE の verifier は state から計算し直す。どこへ戻ってきても復元できる。
 */
import {
  issueSession, buildSetCookie, buildRoundTripCookie,
  readValue, nameKey, genUserId, MEMBER_COOKIE,
} from "@/lib/security";
import { callAppsScript } from "@/lib/admin-shared";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";
import {
  lineEnabled, exchangeCode, verifyIdToken, redirectUri, resultPage, verifierFor,
  LINE_STATE_COOKIE, ACCOUNT_LINE_COL,
} from "@/lib/lineAuth";
import { saveHandoff } from "@/lib/loginHandoff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Row = { rowIndex: number; data: string[] };
type Stash = { mode: string; sub: string; nonce: string; ph?: string; pwa?: boolean };

const SESSION_TTL = 60 * 60 * 24 * 7;   // メンバーのログインと同じ7日

/** 画面に出す文言。何が起きたかと、次にどうすればいいかを必ず書く */
const MESSAGES: Record<string, { ok: boolean; title: string; body: string }> = {
  linked: {
    ok: true, title: "LINEと連携しました",
    body: "次からは、ログイン画面の「LINEでログイン」で入れます。",
  },
  registered: {
    ok: true, title: "登録が完了しました",
    body: "次からは、ログイン画面の「LINEでログイン」だけで入れます。パスワードはありません。",
  },
  already_registered: {
    ok: false, title: "すでに登録されています",
    body: "このメンバーのアカウントはすでにあります。ログイン画面からお入りください。ユーザーIDが分からない場合は「ユーザーID・パスワードを忘れた場合」からご連絡ください。",
  },
  not_linked: {
    ok: false, title: "まだ連携されていません",
    body: "先にユーザーIDとパスワードでログインし、マイページの「LINEでログイン」から連携してください。",
  },
  already_used: {
    ok: false, title: "別の人が使っています",
    body: "このLINEアカウントは、すでに別のメンバーに連携されています。心当たりがなければ代表にご連絡ください。",
  },
  expired: {
    ok: false, title: "時間が経ちすぎました",
    body: "手続きの途中で10分以上かかったようです。お手数ですが、もう一度やり直してください。",
  },
  canceled: {
    ok: false, title: "キャンセルしました",
    body: "LINEでの連携をとりやめました。",
  },
  pending: {
    ok: false, title: "承認待ちです",
    body: "アカウントがまだ承認されていません。代表の承認後にご利用ください。",
  },
  rejected: {
    ok: false, title: "ご利用いただけません",
    body: "このアカウントは現在利用できません。代表にご確認ください。",
  },
  no_column: {
    ok: false, title: "連携を保存できませんでした",
    body: "データベースの準備が済んでいません。代表にこの画面を見せてください（supabase/schema.sql の実行が必要です）。",
  },
  disabled: {
    ok: false, title: "いま使えません",
    body: "LINEログインの設定が済んでいません。代表にご連絡ください。",
  },
};

const FALLBACK = {
  ok: false, title: "うまくいきませんでした",
  body: "もう一度お試しください。何度も失敗する場合は、この画面を代表にお見せください。",
};

/**
 * 連携したあとは、アプリを開きなおしてもらう。
 *
 * この画面はたいていSafariで開いている（ホーム画面のアプリからLINEへ行くと
 * 戻り先がSafariになる）。そこで「アプリをひらく」を押しても、Safariの中で
 * もう1つ開くだけで、ホーム画面のアプリには戻らない。
 * 閉じて開きなおしてもらうのが、いちばん確実で分かりやすい。
 */
type DoneOpts = {
  /** 追加で返すヘッダー（ログインのCookieなど） */
  headers?: Record<string, string>;
  /** 発行されたユーザーID。登録できたときだけ出す */
  id?: string;
  /** ホーム画面アプリから始まった手続きか */
  fromApp?: boolean;
  /** 引換券を預けられたか（アプリに戻るだけでログインできるか） */
  handed?: boolean;
};

/**
 * ホーム画面アプリから来た人への文言。
 *
 * この画面はSafariで開いている。そこで「アプリをひらく」を押しても、
 * Safariの中でもう1枚開くだけで、ホーム画面のアプリには戻らない。
 * やることは1つ、「閉じて戻る」だけにする。
 */
function appBody(code: string, handed?: boolean): string {
  if (code === "linked") return "次からは、ログイン画面の「LINEでログイン」で入れます。";
  return handed
    ? "アプリに戻ると、そのままログインされます。"
    : "お手数ですが、アプリに戻って、ユーザーIDとパスワードでログインしてください。";
}

function done(code: string, opts: DoneOpts = {}): Response {
  const m = MESSAGES[code] ?? FALLBACK;
  const fromApp = !!opts.fromApp;
  const res = resultPage({
    ...m,
    body: fromApp && m.ok ? appBody(code, opts.handed) : m.body,
    // Safariで始めた人は、そのままアプリへ進める。
    // アプリから来た人を進めてはいけない（Safariの中で動いてしまう）
    auto: !fromApp && code === "login_ok",
    closeOnly: fromApp || code === "linked" || code === "registered",
    closeText: fromApp && opts.handed
      ? "この画面を閉じて、アプリに戻ってください。"
      : undefined,
    id: opts.id,
  });
  const headers = new Headers(res.headers);
  headers.append("Set-Cookie", buildRoundTripCookie(LINE_STATE_COOKIE, "", 0));
  for (const [k, v] of Object.entries(opts.headers ?? {})) headers.append(k, v);
  return new Response(res.body, { status: res.status, headers });
}

MESSAGES.login_ok = {
  ok: true, title: "ログインしました",
  body: "アプリに進みます。",
};

export async function GET(request: Request) {
  const rl = rateLimit(`line-callback:${clientIp(request.headers)}`, { limit: 30, windowMs: 10 * 60_000 });
  if (!rl.ok) return tooMany(rl.retryAfter);
  if (!lineEnabled()) return done("disabled");

  const url = new URL(request.url);

  // state は署名付き。改ざんされていれば読めない＝こちらが始めた手続きではない。
  // キャンセルされたときも state は返ってくるので、文言を決めるために先に読む
  const state = url.searchParams.get("state") ?? "";
  const stash = readValue<Stash>(state);

  // どこから始まった手続きか。戻り先の案内を変えるのに使う
  const app = !!stash?.pwa;

  // ユーザーが同意画面で「キャンセル」したとき
  if (url.searchParams.get("error")) return done("canceled", { fromApp: app });
  if (!stash?.nonce) return done("expired", { fromApp: app });

  const code = url.searchParams.get("code") ?? "";
  if (!code) return done("expired", { fromApp: app });

  /**
   * ログインを成立させる。
   *
   * Safariで始めた人には、この応答のCookieでそのまま入ってもらう。
   * ホーム画面アプリから来た人には、そのCookieは届かない（保管庫が別）。
   * 代わりに引換券を預けて、アプリに戻ったときに取りに来てもらう。
   */
  async function signIn(codeName: string, accountId: string, id?: string) {
    const handed = stash?.ph ? await saveHandoff(stash.ph, accountId) : false;
    const session = issueSession("member", SESSION_TTL, accountId);
    return done(codeName, {
      headers: { "Set-Cookie": buildSetCookie(MEMBER_COOKIE, session, SESSION_TTL) },
      id, fromApp: app, handed,
    });
  }

  const token = await exchangeCode(code, verifierFor(state), redirectUri(request));
  if (!token.ok) return done("token_failed", { fromApp: app });

  const verified = verifyIdToken(token.idToken, stash.nonce);
  if (!verified.ok) {
    console.error("[line] id token rejected:", verified.error);
    return done("bad_token", { fromApp: app });
  }
  const lineUserId = verified.sub;

  const list = await callAppsScript({ op: "list", sheet: "accounts" });
  if (!list.ok) return done("server_error", { fromApp: app });
  const rows = (list.data as { rows?: Row[] }).rows ?? [];

  if (stash.mode === "link") {
    const target = rows.find(r => (r.data[0] ?? "") === stash.sub);
    if (!target) return done("no_account", { fromApp: app });

    // 1つのLINEアカウントを複数のメンバーに紐づけさせない。
    // 紐づけられると、他人になりすましてログインできてしまう
    const taken = rows.find(
      r => (r.data[ACCOUNT_LINE_COL] ?? "") === lineUserId && (r.data[0] ?? "") !== stash.sub,
    );
    if (taken) return done("already_used", { fromApp: app });

    const next = target.data.slice();
    while (next.length <= ACCOUNT_LINE_COL) next.push("");
    next[ACCOUNT_LINE_COL] = lineUserId;
    const saved = await callAppsScript({
      op: "update", sheet: "accounts", rowIndex: target.rowIndex, row: next,
    });
    if (!saved.ok) {
      console.error("[line] link save failed:", saved.error);
      return done(/line_user_id|列がありません/.test(saved.error) ? "no_column" : "save_failed", { fromApp: app });
    }
    return done("linked", { fromApp: app });
  }

  if (stash.mode === "register") {
    // 1つのLINEアカウントで2人分は作らせない
    if (rows.some(r => (r.data[ACCOUNT_LINE_COL] ?? "") === lineUserId)) return done("already_used", { fromApp: app });
    // 送り出したあとに本人が別の端末で登録していた場合に備えて、ここでも見る
    if (rows.some(r => (r.data[7] ?? "") === stash.sub && (r.data[5] ?? "") !== "rejected")) {
      return done("already_registered", { fromApp: app });
    }

    // 氏名はURLに乗せていないので、名簿から引き直す
    const mList = await callAppsScript({ op: "list", sheet: "members" });
    if (!mList.ok) return done("server_error", { fromApp: app });
    const members = (mList.data as { rows?: Row[] }).rows ?? [];
    // members 列: [id, name, nickname, jerseyNumber, position, joinedDate, active, kana]
    const me = members.find(r => (r.data[0] ?? "") === stash.sub);
    if (!me) return done("no_account", { fromApp: app });
    // アカウントの氏名はカタカナでそろえる（IDとパスワードで登録した人と同じ形）
    const name = ((me.data[7] ?? "").trim() || (me.data[1] ?? "").trim());
    if (!name) return done("no_account", { fromApp: app });

    const used = new Set(rows.map(r => (r.data[8] ?? "").toUpperCase()).filter(Boolean));
    let userId = "";
    for (let i = 0; i < 40; i++) {
      const cand = genUserId();
      if (!used.has(cand.toUpperCase())) { userId = cand; break; }
    }
    if (!userId) return done("server_error", { fromApp: app });

    /*
     * パスワードの欄（hash・salt）は空にする。
     * 空のときログインは必ず失敗する作りなので（security.verifyPassword）、
     * このアカウントに入れるのはLINEを持っている本人だけになる。
     * accounts 列: [id, name, nameKey, hash, salt, status, createdAt,
     *               memberId, userId, role, staffTitle, staffArea, lineUserId]
     */
    const accountId = `acc_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const row = [
      accountId, name, nameKey(name), "", "", "approved",
      new Date().toISOString().slice(0, 19).replace("T", " "),
      stash.sub, userId, "", "", "", lineUserId,
    ];
    const saved = await callAppsScript({ op: "append", sheet: "accounts", row });
    if (!saved.ok) {
      console.error("[line] register failed:", saved.error);
      return done(/line_user_id|列がありません/.test(saved.error) ? "no_column" : "save_failed", { fromApp: app });
    }

    return signIn("registered", accountId, userId);
  }

  // mode === "login"
  const acc = rows.find(r => (r.data[ACCOUNT_LINE_COL] ?? "") === lineUserId);
  if (!acc) return done("not_linked", { fromApp: app });

  const status = (acc.data[5] ?? "").trim();
  if (status === "pending") return done("pending", { fromApp: app });
  if (status !== "approved") return done("rejected", { fromApp: app });

  return signIn("login_ok", acc.data[0] ?? "");
}
