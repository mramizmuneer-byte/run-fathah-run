import { CX, FAR, GROUND_Y, HORIZON, VH, VW, project } from "./proj";
import { backdrop, rawPhoto, type PhotoKey } from "./photos";
import { roundRect } from "./bossArt";
import { FIRM } from "@/config/game";

export type SkyPhase = "morning" | "afternoon" | "evening" | "night";

const SKIES: Record<SkyPhase, [string, string, string]> = {
  morning: ["#bfe3f3", "#e8f2e2", "#fdf3df"],
  afternoon: ["#8ec8ea", "#cfe6f2", "#f3f7f4"],
  evening: ["#f2a65a", "#f6c88b", "#fbe3c0"],
  night: ["#131a2e", "#1e2740", "#2e3550"],
};

export function skyPhaseFor(distance: number): { phase: SkyPhase; blend: number } {
  const cycle = 900;
  const order: SkyPhase[] = ["morning", "afternoon", "evening", "night"];
  const t = (distance / cycle) % 4;
  const i = Math.floor(t);
  return { phase: order[i], blend: t - i };
}

function lerpHex(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round((((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t));
  const g = Math.round((((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t));
  const bl = Math.round(((pa & 255) * (1 - t) + (pb & 255) * t));
  return `rgb(${r},${g},${bl})`;
}

/* ------------------------------------------------------------------ */
/* Stage 1 — the 3rd floor balcony corridor (from the office video)    */
/* ------------------------------------------------------------------ */

function drawPhotoLayer(
  ctx: CanvasRenderingContext2D,
  key: PhotoKey,
  y: number,
  h: number,
  drift: number,
  blur: number,
  dark: number,
  fallbackTop: string,
  fallbackBottom: string,
) {
  const W = VW + 120;
  const bd = backdrop(key, W, Math.round(h), blur, dark);
  if (bd) {
    const off = ((drift % 120) + 120) % 120;
    ctx.drawImage(bd, -off, y, W, h);
  } else {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, fallbackTop);
    g.addColorStop(1, fallbackBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, y, VW, h);
  }
}

export function drawCorridor(
  ctx: CanvasRenderingContext2D,
  scroll: number,
  doorOpen: number,
) {
  // blurred real trees & street beyond the railing (two parallax layers)
  drawPhotoLayer(ctx, "streetView", -20, HORIZON + 140, Math.sin(scroll * 0.002) * 40 + 40, 9, 0.28, "#8fb67a", "#3d6b3a");
  ctx.save();
  ctx.globalAlpha = 0.55;
  drawPhotoLayer(ctx, "corridor", HORIZON - 170, 260, scroll * 0.05, 14, 0.35, "#6f8f5a", "#4a6a40");
  ctx.restore();

  // granite floor
  const fg = ctx.createLinearGradient(0, HORIZON, 0, VH);
  fg.addColorStop(0, "#5c5a55");
  fg.addColorStop(1, "#33312e");
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.moveTo(0, VH);
  ctx.lineTo(VW, VH);
  const l = project(-200, 0, FAR);
  const r = project(200, 0, FAR);
  ctx.lineTo(r.x, r.y);
  ctx.lineTo(l.x, l.y);
  ctx.closePath();
  ctx.fill();

  // speckle
  ctx.save();
  ctx.globalAlpha = 0.25;
  for (let i = 0; i < 90; i++) {
    const z = ((i * 61.7 - scroll) % FAR + FAR) % FAR;
    const p = project((((i * 131) % 380) - 190), 0, z);
    ctx.fillStyle = i % 2 ? "#8d8a84" : "#1e1c1a";
    ctx.fillRect(p.x, p.y, 2 + p.s * 3, 1 + p.s * 2);
  }
  ctx.restore();

  // floor joint lines
  ctx.strokeStyle = "rgba(20,19,18,0.55)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 12; i++) {
    const z = ((i * 110 - (scroll % 110)) % FAR + FAR) % FAR;
    const a = project(-190, 0, z);
    const b = project(190, 0, z);
    ctx.globalAlpha = 1 - z / FAR;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // repeating artificial grass mats along the right side
  for (let i = 0; i < 4; i++) {
    const z0 = ((i * 360 - (scroll % 1440)) % 1440 + 1440) % 1440 - 120;
    if (z0 > FAR) continue;
    const z1 = Math.min(FAR, z0 + 160);
    const m1 = project(96, 0, z1);
    const m2 = project(186, 0, z1);
    const m3 = project(186, 0, z0);
    const m4 = project(96, 0, z0);
    ctx.globalAlpha = Math.max(0, 1 - z0 / FAR);
    ctx.fillStyle = "#4f9442";
    ctx.beginPath();
    ctx.moveTo(m1.x, m1.y);
    ctx.lineTo(m2.x, m2.y);
    ctx.lineTo(m3.x, m3.y);
    ctx.lineTo(m4.x, m4.y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // the glass door far away, opening
  drawGlassDoor(ctx, doorOpen);

  // LEFT: cream parapet + stainless railing
  drawParapetAndRailing(ctx, scroll);

  // RIGHT: glass & granite wall with ceiling overhang
  drawRightWall(ctx, scroll);
  drawCeiling(ctx, scroll);

  // potted palms as set dressing (far to near)
  for (let i = 5; i >= 0; i--) {
    const z = ((i * 230 + 90 - (scroll % 1380)) % 1380 + 1380) % 1380 - 140;
    if (z > FAR || z < -100) continue;
    drawPalm(ctx, 172, z);
  }
}

function drawCeiling(ctx: CanvasRenderingContext2D, scroll: number) {
  const H = 820;
  const a = project(-40, H, FAR);
  const b = project(190, H, FAR);
  const c = project(190, H, -80);
  const d = project(-40, H, -80);
  const g = ctx.createLinearGradient(0, 0, 0, HORIZON);
  g.addColorStop(0, "#cfc6b6");
  g.addColorStop(1, "#efe8da");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(d.x, d.y);
  ctx.closePath();
  ctx.fill();
  // beam edge
  ctx.strokeStyle = "rgba(90,80,66,0.5)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(d.x, d.y);
  ctx.stroke();
  // recessed lights
  for (let i = 0; i < 8; i++) {
    const z = ((i * 160 - (scroll % 160)) % FAR + FAR) % FAR;
    const p = project(90, H, z);
    ctx.globalAlpha = 0.9 * (1 - z / FAR);
    ctx.fillStyle = "#fff6dc";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 16 * p.s, 5 * p.s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPalm(ctx: CanvasRenderingContext2D, x: number, z: number) {
  const p = project(x, 0, z);
  const s = p.s * 1.25;
  if (s < 0.06) return;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(s, s);
  ctx.globalAlpha = Math.min(1, (FAR - z) / 200);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(0, 0, 26, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2b2a2e";
  ctx.beginPath();
  ctx.moveTo(-18, -34);
  ctx.lineTo(18, -34);
  ctx.lineTo(13, 0);
  ctx.lineTo(-13, 0);
  ctx.closePath();
  ctx.fill();
  for (let i = -3; i <= 3; i++) {
    ctx.save();
    ctx.translate(0, -34);
    ctx.rotate(i * 0.33);
    ctx.fillStyle = i % 2 ? "#3f7d36" : "#5a9a45";
    ctx.beginPath();
    ctx.ellipse(0, -34, 6, 36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawRightWall(ctx: CanvasRenderingContext2D, scroll: number) {
  const X = 190;
  const H = 820;
  const top = project(X, H, FAR);
  const topN = project(X, H, -80);
  const botN = project(X, 0, -80);
  const bot = project(X, 0, FAR);
  const wg = ctx.createLinearGradient(CX, HORIZON, VW, VH);
  wg.addColorStop(0, "#e3ded2");
  wg.addColorStop(1, "#bab3a4");
  ctx.fillStyle = wg;
  ctx.beginPath();
  ctx.moveTo(top.x, top.y);
  ctx.lineTo(topN.x, topN.y);
  ctx.lineTo(botN.x, botN.y);
  ctx.lineTo(bot.x, bot.y);
  ctx.closePath();
  ctx.fill();

  // glass panels + granite pillars repeating
  const P = 260;
  for (let i = 5; i >= 0; i--) {
    const z0 = ((i * P - (scroll % P)) % (P * 5) + P * 5) % (P * 5) - 80;
    if (z0 > FAR) continue;
    const z1 = Math.min(FAR, z0 + P * 0.7);
    const q = (zz: number, yy: number) => project(X, yy, zz);
    const a = q(z0, 20);
    const b = q(z1, 20);
    const c = q(z1, 560);
    const d = q(z0, 560);
    ctx.globalAlpha = Math.max(0, 1 - z0 / FAR);
    ctx.fillStyle = "rgba(120,150,150,0.55)";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(40,44,46,0.6)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // granite pillar
    const e = q(z1, 0);
    const f = q(Math.min(FAR, z1 + P * 0.3), 0);
    const g2 = q(Math.min(FAR, z1 + P * 0.3), H);
    const h = q(z1, H);
    ctx.fillStyle = "#77716a";
    ctx.beginPath();
    ctx.moveTo(e.x, e.y);
    ctx.lineTo(f.x, f.y);
    ctx.lineTo(g2.x, g2.y);
    ctx.lineTo(h.x, h.y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // the real nameplate scrolling past on a granite pillar
  const plateZ = ((700 - scroll) % 1800 + 1800) % 1800 - 100;
  drawNameplate(ctx, plateZ);
}

export function drawNameplate(ctx: CanvasRenderingContext2D, z: number, at?: { x: number; y: number; s: number }) {
  if (!at && (z < -80 || z > FAR)) return;
  const c = at ?? project(176, 250, z);
  const w = 190 * c.s;
  const h = 78 * c.s;
  if (w < 12) return;
  ctx.save();
  // granite backing
  ctx.fillStyle = "#6f6a63";
  roundRect(ctx, c.x - w * 0.7, c.y - h * 1.2, w * 1.4, h * 2.4, 2);
  ctx.fill();
  const photo = rawPhoto("nameplate");
  if (photo && photo.naturalWidth) {
    // the real plaque photo, cropped to the brass plate
    const iw = photo.naturalWidth;
    const ih = photo.naturalHeight;
    ctx.drawImage(photo, iw * 0.02, ih * 0.06, iw * 0.92, ih * 0.86, c.x - w / 2, c.y - h / 2, w, h);
    ctx.strokeStyle = "rgba(227,187,102,0.8)";
    ctx.lineWidth = Math.max(1, 1.5 * c.s);
    ctx.strokeRect(c.x - w / 2, c.y - h / 2, w, h);
    ctx.restore();
    return;
  }
  // bronze plaque
  const pg = ctx.createLinearGradient(c.x - w / 2, c.y - h / 2, c.x + w / 2, c.y + h / 2);
  pg.addColorStop(0, "#6b432a");
  pg.addColorStop(0.5, "#8a5a36");
  pg.addColorStop(1, "#5c3923");
  ctx.fillStyle = pg;
  roundRect(ctx, c.x - w / 2, c.y - h / 2, w, h, 3 * c.s);
  ctx.fill();
  ctx.strokeStyle = "#e3bb66";
  ctx.lineWidth = Math.max(1, 2.5 * c.s);
  roundRect(ctx, c.x - w / 2 + 3 * c.s, c.y - h / 2 + 3 * c.s, w - 6 * c.s, h - 6 * c.s, 2 * c.s);
  ctx.stroke();
  ctx.fillStyle = "#f0cc7a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.max(4, 13 * c.s)}px Georgia, serif`;
  ctx.fillText(FIRM.name, c.x, c.y - h * 0.16);
  ctx.font = `600 ${Math.max(3, 8.5 * c.s)}px Georgia, serif`;
  ctx.fillText(FIRM.subtitle, c.x, c.y + h * 0.2);
  ctx.restore();
}

function drawGlassDoor(ctx: CanvasRenderingContext2D, open: number) {
  const z = FAR - 60;
  const c = project(0, 0, z);
  const top = project(0, 230, z);
  const w = 170 * c.s;
  const h = c.y - top.y;
  if (h < 4) return;
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - open);
  ctx.fillStyle = "rgba(190,215,220,0.55)";
  ctx.fillRect(c.x - w / 2, top.y, w, h);
  ctx.strokeStyle = "rgba(60,70,72,0.7)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(c.x - w / 2, top.y, w, h);
  // black bar handle
  ctx.fillStyle = "#1c1c1e";
  ctx.fillRect(c.x - 2, top.y + h * 0.4, 3, h * 0.28);
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Stage 2 — the tree canopy descent                                   */
/* ------------------------------------------------------------------ */

export function drawTreeCanopy(
  ctx: CanvasRenderingContext2D,
  scroll: number,
  progress: number,
) {
  // the street below, revealed as he falls
  const sg = ctx.createLinearGradient(0, HORIZON - 80, 0, VH);
  sg.addColorStop(0, "#6b6f6a");
  sg.addColorStop(1, "#4b4e4a");
  ctx.fillStyle = sg;
  ctx.fillRect(0, 0, VW, VH);
  const street = backdrop("streetBelow", VW, VH, 7, 0.3);
  if (street) {
    const z = 1 + progress * 0.35;
    ctx.drawImage(street, CX - (VW * z) / 2, VH / 2 - (VH * z) / 2, VW * z, VH * z);
  }


  // buildings far below
  ctx.save();
  ctx.globalAlpha = 0.35 + progress * 0.45;
  for (let i = 0; i < 7; i++) {
    const bx = i * 68 - 30;
    const bh = 90 + ((i * 53) % 90);
    ctx.fillStyle = i % 2 ? "#8b8378" : "#9a9287";
    ctx.fillRect(bx, HORIZON + 60 - bh * 0.4, 58, bh);
    ctx.fillStyle = "rgba(60,70,80,0.5)";
    for (let w = 0; w < 6; w++)
      ctx.fillRect(bx + 8 + (w % 3) * 16, HORIZON + 70 - bh * 0.4 + Math.floor(w / 3) * 22, 10, 12);
  }
  ctx.restore();

  // sun shafts through the leaves
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 4; i++) {
    const x = 40 + i * 95 + Math.sin(scroll * 0.002 + i) * 10;
    const g = ctx.createLinearGradient(x, 0, x + 60, VH);
    g.addColorStop(0, "rgba(255,240,180,0.16)");
    g.addColorStop(1, "rgba(255,240,180,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 30, 0);
    ctx.lineTo(x + 110, VH);
    ctx.lineTo(x + 40, VH);
    ctx.fill();
  }
  ctx.restore();

  // trunk with bark ridges (behind the leaves)
  const tg = ctx.createLinearGradient(CX - 30, 0, CX + 30, 0);
  tg.addColorStop(0, "#3a2717");
  tg.addColorStop(0.45, "#6e4c30");
  tg.addColorStop(1, "#2e1f12");
  ctx.fillStyle = tg;
  ctx.fillRect(CX - 30, 0, 60, VH);
  ctx.strokeStyle = "rgba(30,20,12,0.55)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    const y = (((i * 97 + scroll * 1.2) % (VH + 80)) + VH + 80) % (VH + 80) - 40;
    ctx.beginPath();
    ctx.moveTo(CX - 22 + (i % 3) * 14, y);
    ctx.quadraticCurveTo(CX - 18 + (i % 3) * 14, y + 25, CX - 24 + (i % 3) * 14, y + 50);
    ctx.stroke();
  }
  // side boughs scrolling past
  for (let i = 0; i < 4; i++) {
    const y = (((i * 260 + scroll * 1.0) % (VH + 300)) + VH + 300) % (VH + 300) - 150;
    const dir = i % 2 ? 1 : -1;
    ctx.strokeStyle = "#4a3220";
    ctx.lineCap = "round";
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(CX, y);
    ctx.quadraticCurveTo(CX + dir * 90, y - 30, CX + dir * 210, y - 70);
    ctx.stroke();
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(CX + dir * 120, y - 40);
    ctx.lineTo(CX + dir * 160, y - 110);
    ctx.stroke();
  }

  // canopy — shaded leaf clusters at three depths
  const pal = [
    ["#1f4220", "#2e5a2c", "#3b6d35"],
    ["#2f6a2c", "#3f7a37", "#5c9a48"],
    ["#3f8a38", "#5aa446", "#86c46a"],
  ];
  for (let layer = 0; layer < 3; layer++) {
    const sp = 0.35 + layer * 0.45;
    ctx.save();
    ctx.globalAlpha = 0.6 + layer * 0.18;
    const n = layer === 2 ? 10 : 16;
    for (let i = 0; i < n; i++) {
      const seed = i * 71.3 + layer * 313;
      let bx = (seed * 17) % VW;
      if (layer === 2 && Math.abs(bx - CX) < 90) bx = bx < CX ? 20 + (bx % 40) : VW - 20 - (bx % 40);
      const by = (((seed * 29 + scroll * sp) % (VH + 300)) + VH + 300) % (VH + 300) - 150;
      const r = 24 + ((seed * 11) % 40) + layer * 10;
      const [dk, md, lt] = pal[layer];
      ctx.fillStyle = dk;
      ctx.beginPath();
      ctx.arc(bx, by + r * 0.15, r, 0, Math.PI * 2);
      ctx.arc(bx - r * 0.7, by + r * 0.35, r * 0.65, 0, Math.PI * 2);
      ctx.arc(bx + r * 0.7, by + r * 0.3, r * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = md;
      ctx.beginPath();
      ctx.arc(bx - r * 0.1, by - r * 0.05, r * 0.8, 0, Math.PI * 2);
      ctx.arc(bx + r * 0.55, by + r * 0.1, r * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = lt;
      ctx.beginPath();
      ctx.arc(bx - r * 0.3, by - r * 0.3, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // falling leaves
  ctx.fillStyle = "#7fb85a";
  for (let i = 0; i < 12; i++) {
    const x = (i * 83 + Math.sin(scroll * 0.01 + i) * 20 + VW) % VW;
    const y = (((i * 131 - scroll * 0.6) % VH) + VH) % VH;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(scroll * 0.01 + i);
    ctx.beginPath();
    ctx.ellipse(0, 0, 6, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // vignette for depth
  const vg = ctx.createRadialGradient(CX, VH * 0.55, VW * 0.3, CX, VH * 0.55, VH * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(10,25,10,0.45)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, VW, VH);
}

/* ------------------------------------------------------------------ */
/* Stage 3 — endless Bangalore road                                    */
/* ------------------------------------------------------------------ */

export type RoadSegment =
  | "avenue"
  | "lane"
  | "metro"
  | "junction"
  | "market"
  | "chai";

export const ROAD_SEGMENTS: RoadSegment[] = [
  "avenue",
  "lane",
  "metro",
  "junction",
  "market",
  "chai",
];

export const SEGMENT_LABELS: Record<RoadSegment, string> = {
  avenue: "RAIN TREE AVENUE",
  lane: "RESIDENTIAL LANE",
  metro: "UNDER THE METRO",
  junction: "BUSY JUNCTION",
  market: "MARKET STRETCH",
  chai: "FILTER COFFEE STALL",
};

export function drawRoad(
  ctx: CanvasRenderingContext2D,
  scroll: number,
  seg: RoadSegment,
  distance: number,
  rain: boolean,
) {
  const { phase, blend } = skyPhaseFor(distance);
  const order: SkyPhase[] = ["morning", "afternoon", "evening", "night"];
  const next = order[(order.indexOf(phase) + 1) % 4];
  const a = SKIES[phase];
  const b = SKIES[next];
  const g = ctx.createLinearGradient(0, 0, 0, HORIZON + 30);
  g.addColorStop(0, lerpHex(a[0], b[0], blend));
  g.addColorStop(0.6, lerpHex(a[1], b[1], blend));
  g.addColorStop(1, lerpHex(a[2], b[2], blend));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VW, HORIZON + 40);

  const night = phase === "night";

  drawSegmentBackdrop(ctx, scroll, seg, night);

  // road surface
  const rg = ctx.createLinearGradient(0, HORIZON, 0, VH);
  rg.addColorStop(0, night ? "#2b2c33" : "#55555c");
  rg.addColorStop(1, night ? "#1a1b20" : "#3a3a40");
  ctx.fillStyle = rg;
  const l = project(-210, 0, FAR);
  const r = project(210, 0, FAR);
  ctx.beginPath();
  ctx.moveTo(0, VH);
  ctx.lineTo(VW, VH);
  ctx.lineTo(r.x, r.y);
  ctx.lineTo(l.x, l.y);
  ctx.closePath();
  ctx.fill();

  // kerbs
  for (const kx of [-200, 200]) {
    const ka = project(kx, 0, FAR);
    const kb = project(kx, 0, -60);
    const kc = project(kx, 16, -60);
    const kd = project(kx, 16, FAR);
    ctx.fillStyle = night ? "#3b3c44" : "#9a9689";
    ctx.beginPath();
    ctx.moveTo(ka.x, ka.y);
    ctx.lineTo(kb.x, kb.y);
    ctx.lineTo(kc.x, kc.y);
    ctx.lineTo(kd.x, kd.y);
    ctx.closePath();
    ctx.fill();
  }

  // dashed lane markings
  ctx.fillStyle = night ? "rgba(220,220,210,0.55)" : "rgba(240,238,225,0.8)";
  for (const lx of [-52, 52]) {
    for (let i = 0; i < 16; i++) {
      const z = ((i * 96 - (scroll % 96)) % FAR + FAR) % FAR;
      const p1 = project(lx, 0, z);
      const p2 = project(lx, 0, z + 44);
      const w = Math.max(0.5, 6 * p1.s);
      ctx.globalAlpha = 1 - z / FAR;
      ctx.beginPath();
      ctx.moveTo(p1.x - w / 2, p1.y);
      ctx.lineTo(p1.x + w / 2, p1.y);
      ctx.lineTo(p2.x + w * 0.4, p2.y);
      ctx.lineTo(p2.x - w * 0.4, p2.y);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  drawSidewalksAndFacades(ctx, scroll, seg, night);
  if (night) drawStreetLamps(ctx, scroll);
  if (rain) drawRain(ctx, scroll);
}

export function drawSegmentBackdrop(
  ctx: CanvasRenderingContext2D,
  scroll: number,
  seg: RoadSegment,
  night: boolean,
) {
  const baseY = HORIZON + 34;
  const shade = night ? 0.45 : 1;

  const wall = (x: number, w: number, h: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(x, baseY - h, w, h);
  };

  if (seg === "avenue") {
    for (let i = 0; i < 10; i++) {
      const x = ((i * 92 - scroll * 0.25) % (VW + 180)) - 90;
      ctx.fillStyle = `rgba(${Math.round(42 * shade)},${Math.round(84 * shade)},${Math.round(40 * shade)},0.95)`;
      ctx.beginPath();
      ctx.arc(x, baseY - 116, 70, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(70,50,32,0.9)";
      ctx.fillRect(x - 7, baseY - 120, 14, 120);
    }
  } else if (seg === "lane") {
    for (let i = 0; i < 8; i++) {
      const x = ((i * 118 - scroll * 0.3) % (VW + 240)) - 120;
      const h = 130 + ((i * 47) % 70);
      wall(x, 108, h, night ? "#3a3f4a" : "#ded4c2");
      ctx.fillStyle = night ? "#f6d98a" : "rgba(120,130,140,0.45)";
      for (let k = 0; k < 6; k++)
        ctx.fillRect(x + 12 + (k % 3) * 32, baseY - h + 18 + Math.floor(k / 3) * 40, 20, 24);
      // balcony plants
      ctx.fillStyle = `rgba(${Math.round(60 * shade)},${Math.round(112 * shade)},${Math.round(56 * shade)},1)`;
      ctx.fillRect(x + 10, baseY - h + 60, 86, 8);
    }
  } else if (seg === "metro") {
    ctx.fillStyle = night ? "#4a3560" : "#7b5ea3";
    for (let i = 0; i < 5; i++) {
      const x = ((i * 190 - scroll * 0.5) % (VW + 380)) - 190;
      ctx.fillRect(x - 15, baseY - 190, 30, 190);
    }
    ctx.fillStyle = night ? "#3a3f4d" : "#8c8f96";
    ctx.fillRect(0, baseY - 214, VW, 30);
  } else if (seg === "junction") {
    for (let i = 0; i < 9; i++) {
      const x = ((i * 86 - scroll * 0.28) % (VW + 180)) - 90;
      wall(x, 78, 90 + ((i * 61) % 110), night ? "#343947" : "#c9c1b2");
    }
    // signal
    ctx.fillStyle = "#2c2f34";
    ctx.fillRect(VW - 42, baseY - 120, 8, 120);
    ctx.fillRect(VW - 52, baseY - 152, 28, 40);
    ctx.fillStyle = "#e04b3c";
    ctx.beginPath();
    ctx.arc(VW - 38, baseY - 140, 6, 0, Math.PI * 2);
    ctx.fill();
  } else if (seg === "market") {
    for (let i = 0; i < 9; i++) {
      const x = ((i * 86 - scroll * 0.3) % (VW + 180)) - 90;
      wall(x, 80, 110, night ? "#3b3540" : "#d3c6b4");
      // awnings
      ctx.fillStyle = ["#d9564a", "#e8a33d", "#3f8f6d"][i % 3];
      ctx.fillRect(x, baseY - 52, 80, 16);
      // flowers / fruit
      for (let k = 0; k < 5; k++) {
        ctx.fillStyle = ["#e8556d", "#f2a93b", "#8bc34a"][(i + k) % 3];
        ctx.beginPath();
        ctx.arc(x + 12 + k * 15, baseY - 22, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else {
    // chai stall
    for (let i = 0; i < 8; i++) {
      const x = ((i * 100 - scroll * 0.28) % (VW + 200)) - 100;
      wall(x, 92, 120, night ? "#3a3a44" : "#cdc3b0");
    }
    const sx = ((-scroll * 0.28) % (VW + 200) + VW + 200) % (VW + 200) - 60;
    ctx.fillStyle = "#8a5a2c";
    ctx.fillRect(sx, baseY - 70, 96, 70);
    ctx.fillStyle = "#c9402f";
    ctx.fillRect(sx - 6, baseY - 86, 108, 18);
    ctx.fillStyle = "#f6e3c0";
    ctx.font = "700 10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("FILTER COFFEE", sx + 48, baseY - 73);
  }
}

function drawStreetLamps(ctx: CanvasRenderingContext2D, scroll: number) {
  for (let i = 0; i < 8; i++) {
    const z = ((i * 220 - (scroll % 220)) % FAR + FAR) % FAR;
    const base = project(206, 0, z);
    const top = project(206, 190, z);
    ctx.strokeStyle = "#2f3138";
    ctx.lineWidth = Math.max(0.8, 5 * base.s);
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(top.x, top.y);
    ctx.stroke();
    const grd = ctx.createRadialGradient(top.x, top.y, 1, top.x, top.y, 70 * base.s);
    grd.addColorStop(0, "rgba(255,214,140,0.85)");
    grd.addColorStop(1, "rgba(255,214,140,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(top.x, top.y, 70 * base.s, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRain(ctx: CanvasRenderingContext2D, scroll: number) {
  ctx.save();
  ctx.strokeStyle = "rgba(190,215,235,0.45)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 70; i++) {
    const x = (i * 53.7 + scroll * 0.4) % VW;
    const y = (i * 137 + scroll * 6) % VH;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 3, y + 16);
    ctx.stroke();
  }
  ctx.restore();
}

const FACADE_COLS = ["#d8c8ae", "#c9a98a", "#e0d6c2", "#b98d6d", "#cdbfa6", "#a88f78"];
const SIGN_COLS = ["#c9402f", "#2f6d8a", "#e0a02f", "#3f8f6d", "#7a4aa0"];

function drawSidewalksAndFacades(
  ctx: CanvasRenderingContext2D,
  scroll: number,
  seg: RoadSegment,
  night: boolean,
) {
  const shade = night ? 0.45 : 1;
  const mul = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.round(((n >> 16) & 255) * shade);
    const g = Math.round(((n >> 8) & 255) * shade);
    const b = Math.round((n & 255) * shade);
    return `rgb(${r},${g},${b})`;
  };
  for (const side of [-1, 1]) {
    // sidewalk plane
    const s1 = project(side * 205, 16, FAR);
    const s2 = project(side * 430, 16, FAR);
    const s3 = project(side * 430, 16, -80);
    const s4 = project(side * 205, 16, -80);
    ctx.fillStyle = mul("#8f877a");
    ctx.beginPath();
    ctx.moveTo(s1.x, s1.y);
    ctx.lineTo(s2.x, s2.y);
    ctx.lineTo(s3.x, s3.y);
    ctx.lineTo(s4.x, s4.y);
    ctx.closePath();
    ctx.fill();
    // facade blocks (far to near)
    const P = 220;
    const X = side * 430;
    const H = 700;
    for (let i = 6; i >= 0; i--) {
      const idx = Math.floor((scroll + i * P) / P);
      const z0 = i * P - (scroll % P) - 80;
      if (z0 > FAR) continue;
      const z1 = Math.min(FAR, z0 + P);
      const col = FACADE_COLS[(idx * 7 + (side > 0 ? 3 : 0)) % FACADE_COLS.length];
      const h = H - ((idx * 131) % 260);
      const a = project(X, 0, z0);
      const b = project(X, 0, z1);
      const c = project(X, h, z1);
      const d = project(X, h, z0);
      ctx.fillStyle = mul(col);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(d.x, d.y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.18)";
      ctx.lineWidth = 1;
      ctx.stroke();
      // shop front + sign
      const sa = project(X, 0, z0 + 20);
      const sb = project(X, 0, z1 - 20);
      const sc = project(X, 120, z1 - 20);
      const sd = project(X, 120, z0 + 20);
      ctx.fillStyle = night ? "rgba(255,210,130,0.55)" : "rgba(40,36,34,0.55)";
      ctx.beginPath();
      ctx.moveTo(sa.x, sa.y);
      ctx.lineTo(sb.x, sb.y);
      ctx.lineTo(sc.x, sc.y);
      ctx.lineTo(sd.x, sd.y);
      ctx.closePath();
      ctx.fill();
      const ga = project(X, 130, z0 + 10);
      const gb = project(X, 130, z1 - 10);
      const gc = project(X, 175, z1 - 10);
      const gd = project(X, 175, z0 + 10);
      ctx.fillStyle = seg === "market" ? SIGN_COLS[idx % 5] : mul(SIGN_COLS[idx % 5]);
      ctx.beginPath();
      ctx.moveTo(ga.x, ga.y);
      ctx.lineTo(gb.x, gb.y);
      ctx.lineTo(gc.x, gc.y);
      ctx.lineTo(gd.x, gd.y);
      ctx.closePath();
      ctx.fill();
      // windows
      ctx.fillStyle = night ? "rgba(246,217,138,0.8)" : "rgba(90,110,125,0.5)";
      for (let f = 0; f < 3; f++) {
        const wy = 240 + f * 140;
        if (wy + 80 > h) break;
        for (let k = 0; k < 2; k++) {
          const za = z0 + 40 + k * 90;
          const zb = za + 50;
          if (zb > z1) continue;
          const w1 = project(X, wy, za);
          const w2 = project(X, wy, zb);
          const w3 = project(X, wy + 70, zb);
          const w4 = project(X, wy + 70, za);
          ctx.beginPath();
          ctx.moveTo(w1.x, w1.y);
          ctx.lineTo(w2.x, w2.y);
          ctx.lineTo(w3.x, w3.y);
          ctx.lineTo(w4.x, w4.y);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
    // big rain trees on the sidewalk
    for (let i = 4; i >= 0; i--) {
      const z = ((i * 300 + (side > 0 ? 150 : 0) - (scroll % 1500)) % 1500 + 1500) % 1500 - 120;
      if (z > FAR) continue;
      const base = project(side * 300, 16, z);
      const top = project(side * 300, 520, z);
      ctx.fillStyle = mul("#4a3422");
      ctx.fillRect(base.x - 9 * base.s, top.y + 60 * base.s, 18 * base.s, base.y - top.y - 60 * base.s);
      ctx.fillStyle = night ? "rgba(24,48,26,0.95)" : "rgba(52,100,48,0.95)";
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.arc(top.x + (k - 1.5) * 50 * base.s, top.y + ((k % 2) * 30) * base.s, 80 * base.s, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

export { GROUND_Y };

function drawParapetAndRailing(ctx: CanvasRenderingContext2D, scroll: number) {
  const X = -190;
  const top = project(X, 62, FAR);
  const topN = project(X, 62, -80);
  const botN = project(X, 0, -80);
  const bot = project(X, 0, FAR);
  ctx.fillStyle = "#cfc6b4";
  ctx.beginPath();
  ctx.moveTo(top.x, top.y);
  ctx.lineTo(topN.x, topN.y);
  ctx.lineTo(botN.x, botN.y);
  ctx.lineTo(bot.x, bot.y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#cfd4d8";
  for (let i = 0; i < 14; i++) {
    const z = ((i * 86 - (scroll % 86)) % FAR + FAR) % FAR;
    const a = project(X, 62, z);
    const b = project(X, 150, z);
    ctx.lineWidth = Math.max(0.6, 5 * a.s);
    ctx.globalAlpha = 0.9 * (1 - z / (FAR * 1.1));
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (const h of [150, 128, 106, 84]) {
    const a = project(X, h, FAR);
    const b = project(X, h, -80);
    ctx.lineWidth = h === 150 ? 3 : 1.6;
    ctx.strokeStyle = h === 150 ? "#e2e7ea" : "#b9c0c6";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}

/** Day-cycle sky gradient for the road stage. */
export function drawSkyGradient(ctx: CanvasRenderingContext2D, distance: number) {
  const { phase, blend } = skyPhaseFor(distance);
  const order: SkyPhase[] = ["morning", "afternoon", "evening", "night"];
  const next = order[(order.indexOf(phase) + 1) % 4];
  const a = SKIES[phase];
  const b = SKIES[next];
  const g = ctx.createLinearGradient(0, 0, 0, HORIZON + 30);
  g.addColorStop(0, lerpHex(a[0], b[0], blend));
  g.addColorStop(0.6, lerpHex(a[1], b[1], blend));
  g.addColorStop(1, lerpHex(a[2], b[2], blend));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VW, HORIZON + 40);
}
