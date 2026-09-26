/**
 * 下層ページの見出し。
 *
 * 以前は紺の色面に格子模様を敷いていたが、
 * トップと同じ「白地・大きな見出し・余白」で揃える。
 */
export default function PageHero({ title, sub }: { title: string; sub?: React.ReactNode }) {
  return (
    <section style={{ background: "#fff", paddingTop: "clamp(46px, 7vw, 84px)", paddingBottom: "clamp(30px, 4.5vw, 52px)" }}>
      <div className="sec-in center">
        <h1 className="t-head">{title}</h1>
        {sub && (
          <p className="t-sub" style={{ marginTop: 16, maxWidth: 620, marginLeft: "auto", marginRight: "auto" }}>
            {sub}
          </p>
        )}
      </div>
    </section>
  );
}
