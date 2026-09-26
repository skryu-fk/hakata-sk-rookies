import Image from "next/image";
import Link from "next/link";

/**
 * 下層ページ共通のヘッダー。
 *
 * トップページのヘッダーと同じ見た目にして、どこへ移動しても
 * 同じサイトの中にいると分かるようにしている。
 * 細く、半透明で、文字は小さく。飾りの罫線や影は置かない。
 */
const TEAM_NAME_JP = "博多SKルーキーズ";

export default function SiteHeader({ back = "トップへ" }: { back?: string }) {
  return (
    <header
      style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "saturate(180%) blur(20px)",
        WebkitBackdropFilter: "saturate(180%) blur(20px)",
        borderBottom: "1px solid rgba(0,0,0,0.08)",
      }}
    >
      <div className="sec-in-wide" style={{ height: 52, display: "flex", alignItems: "center", gap: 16 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", flexShrink: 0 }}>
          <Image src="/sk_logo_crop.png" alt={TEAM_NAME_JP} width={46} height={38} className="object-contain" priority style={{ width: 34, height: "auto" }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.01em" }}>{TEAM_NAME_JP}</span>
        </Link>
        <Link href="/" className="link-more" style={{ marginLeft: "auto", fontSize: 14 }}>
          {back}
        </Link>
      </div>
    </header>
  );
}
