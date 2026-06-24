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
export type Metric = { key: string; label: string; score: number; comment: string };
export type FormResult = {
  kind: Kind;
  overall: number;
  speedKmh: number;
  speedLabel: string;
  handSpeedKmh: number;
  metrics: Metric[];
  tips: string[];
  keyframeDataUrl: string;
  framesAnalyzed: number;
  durationSec: number;
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
const dist3 = (a: LM, b: LM) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const lineAngleDeg = (a: LM, b: LM) => Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
const std = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = xs.reduce((s, v) => s + v, 0) / xs.length;
  return Math.sqrt(xs.reduce((s, v) => s + (v - m) ** 2, 0) / xs.length);
};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
// 移動平均（ジッタ低減）。w=隣接何点を平均するか
const sma = (xs: number[], w = 1) => xs.map((_, i) => {
  let s = 0, c = 0;
  for (let k = -w; k <= w; k++) { const j = i + k; if (j >= 0 && j < xs.length) { s += xs[j]; c++; } }
  return s / c;
});
// 値 v を [lo,hi] のとき [0,100] に線形マップ（外は0/100）
const mapScore = (v: number, lo: number, hi: number) => clamp(((v - lo) / (hi - lo)) * 100, 0, 100);
// 「ちょうど良い帯」評価：targetを中心に許容幅 tol で 100、離れるほど減点
const bandScore = (v: number, target: number, tol: number) => clamp(100 - (Math.abs(v - target) / tol) * 100, 0, 100);

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
      baseOptions: { modelAssetPath: "/mediapipe/pose_landmarker_full.task", delegate: "GPU" },
      runningMode: "VIDEO",
      numPoses: 1,
      // 暗い映像でも拾えるよう、しきい値はやや低め
      minPoseDetectionConfidence: 0.3,
      minPosePresenceConfidence: 0.3,
      minTrackingConfidence: 0.3,
    });
    _landmarker = lm;
    return lm;
  })();
  return _loading;
}

// フレームの平均輝度（0〜255）を小さなキャンバスで概算。暗さ判定に使う。
const _briCv = typeof document !== "undefined" ? document.createElement("canvas") : null;
function frameBrightness(video: HTMLVideoElement): number | null {
  if (!_briCv) return null;
  _briCv.width = 24; _briCv.height = 24;
  const ctx = _briCv.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  try {
    ctx.drawImage(video, 0, 0, 24, 24);
    const d = ctx.getImageData(0, 0, 24, 24).data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    return sum / (d.length / 4);
  } catch { return null; }
}

