"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TERMS, type BaseballTerm } from "@/data/baseball-terms";

const DURATION = 30; // seconds
const BEST_KEY = "hakata-typing-best";

type Phase = "idle" | "playing" | "finished";
type LogEntry = { word: string; hint: string; ok: boolean; ms: number };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function TypingGame() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [time, setTime] = useState(DURATION);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [queue, setQueue] = useState<BaseballTerm[]>([]);
  const [current, setCurrent] = useState<BaseballTerm | null>(null);
  const [input, setInput] = useState("");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [shake, setShake] = useState(false);
  const [bestScore, setBestScore] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startMsRef = useRef(0);
  const wordStartRef = useRef(0);

  // 初回マウントでベストスコア読み込み
  useEffect(() => {
    try {
      const raw = localStorage.getItem(BEST_KEY);
      if (raw) setBestScore(Number(raw) || 0);
    } catch {/* ignore */}
  }, []);

  // タイマー処理
  useEffect(() => {
    if (phase !== "playing") return;
    tickRef.current = setInterval(() => {
      const elapsed = (Date.now() - startMsRef.current) / 1000;
      const remain = Math.max(0, DURATION - elapsed);
      setTime(remain);
      if (remain <= 0) {
        finish();
      }
    }, 100);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function start() {
    const q = shuffle(TERMS);
    setQueue(q);
    setCurrent(q[0]);
    setInput("");
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setLog([]);
    setTime(DURATION);
    setPhase("playing");
    startMsRef.current = Date.now();
    wordStartRef.current = Date.now();
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function finish() {
    if (tickRef.current) clearInterval(tickRef.current);
    setPhase("finished");
    setTime(0);
    setScore(prev => {
      // ベストスコアを更新
      try {
        const stored = Number(localStorage.getItem(BEST_KEY) || 0);
        if (prev > stored) {
          localStorage.setItem(BEST_KEY, String(prev));
          setBestScore(prev);
        }
      } catch {/* ignore */}
      return prev;
    });
  }

  // 次のお題へ
  const advance = useCallback((ok: boolean) => {
    if (!current) return;
    const ms = Date.now() - wordStartRef.current;
    setLog(prev => [...prev, { word: current.word, hint: current.hint, ok, ms }]);
    if (ok) {
      // スコア: 単語長×10 + 速さボーナス（最大30）
      const speedBonus = Math.max(0, Math.round(30 - ms / 100));
      setScore(s => s + current.word.length * 10 + speedBonus);
      setStreak(s => {
        const next = s + 1;
        setBestStreak(b => Math.max(b, next));
        return next;
      });
    } else {
      setStreak(0);
    }
    // 次の単語を出す（queueが尽きたら再シャッフル）
    setQueue(prev => {
      const rest = prev.slice(1);
      if (rest.length === 0) {
        const reshuf = shuffle(TERMS);
        setCurrent(reshuf[0]);
        return reshuf;
      }
      setCurrent(rest[0]);
      return rest;
    });
    setInput("");
    wordStartRef.current = Date.now();
  }, [current]);

  // 入力ハンドラ — 完全一致したら次へ
  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (phase !== "playing" || !current) return;
    const v = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
    setInput(v);
    if (v === current.word) {
      advance(true);
    } else if (!current.word.startsWith(v)) {
      // 完全に外れている → 軽く揺らす
      setShake(true);
      setTimeout(() => setShake(false), 200);
    }
  }

  // Tab でスキップ
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Tab" && phase === "playing") {
      e.preventDefault();
      advance(false);
    }
  }

  // 統計
  const stats = useMemo(() => {
    const total = log.length;
    const correct = log.filter(l => l.ok).length;
    const wrong = total - correct;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    const avgMs = correct > 0
      ? Math.round(log.filter(l => l.ok).reduce((sum, l) => sum + l.ms, 0) / correct)
      : 0;
    return { total, correct, wrong, accuracy, avgMs };
  }, [log]);

  // ─── レンダリング ─────────────────────────────
  return (
    <div className="typing-game">
      {/* ステータスバー */}
      <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
        <Stat label="TIME" value={`${time.toFixed(1)}s`} accent={time < 10 ? "#d10024" : "#0b1e3f"} />
        <Stat label="SCORE" value={String(score)} accent="#d4a82a" />
        <Stat label="STREAK" value={`x${streak}`} accent="#0b1e3f" />
      </div>

      {/* 進行状況バー */}
      <div style={{ height: 6, background: "rgba(11,30,63,0.08)", marginBottom: 24, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${(time / DURATION) * 100}%`,
            background: time < 10 ? "#d10024" : "#0b1e3f",
            transition: "width 0.1s linear",
          }}
        />
      </div>

      {phase === "idle" && (
        <IdleScreen onStart={start} bestScore={bestScore} />
      )}

      {phase === "playing" && current && (
        <PlayingScreen
          current={current}
          input={input}
          shake={shake}
          inputRef={inputRef}
          onInputChange={onInputChange}
          onKeyDown={onKeyDown}
          onSkip={() => advance(false)}
        />
      )}

      {phase === "finished" && (
        <ResultScreen
          score={score}
          bestScore={bestScore}
          stats={stats}
          bestStreak={bestStreak}
          log={log}
          onRestart={start}
        />
      )}
    </div>
  );
}

// ─── サブコンポーネント ─────────────────────────

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e0dcd4", padding: "12px 16px" }}>
      <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 10, color: "#8a8a8a", letterSpacing: "0.3em", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 26, fontWeight: 700, color: accent, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}

function IdleScreen({ onStart, bestScore }: { onStart: () => void; bestScore: number }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e0dcd4", padding: "48px 32px", textAlign: "center" }}>
      <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d10024", letterSpacing: "0.4em", marginBottom: 14 }}>
        READY
      </div>
      <h2 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: 26, fontWeight: 900, color: "#0b1e3f", marginBottom: 10 }}>
        30秒チャレンジ
      </h2>
      <p style={{ fontSize: 14, color: "#5b6373", lineHeight: 1.9, marginBottom: 28, maxWidth: 460, marginInline: "auto" }}>
        野球用語の日本語ヒントを見て、対応する英単語を入力。<br />
        覚えながらタイピングしよう。
      </p>
      {bestScore > 0 && (
        <div style={{ marginBottom: 20, fontSize: 13, color: "#8a8a8a" }}>
          自己ベスト：<span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 20, fontWeight: 700, color: "#d4a82a", marginLeft: 6 }}>{bestScore}</span>
        </div>
      )}
      <button
        onClick={onStart}
        className="typing-start-btn"
        style={{
          background: "#d10024",
          color: "#fff",
          border: "none",
          padding: "16px 48px",
          fontFamily: "var(--font-zen),sans-serif",
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: "0.2em",
          cursor: "pointer",
        }}
      >
        スタート →
      </button>
    </div>
  );
}

function PlayingScreen({
  current, input, shake, inputRef, onInputChange, onKeyDown, onSkip,
}: {
  current: BaseballTerm;
  input: string;
  shake: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSkip: () => void;
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e0dcd4", padding: "32px 28px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 10, color: "#d10024", letterSpacing: "0.3em" }}>HINT</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#d4a82a", background: "rgba(212,168,42,0.12)", padding: "2px 8px" }}>{current.cat}</span>
      </div>
      <p style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: 18, fontWeight: 700, color: "#0b1e3f", lineHeight: 1.6, marginBottom: 24 }}>
        {current.hint}
      </p>

      {/* 単語表示 — 入力済み文字を強調 */}
      <div className={shake ? "shake" : ""} style={{ background: "#0b1e3f", padding: "24px 28px", marginBottom: 20, textAlign: "center", letterSpacing: "0.15em" }}>
        <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: "clamp(28px,5vw,42px)", fontWeight: 700, lineHeight: 1.2 }}>
          {current.word.split("").map((c, i) => {
            const typed = i < input.length;
            const correct = typed && input[i] === c;
            return (
              <span
                key={i}
                style={{
                  color: typed ? (correct ? "#d4a82a" : "#ff6982") : "rgba(255,255,255,0.4)",
                  borderBottom: i === input.length ? "2px solid #d4a82a" : "2px solid transparent",
                  paddingBottom: 4,
                  transition: "color 0.1s",
                }}
              >
                {c}
              </span>
            );
          })}
        </div>
      </div>

      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={onInputChange}
        onKeyDown={onKeyDown}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        placeholder="英字で入力 (IME OFF)"
        style={{
          width: "100%",
          padding: "16px 18px",
          fontSize: 20,
          fontFamily: "var(--font-oswald),sans-serif",
          letterSpacing: "0.15em",
          textAlign: "center",
          border: "2px solid #d10024",
          outline: "none",
          textTransform: "uppercase",
          background: "#fafafa",
        }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
        <span style={{ fontSize: 11, color: "#8a8a8a" }}>
          <kbd style={{ background: "#e0dcd4", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontFamily: "monospace" }}>Tab</kbd> でスキップ
        </span>
        <button
          onClick={onSkip}
          style={{ background: "transparent", border: "1px solid #d8d4cb", color: "#5b6373", padding: "6px 14px", fontSize: 12, cursor: "pointer" }}
        >
          スキップ →
        </button>
      </div>
    </div>
  );
}

function ResultScreen({
  score, bestScore, stats, bestStreak, log, onRestart,
}: {
  score: number;
  bestScore: number;
  stats: { total: number; correct: number; wrong: number; accuracy: number; avgMs: number };
  bestStreak: number;
  log: LogEntry[];
  onRestart: () => void;
}) {
  const isNewBest = score >= bestScore && score > 0;
  return (
    <div>
      <div style={{ background: "#0b1e3f", color: "#fff", padding: "36px 28px", textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d4a82a", letterSpacing: "0.4em", marginBottom: 10 }}>
          {isNewBest ? "NEW BEST!" : "TIME UP"}
        </div>
        <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: "clamp(60px,10vw,84px)", fontWeight: 700, lineHeight: 1, color: "#fff" }}>
          {score}
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: "0.2em", marginTop: 6 }}>POINTS</div>
        {bestScore > 0 && !isNewBest && (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 14 }}>
            自己ベスト：<span style={{ color: "#d4a82a", fontWeight: 700 }}>{bestScore}</span>
          </div>
        )}
      </div>

      <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <Stat label="CORRECT" value={String(stats.correct)} accent="#0b1e3f" />
        <Stat label="WRONG" value={String(stats.wrong)} accent="#d10024" />
        <Stat label="ACCURACY" value={`${stats.accuracy}%`} accent="#d4a82a" />
        <Stat label="STREAK" value={`x${bestStreak}`} accent="#0b1e3f" />
      </div>

      <div style={{ background: "#fff", border: "1px solid #e0dcd4", padding: "16px 20px", marginBottom: 20, maxHeight: 280, overflowY: "auto" }}>
        <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 10, color: "#d10024", letterSpacing: "0.3em", marginBottom: 10 }}>
          RECAP
        </div>
        {log.length === 0 ? (
          <p style={{ fontSize: 13, color: "#8a8a8a" }}>表示する記録がありません。</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {log.map((l, i) => (
              <li key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderTop: i === 0 ? "none" : "1px solid #f0ece6", fontSize: 13 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <span style={{ color: l.ok ? "#1a9f3a" : "#d10024", fontWeight: 700, width: 16 }}>
                    {l.ok ? "✓" : "✕"}
                  </span>
                  <span style={{ fontFamily: "var(--font-oswald),sans-serif", color: "#0b1e3f", fontWeight: 700, minWidth: 110 }}>
                    {l.word}
                  </span>
                  <span style={{ color: "#5b6373", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {l.hint}
                  </span>
                </span>
                {l.ok && (
                  <span style={{ fontSize: 11, color: "#8a8a8a", flexShrink: 0, marginLeft: 8 }}>
                    {(l.ms / 1000).toFixed(1)}s
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={onRestart}
        style={{
          width: "100%",
          background: "#d10024",
          color: "#fff",
          border: "none",
          padding: "16px",
          fontFamily: "var(--font-zen),sans-serif",
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: "0.2em",
          cursor: "pointer",
        }}
      >
        もう一度プレイ →
      </button>
    </div>
  );
}
