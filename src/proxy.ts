/**
 * メンテナンス中の遮断
 *
 * Next.js 16 では middleware.ts が非推奨になり、proxy.ts を使う。
 *
 * ここでしか止められないものがある。ページ側で出し分けると、
 * API（/api/...）やまだ描画されていない経路が素通りするため、
 * 入口でまとめて返す。
 */
import { NextResponse, type NextRequest } from "next/server";
import { inMaintenance, isAllowedDuringMaintenance, isOperator, maintenanceResponse } from "@/lib/maintenance";

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 管理者としてログインしている場合は、止めている最中でも中を見られる。
  // Next.js 16 の Proxy は Node.js ランタイムで動くため、
  // ここで署名付きCookieの検証ができる。
  if (inMaintenance() && !isAllowedDuringMaintenance(path) && !isOperator(request.headers)) {
    return maintenanceResponse();
  }

  // ヘッダを書き換えないので request は渡さない。渡すと Next が受け取った
  // ヘッダ全部を x-middleware-request-* として再送出し、
  // x-middleware-override-headers で一覧を上書きするため、無駄に大きくなる。
  return NextResponse.next();
}

export const config = {
  // 画像やフォントは通す。メンテナンス画面のロゴが出なくなるため。
  // _next/static と _next/image も、画面を組み立てるのに必要。
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|woff2?)$).*)",
  ],
};
