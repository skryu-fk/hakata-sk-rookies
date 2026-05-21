"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TERMS, type BaseballTerm } from "@/data/baseball-terms";

const DURATION = 30; // seconds
const BEST_KEY = "hakata-typing-best";

type Phase = "idle" | "playing" | "finished";
type Mode = "typing" | "quiz";
type LogEntry = { word: string; hint: string; ok: boolean; ms: number };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 4択クイズの選択肢を作る（同カテゴリ優先、ヒント被りは除外） */
function makeQuizOptions(target: BaseballTerm): string[] {
  const sameCategory = TERMS.filter(
    t => t.cat === target.cat && t.word !== target.word && t.hint !== target.hint
  );
  const others = TERMS.filter(
    t => t.cat !== target.cat && t.word !== target.word && t.hint !== target.hint
  );
  const pool = shuffle([...sameCategory, ...others]).slice(0, 3);
  return shuffle([target.word, ...pool.map(t => t.word)]);
}

export default function TypingGame() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [mode, setMode] = useState<Mode>("typing");
  const [isTouch, setIsTouch] = useState(false);
  const [time, setTime] = useState(DURATION);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [queue, setQueue] = useState<BaseballTerm[]>([]);
  const [current, setCurrent] = useState<BaseballTerm | null>(null);
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [quizFeedback, setQuizFeedback] = useState<{ pick: string; ok: boolean } | null>(null);
  const [input, setInput] = useState("");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [shake, setShake] = useState(false);
  const [bestScore, setBestScore] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startMsRef = useRef(0);
  const wordStartRef = useRef(0);

  // タッチ判定 → デフォルトでクイズ
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const mql = window.matchMedia("(pointer: coarse)");
      const touch = mql.matches;
      setIsTouch(touch);
      if (touch) setMode("quiz");
    } catch {/* ignore */}
  }, []);

  // ベストスコア
  useEffect(() => {
    try {
      const raw = localStorage.getItem(BEST_KEY);
      if (raw) setBestScore(Number(raw) || 0);
    } catch {/* ignore */}
  }, []);

  // タイマー
  useEffect(() => {
    if (phase !== "playing") return;
    tickRef.current = setInterval(() => {
      const elapsed = (Date.now() - startMsRef.current) / 1000;
      const remain = Math.max(0, DURATION - elapsed);
      setTime(remain);
      if (remain <= 0) finish();
    }, 100);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // current 変化時にクイズ選択肢を生成
  useEffect(() => {
    if (current && mode === "quiz") {
      setQuizOptions(makeQuizOptions(current));
    }
  }, [current, mode]);

  function start() {
    const q = shuffle(TERMS);
    setQueue(q);
    setCurrent(q[0]);
    setInput("");
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setLog([]);
    setQuizFeedback(null);
    setTime(DURATION);
    setPhase("playing");
    startMsRef.current = Date.now();
    wordStartRef.current = Date.now();
    if (mode === "typing") {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function finish() {
    if (tickRef.current) clearInterval(tickRef.current);
    setPhase("finished");
    setTime(0);
    setScore(prev => {
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

  // スコア算出。ローマ字長 × 8 + 速さボーナス
  function scoreFor(romajiLen: number, ms: number) {
    const speedBonus = Math.max(0, Math.round(40 - ms / 100));
    return romajiLen * 8 + speedBonus;
  }

  const advance = useCallback((ok: boolean) => {
    if (!current) return;
    const ms = Date.now() - wordStartRef.current;
    setLog(prev => [...prev, { word: current.word, hint: current.hint, ok, ms }]);
    if (ok) {
      setScore(s => s + scoreFor(current.romaji.length, ms));
      setStreak(s => {
        const next = s + 1;
        setBestStreak(b => Math.max(b, next));
        return next;
      });
    } else {
      setStreak(0);
    }
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
    setQuizFeedback(null);
    wordStartRef.current = Date.now();
  }, [current]);

  // ── タイピング入力（ローマ字 a-z 小文字） ──
  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (phase !== "playing" || !current) return;
    const v = e.target.value.toLowerCase().replace(/[^a-z]/g, "");
    setInput(v);
    if (v === current.romaji) advance(true);
    else if (!current.romaji.startsWith(v)) {
      setShake(true);
      setTimeout(() => setShake(false), 200);
    }
  }

  // オンスクリーンキーボード（スマホ）
  function virtualType(char: string) {
    if (phase !== "playing" || !current) return;
    const c = char.toLowerCase();
    setInput(prev => {
      const next = (prev + c).replace(/[^a-z]/g, "");
      if (next === current.romaji) {
        setTimeout(() => advance(true), 0);
        return next;
      }
      if (!current.romaji.startsWith(next)) {
        setShake(true);
        setTimeout(() => setShake(false), 200);
      }
      return next;
    });
  }
  function virtualBackspace() {
    setInput(prev => prev.slice(0, -1));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Tab" && phase === "playing") {
      e.preventDefault();
      advance(false);
    }
  }

  function onQuizPick(opt: string) {
    if (phase !== "playing" || !current || quizFeedback) return;
    const ok = opt === current.word;
    setQuizFeedback({ pick: opt, ok });
    setTimeout(() => advance(ok), 350);
  }

  const stats = useMemo(() => {
    const total = log.length;
    const correct = log.filter(l => l.ok).length;
    const wrong = total - correct;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { total, correct, wrong, accuracy };
  }, [log]);

  return (
    <div className="typing-game">
      <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
        <Stat label="TIME" value={`${time.toFixed(1)}s`} accent={time < 10 ? "#d10024" : "#0b1e3f"} />
        <Stat label="SCORE" value={String(score)} accent="#d4a82a" />
        <Stat label="STREAK" value={`x${streak}`} accent="#0b1e3f" />
      </div>

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
        <IdleScreen
          onStart={start}
          bestScore={bestScore}
          isTouch={isTouch}
          mode={mode}
          onModeChange={setMode}
        />
      )}

      {phase === "playing" && current && (
        mode === "quiz" ? (
          <QuizPlayingScreen
            current={current}
            options={quizOptions}
            feedback={quizFeedback}
            onPick={onQuizPick}
            onSkip={() => advance(false)}
          />
        ) : (
          <TypingPlayingScreen
            current={current}
            input={input}
            shake={shake}
            isTouch={isTouch}
            inputRef={inputRef}
            onInputChange={onInputChange}
            onKeyDown={onKeyDown}
            onSkip={() => advance(false)}
            onVirtualKey={virtualType}
            onVirtualBackspace={virtualBackspace}
          />
        )
      )}

      {phase === "finished" && (
        <ResultScreen
          score={score}
          bestScore={bestScore}
          stats={stats}
          bestStreak={bestStreak}
          log={log}
          mode={mode}
          isTouch={isTouch}
          onModeChange={setMode}
          onRestart={start}
        />
      )}
    </div>
  );
}

// ─── 共通: 統計カード ─────────────────────────
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

// ─── モードトグル ─────────────────────────────
function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const tab = (key: Mode, label: string, hint: string) => (
    <button
      key={key}
      onClick={() => onChange(key)}
      style={{
        flex: 1,
        padding: "10px 12px",
        background: mode === key ? "#0b1e3f" : "transparent",
        color: mode === key ? "#fff" : "#5b6373",
        border: mode === key ? "none" : "1px solid #d8d4cb",
        cursor: "pointer",
        fontFamily: "var(--font-zen),sans-serif",
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textAlign: "left",
      }}
    >
      <div>{label}</div>
      <div style={{ fontSize: 10, opacity: 0.75, fontWeight: 400, marginTop: 2 }}>{hint}</div>
    </button>
  );
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
      {tab("quiz", "4択クイズ", "タップで選ぶ／指で快適")}
      {tab("typing", "タイピング", "ローマ字入力／日本語学習向き")}
    </div>
  );
}

