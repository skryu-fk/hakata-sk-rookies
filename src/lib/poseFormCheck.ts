/**
 * poseFormCheck — 端末内（ブラウザ内）で完結するバッティング/ピッチングのフォーム解析。
 *
 * 動画は一切サーバーへ送らない。MediaPipe PoseLandmarker（WASM・モデルは同一オリジン
 * /public/mediapipe に同梱）で骨格を推定し、各フレームの 33 キーポイントから
 * ・推定スイング/リリース速度（worldLandmarks のメートル空間で算出 → km/h）
 * ・フォームの各指標スコア（0〜100）と総合点
 * ・改善点（指摘ルール）
 * を計算する。あくまで“目安”であり、計測機器のような精度ではない点に注意。
 */

import type { PoseLandmarker as PoseLandmarkerType } from "@mediapipe/tasks-vision";

export type Kind = "batting" | "pitching";
export type LM = { x: number; y: number; z: number; visibility?: number };
export type Metric = { key: string; label: string; score: number; comment: string; measured?: string };
export type KeyFrame = { label: string; phase: string; dataUrl: string };
export type HitterType = { emoji: string; label: string; desc: string };
export type FormResult = {
  kind: Kind;
  overall: number;
  hitterType: HitterType | null;  // 打者タイプ判定（打撃のみ）
  metrics: Metric[];
  strengths: string[];         // 良かった点
  tips: string[];              // 改善アドバイス（具体的）
  keyframeDataUrl: string;     // インパクト/リリース（代表コマ）
  keyframes: KeyFrame[];       // 構え〜フォロースルーまでの連続コマ
  framesAnalyzed: number;
  durationSec: number;
  confidence: "high" | "medium" | "low"; // 解析の信頼度（骨格の取得品質から算出）
  lowLight: boolean;       // 暗い映像（精度が落ちる）
  brightness: number;      // 平均輝度 0〜255（目安）
  notes: string[];         // 精度に関する注意（暗い・フレーム少 など）
};

// BlazePose 33点のインデックス
const NOSE = 0, L_SH = 11, R_SH = 12, L_EL = 13, R_EL = 14, L_WR = 15, R_WR = 16,
  L_HIP = 23, R_HIP = 24, L_KN = 25, R_KN = 26, L_AN = 27, R_AN = 28;

const CONNECTIONS: [number, number][] = [
  [L_SH, R_SH], [L_SH, L_HIP], [R_SH, R_HIP], [L_HIP, R_HIP],
  [L_SH, L_EL], [L_EL, L_WR], [R_SH, R_EL], [R_EL, R_WR],
  [L_HIP, L_KN], [L_KN, L_AN], [R_HIP, R_KN], [R_KN, R_AN],
];

// ── 幾何ヘルパ ──
const mid = (a: LM, b: LM): LM => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 });
const dist2 = (a: LM, b: LM) => Math.hypot(a.x - b.x, a.y - b.y);
// 世界座標(メートル)での3D距離。カメラ位置に左右されない計測に使う。
const dist3 = (a: LM, b: LM) => Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
const lineAngleDeg = (a: LM, b: LM) => Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
const std = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = xs.reduce((s, v) => s + v, 0) / xs.length;
  return Math.sqrt(xs.reduce((s, v) => s + (v - m) ** 2, 0) / xs.length);
};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
// 重い検出ループの合間にブラウザへ制御を返す（UIを固めない・進捗バーを動かすため）
const yieldNow = () => new Promise<void>(r => setTimeout(r, 0));
// 移動平均（ジッタ低減）。w=隣接何点を平均するか
const sma = (xs: number[], w = 1) => xs.map((_, i) => {
  let s = 0, c = 0;
  for (let k = -w; k <= w; k++) { const j = i + k; if (j >= 0 && j < xs.length) { s += xs[j]; c++; } }
  return s / c;
});
// 角度の移動平均。角度は -180 と 180 が同じ向きなので、そのまま平均すると
// 0度付近に化ける。sin/cos に直して平均し、角度へ戻す。
const smaAngle = (deg: number[], w = 1) => deg.map((_, i) => {
  let sx = 0, sy = 0;
  for (let k = -w; k <= w; k++) {
    const j = i + k;
    if (j >= 0 && j < deg.length) { const r = deg[j] * Math.PI / 180; sx += Math.cos(r); sy += Math.sin(r); }
  }
  return Math.atan2(sy, sx) * 180 / Math.PI;
});
/**
 * 外れ値に強い最大値（上位1割を捨てた最大値）。
 * 骨格推定は1コマだけ大きく外れることがあり、素の Math.max だと
 * その1コマに引っ張られる。しかもコマ数が多い動画ほど外れ値を引きやすく、
 * 「同じ動きなのに端末によって点数が変わる」原因になるため、ここで抑える。
 */
const robustMax = (xs: number[]) => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => b - a);
  // コマが少ないときに上位を捨てると、山を取りこぼして低く出てしまう。
  if (s.length < 8) return s[0];
  return s[clamp(Math.round(s.length * 0.1), 1, s.length - 1)];
};

type Frame = { t: number; lm: LM[]; world: LM[] };

