/**
 * 活動概要の表
 *
 *   <ActivityTable />        … ホーム用。home: true の3行だけ
 *   <ActivityTable full />   … /activity 用。全部
 */
import { ACTIVITY } from "@/data/activity";

export default function ActivityTable({ full = false }: { full?: boolean }) {
  const rows = full ? ACTIVITY : ACTIVITY.filter(r => r.home);
  return (
    <div style={{ border: "1px solid #e0dcd4", overflow: "hidden" }}>
      {rows.map((row, i) => (
        <div key={row.label} className="activity-row reveal grid grid-cols-1 md:[grid-template-columns:220px_1fr]" data-delay={String(i * 80)}
          style={{ borderBottom: i < rows.length - 1 ? "1px solid #e0dcd4" : "none" }}>
          <div className="activity-label flex items-center px-5 md:px-7 py-4 md:py-6" style={{ background: "#0b1e3f", borderLeft: "4px solid #d10024" }}>
            <span style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 700, fontSize: 15, color: "#fff", letterSpacing: "0.06em" }}>{row.label}</span>
          </div>
          <div className="activity-body px-5 md:px-8 py-5 md:py-6" style={{ background: "#fefcfa" }}>
            <p style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: "clamp(16px,2vw,22px)", fontWeight: 900, color: "#0b1e3f", marginBottom: 6 }}>{row.main}</p>
            <p style={{ fontSize: 13, color: "#5b6373", lineHeight: 1.8 }}>{row.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
