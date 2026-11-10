import { APP_VERSION } from "@/data/changelog";

/**
 * /api/app-version — いま配られているアプリの版を返す。
 *
 * ホーム画面に追加したアプリは、閉じてもメモリに残ることがあり、
 * 新しい版を出しても古い画面のまま動き続ける。
 * 開いている画面がこれを見に来て、自分の版と違えば
 * 「新しい版があります」と出せるようにする。
 *
 * ビルドのたびに値が変わるので、キャッシュさせない。
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export function GET() {
  return Response.json(
    { ok: true, version: APP_VERSION },
    { headers: { "cache-control": "no-store, max-age=0" } },
  );
}