// ── PoseLandmarker（シングルトン） ──
let _landmarker: PoseLandmarkerType | null = null;
let _loading: Promise<PoseLandmarkerType> | null = null;
async function getLandmarker(): Promise<PoseLandmarkerType> {
  if (_landmarker) return _landmarker;
  if (_loading) return _loading;
  _loading = (async () => {
    const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
    const vision = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
    const lm = await PoseLandmarker.createFromOptions(vision, {
      // fullモデル＋IMAGEモード（状態を持たない＝同じ画像なら必ず同じ結果＝再現性あり）。
      baseOptions: { modelAssetPath: "/mediapipe/pose_landmarker_full.task", delegate: "GPU" },
      runningMode: "IMAGE",
      numPoses: 1,
      minPoseDetectionConfidence: 0.4,
      minPosePresenceConfidence: 0.4,
    });
    _landmarker = lm;
    return lm;
  })();
  return _loading;
}

// 取り込んだ静止コマ（再生しながら取得＝確実にデコード済み → 検出はあとで）
type Shot = { t: number; cv: HTMLCanvasElement };
const SHOT_W = 260;       // 取り込み解像度（省メモリ）
const MAX_SHOTS = 120;    // メモリ保護
const TARGET_SHOTS = 80;  // 動画全体に均等取り込みする目標コマ数

// キャンバスの平均輝度（0〜255）。実フレームから測るので暗さ誤判定しない。
function canvasBrightness(cv: HTMLCanvasElement): number | null {
  try {
    const c = document.createElement("canvas"); c.width = 24; c.height = 24;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(cv, 0, 0, 24, 24);
    const d = ctx.getImageData(0, 0, 24, 24).data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    return sum / (d.length / 4);
  } catch { return null; }
}

// 検出/描画用に明るさ補正したキャンバスを返す（暗所のみ）
const _procCv = typeof document !== "undefined" ? document.createElement("canvas") : null;
function brightenSource(src: HTMLCanvasElement, gain: number, contrast: number): HTMLCanvasElement {
  if (!_procCv || gain <= 1.02) return src;
  _procCv.width = src.width; _procCv.height = src.height;
  const ctx = _procCv.getContext("2d");
  if (!ctx) return src;
  try {
    ctx.filter = `brightness(${gain}) contrast(${contrast})`;
    ctx.drawImage(src, 0, 0);
    ctx.filter = "none";
    return _procCv;
  } catch { return src; }
}

function seekTo(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    // requestAnimationFrame はアプリを裏に回した時など“画面が描かれない状態”では
    // 一切発火しない。ここで rAF を待つと解析が永久に止まるため、タイマーで進める。
    const finish = () => { if (done) return; done = true; video.removeEventListener("seeked", finish); setTimeout(resolve, 0); };
    video.addEventListener("seeked", finish);
    try { video.currentTime = Math.max(0, Math.min(t, (video.duration || 0) - 0.001)); } catch { finish(); }
    setTimeout(finish, 400);
  });
}

type RVFC = HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number };
// シーク後、そのコマが実際に描画される（デコードされる）まで待つ。
// これをしないと一部端末で“まだ真っ黒のコマ”を取得して検出に失敗する。
function waitDecoded(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve) => {
    const rv = video as RVFC;
    let done = false;
    const fin = () => { if (done) return; done = true; resolve(); };
    if (typeof rv.requestVideoFrameCallback === "function") {
      rv.requestVideoFrameCallback!(fin);          // 新しいコマが合成された瞬間に発火
      setTimeout(fin, 220);
    } else {
      requestAnimationFrame(() => requestAnimationFrame(fin));
      setTimeout(fin, 220);
    }
  });
}

/** 今表示されているコマを静止画として取り込む */
function pushShot(video: HTMLVideoElement, shots: Shot[]): void {
  if (shots.length >= MAX_SHOTS) return;
  const vw = video.videoWidth || SHOT_W, vh = video.videoHeight || Math.round(SHOT_W * 1.6);
  const w = SHOT_W, h = Math.max(1, Math.round(vh * (SHOT_W / vw)));
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const ctx = cv.getContext("2d");
  if (ctx) { try { ctx.drawImage(video, 0, 0, w, h); shots.push({ t: video.currentTime, cv }); } catch { /* noop */ } }
}

/**
 * コマ取得：動画を“再生しながら”静止コマを取る（requestVideoFrameCallback）。
 * 常にデコード済みフレームが得られる＝真っ黒コマにならず確実に検出できる。
 * 動画全体に均等な間隔で取り込み（時間ベース）。再生不可ならシークで取得。
 */
async function grabShots(video: HTMLVideoElement, duration: number, onProgress?: (p: number) => void): Promise<Shot[]> {
  const shots: Shot[] = [];
  const draw = () => pushShot(video, shots);
  const rv = video as RVFC;
  const interval = Math.max(0.02, duration / TARGET_SHOTS);
  if (typeof rv.requestVideoFrameCallback === "function") {
    await new Promise<void>((resolve) => {
      let done = false, prevT = -1, sameCt = 0, calls = 0, nextDrawT = 0;
      const startMs = Date.now();
      const finish = () => { if (done) return; done = true; try { video.pause(); } catch { /* noop */ } resolve(); };
      const onFrame = () => {
        if (done) return;
        if (Date.now() - startMs > 11000) { finish(); return; }                 // 同期ウォールクロック
        if (++calls > 1500 || shots.length >= MAX_SHOTS) { finish(); return; }
        const ct = video.currentTime;
        if (Math.abs(ct - prevT) < 1e-4) { if (++sameCt > 10) { finish(); return; } }
        else { sameCt = 0; prevT = ct; }
        if (ct >= nextDrawT) { draw(); nextDrawT = ct + interval; }             // 間隔ごとに取り込む
        onProgress?.(0.06 + 0.30 * clamp(ct / duration, 0, 1));
        if (video.ended || ct >= duration - 0.04) { finish(); return; }
        rv.requestVideoFrameCallback!(onFrame);
      };
      video.addEventListener("ended", finish, { once: true });
      try { video.currentTime = 0; video.playbackRate = clamp(duration / 6, 1, 2); } catch { /* noop */ }
      Promise.resolve(video.play()).catch(() => { /* 再生不可なら下のシークへ */ });
      rv.requestVideoFrameCallback!(onFrame);
      // 画面が描かれない状態では requestVideoFrameCallback が発火しない。
      // 一定時間たっても1コマも取れていなければ、待たずにシーク取り込みへ切り替える。
      setTimeout(() => { if (shots.length === 0) finish(); }, 2500);
      setTimeout(finish, 11500);
    });
  }
  // 再生で取れなかった時のみシーク取り込み（フレーム描画を待ってから）
  if (shots.length < 8 && isFinite(video.duration) && video.duration > 0.3) {
    shots.length = 0;
    const N = clamp(Math.round(duration * 10), 18, 50);
    for (let i = 0; i <= N; i++) { await seekTo(video, (duration * i) / N); await waitDecoded(video); draw(); onProgress?.(0.06 + 0.30 * (i / N)); }
  }
  return shots;
}

