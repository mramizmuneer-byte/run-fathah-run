/**
 * Three-layer back-view Fathu: legs (with thigh/shin slices), torso+arms (strip
 * mesh that pitches forward), head (always 100% size). Never scales the whole
 * sprite. Falls back to a drawn silhouette if the cutout image is missing.
 */
import { LAYER_RIG as R, type Pt } from "@/config/rig";

export interface LPose {
  x: number; // px sideways
  lean: number; // rad, whole body around the feet
  thL: number; thR: number; // thigh scaleY
  shL: number; shR: number; // shin scaleY (foreshortening)
  liftL: number; liftR: number; // px a boot is raised
  bootL: number; bootR: number; // shin x-scale (boot turning toward camera)
  pitch: number; // torso forward pitch (rad)
  torsoDY: number; // px
  twist: number; // shear per px of height
  headDX: number;
  headDrop: number; // px the head sinks into the shoulders (tilt down)
}

export function lStand(): LPose {
  return { x: 0, lean: 0, thL: 1, thR: 1, shL: 1, shR: 1, liftL: 0, liftR: 0, bootL: 1, bootR: 1, pitch: 0, torsoDY: 0, twist: 0, headDX: 0, headDrop: 0 };
}
const KEYS = Object.keys(lStand()) as (keyof LPose)[];
export const lSet = (p: Partial<LPose>): LPose => Object.assign(lStand(), p);
export function lBlend(into: LPose, t: LPose, k: number) {
  for (const key of KEYS) into[key] += (t[key] - into[key]) * k;
}
export function lMix(a: LPose, b: LPose, k: number): LPose {
  const o = lStand();
  for (const key of KEYS) o[key] = a[key] + (b[key] - a[key]) * k;
  return o;
}

const D = Math.PI / 180;
/** Named poses (tune freely). */
export const LPOSES = {
  anticipation: { thL: 0.8, thR: 0.8, shL: 0.86, shR: 0.86, pitch: 14 * D, headDrop: 4 },
  takeoff: { thL: 1, thR: 1, shL: 1, shR: 1, pitch: 4 * D },
  air: { thL: 0.55, thR: 0.57, shL: 0.62, shR: 0.64, liftL: 34, liftR: 26, bootL: 0.8, bootR: 0.82, pitch: 10 * D, headDrop: 3 },
  land: { thL: 0.72, thR: 0.72, shL: 0.84, shR: 0.84, pitch: 18 * D, headDrop: 6 },
  slide: { thL: 0.45, thR: 0.45, shL: 0.6, shR: 0.6, bootL: 0.86, bootR: 0.86, pitch: 52 * D, headDrop: 10, torsoDY: 6 },
  hit: { thL: 0.94, thR: 0.94, pitch: -8 * D, headDrop: -4 },
} satisfies Record<string, Partial<LPose>>;

export function lRun(phi: number): LPose {
  const s = Math.sin(phi);
  const fL = Math.max(0, s);
  const fR = Math.max(0, -s);
  return lSet({
    shL: 1 - 0.42 * fL, shR: 1 - 0.42 * fR,
    thL: 1 - 0.08 * fL, thR: 1 - 0.08 * fR,
    liftL: 22 * fL, liftR: 22 * fR,
    bootL: 1 - 0.1 * fL, bootR: 1 - 0.1 * fR,
    pitch: 6 * D, twist: 0.035 * s * 0.01 * 4, torsoDY: -Math.abs(s) * 4, headDX: -s * 1.2,
  });
}

/* ---------------- build ---------------- */

export interface Layers {
  head: HTMLCanvasElement;
  torso: HTMLCanvasElement;
  legs: HTMLCanvasElement;
  real: boolean;
}

function clipTo(src: CanvasImageSource, poly: Pt[]): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = R.width;
  cv.height = R.height;
  const c = cv.getContext("2d");
  if (c) {
    c.beginPath();
    poly.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
    c.clip();
    c.drawImage(src, 0, 0, R.width, R.height);
  }
  return cv;
}

function fallback(): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = R.width;
  cv.height = R.height;
  const c = cv.getContext("2d")!;
  const rr = (x: number, y: number, w: number, h: number, r: number, col: string) => {
    c.fillStyle = col;
    c.beginPath();
    c.roundRect(x, y, w, h, r);
    c.fill();
  };
  rr(36, 230, 50, 250, 14, "#26232a");
  rr(89, 230, 50, 250, 14, "#26232a");
  rr(28, 470, 62, 42, 10, "#5a3a26");
  rr(85, 470, 62, 42, 10, "#5a3a26");
  rr(6, 88, 34, 200, 16, "#d49a9c");
  rr(135, 88, 34, 200, 16, "#d49a9c");
  rr(30, 72, 115, 175, 24, "#d9a3a5");
  rr(34, 226, 107, 16, 4, "#3a2a22");
  c.fillStyle = "#1e1714";
  c.beginPath();
  c.ellipse(88, 44, 34, 42, 0, 0, Math.PI * 2);
  c.fill();
  return cv;
}

export function buildLayers(img: HTMLImageElement | null): Layers | null {
  if (typeof document === "undefined") return null;
  const real = !!img && img.naturalWidth > 0;
  const src: CanvasImageSource = real ? img! : fallback();
  return {
    head: clipTo(src, R.head.poly),
    torso: clipTo(src, R.torso.poly),
    legs: clipTo(src, R.legs.poly),
    real,
  };
}

