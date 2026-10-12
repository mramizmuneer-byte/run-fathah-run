/**
 * 2D puppet rig built from a single character cutout.
 * Parts are clipped from the image with the polygons in src/config/rig.ts.
 * From behind, limbs move by FORESHORTENING (per-part scaleY + vertical shift);
 * rotation is limited to tiny natural angles. Poses live in src/config/anim.ts.
 * If the image is missing, a drawn silhouette with the same slices is used.
 */
import { RIG_LIMITS, type PartDef, type Pt, type RigDef } from "@/config/rig";
import { ANIM_LIMITS, POSES, RUN_CYCLE, type PoseSet } from "@/config/anim";

export interface Pose {
  x: number;
  y: number; // image px, negative = up
  rot: number; // whole-body tilt around the feet
  pelvisRot: number;
  hipSX: number;
  torsoRot: number;
  torsoSY: number;
  torsoShear: number;
  headRot: number;
  headDY: number;
  headS: number;
  uaL: number;
  faL: number;
  uaR: number;
  faR: number;
  uaSYL: number;
  uaSYR: number;
  faSYL: number;
  faSYR: number;
  faDYL: number;
  faDYR: number;
  thL: number;
  shL: number;
  thR: number;
  shR: number;
  thSYL: number;
  shSYL: number;
  thSYR: number;
  shSYR: number;
  shSXL: number;
  shSXR: number;
  liftL: number;
  liftR: number;
  turn: number; // horizontal squash for the home "turn away" (cinematic only)
}

export function basePose(): Pose {
  return {
    x: 0, y: 0, rot: 0, pelvisRot: 0, hipSX: 1, torsoRot: 0, torsoSY: 1, torsoShear: 0,
    headRot: 0, headDY: 0, headS: 1,
    uaL: 0.03, faL: 0, uaR: -0.03, faR: 0,
    uaSYL: 1, uaSYR: 1, faSYL: 1, faSYR: 1, faDYL: 0, faDYR: 0,
    thL: 0.015, shL: 0, thR: -0.015, shR: 0,
    thSYL: 1, shSYL: 1, thSYR: 1, shSYR: 1, shSXL: 1, shSXR: 1,
    liftL: 0, liftR: 0, turn: 1,
  };
}

const KEYS = Object.keys(basePose()) as (keyof Pose)[];

export function fromSet(set: PoseSet): Pose {
  return Object.assign(basePose(), set);
}
export function blendPose(into: Pose, target: Pose, k: number) {
  for (const key of KEYS) into[key] += (target[key] - into[key]) * k;
}
export function mixPose(a: Pose, b: Pose, k: number): Pose {
  const o = basePose();
  for (const key of KEYS) o[key] = a[key] + (b[key] - a[key]) * k;
  return o;
}

const clamp = (v: number, a: number) => Math.max(-a, Math.min(a, v));
/** Enforce the from-behind rules: tiny leg angles, arms within 20deg, small body tilt. */
export function clampBackPose(p: Pose) {
  p.thL = clamp(p.thL, ANIM_LIMITS.legRot);
  p.thR = clamp(p.thR, ANIM_LIMITS.legRot);
  p.shL = clamp(p.shL, ANIM_LIMITS.legRot * 1.6);
  p.shR = clamp(p.shR, ANIM_LIMITS.legRot * 1.6);
  p.uaL = clamp(p.uaL, ANIM_LIMITS.armRot);
  p.uaR = clamp(p.uaR, ANIM_LIMITS.armRot);
  p.faL = clamp(p.faL, ANIM_LIMITS.armRot);
  p.faR = clamp(p.faR, ANIM_LIMITS.armRot);
  p.rot = clamp(p.rot, ANIM_LIMITS.bodyRot);
}

const clampS = (v: number) => Math.max(RIG_LIMITS.minScale, Math.min(RIG_LIMITS.maxScale, v));

/* ------------------------------------------------------------------ */
/* Pose library (back view)                                            */
/* ------------------------------------------------------------------ */