// 隣接コマの画像差分が最大の位置 ＝ いちばん動いた瞬間（スイング/リリース）。
// 速い動きはモーションブラーで骨格検出が外れがちなので、画像の動きで瞬間を当てる。
// 戻り値: idx=最も動いたコマ（スイング/リリース）, intensity=動きの強さ0〜1（ブレた瞬間も拾える）
function motionPeakIndex(shots: Shot[]): { idx: number; intensity: number } {
  const fallback = { idx: Math.floor(shots.length / 2), intensity: 0 };
  if (shots.length < 3) return fallback;
  const W = 40, H = 30;
  const c = typeof document !== "undefined" ? document.createElement("canvas") : null;
  if (!c) return fallback;
  c.width = W; c.height = H;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return fallback;
  const sigs: Uint8ClampedArray[] = [];
  for (const s of shots) {
    try { ctx.drawImage(s.cv, 0, 0, W, H); sigs.push(ctx.getImageData(0, 0, W, H).data); }
    catch { sigs.push(new Uint8ClampedArray(W * H * 4)); }
  }
  const diffs = [0];
  for (let i = 1; i < sigs.length; i++) {
    let d = 0; const a = sigs[i], b = sigs[i - 1];
    for (let j = 0; j < a.length; j += 4) d += Math.abs(a[j] - b[j]) + Math.abs(a[j + 1] - b[j + 1]) + Math.abs(a[j + 2] - b[j + 2]);
    diffs.push(d);
  }
  let peak = Math.floor(shots.length / 2), pd = -1;
  for (let i = 1; i < diffs.length; i++) {
    const v = (diffs[i - 1] + diffs[i] + (diffs[i + 1] || diffs[i])) / 3;
    if (v > pd) { pd = v; peak = i; }
  }
  // 強さ＝最大の平滑差分を、全画素の最大値で正規化（0〜1付近）
  const maxPossible = W * H * 3 * 255;
  const intensity = clamp(pd / (maxPossible * 0.5), 0, 1);
  return { idx: peak, intensity };
}

/**
 * スイング/投球の瞬間の前後だけ、コマを細かく取り直す。
 *
 * 動画全体を均等に取り込むだけだと、0.2秒ほどで終わるスイングが2〜3コマしか
 * 残らず、回転量や「ため」を正しく測れない（速さの山を1コマ跨いで見逃す）。
 * いちばん動いた瞬間の前後 ±REFINE_SPAN 秒を 1/30 秒間隔で取り直して補う。
 */
const REFINE_SPAN = 0.5;   // 前後何秒を取り直すか
const REFINE_STEP = 1 / 30; // 取り直す間隔（多くの動画の実フレーム間隔）
async function refineShots(video: HTMLVideoElement, shots: Shot[], centerT: number, duration: number): Promise<void> {
  const from = Math.max(0, centerT - REFINE_SPAN), to = Math.min(duration, centerT + REFINE_SPAN);
  const startMs = Date.now();
  const added: Shot[] = [];
  for (let t = from; t <= to; t += REFINE_STEP) {
    if (Date.now() - startMs > 7000 || shots.length + added.length >= MAX_SHOTS) break;
    // すでに近い時刻のコマがあるなら取り直さない
    if (shots.some(s => Math.abs(s.t - t) < REFINE_STEP * 0.6)) continue;
    await seekTo(video, t);
    await waitDecoded(video);
    pushShot(video, added);
  }
  shots.push(...added);
  shots.sort((a, b) => a.t - b.t);
}