/* ---------------- draw ---------------- */

const TL = R.kneeY - R.hipY;
const SL = R.height - R.kneeY;
const clampS = (v: number) => Math.max(0.4, Math.min(1.15, v));

/** Hip height above the lowest foot (image px). */
export function hipHeight(p: LPose) {
  const l = TL * clampS(p.thL) + SL * clampS(p.shL) - p.liftL;
  const r = TL * clampS(p.thR) + SL * clampS(p.shR) - p.liftR;
  return Math.max(l, r);
}

/** Draws in image-px space with the feet at (0,0), y up = negative. */
function drawLocal(c: CanvasRenderingContext2D, L: Layers, p: LPose) {
  const cx = R.centerX;
  const hip = -hipHeight(p);
  const ox = -cx + p.x;
  c.save();
  c.translate(ox, 0);
  // ---- legs ----
  const pelvisH = R.hipY - R.legs.top;
  c.drawImage(L.legs, 0, R.legs.top, R.width, pelvisH + 6, 0, hip - pelvisH, R.width, pelvisH + 6);
  const leg = (x0: number, x1: number, th: number, sh: number, lift: number, boot: number) => {
    const w = x1 - x0;
    const tH = TL * clampS(th);
    const sH = SL * clampS(sh);
    const kneeY = hip + tH - lift;
    const mid = (x0 + x1) / 2;
    const bw = w * boot;
    // shin + boot
    c.drawImage(L.legs, x0, R.kneeY - 4, w, SL + 4, mid - bw / 2, kneeY - 4, bw, sH + 4);
    // thigh on top (knee overlaps the shin)
    c.drawImage(L.legs, x0, R.hipY, w, TL + 6, x0, hip, w, tH + 6 * clampS(th));
  };
  leg(0, cx, p.thL, p.shL, p.liftL, p.bootL);
  leg(cx, R.width, p.thR, p.shR, p.liftR, p.bootR);

  // ---- torso strip mesh, pitched around the hip line ----
  const cosP = Math.cos(p.pitch);
  const sinP = Math.sin(Math.max(0, p.pitch));
  const fy = cosP + Math.sin(p.pitch) * R.pitchRise; // vertical factor per px above the hip
  const top = R.torso.top;
  const bot = R.torso.bottom;
  const n = R.strips;
  const base = hip + p.torsoDY;
  const mapY = (sy: number) => {
    const d = R.hipY - sy; // >0 above the hip
    return d > 0 ? base - d * fy : base - d; // below the hip (hands) hang straight
  };
  const mapS = (sy: number) => 1 / (1 + Math.max(0, R.hipY - sy) * sinP * R.pitchPerspective);
  const edges: number[] = [];
  for (let i = 0; i <= n; i++) edges.push(top + ((bot - top) * i) / n);
  for (let i = 0; i < n; i++) {
    const s0 = edges[i];
    const s1 = edges[i + 1];
    const y0 = mapY(s0);
    const y1 = mapY(s1);
    const sc = mapS((s0 + s1) / 2);
    const w = R.width * sc;
    const shift = p.twist * (R.hipY - (s0 + s1) / 2);
    c.drawImage(L.torso, 0, s0, R.width, s1 - s0, cx - w / 2 + shift, y0, w, y1 - y0 + 0.8);
  }

  // ---- head: 100% size, rides the shoulders ----
  const neckY = mapY(R.head.neckY) + p.headDrop;
  const neckX = cx + p.twist * (R.hipY - R.head.neckY) + p.headDX;
  c.drawImage(L.head, 0, 0, R.width, R.head.neckY + 8, neckX - cx, neckY - R.head.neckY, R.width, R.head.neckY + 8);
  c.restore();
}

let buf: HTMLCanvasElement | null = null;

/**
 * Draw Fathu with his lowest foot at (fx, fy). k = screen px per image px.
 * Rendered through an offscreen buffer so blink alpha and the white hit flash
 * apply to the whole figure without layer seams.
 */
export function drawLayered(
  ctx: CanvasRenderingContext2D,
  L: Layers,
  p: LPose,
  fx: number,
  fy: number,
  k: number,
  alpha: number,
  flash: number,
) {
  if (typeof document === "undefined") return;
  const res = 2;
  const W = Math.ceil(R.width * 1.7 * k * res);
  const H = Math.ceil(R.height * 1.1 * k * res);
  if (!buf || buf.width < W || buf.height < H) {
    buf = document.createElement("canvas");
    buf.width = Math.max(W, buf?.width ?? 0);
    buf.height = Math.max(H, buf?.height ?? 0);
  }
  const b = buf.getContext("2d");
  if (!b) return;
  b.setTransform(1, 0, 0, 1, 0, 0);
  b.globalCompositeOperation = "source-over";
  b.clearRect(0, 0, W, H);
  b.setTransform(k * res, 0, 0, k * res, W / 2, H - 4);
  b.rotate(p.lean);
  drawLocal(b, L, p);
  if (flash > 0) {
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.globalCompositeOperation = "source-atop";
    b.globalAlpha = Math.min(1, flash);
    b.fillStyle = "#ffffff";
    b.fillRect(0, 0, W, H);
    b.globalAlpha = 1;
    b.globalCompositeOperation = "source-over";
  }
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(buf, 0, 0, W, H, fx - W / res / 2, fy - (H - 4) / res, W / res, H / res);
  ctx.restore();
}