export function poseRun(phi: number): Pose {
  const c = RUN_CYCLE;
  const p = basePose();
  const s = Math.sin(phi);
  const fL = Math.max(0, s);
  const fR = Math.max(0, -s);
  // legs: the lifting leg foreshortens, the planted one stays full length
  p.shSYL = 1 - c.shinLift * fL;
  p.shSYR = 1 - c.shinLift * fR;
  p.thSYL = 1 - c.thighLift * fL;
  p.thSYR = 1 - c.thighLift * fR;
  p.liftL = c.bootRaise * fL;
  p.liftR = c.bootRaise * fR;
  p.shSXL = 1 - c.bootShrink * fL;
  p.shSXR = 1 - c.bootShrink * fR;
  // arms: opposite arm swings forward (forearm rises + shortens)
  p.faSYL = 1 - c.forearmShorten * fR;
  p.faSYR = 1 - c.forearmShorten * fL;
  p.faDYL = -c.forearmRaise * fR;
  p.faDYR = -c.forearmRaise * fL;
  p.uaSYL = 1 - 0.08 * fR;
  p.uaSYR = 1 - 0.08 * fL;
  p.uaL = 0.04 + c.armSwing * 0.5 * fR;
  p.uaR = -0.04 - c.armSwing * 0.5 * fL;
  // body
  p.pelvisRot = c.hipRock * s;
  p.torsoShear = c.torsoShear * s;
  p.torsoSY = 1 - c.torsoBob * Math.abs(s);
  p.y = -Math.abs(s) * c.hipBob * 0.6;
  p.headRot = -0.01 * s;
  return p;
}

export function poseAir(t: number): Pose {
  const p = fromSet(POSES.air);
  p.faDYL += Math.sin(t * 9) * 2;
  p.faDYR -= Math.sin(t * 9) * 2;
  return p;
}
export const poseAnticipation = () => fromSet(POSES.anticipation);
export const poseTakeoff = () => fromSet(POSES.takeoff);
export const poseLand = () => fromSet(POSES.land);
export function poseDuck(t: number): Pose {
  const p = fromSet(POSES.duck);
  p.y += Math.sin(t * 18) * 1.5;
  return p;
}
export function poseHit(t: number): Pose {
  const p = fromSet(POSES.hit);
  p.uaL += Math.sin(t * 28) * 0.05;
  p.uaR += Math.sin(t * 31 + 1) * 0.05;
  p.faDYL += Math.sin(t * 24) * 6;
  p.faDYR += Math.cos(t * 26) * 6;
  return p;
}

/** Front-view idle for the home screen. Loops smoothly. */
export function poseIdleFront(t: number): Pose {
  const p = basePose();
  const shift = Math.sin(t * 0.75);
  p.torsoSY = 1 + 0.015 * Math.sin(t * 1.7);
  p.rot = shift * 0.012;
  p.x = shift * 2.5;
  p.pelvisRot = -shift * 0.02;
  p.shSYL = 1 - Math.max(0, shift) * 0.04;
  p.shSYR = 1 - Math.max(0, -shift) * 0.04;
  p.headRot = Math.sin(t * 0.9 + 1) * 0.035;
  p.uaL = 0.05 + Math.sin(t * 1.7) * 0.012;
  p.uaR = -0.05 - Math.sin(t * 1.7) * 0.012;
  // occasional smartwatch check (watch is on his screen-right wrist)
  const cyc = t % 7.5;
  const w = cyc > 5 && cyc < 6.8 ? Math.sin(((cyc - 5) / 1.8) * Math.PI) : 0;
  const ww = w * w * (3 - 2 * w);
  p.uaR += -0.2 * ww;
  p.faR += 0.9 * ww;
  p.faSYR -= 0.35 * ww;
  p.faDYR -= 30 * ww;
  p.headRot += 0.09 * ww;
  p.headDY += 3 * ww;
  return p;
}

/* ------------------------------------------------------------------ */
/* Building parts                                                      */
/* ------------------------------------------------------------------ */

interface Part {
  cv: HTMLCanvasElement;
  ox: number;
  oy: number;
  pivot: Pt;
}

export interface Rig {
  def: RigDef;
  fromImage: boolean;
  head: Part;
  torso: Part;
  hips: Part;
  uaL: Part;
  faL: Part;
  uaR: Part;
  faR: Part;
  thL: Part;
  shL: Part;
  thR: Part;
  shR: Part;
}

function mirror(p: PartDef, w: number): PartDef {
  return {
    poly: p.poly.map(([x, y]) => [w - x, y] as Pt),
    pivot: [w - p.pivot[0], p.pivot[1]],
  };
}