/** 動画ファイルを解析して結果を返す。onProgress(0..1) で進捗を通知。 */
export async function analyzeForm(
  file: File,
  kind: Kind,
  onProgress?: (p: number) => void,
): Promise<FormResult> {
  const landmarker = await getLandmarker();
  onProgress?.(0.08);

  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true; video.playsInline = true; video.preload = "auto"; video.src = url;

  await new Promise<void>((resolve, reject) => {
    const ok = () => resolve();
    video.addEventListener("loadeddata", ok, { once: true });
    video.addEventListener("error", () => reject(new Error("動画を読み込めませんでした。")), { once: true });
    setTimeout(ok, 3000);
  });

  let duration = video.duration;
  if (!isFinite(duration) || duration <= 0) duration = 5; // 一部スマホ動画対策
  const tooShort = duration < 1.0;
  duration = Math.min(duration, 10); // 規定：1〜10秒（10秒超は先頭10秒を解析）

  // ── 1) コマ取得：再生しながら全体を均等に取り込む（確実にデコード済み） ──
  const shots = await grabShots(video, duration, onProgress);
  if (shots.length < 4) {
    URL.revokeObjectURL(url);
    throw new Error("動画をうまく読み込めませんでした。1〜10秒の別の動画でお試しください。");
  }

  // ── 1.5) 動きの山の前後を細かく取り直す ──
  // スイングは0.2秒ほどで終わる。均等取り込みのままでは2〜3コマしか残らず、
  // 回転量やためを測れない。先に「いちばん動いた瞬間」を見つけて密に取り直す。
  // 注意: 動きの山は「取り直す前（コマ間隔が均一なうち）」に求めること。
  // 取り直したあとの配列は間隔がバラバラで、隣のコマとの画像差分は
  // 間隔が広いところほど大きく出る＝山の位置を誤って判定してしまう。
  const coarsePeak = motionPeakIndex(shots);
  const motionT = shots[coarsePeak.idx].t;
  const motionIntensity = coarsePeak.intensity;
  await refineShots(video, shots, motionT, duration);

  // ── 2) 明るさ（実フレームから3点測定）→ 自動補正ゲイン ──
  const briSamples: number[] = [];
  for (const r of [0.2, 0.5, 0.8]) {
    const b = canvasBrightness(shots[Math.floor((shots.length - 1) * r)].cv);
    if (b != null) briSamples.push(b);
  }
  const brightness = briSamples.length ? briSamples.reduce((s, v) => s + v, 0) / briSamples.length : 128;
  const gain = brightness < 105 ? clamp(105 / Math.max(6, brightness), 1, 7) : 1;
  const contrast = gain > 1.6 ? 1.2 : gain > 1.02 ? 1.1 : 1;
  onProgress?.(0.40);

  // ── 3) 検出（IMAGEモード＝状態を持たない＝同じ画像なら必ず同じ結果） ──
  // 検出するコマ数は DET_MAX 本に固定する（端末の負荷を一定に保つため）。
  // ただし均等に配るのではなく、動きの山の前後（＝実際のスイング/投球）へ
  // 優先的に割り当てる。ここが密でないと角度も速さも測れないため。
  const det = new Map<number, { lm: LM[]; world: LM[] }>();
  const DET_MAX = 40;
  const WINDOW_MAX = 30; // うちスイング区間に割り当てる上限
  const pickEven = (src: number[], n: number): number[] => {
    if (src.length <= n) return src;
    const st = src.length / n;
    return Array.from(new Set(Array.from({ length: n }, (_, k) => src[Math.min(src.length - 1, Math.round(k * st))])));
  };
  const inSwing = shots.map((_, i) => i).filter(i => Math.abs(shots[i].t - motionT) <= REFINE_SPAN);
  const outSwing = shots.map((_, i) => i).filter(i => Math.abs(shots[i].t - motionT) > REFINE_SPAN);
  const nearIdxs = pickEven(inSwing, WINDOW_MAX);
  const farIdxs = pickEven(outSwing, Math.max(0, DET_MAX - nearIdxs.length));
  const detIdxs = [...new Set([...nearIdxs, ...farIdxs])].sort((a, b) => a - b);
  for (let n = 0; n < detIdxs.length; n++) {
    const idx = detIdxs[n];
    const src = brightenSource(shots[idx].cv, gain, contrast);
    let res;
    try { res = landmarker.detect(src); } catch { res = null; }
    const lm = res?.landmarks?.[0] as LM[] | undefined;
    const world = (res?.worldLandmarks?.[0] as LM[] | undefined) ?? lm;
    if (lm && world && lm.length >= 20) det.set(idx, { lm, world });
    onProgress?.(0.40 + 0.50 * (n / detIdxs.length));
    if (n % 2 === 1) await yieldNow(); // UIを固めない
  }
  onProgress?.(0.92);

  // ── 検出済みを時刻順に → frames（写真用に shot index も保持） ──
  const detList = [...det.entries()].map(([idx, d]) => ({ idx, t: shots[idx].t, lm: d.lm, world: d.world })).sort((a, b) => a.t - b.t);
  const frames: Frame[] = detList.map(f => ({ t: f.t, lm: f.lm, world: f.world }));

  // 利き手（よく動く手首）
  const wrPath = (w: number) => { let s = 0; for (let i = 1; i < frames.length; i++) s += dist2(frames[i].lm[w], frames[i - 1].lm[w]); return s; };
  const WR = wrPath(R_WR) >= wrPath(L_WR) ? R_WR : L_WR;

  const lowLight = brightness < 34;
  const veryDark = brightness < 15;
  const fewFrames = frames.length < 12;

  if (frames.length < 3) {
    URL.revokeObjectURL(url);
    throw new Error(lowLight
      ? "暗くて人物をうまく検出できませんでした。明るい場所で、横から全身が写るように撮ってください。"
      : "人物の全身が検出できませんでした。横から、全身が画面に収まるように撮影してください。");
  }

  const notes: string[] = [];
  if (tooShort) notes.push("⏱ 動画が短めです。1〜10秒（スイング全体が入る長さ）で撮ると精度が上がります。");
  if (lowLight) notes.push(veryDark
    ? "🌙 かなり暗い映像です。明るさを自動補正して解析しました。明るい場所で撮るほど精度が上がります。"
    : "🌙 やや暗い映像です。明るさを自動補正して解析しています。明るい場所ほど精度が高くなります。");
  if (fewFrames) notes.push("⚠ 解析できたコマが少なめのため、数値は参考値です（横から・全身・なるべくブレずに撮ると精度UP）。");

  /* ════════════════════════════════════════════════════════════
   * 解析コア
   *
   * 角度・距離はすべて MediaPipe の「世界座標(worldLandmarks)」で計算する。
   * 世界座標は「腰の中心を原点としたメートル単位の3D座標」なので、
   * カメラの位置・距離・画角が変わっても同じ動きなら同じ数値になる。
   * （従来は画像上の2D座標で角度を出していたため、撮る位置で結果が変わっていた）
   * ════════════════════════════════════════════════════════════ */

  const KEY_PTS = [L_SH, R_SH, L_HIP, R_HIP, L_EL, R_EL, L_WR, R_WR, L_KN, R_KN, L_AN, R_AN];
  const avg = (xs: number[]) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 0);
  const median = (xs: number[]) => {
    if (!xs.length) return 0;
    const s = [...xs].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  };

  // 骨格がどれだけ確実に取れているか（0〜1）。低いときは数値を断定しない。
  const detectQuality = avg(frames.map(f => avg(KEY_PTS.map(i => f.lm[i]?.visibility ?? 0))));

  // 体格の基準（メートル）。点数を身長差に左右されないよう正規化に使う。
  const shoulderW = Math.max(0.12, median(frames.map(f => dist3(f.world[L_SH], f.world[R_SH]))));
  const legLen = Math.max(0.25, median(frames.map(f =>
    (dist3(f.world[L_HIP], f.world[L_AN]) + dist3(f.world[R_HIP], f.world[R_AN])) / 2)));
  const armLen = Math.max(0.20, median(frames.map(f => dist3(f.world[L_SH], f.world[L_WR]))));

  // 水平面での体の向き（方位角）。左右の点を結ぶ線の x-z 平面上の角度。
  const azimuth = (a: LM, b: LM) => Math.atan2((b.z ?? 0) - (a.z ?? 0), b.x - a.x) * 180 / Math.PI;
  // 角度差を -180〜180 に収める
  const angDiff = (a: number, b: number) => { let d = a - b; while (d > 180) d -= 360; while (d < -180) d += 360; return d; };

  // 速い動きはブレて z 座標が乱れ、向きが1コマだけ大きく飛ぶことがある。
  // 前後のコマと均して、実際の動きだけを残す。
  const shoulderAz = smaAngle(frames.map(f => azimuth(f.world[R_SH], f.world[L_SH])), 1);
  const hipAz = smaAngle(frames.map(f => azimuth(f.world[R_HIP], f.world[L_HIP])), 1);

  /* ── インパクト/リリースの瞬間を「手首の速さ」から求める ──
   * 世界座標なので、カメラが揺れても手の動きだけを見られる。
   * 最速の瞬間＝インパクト（打撃）／リリース（投球）。
   * ブレて骨格が取れない瞬間に備え、取れなければ画像の動き量で補う。   */
  const wristSpeed: number[] = frames.map((f, i) => {
    if (i === 0) return 0;
    const dt = Math.max(1e-3, f.t - frames[i - 1].t);
    return dist3(f.world[WR], frames[i - 1].world[WR]) / dt; // m/s
  });
  const speedSm = sma(wristSpeed, 1);
  let peakIdx = 0;
  for (let i = 1; i < speedSm.length; i++) if (speedSm[i] > speedSm[peakIdx]) peakIdx = i;
  const peakSpeed = speedSm[peakIdx] ?? 0;

  // 手首の速さが極端に小さい＝手が追えていないので、画像の動き（motionT）を採用
  if (peakSpeed < 0.8 || detectQuality < 0.45) {
    let best = 0, bd = Infinity;
    for (let i = 0; i < frames.length; i++) { const d = Math.abs(frames[i].t - motionT); if (d < bd) { bd = d; best = i; } }
    peakIdx = best;
  }
  const impactT = frames[peakIdx]?.t ?? motionT;

  /* ── 解析する区間（スイング/投球動作の前後だけ） ──
   * 動画全体を見ると、歩いて構えに入る場面などが混ざって数値が狂う。   */
  // 区切りは「インパクトから何秒か」で決める。コマ番号で区切ると、
  // コマ数や取り込み間隔が違うだけで見る範囲がずれ、同じ動きでも数値が変わる。
  // 項目ごとに、本来見るべき局面だけを切り出す。
  const range = (fromSec: number, toSec: number): number[] => {
    const out = frames.map((_, i) => i)
      .filter(i => frames[i].t - impactT >= fromSec && frames[i].t - impactT <= toSec);
    return out.length >= 3 ? out : frames.map((_, i) => i); // 取れなければ全体で代用
  };
  const nearestFrame = (offsetSec: number) => {
    let b = 0, bd = Infinity;
    for (let i = 0; i < frames.length; i++) {
      const d = Math.abs(frames[i].t - (impactT + offsetSec));
      if (d < bd) { bd = d; b = i; }
    }
    return b;
  };
  const swingIdx = range(-0.55, 0.45);   // 動作そのもの
  const setupIdx = nearestFrame(-0.55);  // 構え（基準の向き）
  const winIdx = swingIdx;               // 信頼度の判定に使う

  // スイング区間のコマ間隔。「ためが最大の瞬間」は一瞬しかないため、
  // ここが粗いとその瞬間を取りこぼし、数値が実際より低く出る。
  // 数字を取り繕わず、粗いときは信頼度を下げて伝える。
  const swingGaps: number[] = [];
  for (let k = 1; k < swingIdx.length; k++) swingGaps.push(frames[swingIdx[k]].t - frames[swingIdx[k - 1]].t);
  const swingStep = swingGaps.length ? median(swingGaps) : 1;

  /* ── 指標の計算（すべて世界座標ベース） ── */

  // 体の回転量：構えからの肩の向きの変化（度）
  const rotationDeg = robustMax(swingIdx.map(i => Math.abs(angDiff(shoulderAz[i], shoulderAz[setupIdx]))));

  // 捻転差（Xファクター）：肩と腰のねじれ（度）。大きいほど力が溜まる。
  // 見るのは「ためが最大になる、踏み込んでから振り出すまで」。
  // 振り抜いたあとまで含めると、ただ肩が先行しただけの角度を拾ってしまう。
  const separationDeg = robustMax(range(-0.45, 0.15).map(i => Math.abs(angDiff(shoulderAz[i], hipAz[i]))));

  // 頭のブレ：腰の中心から見た頭の横ズレ（肩幅比）。小さいほど軸が安定。
  // インパクトまでで見る（振り抜いたあと頭が動くのは当たり前のため）。
  const headIdx = range(-0.60, 0.10);
  const headMid = median(headIdx.map(i => frames[i].world[NOSE].x));
  const headSway = robustMax(headIdx.map(i => Math.abs(frames[i].world[NOSE].x - headMid))) / shoulderW;

  // ステップ幅：両足首の間隔（脚の長さ比）
  const strideRatio = robustMax(range(-0.40, 0.20).map(i => dist3(frames[i].world[L_AN], frames[i].world[R_AN]))) / legLen;

  // フォロースルー：インパクト後 0.6 秒のあいだに、手がどこまで運ばれたか（腕の長さ比）。
  // 移動距離を足し算するとコマ数が多いほど長くなるため、インパクト時の手の位置から
  // いちばん遠ざかった距離で測る。時間で区切らないと、振り終わったあとの
  // 歩き出しや構え直しまで「振り抜き」として数えてしまう。
  const followRatio = robustMax(
    range(0.02, 0.60).map(i => dist3(frames[i].world[WR], frames[peakIdx].world[WR]) / armLen));

  // 開きの早さ：インパクトまでの前半で、肩がどれだけ回ってしまっているか
  const midI = nearestFrame(-0.25);
  const earlyOpenRatio = rotationDeg > 3
    ? clamp(Math.abs(angDiff(shoulderAz[midI], shoulderAz[setupIdx])) / rotationDeg, 0, 1)
    : 0;

  /* ── 採点 ──
   * 下駄を履かせず、測定値をそのまま決められた基準で点数化する。
   * 基準値は一般的な指導内容をもとにした目安（絶対的な正解ではない）。   */
  const up = (v: number, lo: number, ideal: number) => clamp(Math.round(((v - lo) / (ideal - lo)) * 100), 0, 100);
  const down = (v: number, good: number, bad: number) => clamp(Math.round(((bad - v) / (bad - good)) * 100), 0, 100);
  // 「この範囲ならどこでも満点、外れるほど下がる」。踏み込み幅のように
  // 正解が一点ではなく幅がある項目に使う（広い構えも狭い構えも正解になりうる）。
  const plateau = (v: number, lo: number, hi: number, tol: number) =>
    v >= lo && v <= hi ? 100 : clamp(Math.round(100 - ((v < lo ? lo - v : v - hi) / tol) * 100), 0, 100);

  const firstLine = (s: string) => s.split("。")[0] + "。";
  type Def = { key: string; label: string; score: number; measured: string; good: string; tip: string };
  let defs: Def[];

  if (kind === "batting") {
    defs = [
      { key: "axis", label: "軸の安定（頭のブレ）", score: down(headSway, 0.25, 1.10),
        measured: `頭のブレ 肩幅の${(headSway * 100).toFixed(0)}%`,
        good: "頭の位置が最後まで動かず、非常に安定した軸で振れています。",
        tip: "スイング中に頭が動いています。アゴを軽く引き、目線をインパクト位置に最後まで残す意識を。鏡の前でゆっくり素振りし、頭が左右に流れないか確認すると効果的です。" },
      { key: "rotation", label: "体の回転", score: up(rotationDeg, 30, 160),
        measured: `肩の回転 ${rotationDeg.toFixed(0)}°`,
        good: "骨盤から大きく回転できていて、力がしっかり伝わるスイングです。",
        tip: "回転が小さめです。手だけで振らず、後ろの腰（骨盤）を投手方向へしっかり回す意識を。ティー打撃で『おへそをピッチャーへ向ける』感覚を作りましょう。" },
      { key: "separation", label: "捻転差（ため）", score: up(separationDeg, 8, 40),
        measured: `肩と腰のねじれ ${separationDeg.toFixed(0)}°`,
        good: "肩と腰のねじれが大きく、パワーを溜められています。",
        tip: "肩と腰が一緒に回っていて「ため」が作れていません。下半身を先に回し、上半身を我慢して遅れて出すと打球が強くなります。腰から動き出す素振りを繰り返しましょう。" },
      { key: "stride", label: "踏み込み（ステップ）", score: plateau(strideRatio, 0.75, 1.30, 0.35),
        measured: `足幅 脚の長さの${(strideRatio * 100).toFixed(0)}%`,
        good: "前足へちょうど良い幅で踏み込めていて、下半身主導のスイングです。",
        tip: "踏み込み幅が最適から外れています。広すぎると回転できず、狭すぎると力が伝わりません。軸足に乗ってから、自分が一番回りやすい幅を素振りで探しましょう。" },
      { key: "follow", label: "フォロースルー", score: up(followRatio, 0.35, 1.30),
        measured: `インパクト後の手の移動 腕の長さの${followRatio.toFixed(1)}倍`,
        good: "最後までしっかり振り切れていて、理想的なフィニッシュです。",
        tip: "振り切りが小さめです。インパクトで止めず、両手が肩の高さまで来るイメージで大きく振り抜きましょう。フィニッシュまで一気に振る素振りを。" },
    ];
  } else {
    defs = [
      { key: "balance", label: "軸の安定（頭のブレ）", score: down(headSway, 0.25, 1.05),
        measured: `頭のブレ 肩幅の${(headSway * 100).toFixed(0)}%`,
        good: "軸足で立った時から着地まで、頭の位置が安定しています。",
        tip: "立ち上がりで上体が揺れています。軸足一本で2秒静止できるバランス練習を。お腹に力を入れ、頭の真下に軸足を置く意識で。" },
      { key: "stride", label: "ステップ幅", score: plateau(strideRatio, 0.85, 1.40, 0.35),
        measured: `歩幅 脚の長さの${(strideRatio * 100).toFixed(0)}%`,
        good: "良いステップ幅で、下半身をしっかり使えています。",
        tip: "歩幅が最適から外れています。狭いと球威が出ず、広すぎるとリリースが安定しません。体重を乗せ切れる幅を探しましょう。" },
      { key: "open", label: "開きの早さ", score: down(earlyOpenRatio, 0.25, 0.75),
        measured: `前半での開き ${(earlyOpenRatio * 100).toFixed(0)}%`,
        good: "体の開きを我慢できていて、力の伝わるフォームです。",
        tip: "体（胸・肩）の開きが早いです。グラブ側の肩を打者へ向けたまま我慢し、最後に一気に開くと球速・制球が上がります。タオルシャドーで開きを抑える練習を。" },
      { key: "separation", label: "捻転差（ため）", score: up(separationDeg, 8, 38),
        measured: `肩と腰のねじれ ${separationDeg.toFixed(0)}°`,
        good: "下半身と上半身の時間差が作れていて、球に力が乗ります。",
        tip: "肩と腰が同時に回っています。踏み出した足が着いてから上半身を回すと、球速が上がります。ゆっくりしたシャドーピッチングで順番を体に入れましょう。" },
      { key: "follow", label: "フォロースルー", score: up(followRatio, 0.35, 1.25),
        measured: `リリース後の手の移動 腕の長さの${followRatio.toFixed(1)}倍`,
        good: "腕を最後までしっかり振り切れています。",
        tip: "振り切りが小さめです。リリース後も腕を振り抜き、グラブ側の膝の外まで手を持っていくと、肩肘の負担も減り球威も出ます。" },
    ];
  }

  /* ── 信頼度 ──
   * 骨格の取得品質・解析できたコマ数・区間が取れたかで決める。
   * 低いときは数値を断定せず、その旨をはっきり伝える。   */
  const confidence: "high" | "medium" | "low" =
    detectQuality >= 0.75 && frames.length >= 18 && winIdx.length >= 12 && swingStep <= 0.07 ? "high"
    : detectQuality >= 0.55 && frames.length >= 10 && swingStep <= 0.16 ? "medium" : "low";

  const metrics: Metric[] = defs.map(d => ({
    key: d.key, label: d.label, score: d.score, measured: d.measured,
    comment: d.score >= 70 ? d.good : firstLine(d.tip),
  }));
  const scoreOf = (k: string) => defs.find(d => d.key === k)?.score ?? 0;
  const overall = Math.round(defs.reduce((s, d) => s + d.score, 0) / defs.length);

  if (confidence === "low") {
    notes.push("⚠ 骨格をうまく検出できていないため、点数の精度は低めです。横から・全身が入るように・明るい場所で撮り直すと大きく改善します。");
  } else if (confidence === "medium") {
    notes.push("ℹ️ おおむね検出できています。全身がはっきり映るように撮ると、さらに精度が上がります。");
  }
  if (swingStep > 0.07) {
    notes.push("⚠ スイングの一瞬を捉えたコマが少なめです。とくに「ため（捻転差）」は実際より低めに出ている可能性があります。");
  }

  // ── 打者タイプ判定（打撃のみ）── 回転・捻転差・振り切り・軸から判定する
  let hitterType: HitterType | null = null;
  if (kind === "batting") {
    const rotS = scoreOf("rotation"), followS = scoreOf("follow"), axisS = scoreOf("axis"), sepS = scoreOf("separation");
    const power = (rotS + followS + sepS) / 3;
    if (confidence === "low") {
      hitterType = { emoji: "❓", label: "判定できません", desc: "骨格がうまく取れませんでした。横から全身が入るように撮り直すと判定できます。" };
    } else if (overall < 45) {
      hitterType = { emoji: "🌱", label: "発展途上タイプ", desc: "まずは基礎フォームを固める段階。下のポイントを1つずつ試そう。続ければ必ず伸びます！" };
    } else if (power >= 72 && rotS >= 65) {
      hitterType = { emoji: "💣", label: "長距離（パワー）タイプ", desc: "大きな回転とためでボールを遠くへ飛ばすスラッガータイプ。長打が武器です！" };
    } else if (axisS >= 70 && rotS >= 45) {
      hitterType = { emoji: "🎯", label: "中距離（ミート）タイプ", desc: "軸が安定したコンパクトなスイング。確実にミートして広角に打ち分けるタイプ。" };
    } else {
      hitterType = { emoji: "⚙️", label: "バランス改善タイプ", desc: "持ち味はこれから。軸と回転を整えると一気に伸びます。下のポイントを重点的に。" };
    }
  }

  // 良かった点（高スコア）と 改善アドバイス（低スコア・具体的）
  const strengths = defs.filter(d => d.score >= 72).sort((a, b) => b.score - a.score).slice(0, 3).map(d => d.good);
  const tips = defs.filter(d => d.score < 65).sort((a, b) => a.score - b.score).slice(0, 4).map(d => d.tip);
  if (tips.length === 0) tips.push("大きな弱点は見当たりません。今のフォームを維持しつつ、さらにスイング/球のキレを磨いていきましょう！");
  if (strengths.length === 0) strengths.push("まずは反復で“同じ動き”を固めることから。続けるほど数値は必ず伸びます。");
  // ── キーフレーム連続コマ（取り込んだ“全コマ”から＝ブレた瞬間も表示する） ──
  const sS = shots[0].t, sE = shots[shots.length - 1].t, pT = impactT;
  const isBat = kind === "batting";
  const phaseDefs = [
    { label: "構え", phase: "SET", t: sS + (pT - sS) * 0.10 },
    { label: isBat ? "始動・トップ" : "ステップ", phase: "LOAD", t: sS + (pT - sS) * 0.60 },
    { label: isBat ? "インパクト" : "リリース", phase: "IMPACT", t: pT },
    { label: "フォロー①", phase: "FOLLOW1", t: pT + (sE - pT) * 0.30 },
    { label: "フォロー②", phase: "FOLLOW2", t: pT + (sE - pT) * 0.62 },
    { label: "フィニッシュ", phase: "FINISH", t: sE },
  ];
  const nearestShotIdx = (t: number) => { let b = 0, bd = Infinity; for (let i = 0; i < shots.length; i++) { const d = Math.abs(shots[i].t - t); if (d < bd) { bd = d; b = i; } } return b; };
  // 各キーフレームのコマをその場で検出して骨格を出す（構え等ハッキリしたコマは必ず表示。
  // ブレて検出できない瞬間だけ画像のみ）。IMAGEモードなので結果は安定。
  const detByIdx = new Map(detList.map(f => [f.idx, f.lm] as const));
  const keyframes: KeyFrame[] = [];
  for (let p = 0; p < phaseDefs.length; p++) {
    const ph = phaseDefs[p];
    const si = nearestShotIdx(ph.t);
    let lm = detByIdx.get(si) ?? null;
    if (!lm) {
      const src = brightenSource(shots[si].cv, gain, contrast);
      let res; try { res = landmarker.detect(src); } catch { res = null; }
      const l = res?.landmarks?.[0] as LM[] | undefined;
      if (l && l.length >= 20) lm = l;
    }
    const dataUrl = drawSkeleton(shots[si].cv, lm, WR, gain, contrast);
    if (dataUrl) keyframes.push({ label: ph.label, phase: ph.phase, dataUrl });
    onProgress?.(0.97 + 0.03 * ((p + 1) / phaseDefs.length));
    await yieldNow();
  }
  const keyframeDataUrl = (keyframes.find(k => k.phase === "IMPACT") ?? keyframes[0])?.dataUrl ?? "";

  URL.revokeObjectURL(url);
  onProgress?.(1);

  return {
    kind, overall, hitterType, confidence,
    metrics, strengths, tips, keyframeDataUrl, keyframes,
    framesAnalyzed: frames.length, durationSec: duration,
    lowLight, brightness: Math.round(brightness), notes,
  };
}