function seekTo(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => { if (done) return; done = true; video.removeEventListener("seeked", finish); resolve(); };
    video.addEventListener("seeked", finish);
    try { video.currentTime = Math.max(0, Math.min(t, (video.duration || 0) - 0.001)); } catch { finish(); }
    setTimeout(finish, 600); // フリーズ防止フォールバック
  });
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
    setTimeout(ok, 4000);
  });

  let duration = video.duration;
  if (!isFinite(duration) || duration <= 0) duration = 4; // 一部スマホ動画対策
  duration = Math.min(duration, 12);
  const N = clamp(Math.round(duration * 30), 24, 150);
  const step = duration / N;

  const frames: Frame[] = [];
  const briSamples: number[] = [];
  let lastTs = 0;
  for (let i = 0; i <= N; i++) {
    const t = i * step;
    await seekTo(video, t);
    const ts = Math.max(lastTs + 1, Math.round(t * 1000));
    lastTs = ts;
    // 明るさサンプル（数フレームおきに・ポーズ検出とは独立に測る）
    if (i % 4 === 0) { const b = frameBrightness(video); if (b != null) briSamples.push(b); }
    let res;
    try { res = landmarker.detectForVideo(video, ts); } catch { res = null; }
    const lm = res?.landmarks?.[0] as LM[] | undefined;
    const world = (res?.worldLandmarks?.[0] as LM[] | undefined) ?? lm;
    if (lm && world && lm.length >= 29) frames.push({ t, lm, world });
    if (i % 3 === 0) onProgress?.(0.08 + 0.84 * (i / N));
  }
  onProgress?.(0.94);

  const brightness = briSamples.length ? briSamples.reduce((s, v) => s + v, 0) / briSamples.length : 128;
  const lowLight = brightness < 60;            // これ未満は「暗い」と判定
  const fewFrames = frames.length < 14;

  // 暗い・検出不足でも、最低限のフレームがあれば“精度低め”として解析を続ける。
  if (frames.length < 5) {
    URL.revokeObjectURL(url);
    throw new Error(lowLight
      ? "映像が暗すぎて人物を検出できませんでした。もう少し明るい場所で撮り直してください。"
      : "人物の全身が検出できませんでした。横から、全身が画面に収まるように撮影してください。");
  }

  const notes: string[] = [];
  if (lowLight) notes.push("⚠ 暗い映像のため、解析精度は低めです（明るい場所での撮影をおすすめします）。");
  if (fewFrames) notes.push("⚠ 検出できたコマが少ないため、数値は参考値です。");

  // ── 利き手側（よく動く手首）を選ぶ ──
  const pathOf = (idx: number) => {
    let s = 0;
    for (let i = 1; i < frames.length; i++) s += dist2(frames[i].lm[idx], frames[i - 1].lm[idx]);
    return s;
  };
  const useRight = pathOf(R_WR) >= pathOf(L_WR);
  const WR = useRight ? R_WR : L_WR;

  // ── 速度系列（worldLandmarks＝メートル空間）→ 粗いピーク（インパクト/リリース） ──
  let peakSpeed = 0, peakIdx = 1; // m/s
  for (let i = 1; i < frames.length; i++) {
    const dt = frames[i].t - frames[i - 1].t || step;
    const v = dist3(frames[i].world[WR], frames[i - 1].world[WR]) / dt;
    if (v > peakSpeed) { peakSpeed = v; peakIdx = i; }
  }

  // ── 2段階目：ピーク周辺を細かく再サンプリングして“真の最大手首速度”を捕捉 ──
  // 粗サンプリングはインパクト/リリース最速点を取りこぼしやすいので、近傍を高密度で走査する。
  {
    const lo = frames[Math.max(0, peakIdx - 1)].t;
    const hi = frames[Math.min(frames.length - 1, peakIdx + 1)].t;
    const M = 18;
    const dense: { t: number; w: LM }[] = [];
    let lts = lastTs;
    for (let j = 0; j <= M; j++) {
      const t = lo + (hi - lo) * (j / M);
      await seekTo(video, t);
      const ts = Math.max(lts + 1, Math.round(t * 1000) + 1);
      lts = ts;
      let res;
      try { res = landmarker.detectForVideo(video, ts); } catch { res = null; }
      const w = (res?.worldLandmarks?.[0] as LM[] | undefined) ?? (res?.landmarks?.[0] as LM[] | undefined);
      if (w && w[WR]) dense.push({ t, w: w[WR] });
    }
    for (let j = 1; j < dense.length; j++) {
      const dt = dense[j].t - dense[j - 1].t || (step / M);
      const v = dist3(dense[j].w, dense[j - 1].w) / dt;
      if (v > peakSpeed) peakSpeed = v;
    }
  }
  onProgress?.(0.97);
  const handSpeedKmh = peakSpeed * 3.6;
  // バットヘッド/リリースの目安係数（手の速さからの近似）
  const factor = kind === "batting" ? 2.0 : 1.25;
  const speedKmh = handSpeedKmh * factor;

  // ── 解析用のセットアップ〜ピーク区間 ──
  const start = frames[0], impact = frames[peakIdx];
  const shAngle = (f: Frame) => lineAngleDeg(f.lm[L_SH], f.lm[R_SH]);
  const hipAngle = (f: Frame) => lineAngleDeg(f.lm[L_HIP], f.lm[R_HIP]);
  const bodyH = Math.max(0.05, dist2(mid(start.lm[L_SH], start.lm[R_SH]), mid(start.lm[L_AN], start.lm[R_AN])));

  // 頭(鼻)の横ブレ（正規化x・スムージング後）— 小さいほど軸が安定
  const noseXs = sma(frames.map(f => f.lm[NOSE].x));
  const headSway = std(noseXs) / bodyH; // 体長で正規化

  // 重心（腰中点）の横移動量（スムージング後）
  const hipXs = sma(frames.map(f => mid(f.lm[L_HIP], f.lm[R_HIP]).x));
  const hipTravel = (Math.max(...hipXs) - Math.min(...hipXs)) / bodyH;

  // 肩の回転量（セットアップ→区間内の最大変化、度）
  let shoulderRot = 0;
  for (const f of frames) shoulderRot = Math.max(shoulderRot, Math.abs(shAngle(f) - shAngle(start)));

  // ステップ幅（足首間隔の最大、体長比）
  let strideMax = 0;
  for (const f of frames) strideMax = Math.max(strideMax, Math.abs(f.lm[L_AN].x - f.lm[R_AN].x) / bodyH);

  // フォロースルー（ピーク後の手の移動量、体長比）
  let follow = 0;
  for (let i = peakIdx + 1; i < frames.length; i++) follow += dist2(frames[i].lm[WR], frames[i - 1].lm[WR]);
  follow = follow / bodyH;

  // 「体の開き」のタイミング（肩がどれだけ早く開くか）：序盤フレームの肩回転割合
  const early = frames[Math.min(frames.length - 1, Math.max(1, Math.round(peakIdx * 0.4)))];
  const earlyOpenRatio = shoulderRot > 1 ? Math.abs(shAngle(early) - shAngle(start)) / shoulderRot : 0;

  // リリース/インパクトの手の高さ（肩基準。上ほど y 小）
  const shY = mid(impact.lm[L_SH], impact.lm[R_SH]).y;
  const handAboveShoulder = (shY - impact.lm[WR].y) / bodyH; // +で肩より上

  let metrics: Metric[];
  if (kind === "batting") {
    metrics = [
      mkMetric("axis", "軸の安定（頭のブレ）", mapScore(0.16 - headSway, 0, 0.16),
        headSway < 0.05 ? "頭がほとんどブレず良い軸。" : "スイング中に頭が動きやすい。目線を残す意識を。"),
      mkMetric("rotation", "体の回転", bandScore(shoulderRot, 55, 40),
        shoulderRot < 25 ? "回転が小さめ。骨盤から大きく捻ろう。" : shoulderRot > 95 ? "開きすぎ気味。タメを作ろう。" : "しっかり回転できている。"),
      mkMetric("stride", "踏み込み（ステップ）", bandScore(strideMax, 0.55, 0.4),
        strideMax < 0.3 ? "ステップが小さい。前足へ踏み込もう。" : "良い踏み込み幅。"),
      mkMetric("weight", "重心の安定", mapScore(0.5 - hipTravel, 0, 0.5),
        hipTravel > 0.35 ? "上体が突っ込み気味。軸足で我慢を。" : "重心が安定している。"),
      mkMetric("follow", "フォロースルー", mapScore(follow, 0.2, 1.0),
        follow < 0.35 ? "振り切れていない。最後まで大きく振ろう。" : "最後までしっかり振れている。"),
    ];
  } else {
    metrics = [
      mkMetric("balance", "軸足バランス", mapScore(0.16 - headSway, 0, 0.16),
        headSway < 0.05 ? "頭の軸が安定。" : "立ち姿勢で頭が揺れやすい。軸足で立つ意識を。"),
      mkMetric("stride", "ステップ幅", bandScore(strideMax, 0.7, 0.45),
        strideMax < 0.4 ? "歩幅が狭い。もう一歩前へ。" : strideMax > 1.1 ? "踏み込みすぎ気味。" : "良いステップ幅。"),
      mkMetric("open", "開きの早さ", mapScore(0.55 - earlyOpenRatio, 0, 0.55),
        earlyOpenRatio > 0.45 ? "体の開きが早い。胸を見せるのを我慢しよう。" : "開きを我慢できている。"),
      mkMetric("release", "リリースの高さ", bandScore(handAboveShoulder, 0.18, 0.45),
        handAboveShoulder < -0.05 ? "リリースが低い。肘を上げよう。" : "良いリリースポイント。"),
      mkMetric("follow", "フォロースルー", mapScore(follow, 0.2, 1.1),
        follow < 0.35 ? "振り切りが小さい。最後まで腕を振ろう。" : "しっかり振り切れている。"),
    ];
  }

  // 総合点（各指標の平均）
  const overall = Math.round(metrics.reduce((s, m) => s + m.score, 0) / metrics.length);

  // 改善点：低い指標から最大3件
  const tips = metrics
    .filter(m => m.score < 70)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map(m => `${m.label}：${m.comment}`);
  if (tips.length === 0) tips.push("大きな弱点は見当たりません。今のフォームを継続しよう！");

  // ── キーフレーム画像（骨格オーバーレイ） ──
  await seekTo(video, impact.t);
  const keyframeDataUrl = drawSkeleton(video, impact.lm, WR);

  URL.revokeObjectURL(url);
  onProgress?.(1);

  return {
    kind, overall, speedKmh, handSpeedKmh,
    speedLabel: kind === "batting" ? "推定スイング速度" : "推定リリース速度",
    metrics, tips, keyframeDataUrl,
    framesAnalyzed: frames.length, durationSec: duration,
    lowLight, brightness: Math.round(brightness), notes,
  };
}

function mkMetric(key: string, label: string, score: number, comment: string): Metric {
  return { key, label, score: Math.round(clamp(score, 0, 100)), comment };
}

function drawSkeleton(video: HTMLVideoElement, lm: LM[], wr: number): string {
  const vw = video.videoWidth || 360, vh = video.videoHeight || 640;
  const W = 360, H = Math.round((vh / vw) * W);
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  if (!ctx) return "";
  try { ctx.drawImage(video, 0, 0, W, H); } catch { /* drawImage失敗時は骨格のみ */ }
  ctx.save();
  // 接続線
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
  // 関節点
  for (let i = 0; i < lm.length; i++) {
    const p = lm[i];
    if (!p || (p.visibility ?? 1) < 0.3) continue;
    ctx.beginPath();
    ctx.fillStyle = i === wr ? "#ff5a7a" : "#67e0ff";
    ctx.arc(p.x * W, p.y * H, i === wr ? 6 : 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  return cv.toDataURL("image/jpeg", 0.82);
}