function cut(src: CanvasImageSource, def: PartDef): Part {
  const xs = def.poly.map((p) => p[0]);
  const ys = def.poly.map((p) => p[1]);
  const ox = Math.floor(Math.min(...xs));
  const oy = Math.floor(Math.min(...ys));
  const w = Math.max(1, Math.ceil(Math.max(...xs)) - ox);
  const h = Math.max(1, Math.ceil(Math.max(...ys)) - oy);
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const c = cv.getContext("2d");
  if (c) {
    c.beginPath();
    def.poly.forEach(([x, y], i) => (i ? c.lineTo(x - ox, y - oy) : c.moveTo(x - ox, y - oy)));
    c.closePath();
    c.clip();
    c.drawImage(src, -ox, -oy);
  }
  return { cv, ox, oy, pivot: def.pivot };
}

/** Drawn silhouette with the same proportions — used when the photo cutout is missing. */
function fallbackImage(def: RigDef, front: boolean): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = def.width;
  cv.height = def.height;
  const c = cv.getContext("2d")!;
  const W = def.width;
  const rr = (x: number, y: number, w: number, h: number, r: number, col: string) => {
    c.fillStyle = col;
    c.beginPath();
    c.roundRect(x, y, w, h, r);
    c.fill();
  };
  rr(36, 240, 50, 240, 14, "#26232a");
  rr(W - 86, 240, 50, 240, 14, "#26232a");
  rr(28, 470, 62, 42, 10, "#5a3a26");
  rr(W - 90, 470, 62, 42, 10, "#5a3a26");
  rr(8, 88, 34, 170, 16, "#d49a9c");
  rr(W - 42, 88, 34, 170, 16, "#d49a9c");
  rr(6, 200, 30, 70, 14, "#b98262");
  rr(W - 36, 200, 30, 70, 14, "#b98262");
  rr(32, 76, W - 64, 150, 24, "#d9a3a5");
  rr(34, 210, W - 68, 16, 4, "#3a2a22");
  c.fillStyle = "#b98262";
  c.beginPath();
  c.ellipse(W / 2, 44, 32, 40, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#1e1714";
  c.beginPath();
  if (front) c.ellipse(W / 2, 20, 33, 22, 0, Math.PI, Math.PI * 2);
  else c.ellipse(W / 2, 38, 34, 38, 0, 0, Math.PI * 2);
  c.fill();
  return cv;
}

export function buildRig(def: RigDef, img: HTMLImageElement | null, front: boolean): Rig | null {
  if (typeof document === "undefined") return null;
  let src: CanvasImageSource;
  let fromImage = false;
  if (img && img.naturalWidth > 0) {
    const cv = document.createElement("canvas");
    cv.width = def.width;
    cv.height = def.height;
    cv.getContext("2d")?.drawImage(img, 0, 0, def.width, def.height);
    src = cv;
    fromImage = true;
  } else {
    src = fallbackImage(def, front);
  }
  const W = def.width;
  return {
    def,
    fromImage,
    head: cut(src, def.head),
    torso: cut(src, def.torso),
    hips: cut(src, def.hips),
    uaL: cut(src, def.upperArmL),
    faL: cut(src, def.forearmL),
    uaR: cut(src, mirror(def.upperArmL, W)),
    faR: cut(src, mirror(def.forearmL, W)),
    thL: cut(src, def.thighL),
    shL: cut(src, def.shinL),
    thR: cut(src, mirror(def.thighL, W)),
    shR: cut(src, mirror(def.shinL, W)),
  };
}

/* ------------------------------------------------------------------ */
/* Drawing                                                             */
/* ------------------------------------------------------------------ */

function drawPart(ctx: CanvasRenderingContext2D, p: Part) {
  ctx.drawImage(p.cv, p.ox, p.oy);
}

function joint(
  ctx: CanvasRenderingContext2D,
  pivot: Pt,
  angle: number,
  sx: number,
  sy: number,
  dy: number,
  fn: () => void,
  shear = 0,
) {
  ctx.save();
  ctx.translate(pivot[0], pivot[1] + dy);
  if (angle) ctx.rotate(angle);
  if (shear) ctx.transform(1, 0, -shear, 1, 0, 0);
  if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);
  ctx.translate(-pivot[0], -pivot[1]);
  fn();
  ctx.restore();
}

