/**
 * Readable obstacles drawn from their real world-space footprint.
 * Colour code: low jump-overs = yellow/black hazard stripe on top;
 * overhead duck gates = red stripe + two posts; tall dodge blocks = solid colour.
 */
import { OB_DIMS } from "@/config/tuning";
import { drawBox, frontQuad, groundQuad, poly } from "./draw3d";
import { project } from "./proj";
import type { ObKind } from "./props";

export type ObCat = "jump" | "slide" | "block";

export interface ObLook {
  cat: ObCat;
  dims: { len: number; w: number; y0: number; y1: number };
  front: string;
  top: string;
  side: string;
  label: string;
  ink: string;
}

const L = (cat: ObCat, dims: ObLook["dims"], front: string, top: string, side: string, label: string, ink = "#fff8e6"): ObLook => ({
  cat, dims, front, top, side, label, ink,
});

export const OB_LOOK: Record<ObKind, ObLook> = {
  files: L("jump", OB_DIMS.jumpFiles, "#d9a441", "#f3cf6e", "#a97a26", "AUDIT FILES", "#3a2406"),
  gst: L("jump", OB_DIMS.jumpFiles, "#3f78b0", "#7fb0dc", "#2c5680", "GST RETURNS"),
  notice: L("jump", OB_DIMS.jumpLow, "#f3ece0", "#ffffff", "#c9bfae", "TAX NOTICE", "#b5442f"),
  calculator: L("jump", OB_DIMS.jumpLow, "#3c4149", "#6c727c", "#2a2e34", "CALC"),
  plant: L("jump", OB_DIMS.jumpLow, "#b4673f", "#4f9a44", "#8a4c2c", "PLANTER"),
  pothole: L("jump", OB_DIMS.pothole, "#e07a2c", "#f4a24f", "#a8551a", "ROAD WORK"),
  breaker: L("jump", OB_DIMS.pothole, "#f2c230", "#ffe07a", "#b88e12", "SPEED BREAKER", "#2a1c02"),
  pipe: L("slide", OB_DIMS.gate, "#9aa3ad", "#c9d0d6", "#6e7680", "LOW PIPE"),
  email: L("slide", OB_DIMS.gate, "#e8eef5", "#ffffff", "#a8b3bf", "URGENT EMAIL", "#c0392b"),
  plane: L("slide", OB_DIMS.gate, "#fff6c9", "#ffffff", "#d8cc8a", "STICKY NOTES", "#6b5a12"),
  vine: L("slide", OB_DIMS.gate, "#4f8f3a", "#77b85a", "#356628", "VINES"),
  cable: L("slide", OB_DIMS.gate, "#3a3d44", "#5a5e66", "#24262b", "LOW CABLES"),
  chair: L("block", OB_DIMS.tall, "#2f3a4c", "#4a5870", "#1f2836", "OFFICE CHAIRS"),
  trolley: L("block", OB_DIMS.tall, "#7d8590", "#a7aeb8", "#59606a", "FILE TROLLEY"),
  ac: L("block", OB_DIMS.tall, "#e9ecef", "#ffffff", "#b9bfc6", "AC CABINET", "#2a3a4a"),
  branch: L("block", OB_DIMS.tall, "#6b4526", "#8a5d36", "#4a2f19", "BRANCH"),
  crow: L("block", OB_DIMS.tall, "#24262c", "#3a3d45", "#15161a", "CROWS"),
  auto: L("block", OB_DIMS.vehicle, "#2f8f4e", "#f2d23a", "#216a39", "AUTO"),
  scooter: L("block", OB_DIMS.vehicle, "#c94a3a", "#e27565", "#943528", "SCOOTER"),
  bus: L("block", OB_DIMS.bus, "#c23b2e", "#e8e2d6", "#8e2a21", "BMTC"),
  cow: L("block", OB_DIMS.vehicle, "#efe8dc", "#ffffff", "#c8bfb0", "HOLY COW", "#4a3a2a"),
  dog: L("block", OB_DIMS.tall, "#b98552", "#d4a370", "#8a5f36", "STRAY DOG"),
  rider: L("block", OB_DIMS.vehicle, "#e2632a", "#f39a5e", "#a8461b", "DELIVERY"),
  cart: L("block", OB_DIMS.vehicle, "#8a5a2c", "#d9b46a", "#62401e", "VENDOR CART"),
  walker: L("block", OB_DIMS.tall, "#4a6aa8", "#7090cc", "#334c7c", "PEDESTRIAN"),
};

export interface ObBox {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
}

/** Contact shadow — drawn on the ground pass, before anything stands on it. */
export function drawObShadow(ctx: CanvasRenderingContext2D, b: ObBox, cat: ObCat, alpha: number) {
  ctx.save();
  ctx.globalAlpha = 0.38 * alpha;
  ctx.fillStyle = "#000";
  const p = 0.12;
  groundQuad(ctx, b.x0 - p, b.x1 + p, b.z0 - p * 0.5, b.z1 + p, 0.005);
  ctx.fill();
  if (cat === "slide") {
    // shadow of the beam right under it, so the gate reads as overhead
    ctx.globalAlpha = 0.28 * alpha;
    groundQuad(ctx, b.x0, b.x1, b.z0 + 0.4, b.z1 + 0.9, 0.006);
    ctx.fill();
  }
  ctx.restore();
}