// ─── アイドル画面 ─────────────────────────────
function IdleScreen({
  onStart, bestScore, isTouch, mode, onModeChange,
}: {
  onStart: () => void;
  bestScore: number;
  isTouch: boolean;
  mode: Mode;
  onModeChange: (m: Mode) => void;
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e0dcd4", padding: "40px 28px", textAlign: "center" }}>
      <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 11, color: "#d10024", letterSpacing: "0.4em", marginBottom: 12 }}>
        READY
      </div>
      <h2 style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: 26, fontWeight: 900, color: "#0b1e3f", marginBottom: 10 }}>
        30秒チャレンジ
      </h2>
      <p style={{ fontSize: 14, color: "#5b6373", lineHeight: 1.9, marginBottom: 24, maxWidth: 480, marginInline: "auto" }}>
        野球用語の日本語を見て、対応する<strong>ローマ字</strong>を入力。<br />
        覚えながら速く打てたら最高。
      </p>

      {isTouch && (
        <div style={{ textAlign: "left", maxWidth: 460, marginInline: "auto" }}>
          <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 10, color: "#d10024", letterSpacing: "0.3em", marginBottom: 8 }}>SELECT MODE</p>
          <ModeToggle mode={mode} onChange={onModeChange} />
        </div>
      )}

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

