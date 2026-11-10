/**
 * /api/line/start — LINEの同意画面へ送り出す。
 *   GET ?mode=link   … ログイン中の自分のアカウントにLINEを紐づける
 *   GET ?mode=login  … 紐づけ済みの人が、LINEでログインする
 *
 * state・nonce・PKCE の verifier をここで作り、署名付きCookieに預ける。
 * mode=link のときは、いま誰がログインしているか（アカウントID）も一緒に預ける。
 * 戻ってきたときはメンバーCookie（SameSite=Strict）が送られてこないため、
 * 本人の特定をこのCookieに頼る必要があるため。
 */
import {
  readSession, readCookie, MEMBER_COOKIE,
  signValue, buildRoundTripCookie,
} from "@/lib/security";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";
import {
  lineEnabled, buildAuthUrl, randomToken, redirectUri, LINE_STATE_COOKIE,
} from "@/lib/lineAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 往復に使える時間。同意画面で迷っても足りるが、放置すれば切れる */
const ROUND_TRIP_SECONDS = 10 * 60;

export async function GET(request: Request) {
  const rl = rateLimit(`line-start:${clientIp(request.headers)}`, { limit: 20, windowMs: 10 * 60_000 });
  if (!rl.ok) return tooMany(rl.retryAfter);

  if (!lineEnabled()) {
    return Response.json({ ok: false, error: "LINEログインは設定されていません。" }, { status: 503 });
  }

  const mode = new URL(request.url).searchParams.get("mode") === "login" ? "login" : "link";

  // 紐づけは、ログインしている本人からの操作に限る
  let accountId = "";
  if (mode === "link") {
    const sess = readSession(readCookie(request.headers, MEMBER_COOKIE), "member");
    if (!sess?.sub) {
      return Response.json({ ok: false, error: "ログインが必要です。" }, { status: 401 });
    }
    accountId = sess.sub;
  }

  const state = randomToken();
  const nonce = randomToken();
  const verifier = randomToken(48);   // PKCE: 43〜128文字に収まる長さ

  const cookie = signValue({ state, nonce, verifier, mode, accountId }, ROUND_TRIP_SECONDS);

  return new Response(null, {
    status: 302,
    headers: {
      Location: buildAuthUrl({ state, nonce, verifier, redirect: redirectUri(request) }),
      "Set-Cookie": buildRoundTripCookie(LINE_STATE_COOKIE, cookie, ROUND_TRIP_SECONDS),
      "cache-control": "no-store",
    },
  });
}
