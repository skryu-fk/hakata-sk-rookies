"use client";

import { useEffect, useMemo, useState } from "react";
import { PRACTICE_TYPE_COLOR, type Practice, type PracticeType } from "@/data/practices";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function parseDate(s: string) {
  return new Date(s + "T00:00:00");
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function PracticeCalendar({ practices }: { practices: Practice[] }) {
  // today を state 管理し、日付が変わったら自動で更新する
  const [today, setToday] = useState<Date>(() => startOfToday());
  const [view, setView] = useState<Date>(() => {
    const t = startOfToday();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });

  useEffect(() => {
    // 毎分チェック + タブ復帰時にもチェック。日付が変わったら setToday でハイライトを移動。
    const tick = () => {
      const t = startOfToday();
      setToday(prev => (sameDay(prev, t) ? prev : t));
    };
    const id = window.setInterval(tick, 60 * 1000);
    const onVisible = () => { if (!document.hidden) tick(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", tick);
    };
  }, []);

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const byDay = useMemo(() => {
    const m = new Map<number, Practice[]>();
    for (const p of practices) {
      const d = parseDate(p.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!m.has(day)) m.set(day, []);
        m.get(day)!.push(p);
      }
    }
    return m;
  }, [practices, year, month]);

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);
  while (cells.length % 7 !== 0) cells.push(null);

  const goPrev = () => setView(new Date(year, month - 1, 1));
  const goNext = () => setView(new Date(year, month + 1, 1));
  const goToday = () => setView(new Date(today.getFullYear(), today.getMonth(), 1));
  const isCurrentView = year === today.getFullYear() && month === today.getMonth();

  const navBtn: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "rgba(255,255,255,0.7)",
    cursor: "pointer",
    fontSize: 16,
    width: 32,
    height: 32,
    display: "grid",
    placeItems: "center",
    transition: "background 0.15s",
  };

  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.06)" }}>
        <span style={{ fontFamily: "var(--font-zen),sans-serif", fontWeight: 700, color: "#fff", fontSize: 13, letterSpacing: "0.12em" }}>練習カレンダー</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={goPrev} aria-label="前の月" style={navBtn}>‹</button>
          <div style={{ fontFamily: "var(--font-oswald),sans-serif", color: "#fff", fontSize: 15, letterSpacing: "0.08em", minWidth: 72, textAlign: "center" }}>
            {year}.{String(month + 1).padStart(2, "0")}
          </div>
          <button onClick={goNext} aria-label="次の月" style={navBtn}>›</button>
          {!isCurrentView && (
            <button onClick={goToday} style={{ ...navBtn, width: "auto", padding: "0 10px", fontSize: 11, letterSpacing: "0.1em" }}>今月</button>
          )}
        </div>
      </div>

      {/* grid */}
      <div style={{ padding: "16px 14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 6 }}>
          {WEEKDAYS.map((w, i) => (
            <div key={w} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: i === 0 ? "#f28899" : i === 6 ? "#8fc4ff" : "rgba(255,255,255,0.5)", padding: "4px 0", letterSpacing: "0.05em" }}>{w}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
          {cells.map((d, i) => {
            if (!d) return <div key={i} style={{ aspectRatio: "1" }} />;
            const cellDate = new Date(year, month, d);
            const isToday = sameDay(cellDate, today);
            const dow = cellDate.getDay();
            const ps = byDay.get(d) ?? [];
            const hasPractice = ps.length > 0;
            const allCanceled = hasPractice && ps.every(p => p.status === "canceled");
            const borderColor = isToday ? "#d10024" : hasPractice ? "#d4a82a" : "transparent";
            const borderWidth = isToday || hasPractice ? 2 : 1;
            const bg = isToday ? "rgba(209,0,36,0.1)" : hasPractice ? "rgba(212,168,42,0.08)" : "transparent";
            const title = ps.map(p => {
              const st = p.status === "canceled" ? "【中止】" : p.status === "tentative" ? "【未定】" : "";
              return `${st}${p.type} @ ${p.place}${p.time ? " " + p.time : ""}`;
            }).join("\n");
            return (
              <div
                key={i}
                title={title || undefined}
                style={{
                  aspectRatio: "1",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 3,
                  border: `${borderWidth}px solid ${borderColor}`,
                  background: bg,
                  opacity: allCanceled ? 0.5 : 1,
                  position: "relative",
                }}>
                <span style={{
                  fontFamily: "var(--font-oswald),sans-serif",
                  fontSize: 13,
                  color: isToday ? "#ff5b75" : dow === 0 ? "#f28899" : dow === 6 ? "#8fc4ff" : "rgba(255,255,255,0.85)",
                  fontWeight: isToday || hasPractice ? 700 : 400,
                  textDecoration: allCanceled ? "line-through" : "none",
                }}>{d}</span>
                <div style={{ display: "flex", gap: 2, height: 6 }}>
                  {ps.slice(0, 3).map((p, idx) => (
                    <span key={idx} style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: p.status === "canceled" ? "rgba(255,255,255,0.2)" : PRACTICE_TYPE_COLOR[p.type],
                      opacity: p.status === "tentative" ? 0.6 : 1,
                    }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* legend */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", marginTop: 16, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: 11, color: "rgba(255,255,255,0.55)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 12, height: 12, border: "2px solid #d10024", background: "rgba(209,0,36,0.1)" }} /> 今日
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 12, height: 12, border: "2px solid #d4a82a", background: "rgba(212,168,42,0.08)" }} /> 練習日
          </span>
          {(Object.keys(PRACTICE_TYPE_COLOR) as PracticeType[]).map(t => (
            <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: PRACTICE_TYPE_COLOR[t] }} /> {t === "キャッチボール" ? "公園練習" : t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