// ─── タイピング画面（寿司打スタイル） ─────────
function TypingPlayingScreen({
  current, input, shake, isTouch, inputRef, onInputChange, onKeyDown, onSkip,
  onVirtualKey, onVirtualBackspace,
}: {
  current: BaseballTerm;
  input: string;
  shake: boolean;
  isTouch: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSkip: () => void;
  onVirtualKey: (c: string) => void;
  onVirtualBackspace: () => void;
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e0dcd4", padding: "24px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 10, color: "#d10024", letterSpacing: "0.3em" }}>HINT</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#d4a82a", background: "rgba(212,168,42,0.12)", padding: "2px 8px" }}>{current.cat}</span>
      </div>
      <p style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: 13, color: "#5b6373", lineHeight: 1.6, marginBottom: 18 }}>
        {current.hint}
      </p>

      {/* 寿司打スタイル: 日本語の単語をデカく、その下にローマ字をハイライト */}
      <div className={shake ? "shake" : ""} style={{ background: "#0b1e3f", padding: "26px 24px 24px", marginBottom: 18, textAlign: "center" }}>
        <div style={{
          fontFamily: "var(--font-zen),sans-serif",
          fontSize: "clamp(28px,5.5vw,42px)",
          fontWeight: 900,
          color: "#fff",
          lineHeight: 1.25,
          letterSpacing: "0.04em",
          marginBottom: 16,
        }}>
          {current.word}
        </div>
        <div style={{
          fontFamily: "var(--font-oswald),sans-serif",
          fontSize: "clamp(20px,4vw,30px)",
          letterSpacing: "0.15em",
          lineHeight: 1.2,
        }}>
          {current.romaji.split("").map((c, i) => {
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

      {!isTouch ? (
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={onInputChange}
          onKeyDown={onKeyDown}
          autoComplete="off"
          spellCheck={false}
          placeholder="ローマ字で入力 (IME OFF)"
          style={{
            width: "100%",
            padding: "16px 18px",
            fontSize: 20,
            fontFamily: "var(--font-oswald),sans-serif",
            letterSpacing: "0.15em",
            textAlign: "center",
            border: "2px solid #d10024",
            outline: "none",
            background: "#fafafa",
          }}
        />
      ) : (
        <OnscreenKeyboard
          onKey={onVirtualKey}
          onBackspace={onVirtualBackspace}
          onSkip={onSkip}
        />
      )}

      {!isTouch && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
          <span style={{ fontSize: 11, color: "#8a8a8a" }}>
            <kbd style={{ background: "#e0dcd4", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontFamily: "monospace" }}>Tab</kbd> でスキップ
          </span>
          <button onClick={onSkip} style={{ background: "transparent", border: "1px solid #d8d4cb", color: "#5b6373", padding: "6px 14px", fontSize: 12, cursor: "pointer" }}>
            スキップ →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── オンスクリーン キーボード ───────────────
const KB_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

function OnscreenKeyboard({
  onKey, onBackspace, onSkip,
}: {
  onKey: (c: string) => void;
  onBackspace: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="kbd-wrap" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {KB_ROWS.map((row, ri) => (
        <div key={ri} style={{ display: "flex", justifyContent: "center", gap: 4 }}>
          {ri === 1 && <span style={{ flex: "0.5 1 0" }} />}
          {row.split("").map(ch => (
            <button
              key={ch}
              onClick={() => onKey(ch)}
              className="kbd-key"
              style={{
                flex: 1,
                aspectRatio: "1",
                maxHeight: 52,
                fontFamily: "var(--font-oswald),sans-serif",
                fontSize: 18,
                fontWeight: 700,
                color: "#0b1e3f",
                background: "#fff",
                border: "1px solid #d8d4cb",
                cursor: "pointer",
                touchAction: "manipulation",
                userSelect: "none",
                textTransform: "lowercase",
              }}
            >
              {ch}
            </button>
          ))}
          {ri === 1 && <span style={{ flex: "0.5 1 0" }} />}
          {ri === 2 && (
            <button
              onClick={onBackspace}
              className="kbd-key"
              style={{
                flex: 1.6,
                aspectRatio: "auto",
                maxHeight: 52,
                fontSize: 16,
                fontWeight: 700,
                color: "#fff",
                background: "#5b6373",
                border: "none",
                cursor: "pointer",
                touchAction: "manipulation",
              }}
            >
              ⌫
            </button>
          )}
        </div>
      ))}
      <button
        onClick={onSkip}
        style={{ marginTop: 6, padding: "10px", background: "transparent", border: "1px solid #d8d4cb", color: "#5b6373", fontSize: 12, cursor: "pointer", letterSpacing: "0.1em" }}
      >
        スキップ →
      </button>
    </div>
  );
}

// ─── クイズ画面 ───────────────────────────────
function QuizPlayingScreen({
  current, options, feedback, onPick, onSkip,
}: {
  current: BaseballTerm;
  options: string[];
  feedback: { pick: string; ok: boolean } | null;
  onPick: (opt: string) => void;
  onSkip: () => void;
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e0dcd4", padding: "28px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 10, color: "#d10024", letterSpacing: "0.3em" }}>QUIZ</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#d4a82a", background: "rgba(212,168,42,0.12)", padding: "2px 8px" }}>{current.cat}</span>
      </div>
      <p style={{ fontFamily: "var(--font-zen),sans-serif", fontSize: 18, fontWeight: 700, color: "#0b1e3f", lineHeight: 1.6, marginBottom: 24 }}>
        {current.hint}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {options.map((opt, i) => {
          let bg = "#fff";
          let color = "#0b1e3f";
          let border = "1px solid #d8d4cb";
          if (feedback) {
            if (opt === current.word) {
              bg = "#1a9f3a"; color = "#fff"; border = "1px solid #1a9f3a";
            } else if (opt === feedback.pick) {
              bg = "#d10024"; color = "#fff"; border = "1px solid #d10024";
            } else {
              color = "#aaa";
            }
          }
          return (
            <button
              key={i}
              onClick={() => onPick(opt)}
              disabled={!!feedback}
              style={{
                padding: "18px 14px",
                background: bg,
                color,
                border,
                fontFamily: "var(--font-zen),sans-serif",
                fontSize: "clamp(15px,3.5vw,20px)",
                fontWeight: 700,
                letterSpacing: "0.04em",
                cursor: feedback ? "default" : "pointer",
                transition: "all 0.15s",
                minHeight: 64,
                touchAction: "manipulation",
                whiteSpace: "normal",
                lineHeight: 1.3,
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
        <button onClick={onSkip} disabled={!!feedback} style={{ background: "transparent", border: "1px solid #d8d4cb", color: "#5b6373", padding: "6px 14px", fontSize: 12, cursor: feedback ? "default" : "pointer" }}>
          スキップ →
        </button>
      </div>
    </div>
  );
}

// ─── 結果画面 ─────────────────────────────────
function ResultScreen({
  score, bestScore, stats, bestStreak, log, mode, isTouch, onModeChange, onRestart,
}: {
  score: number;
  bestScore: number;
  stats: { total: number; correct: number; wrong: number; accuracy: number };
  bestStreak: number;
  log: LogEntry[];
  mode: Mode;
  isTouch: boolean;
  onModeChange: (m: Mode) => void;
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
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: "0.2em", marginTop: 6 }}>
          POINTS · {mode === "quiz" ? "QUIZ" : "TYPING"}
        </div>
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

      <div style={{ background: "#fff", border: "1px solid #e0dcd4", padding: "16px 20px", marginBottom: 20, maxHeight: 260, overflowY: "auto" }}>
        <div style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 10, color: "#d10024", letterSpacing: "0.3em", marginBottom: 10 }}>
          RECAP
        </div>
        {log.length === 0 ? (
          <p style={{ fontSize: 13, color: "#8a8a8a" }}>記録なし。</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {log.map((l, i) => (
              <li key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderTop: i === 0 ? "none" : "1px solid #f0ece6", fontSize: 13 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <span style={{ color: l.ok ? "#1a9f3a" : "#d10024", fontWeight: 700, width: 16 }}>
                    {l.ok ? "✓" : "✕"}
                  </span>
                  <span style={{ fontFamily: "var(--font-zen),sans-serif", color: "#0b1e3f", fontWeight: 700, minWidth: 100 }}>
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

      {isTouch && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontFamily: "var(--font-oswald),sans-serif", fontSize: 10, color: "#d10024", letterSpacing: "0.3em", marginBottom: 8 }}>NEXT MODE</p>
          <ModeToggle mode={mode} onChange={onModeChange} />
        </div>
      )}

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
