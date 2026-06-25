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
export type KeyFrame = { label: string; phase: string; dataUrl: string };
export type FormResult = {
  kind: Kind;
  overall: number;
  metrics: Metric[];
  strengths: string[];         // 良かった点
  tips: string[];              // 改善アドバイス（具体的）
  keyframeDataUrl: string;     // インパクト/リリース（代表コマ）
  keyframes: KeyFrame[];       // 構え〜フォロースルーまでの連続コマ
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

// 取り込んだ静止コマ（決まった時刻にシークして取得 → 検出はあとでまとめて行う）
type Shot = { t: number; cv: HTMLCanvasElement };
const SHOT_W = 260;     // 取り込み解像度（省メモリ）

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
    const finish = () => { if (done) return; done = true; video.removeEventListener("seeked", finish); requestAnimationFrame(() => resolve()); };
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

/**
 * コマ取得：動画全体に“決まった時刻”でシークして静止コマを取る。
 * 毎回まったく同じ時刻のコマが得られる＝同じ動画なら結果が安定（再現性）。
 */
async function grabShots(video: HTMLVideoElement, duration: number, onProgress?: (p: number) => void): Promise<Shot[]> {
  const shots: Shot[] = [];
  const N = clamp(Math.round(duration * 6.5), 24, 44); // 取り込みコマ数（重さと密度のバランス）
  for (let i = 0; i <= N; i++) {
    const t = (duration * i) / N;
    await seekTo(video, t);
    await waitDecoded(video); // コマが実際にデコードされるまで待つ（真っ黒コマ対策）
    const vw = video.videoWidth || SHOT_W, vh = video.videoHeight || Math.round(SHOT_W * 1.6);
    const w = SHOT_W, h = Math.max(1, Math.round(vh * (SHOT_W / vw)));
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const ctx = cv.getContext("2d");
    if (ctx) { try { ctx.drawImage(video, 0, 0, w, h); shots.push({ t, cv }); } catch { /* noop */ } }
    onProgress?.(0.06 + 0.30 * (i / N));
  }
  return shots;
}

// 隣接コマの画像差分が最大の位置 ＝ いちばん動いた瞬間（スイング/リリース）。
// 速い動きはモーションブラーで骨格検出が外れがちなので、画像の動きで瞬間を当てる。
function motionPeakIndex(shots: Shot[]): number {
  if (shots.length < 3) return Math.floor(shots.length / 2);
  const c = typeof document !== "undefined" ? document.createElement("canvas") : null;
  if (!c) return Math.floor(shots.length / 2);
  c.width = 40; c.height = 30;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return Math.floor(shots.length / 2);
  const sigs: Uint8ClampedArray[] = [];
  for (const s of shots) {
    try { ctx.drawImage(s.cv, 0, 0, 40, 30); sigs.push(ctx.getImageData(0, 0, 40, 30).data); }
    catch { sigs.push(new Uint8ClampedArray(40 * 30 * 4)); }
  }
  const diffs = [0];
  for (let i = 1; i < sigs.length; i++) {
    let d = 0; const a = sigs[i], b = sigs[i - 1];
    for (let j = 0; j < a.length; j += 4) d += Math.abs(a[j] - b[j]) + Math.abs(a[j + 1] - b[j + 1]) + Math.abs(a[j + 2] - b[j + 2]);
    diffs.push(d);
  }
  // 3点平滑して単発ノイズを除き、最大の所を採用
  let peak = Math.floor(shots.length / 2), pd = -1;
  for (let i = 1; i < diffs.length; i++) {
    const v = (diffs[i - 1] + diffs[i] + (diffs[i + 1] || diffs[i])) / 3;
    if (v > pd) { pd = v; peak = i; }
  }
  return peak;
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

  // ── 1) コマ取得：決まった時刻にシークして取る（毎回同じ＝結果が安定） ──
  const shots = await grabShots(video, duration, onProgress);
  if (shots.length < 4) {
    URL.revokeObjectURL(url);
    throw new Error("動画をうまく読み込めませんでした。1〜10秒の別の動画でお試しください。");
  }

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

  // ── 3) 全コマを検出（IMAGEモード＝状態を持たない＝同じ画像なら必ず同じ結果） ──
  const det = new Map<number, { lm: LM[]; world: LM[] }>();
  for (let idx = 0; idx < shots.length; idx++) {
    const src = brightenSource(shots[idx].cv, gain, contrast);
    let res;
    try { res = landmarker.detect(src); } catch { res = null; }
    const lm = res?.landmarks?.[0] as LM[] | undefined;
    const world = (res?.worldLandmarks?.[0] as LM[] | undefined) ?? lm;
    if (lm && world && lm.length >= 20) det.set(idx, { lm, world });
    onProgress?.(0.40 + 0.50 * (idx / shots.length));
    if (idx % 2 === 1) await yieldNow(); // UIを固めない
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

  // ── スイング/リリースの瞬間を「画像の動きが最大の所」から検出（ブラーでも効く） ──
  const impactShotIdx = motionPeakIndex(shots);
  const impactT = shots[impactShotIdx].t;
  let peakIdx = 0; { let bd = Infinity; for (let i = 0; i < frames.length; i++) { const d = Math.abs(frames[i].t - impactT); if (d < bd) { bd = d; peakIdx = i; } } }
  onProgress?.(0.95);

  // ── 解析用のセットアップ〜インパクト区間 ──
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

  // 各指標：甘め＆下限ありで採点（普通のフォームはB〜A帯に入るよう調整）。
  // good=良かった点 / tip=具体的な改善アドバイス（コツ・ドリル）。
  const FLOOR = 48;
  const sc = (v: number) => Math.round(clamp(v, FLOOR, 100));
  const firstLine = (s: string) => s.split("。")[0] + "。";
  type Def = { key: string; label: string; score: number; good: string; tip: string };
  let defs: Def[];
  if (kind === "batting") {
    const rotTip = shoulderRot < 40
      ? "回転が小さめです。手だけで振らず、後ろの腰（骨盤）を投手方向へしっかり回す意識を。ティー打撃で『おへそをピッチャーへ向ける』感覚を作りましょう。"
      : "体の開きが早めです。前の肩（左打ちなら右肩）を内に入れて“タメ”を作り、ボールを引きつけてから回ると差し込まれにくくなります。";
    defs = [
      { key: "axis", label: "軸の安定（頭のブレ）", score: sc(104 - headSway * 320),
        good: "頭の位置が安定していて、ブレない良い軸です。",
        tip: "スイング中に頭が動いています。アゴを軽く引き、目線をインパクト位置に最後まで残す意識を。鏡の前でゆっくり素振りし、頭が左右に流れないか確認すると効果的です。" },
      { key: "rotation", label: "体の回転", score: sc(100 - Math.abs(shoulderRot - 52) * 0.85),
        good: "骨盤からしっかり回転できていて、力が伝わるスイングです。", tip: rotTip },
      { key: "stride", label: "踏み込み（ステップ）", score: sc(100 - Math.abs(strideMax - 0.5) * 115),
        good: "前足へしっかり踏み込めていて、下半身主導のスイングです。",
        tip: "ステップ幅にムラがあります。軸足に体重を乗せてから、ピッチャー方向へ同じ幅で大きく一歩踏み込むと力が安定して伝わります。" },
      { key: "weight", label: "重心の安定", score: sc(102 - hipTravel * 150),
        good: "重心が安定し、突っ込みもなく良いバランスです。",
        tip: "上体が前に突っ込み気味です。軸足で粘り、頭をボールの後ろに残したまま回転すると安定します。“我慢して引きつける”意識を持ちましょう。" },
      { key: "follow", label: "フォロースルー", score: sc(56 + follow * 60),
        good: "最後までしっかり振り切れていて、理想的なフィニッシュです。",
        tip: "振り切りが小さめです。インパクトで止めず、両手が肩の高さまで来るイメージで大きく振り抜きましょう。フィニッシュまで一気に振る素振りを。" },
    ];
  } else {
    const strideTip = strideMax < 0.55
      ? "歩幅が狭めです。身長の6〜7割を目安に、もう一歩ホーム方向へ踏み出すと球威が増します。"
      : "踏み込みがやや大きく、リリースが安定しにくいです。体重を乗せ切れる幅まで少し詰めましょう。";
    defs = [
      { key: "balance", label: "軸足バランス", score: sc(104 - headSway * 320),
        good: "軸足で立った時の頭の軸が安定しています。",
        tip: "立ち上がりで上体が揺れています。軸足一本で2秒静止できるバランス練習を。お腹に力を入れ、頭の真下に軸足を置く意識で。" },
      { key: "stride", label: "ステップ幅", score: sc(100 - Math.abs(strideMax - 0.65) * 105),
        good: "良いステップ幅で、下半身をしっかり使えています。", tip: strideTip },
      { key: "open", label: "開きの早さ", score: sc(102 - earlyOpenRatio * 88),
        good: "体の開きを我慢できていて、力の伝わるフォームです。",
        tip: "体（胸・肩）の開きが早いです。グラブ側の肩を打者へ向けたまま我慢し、最後に一気に開くと球速・制球が上がります。タオルシャドーで開きを抑える練習を。" },
      { key: "release", label: "リリースの高さ", score: sc(100 - Math.abs(handAboveShoulder - 0.2) * 115),
        good: "リリースポイントが高く、角度のある良い腕の振りです。",
        tip: "リリースが低めです。肘を肩より上げ、頭の近くで離すイメージで。肩・肩甲骨の柔軟性を上げると改善します。" },
      { key: "follow", label: "フォロースルー", score: sc(56 + follow * 58),
        good: "腕を最後までしっかり振り切れています。",
        tip: "振り切りが小さめです。リリース後も腕を振り抜き、グラブ側の膝の外まで手を持っていくと、肩肘の負担も減り球威も出ます。" },
    ];
  }

  const metrics: Metric[] = defs.map(d => ({ key: d.key, label: d.label, score: d.score, comment: d.score >= 68 ? d.good : firstLine(d.tip) }));
  // 総合点（各指標の平均）
  const overall = Math.round(defs.reduce((s, d) => s + d.score, 0) / defs.length);

  // 良かった点（高スコア）と 改善アドバイス（低スコア・具体的）
  const strengths = defs.filter(d => d.score >= 76).sort((a, b) => b.score - a.score).slice(0, 3).map(d => d.good);
  const tips = defs.filter(d => d.score < 72).sort((a, b) => a.score - b.score).slice(0, 4).map(d => d.tip);
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
  // 全コマ検出済みなので、ハッキリ写ったコマ（構え等）には自身の骨格がピッタリ重なる。
  // ブレて未検出の瞬間（インパクト付近）は画像だけ表示する。
  const detByIdx = new Map(detList.map(f => [f.idx, f.lm] as const));
  const keyframes: KeyFrame[] = [];
  for (let p = 0; p < phaseDefs.length; p++) {
    const ph = phaseDefs[p];
    const si = nearestShotIdx(ph.t);
    const dataUrl = drawSkeleton(shots[si].cv, detByIdx.get(si) ?? null, WR, gain, contrast);
    if (dataUrl) keyframes.push({ label: ph.label, phase: ph.phase, dataUrl });
    onProgress?.(0.97 + 0.03 * ((p + 1) / phaseDefs.length));
  }
  const keyframeDataUrl = (keyframes.find(k => k.phase === "IMPACT") ?? keyframes[0])?.dataUrl ?? "";

  URL.revokeObjectURL(url);
  onProgress?.(1);

  return {
    kind, overall,
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