function stripes(
  ctx: CanvasRenderingContext2D,
  b: ObBox,
  y: number,
  a: string,
  c: string,
) {
  // hazard stripes across the top face
  groundQuad(ctx, b.x0, b.x1, b.z0, b.z1, y);
  ctx.fillStyle = a;
  ctx.fill();
  ctx.fillStyle = c;
  const n = 7;
  const w = (b.x1 - b.x0) / n;
  for (let i = 0; i < n; i += 2) {
    const xa = b.x0 + i * w;
    poly(ctx, [
      project(xa, y, b.z0),
      project(Math.min(b.x1, xa + w), y, b.z0),
      project(Math.min(b.x1, xa + w * 1.6), y, b.z1),
      project(Math.min(b.x1, xa + w * 0.6), y, b.z1),
    ]);
    ctx.fill();
  }
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, z: number, w: number, ink: string) {
  const p = project(x, y, z);
  const fs = Math.min(22, w * p.s * 0.13);
  if (fs < 4) return;
  ctx.font = `800 ${fs}px Inter, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = ink;
  ctx.fillText(text, p.x, p.y, w * p.s * 0.9);
}

export function drawObstacle3D(
  ctx: CanvasRenderingContext2D,
  kind: ObKind,
  b: ObBox,
  camX: number,
  camY: number,
  t: number,
) {
  const look = OB_LOOK[kind];
  const midX = (b.x0 + b.x1) / 2;
  const w = b.x1 - b.x0;
  if (look.cat === "slide") {
    // two thick posts + beam with a red stripe
    const pw = 0.16;
    const post = { front: "#3b3f46", top: "#5a5f68", side: "#2a2d33" };
    drawBox(ctx, b.x0, b.x0 + pw, 0, b.y1, b.z0, b.z0 + pw, post, camX, camY);
    drawBox(ctx, b.x1 - pw, b.x1, 0, b.y1, b.z0, b.z0 + pw, post, camX, camY);
    drawBox(ctx, b.x0, b.x1, b.y0, b.y1, b.z0, b.z1, look, camX, camY);
    // red stripe band on the front face
    const h = b.y1 - b.y0;
    frontQuad(ctx, b.x0 + 0.02, b.x1 - 0.02, b.y0 + h * 0.08, b.y0 + h * 0.34, b.z0 - 0.001);
    ctx.fillStyle = "#d8312a";
    ctx.fill();
    // hanging bits so it reads as an obstacle (papers / cables)
    if (kind === "email" || kind === "plane") {
      for (let i = 0; i < 4; i++) {
        const x = b.x0 + 0.3 + i * ((w - 0.6) / 3);
        const sw = Math.sin(t * 6 + i) * 0.04;
        frontQuad(ctx, x - 0.14 + sw, x + 0.14 + sw, b.y0 - 0.22, b.y0, b.z0 - 0.002);
        ctx.fillStyle = kind === "email" ? "#ffffff" : "#ffe36a";
        ctx.fill();
      }
    }
    label(ctx, look.label, midX, b.y0 + h * 0.66, b.z0 - 0.002, w, look.ink);
    return;
  }
  if (kind === "files" || kind === "gst") {
    // stacked, slightly offset folders with paper edges + hazard band on top
    const n = 4;
    const hh = (b.y1 - b.y0) / n;
    const cols = kind === "files" ? ["#d9a441", "#c46a52", "#8fa86b", "#e0b85a"] : ["#3f78b0", "#5b8fc4", "#2c5680", "#4a84bd"];
    for (let i = 0; i < n; i++) {
      const o = (i % 2 ? 0.08 : -0.06);
      const c = cols[i];
      drawBox(ctx, b.x0 + 0.05 + o, b.x1 - 0.05 + o, b.y0 + i * hh, b.y0 + (i + 1) * hh, b.z0, b.z1, { front: c, top: "#f6f1e4", side: c, lw: 1 }, camX, camY);
      frontQuad(ctx, b.x0 + 0.1 + o, b.x1 - 0.1 + o, b.y0 + i * hh + hh * 0.42, b.y0 + i * hh + hh * 0.58, b.z0 - 0.002);
      ctx.fillStyle = "#fbf7ec";
      ctx.fill();
    }
    stripes(ctx, b, b.y1 + 0.002, "#ffd21f", "#1c1c1c");
    label(ctx, look.label, midX, b.y0 + hh * 0.5, b.z0 - 0.004, w, look.ink);
    return;
  }
  if (kind === "chair") {
    // a row of black office chairs: wheels, seat, backrest
    const n = Math.max(1, Math.round(w / 0.9));
    const cw = w / n;
    for (let i = 0; i < n; i++) {
      const x0 = b.x0 + i * cw + 0.08;
      const x1 = x0 + cw - 0.16;
      const xm = (x0 + x1) / 2;
      const z = b.z0 + 0.2;
      drawBox(ctx, xm - 0.04, xm + 0.04, 0.08, 0.5, z, z + 0.08, { front: "#555", top: "#666", side: "#444" }, camX, camY);
      drawBox(ctx, x0 - 0.05, x1 + 0.05, 0, 0.08, z - 0.15, z + 0.25, { front: "#222", top: "#333", side: "#1a1a1a" }, camX, camY);
      drawBox(ctx, x0, x1, 0.5, 0.65, b.z0, b.z1 - 0.2, { front: "#2b2f38", top: "#3d4350", side: "#20232a", lw: 1 }, camX, camY);
      drawBox(ctx, x0 + 0.04, x1 - 0.04, 0.65, b.y1, b.z1 - 0.32, b.z1 - 0.18, { front: "#2f3a4c", top: "#4a5870", side: "#1f2836", lw: 1 }, camX, camY);
    }
    return;
  }
  drawBox(ctx, b.x0, b.x1, b.y0, b.y1, b.z0, b.z1, look, camX, camY);
  if (look.cat === "jump") {
    stripes(ctx, b, b.y1 + 0.002, "#ffd21f", "#1c1c1c");
    // outline the top again for crispness
    groundQuad(ctx, b.x0, b.x1, b.z0, b.z1, b.y1 + 0.003);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#16110c";
    ctx.stroke();
    label(ctx, look.label, midX, (b.y0 + b.y1) / 2, b.z0 - 0.002, w, look.ink);
    return;
  }
  // tall / vehicles: illustrated details on the camera-facing face
  const h = b.y1 - b.y0;
  const z = b.z0 - 0.002;
  const fq = (x0: number, x1: number, y0: number, y1: number, col: string) => {
    frontQuad(ctx, x0, x1, y0, y1, z);
    ctx.fillStyle = col;
    ctx.fill();
  };
  const vehicle = kind === "bus" || kind === "auto" || kind === "scooter" || kind === "rider" || kind === "cart";
  if (vehicle) {
    // tyres peeking out below + red tail lights
    fq(b.x0 + 0.05, b.x0 + 0.35, 0, h * 0.14, "#18191c");
    fq(b.x1 - 0.35, b.x1 - 0.05, 0, h * 0.14, "#18191c");
    if (kind !== "cart") {
      fq(b.x0 + 0.08, b.x0 + 0.3, h * 0.3, h * 0.4, "#ff3b2f");
      fq(b.x1 - 0.3, b.x1 - 0.08, h * 0.3, h * 0.4, "#ff3b2f");
    }
  }
  if (kind === "bus") {
    for (let i = 0; i < 3; i++) {
      const x0 = b.x0 + 0.15 + i * ((w - 0.3) / 3);
      fq(x0 + 0.04, x0 + (w - 0.3) / 3 - 0.04, h * 0.55, h * 0.82, "rgba(150,200,225,0.92)");
    }
    fq(b.x0 + 0.3, b.x1 - 0.3, h * 0.86, h * 0.95, "#1a1a1a");
    fq(b.x0, b.x1, h * 0.18, h * 0.24, "#e8e2d6");
  } else if (kind === "auto") {
    fq(b.x0 - 0.05, b.x1 + 0.05, h * 0.62, b.y1, "#f2c230");
    fq(b.x0 + 0.2, b.x1 - 0.2, h * 0.66, h * 0.88, "#191919");
    fq(midX - 0.3, midX + 0.3, h * 0.2, h * 0.3, "#f6f1df");
  } else if (kind === "scooter" || kind === "rider") {
    fq(midX - 0.22, midX + 0.22, h * 0.5, h * 0.9, kind === "rider" ? "#e2632a" : "#2a2a2a");
    if (kind === "rider") fq(midX - 0.3, midX + 0.3, h * 0.55, h * 0.85, "#f39a5e");
  } else if (kind === "ac") {
    const p = project(midX, h * 0.55, z);
    ctx.strokeStyle = "#5b6470";
    ctx.lineWidth = Math.max(1, 0.03 * p.s);
    for (let r = 1; r <= 3; r++) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, (w * 0.12 * r) * p.s, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (kind === "trolley") {
    const cols = ["#d9a441", "#c46a52", "#3f78b0", "#8fa86b"];
    for (let r = 0; r < 3; r++) {
      for (let i = 0; i < 4; i++) {
        const x0 = b.x0 + 0.12 + i * ((w - 0.24) / 4);
        fq(x0 + 0.03, x0 + (w - 0.24) / 4 - 0.03, h * (0.2 + r * 0.25), h * (0.4 + r * 0.25), cols[(i + r) & 3]);
      }
    }
  } else if (kind === "cow") {
    fq(b.x0 + 0.2, b.x0 + 0.5, h * 0.35, h * 0.55, "#3a2a1f");
    fq(b.x1 - 0.6, b.x1 - 0.3, h * 0.55, h * 0.75, "#3a2a1f");
    fq(midX - 0.04, midX + 0.04, h * 0.1, h * 0.45, "#c8bfb0");
  }
  if (kind !== "trolley") label(ctx, look.label, midX, h * 0.42, z - 0.001, w, look.ink);
}