/** How far below the hip joint the lowest foot sits for a pose (image px). */
export function footDrop(def: RigDef, p: Pose) {
  const leg = (th: number, sh: number, a: number, b: number, lift: number) =>
    Math.cos(th) * def.thighLen * clampS(a) + Math.cos(th + sh) * def.shinLen * clampS(b) - lift;
  const l = leg(p.thL, p.shL, p.thSYL, p.shSYL, p.liftL);
  const r = leg(p.thR, p.shR, p.thSYR, p.shSYR, p.liftR);
  return Math.max(l, r);
}

/** Draw the rig with its lowest foot at (fx, fy) on screen, k = screen px per image px. */
export function drawRig(
  ctx: CanvasRenderingContext2D,
  rig: Rig,
  pose: Pose,
  fx: number,
  fy: number,
  k: number,
) {
  const d = rig.def;
  const hipY = d.thighL.pivot[1];
  const drop = footDrop(d, pose);
  const cx = d.width / 2;

  ctx.save();
  ctx.translate(fx, fy);
  ctx.rotate(pose.rot);
  ctx.scale(k * pose.turn, k);
  ctx.translate(-cx + pose.x, -(hipY + drop) + pose.y);

  joint(ctx, d.hips.pivot, pose.pelvisRot, pose.hipSX, 1, 0, () => {
    const leg = (th: Part, sh: Part, a: number, b: number, sa: number, sb: number, sxb: number, lift: number) => {
      joint(ctx, th.pivot, a, 1, clampS(sa), 0, () => {
        joint(ctx, sh.pivot, b, sxb, clampS(sb), -lift / Math.max(0.3, clampS(sa)), () => drawPart(ctx, sh));
        drawPart(ctx, th);
      });
    };
    leg(rig.thL, rig.shL, pose.thL, pose.shL, pose.thSYL, pose.shSYL, pose.shSXL, pose.liftL);
    leg(rig.thR, rig.shR, pose.thR, pose.shR, pose.thSYR, pose.shSYR, pose.shSXR, pose.liftR);
    drawPart(ctx, rig.hips);

    joint(ctx, d.torso.pivot, pose.torsoRot, 1, clampS(pose.torsoSY), 0, () => {
      const arm = (ua: Part, fa: Part, a: number, b: number, sa: number, sb: number, dyb: number) => {
        joint(ctx, ua.pivot, a, 1, clampS(sa), 0, () => {
          joint(ctx, fa.pivot, b, 1, clampS(sb), dyb, () => drawPart(ctx, fa));
          drawPart(ctx, ua);
        });
      };
      arm(rig.uaL, rig.faL, pose.uaL, pose.faL, pose.uaSYL, pose.faSYL, pose.faDYL);
      arm(rig.uaR, rig.faR, pose.uaR, pose.faR, pose.uaSYR, pose.faSYR, pose.faDYR);
      drawPart(ctx, rig.torso);
      joint(ctx, d.head.pivot, pose.headRot, pose.headS, pose.headS, pose.headDY, () => drawPart(ctx, rig.head));
    }, pose.torsoShear);
  });
  ctx.restore();
}

let flashBuf: HTMLCanvasElement | null = null;

/** Draw the rig tinted toward a colour (hit flash). */
export function drawRigTinted(
  ctx: CanvasRenderingContext2D,
  rig: Rig,
  pose: Pose,
  fx: number,
  fy: number,
  k: number,
  tint: string,
  amount: number,
) {
  if (typeof document === "undefined") return;
  const W = 420;
  const H = 560;
  if (!flashBuf) {
    flashBuf = document.createElement("canvas");
    flashBuf.width = W;
    flashBuf.height = H;
  }
  const b = flashBuf.getContext("2d");
  if (!b) return;
  b.setTransform(1, 0, 0, 1, 0, 0);
  b.globalCompositeOperation = "source-over";
  b.clearRect(0, 0, W, H);
  drawRig(b, rig, pose, W / 2, H - 20, k);
  b.globalCompositeOperation = "source-atop";
  b.globalAlpha = amount;
  b.fillStyle = tint;
  b.fillRect(0, 0, W, H);
  b.globalAlpha = 1;
  b.globalCompositeOperation = "source-over";
  ctx.drawImage(flashBuf, fx - W / 2, fy - (H - 20));
}