function drawSkeleton(srcCv: HTMLCanvasElement, lm: LM[] | null, wr: number, gain = 1, contrast = 1): string {
  const vw = srcCv.width || 360, vh = srcCv.height || 640;
  const W = 360, H = Math.round((vh / vw) * W);
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  if (!ctx) return "";
  // 暗い映像は表示コマも明るさ補正して見やすく
  try {
    if (gain > 1.02) ctx.filter = `brightness(${gain}) contrast(${contrast})`;
    ctx.drawImage(srcCv, 0, 0, W, H);
    ctx.filter = "none";
  } catch { /* drawImage失敗時は骨格のみ */ }
  // 骨格は検出できたコマだけ重ねる（ブレて未検出のコマは画像だけ表示）
  if (lm) {
    ctx.save();
    ctx.strokeStyle = "rgba(212,168,42,0.95)";
    ctx.lineWidth = 3; ctx.lineCap = "round";
    for (const [a, b] of CONNECTIONS) {
      const pa = lm[a], pb = lm[b];
      if (!pa || !pb) continue;
      ctx.beginPath();
      ctx.moveTo(pa.x * W, pa.y * H);
      ctx.lineTo(pb.x * W, pb.y * H);
      ctx.stroke();
    }
    for (let i = 0; i < lm.length; i++) {
      const p = lm[i];
      if (!p || (p.visibility ?? 1) < 0.3) continue;
      ctx.beginPath();
      ctx.fillStyle = i === wr ? "#ff5a7a" : "#67e0ff";
      ctx.arc(p.x * W, p.y * H, i === wr ? 6 : 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  return cv.toDataURL("image/jpeg", 0.82);
}
