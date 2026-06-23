import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Content-Security-Policy
 * - frame-ancestors 'none' でクリックジャッキング/iframe 乗っ取りを防止
 * - object-src 'none' / base-uri 'self' で各種注入を遮断
 * - 必要な外部（Vercel Analytics / X埋め込み / Formspree）だけ許可
 * - 開発時は HMR のために 'unsafe-eval' を追加（本番では外す）
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://formspree.io",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  // 'wasm-unsafe-eval' と blob: は端末内フォーム解析（MediaPipe / WASM・Worker）に必要
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob:${isProd ? "" : " 'unsafe-eval'"} https://va.vercel-scripts.com https://platform.twitter.com https://cdn.syndication.twimg.com`,
  "connect-src 'self' blob: https://va.vercel-scripts.com https://vitals.vercel-insights.com https://formspree.io https://syndication.twitter.com",
  "frame-src https://platform.twitter.com https://syndication.twitter.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "media-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ");

// 全ルート共通のセキュリティヘッダ
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  // 本番のみ HSTS（HTTPS 強制）。ローカル http を壊さないため dev では付けない。
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }] : []),
];

// 個人情報を含む画面/API は検索除外＆キャッシュ禁止
const sensitiveHeaders = [
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
  { key: "Cache-Control", value: "no-store, max-age=0, must-revalidate" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/stats", headers: sensitiveHeaders },
      { source: "/stats/:path*", headers: sensitiveHeaders },
      { source: "/admin", headers: sensitiveHeaders },
      { source: "/admin/:path*", headers: sensitiveHeaders },
      { source: "/api/:path*", headers: sensitiveHeaders },
    ];
  },
};

export default nextConfig;
