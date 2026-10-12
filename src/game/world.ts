/**
 * Stage 1 corridor and Stage 3 road, built in real metres and drawn through the
 * shared camera, so everything streams past at the true running speed.
 */
import { backdrop } from "./photos";
import { cam, project, VH, VW, HORIZON, FAR } from "./proj";
import { drawBox, frontQuad, groundQuad, hash, sideQuad } from "./draw3d";
import { drawNameplate, drawSegmentBackdrop, drawSkyGradient, skyPhaseFor, type RoadSegment } from "./scenery";

const NEAR = -3.6;
const VIEW = 220; // ground drawn this far so it meets the horizon

function fogA(z: number) {
  return Math.max(0, Math.min(1, (FAR + 25 - z) / 45));
}

/** Iterate repeating objects with period P (metres) from far to near. */
function repeat(scroll: number, P: number, maxZ: number, fn: (z: number, i: number) => void) {
  const first = Math.floor((scroll + NEAR) / P);
  const last = Math.floor((scroll + maxZ) / P);
  for (let i = last; i >= first; i--) {
    const z = i * P - scroll;
    if (z < NEAR || z > maxZ) continue;
    fn(z, i);
  }
}

function horizonHaze(ctx: CanvasRenderingContext2D, col: string) {
  const g = ctx.createLinearGradient(0, HORIZON - 60, 0, HORIZON + 40);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.6, col);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, HORIZON - 60, VW, 100);
}

/* ------------------------------------------------------------------ */
/* Stage 1 — balcony corridor                                          */
/* ------------------------------------------------------------------ */

const FLOOR_L = -4.2;
const FLOOR_R = 4.2;

export function drawCorridorWorld(ctx: CanvasRenderingContext2D, scroll: number, t: number) {
  // sky + blurred real street photo far away (slow drift)
  const sky = ctx.createLinearGradient(0, 0, 0, HORIZON);
  sky.addColorStop(0, "#9fc4dc");
  sky.addColorStop(1, "#e8e2cf");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VW, HORIZON + 20);
  const bd = backdrop("streetView", VW + 160, Math.round(HORIZON + 60), 10, 0.22);
  if (bd) {
    ctx.globalAlpha = 0.75;
    const off = ((scroll * 0.6) % 160 + 160) % 160;
    ctx.drawImage(bd, -off, -20);
    ctx.drawImage(bd, VW + 160 - off, -20);
    ctx.globalAlpha = 1;
  }

  // building across the street (far parallax, 3D)
  repeat(scroll, 16, 200, (z, i) => {
    const h = 9 + hash(i) * 10;
    const x0 = -30;
    ctx.globalAlpha = fogA(z * 0.5) * 0.95;
    frontQuad(ctx, x0 - 10, x0 + 4, 0, h, z);
    const cols = ["#c9b79a", "#b5a28a", "#d8cbb2", "#a98f76"];
    ctx.fillStyle = cols[i & 3];
    ctx.fill();
    sideQuad(ctx, x0 + 4, 0, h, z, z + 12);
    ctx.fillStyle = "#9c8b74";
    ctx.fill();
    // windows
    ctx.fillStyle = "rgba(60,80,95,0.55)";
    for (let r = 1; r < h / 3; r++) for (let c = 0; c < 3; c++) {
      frontQuad(ctx, x0 - 8 + c * 4, x0 - 6 + c * 4, r * 3, r * 3 + 1.4, z - 0.01);
      ctx.fill();
    }
  });
  ctx.globalAlpha = 1;

  // tree canopy seen past the railing (mid parallax)
  repeat(scroll, 7, 160, (z, i) => {
    const x = -8.5 - hash(i + 3) * 5;
    const p = project(x, 5 + hash(i) * 2, z);
    const r = (2.4 + hash(i + 9) * 1.6) * p.s;
    ctx.globalAlpha = fogA(z * 0.7);
    ctx.fillStyle = i % 2 ? "#3f7a3a" : "#4f8e44";
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.arc(p.x + r * 0.7, p.y + r * 0.3, r * 0.75, 0, Math.PI * 2);
    ctx.arc(p.x - r * 0.6, p.y + r * 0.35, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  horizonHaze(ctx, "rgba(240,228,205,0.55)");

  // polished speckled granite floor
  const g = ctx.createLinearGradient(0, HORIZON, 0, VH);
  g.addColorStop(0, "#a49a8c");
  g.addColorStop(0.5, "#7b7268");
  g.addColorStop(1, "#4e4842");
  ctx.fillStyle = g;
  groundQuad(ctx, FLOOR_L, FLOOR_R, NEAR, VIEW);
  ctx.fill();
  // alternating slab tint (1 m x 2 m slabs)
  repeat(scroll, 4, 50, (z) => {
    ctx.globalAlpha = fogA(z) * 0.18;
    ctx.fillStyle = "#2a2622";
    for (const x0 of [-3.3, -1.1, 1.1]) {
      groundQuad(ctx, x0, x0 + 1.1, z, z + 2, 0.001);
      ctx.fill();
    }
  });
  // speckles (black, white and rust flecks), near range only for cost
  const fleck = ["#1d1a17", "#f1ece2", "#8a5a3c", "#2d2a26"];
  repeat(scroll, 1, 22, (z, i) => {
    ctx.globalAlpha = fogA(z) * 0.7;
    for (let k = 0; k < 9; k++) {
      const h = hash(i * 13 + k);
      const x = FLOOR_L + hash(i * 7 + k * 3) * (FLOOR_R - FLOOR_L);
      const p = project(x, 0.002, z + h);
      const r = Math.max(0.6, 0.03 * p.s);
      ctx.fillStyle = fleck[k & 3];
      ctx.fillRect(p.x, p.y, r * 1.6, r * 0.7);
    }
  });
  // soft reflection sheen down the middle
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#fff8ea";
  groundQuad(ctx, -0.6, 0.6, NEAR, 40, 0.001);
  ctx.fill();
  ctx.globalAlpha = 1;

  // grass mats along the right
  repeat(scroll, 14, FAR + 10, (z) => {
    ctx.globalAlpha = fogA(z);
    groundQuad(ctx, 2.9, 4.1, z, z + 4, 0.002);
    ctx.fillStyle = "#5f9a3e";
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // bright tile joints every 2 m — the main speed cue
  ctx.fillStyle = "rgba(235,228,214,0.55)";
  repeat(scroll, 2, 70, (z) => {
    ctx.globalAlpha = fogA(z) * 0.8;
    groundQuad(ctx, FLOOR_L, FLOOR_R, z, z + 0.07, 0.003);
    ctx.fill();
  });
  // dashed lane dividers
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  for (const lx of [-1.1, 1.1]) {
    repeat(scroll, 3, FAR, (z) => {
      ctx.globalAlpha = fogA(z);
      groundQuad(ctx, lx - 0.06, lx + 0.06, z, z + 1.5, 0.004);
      ctx.fill();
    });
  }
  ctx.globalAlpha = 1;

  // left parapet + steel railing
  const cream = "#e5dccb";
  ctx.fillStyle = cream;
  sideQuad(ctx, FLOOR_L, 0, 1.0, NEAR, VIEW);
  ctx.fill();
  ctx.fillStyle = "#cfc4b0";
  groundQuad(ctx, FLOOR_L - 0.25, FLOOR_L, NEAR, VIEW, 1.0);
  ctx.fill();
  repeat(scroll, 2.5, FAR, (z) => {
    const a = project(FLOOR_L - 0.1, 1.0, z);
    const b = project(FLOOR_L - 0.1, 1.75, z);
    ctx.globalAlpha = fogA(z);
    ctx.strokeStyle = "#c8d0d6";
    ctx.lineWidth = Math.max(1, 0.06 * a.s);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
  const r0 = project(FLOOR_L - 0.1, 1.75, NEAR);
  const r1 = project(FLOOR_L - 0.1, 1.75, FAR);
  ctx.strokeStyle = "#e4e9ec";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(r0.x, r0.y);
  ctx.lineTo(r1.x, r1.y);
  ctx.stroke();

  // right wall: granite pillars and glass
  ctx.fillStyle = "#6f6a63";
  sideQuad(ctx, FLOOR_R, 0, 3.6, NEAR, VIEW);
  ctx.fill();
  repeat(scroll, 6, FAR, (z, i) => {
    ctx.globalAlpha = fogA(z);
    // glass panel
    sideQuad(ctx, FLOOR_R - 0.01, 0.1, 3.3, z + 0.9, z + 5.8);
    ctx.fillStyle = "rgba(170,205,212,0.85)";
    ctx.fill();
    // reflection streak
    sideQuad(ctx, FLOOR_R - 0.02, 0.4, 3.0, z + 2 + (i % 3) * 0.6, z + 2.6 + (i % 3) * 0.6);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fill();
    // pillar
    drawBox(ctx, FLOOR_R - 0.35, FLOOR_R, 0, 3.6, z, z + 0.9, { front: "#807a72", top: "#8f8a82", side: "#6b665f", lw: 1 }, cam.x, cam.y);
  });
  ctx.globalAlpha = 1;

  // AC outdoor units against the parapet
  repeat(scroll, 22, FAR, (z) => {
    ctx.globalAlpha = fogA(z);
    drawBox(ctx, FLOOR_L, FLOOR_L + 0.5, 0, 0.75, z + 8, z + 9, { front: "#e9e7e1", top: "#f6f4ef", side: "#cfccc4", lw: 1 }, cam.x, cam.y);
    const fan = project(FLOOR_L + 0.5, 0.38, z + 8.5);
    ctx.strokeStyle = "#7d7a74";
    ctx.lineWidth = Math.max(1, 0.03 * fan.s);
    ctx.beginPath();
    ctx.ellipse(fan.x, fan.y, 0.12 * fan.s, 0.28 * fan.s, 0, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;

  // potted palms
  repeat(scroll, 15, FAR, (z, i) => {
    if (i % 2) return;
    const p = project(3.6, 0, z + 3);
    ctx.globalAlpha = fogA(z);
    drawBox(ctx, 3.3, 3.9, 0, 0.6, z + 2.7, z + 3.3, { front: "#a8613c", top: "#5a3a26", side: "#8a4c2c", lw: 1 }, cam.x, cam.y);
    ctx.fillStyle = "#3f8038";
    const top = project(3.6, 0.6, z + 3);
    for (let k = -2; k <= 2; k++) {
      ctx.save();
      ctx.translate(top.x, top.y);
      ctx.rotate(k * 0.42 + Math.sin(t * 1.3 + i) * 0.04);
      ctx.beginPath();
      ctx.ellipse(0, -0.55 * p.s, 0.14 * p.s, 0.6 * p.s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });
  ctx.globalAlpha = 1;

  // nameplate on a pillar every 60 m
  repeat(scroll, 60, FAR, (z) => {
    const c = project(FLOOR_R - 0.38, 2.1, z + 0.45);
    ctx.globalAlpha = fogA(z);
    drawNameplate(ctx, 0, { x: c.x, y: c.y, s: (c.s * 1.3) / 190 * 1.0 });
  });
  ctx.globalAlpha = 1;
}

/** Dead-end parapet across the corridor (leap prompt). */
export function drawDeadEndWorld(ctx: CanvasRenderingContext2D, z: number) {
  drawBox(ctx, FLOOR_L, FLOOR_R, 0, 1.0, z, z + 0.3, { front: "#e5dccb", top: "#cfc4b0", side: "#c9bea9" }, cam.x, cam.y);
  const a = project(FLOOR_L, 1.75, z);
  const b = project(FLOOR_R, 1.75, z);
  ctx.strokeStyle = "#e4e9ec";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  for (let x = FLOOR_L; x <= FLOOR_R; x += 0.9) {
    const p = project(x, 1.0, z);
    const q = project(x, 1.75, z);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
  }
}

/* ------------------------------------------------------------------ */
/* Stage 3 — Bangalore road                                            */
/* ------------------------------------------------------------------ */

const ROAD = 4.4;
const WALK = 7.6;
const FACADE_COLS = ["#d8c8ae", "#c9a98a", "#e0d6c2", "#b98d6d", "#cdbfa6", "#a88f78"];
const SIGN_COLS = ["#c9402f", "#2f6d8a", "#e0a02f", "#3f8f6d", "#7a4aa0"];

export function drawRoadWorld(
  ctx: CanvasRenderingContext2D,
  scroll: number,
  seg: RoadSegment,
  distance: number,
  t: number,
) {
  const { phase } = skyPhaseFor(distance);
  const night = phase === "night";
  drawSkyGradient(ctx, distance);
  drawSegmentBackdrop(ctx, scroll * 24, seg, night);
  horizonHaze(ctx, night ? "rgba(40,40,70,0.5)" : "rgba(240,230,210,0.5)");

  // asphalt
  const rg = ctx.createLinearGradient(0, HORIZON, 0, VH);
  rg.addColorStop(0, night ? "#2b2c33" : "#6a6a70");
  rg.addColorStop(1, night ? "#1a1b20" : "#3e3e44");
  ctx.fillStyle = rg;
  groundQuad(ctx, -ROAD, ROAD, NEAR, VIEW);
  ctx.fill();
  // sidewalks
  ctx.fillStyle = night ? "#3b3c44" : "#a9a497";
  groundQuad(ctx, -WALK, -ROAD, NEAR, VIEW, 0.15);
  ctx.fill();
  groundQuad(ctx, ROAD, WALK, NEAR, VIEW, 0.15);
  ctx.fill();
  // kerb faces with alternating paint (speed cue)
  for (const side of [-1, 1]) {
    repeat(scroll, 2, 70, (z, i) => {
      ctx.globalAlpha = fogA(z);
      sideQuad(ctx, side * ROAD, 0, 0.15, z, z + 1);
      ctx.fillStyle = i % 2 ? "#f0eee6" : "#1d1d1f";
      ctx.fill();
    });
  }
  ctx.globalAlpha = 1;

  // zebra crossings every 120 m
  repeat(scroll, 120, FAR, (z) => {
    ctx.globalAlpha = fogA(z) * (night ? 0.6 : 0.9);
    ctx.fillStyle = "#f2f0e6";
    for (let x = -ROAD + 0.2; x < ROAD - 0.4; x += 0.8) {
      groundQuad(ctx, x, x + 0.45, z, z + 3, 0.004);
      ctx.fill();
    }
  });
  // manholes
  repeat(scroll, 37, FAR, (z, i) => {
    const x = (Math.floor(hash(i) * 3) - 1) * 2.2 + 0.6;
    const p = project(x, 0.004, z);
    ctx.globalAlpha = fogA(z);
    ctx.fillStyle = "#2a2a2e";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 0.35 * p.s, 0.35 * p.s * Math.max(0.12, (cam.y / Math.max(1, p.d)) * 0.9), 0, 0, Math.PI * 2);
    ctx.fill();
  });
  // lane paint
  ctx.fillStyle = night ? "rgba(225,225,210,0.7)" : "rgba(250,248,235,0.92)";
  for (const lx of [-1.1, 1.1]) {
    repeat(scroll, 4, FAR, (z) => {
      ctx.globalAlpha = fogA(z);
      groundQuad(ctx, lx - 0.07, lx + 0.07, z, z + 2, 0.005);
      ctx.fill();
    });
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#e8c23a";
  for (const ex of [-ROAD + 0.15, ROAD - 0.15]) {
    groundQuad(ctx, ex - 0.06, ex + 0.06, NEAR, VIEW, 0.005);
    ctx.fill();
  }

  // metro viaduct overhead
  if (seg === "metro") {
    repeat(scroll, 26, FAR + 20, (z) => {
      ctx.globalAlpha = fogA(z);
      for (const side of [-1, 1])
        drawBox(ctx, side * 6.2 - 0.5, side * 6.2 + 0.5, 0, 7, z, z + 1, { front: "#8a5bb0", top: "#a57cc8", side: "#6c4390", lw: 1 }, cam.x, cam.y);
      drawBox(ctx, -7, 7, 7, 8.2, z - 0.5, z + 1.5, { front: "#b9b3c2", top: "#d6d1dd", side: "#8d8796", lw: 1 }, cam.x, cam.y);
    });
    ctx.globalAlpha = 1;
  }

  // facades on both sides
  for (const side of [-1, 1]) {
    repeat(scroll, 9, FAR + 20, (z, i) => {
      const k = i * 2 + (side > 0 ? 1 : 0);
      const h = 6 + hash(k) * 7;
      const X = side * WALK;
      ctx.globalAlpha = fogA(z);
      sideQuad(ctx, X, 0.15, h, z, z + 9);
      ctx.fillStyle = FACADE_COLS[k % FACADE_COLS.length];
      if (night) ctx.fillStyle = "#3a3640";
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.lineWidth = 1;
      ctx.stroke();
      // shop shutter + sign
      sideQuad(ctx, X - side * 0.01, 0.15, 2.6, z + 1, z + 8);
      ctx.fillStyle = night ? "#55505e" : "#7c7468";
      ctx.fill();
      sideQuad(ctx, X - side * 0.02, 2.8, 3.6, z + 0.8, z + 8.2);
      ctx.fillStyle = SIGN_COLS[k % SIGN_COLS.length];
      ctx.fill();
      // windows
      ctx.fillStyle = night ? (k % 3 ? "rgba(255,214,120,0.85)" : "rgba(40,40,60,0.8)") : "rgba(70,95,110,0.6)";
      for (let wy = 4.3; wy < h - 1; wy += 2.2) {
        for (let wz = 1.5; wz < 8; wz += 2.6) {
          sideQuad(ctx, X - side * 0.02, wy, wy + 1.2, z + wz, z + wz + 1.2);
          ctx.fill();
        }
      }
    });
  }
  ctx.globalAlpha = 1;

  // roadside trees / lamps
  for (const side of [-1, 1]) {
    repeat(scroll, seg === "avenue" ? 11 : 22, FAR + 10, (z, i) => {
      const X = side * 6;
      const base = project(X, 0.15, z);
      const top = project(X, 3.2, z);
      ctx.globalAlpha = fogA(z);
      ctx.strokeStyle = "#5a3f2a";
      ctx.lineWidth = Math.max(1, 0.25 * base.s);
      ctx.beginPath();
      ctx.moveTo(base.x, base.y);
      ctx.lineTo(top.x, top.y);
      ctx.stroke();
      const r = (seg === "avenue" ? 2.6 : 1.8) * top.s;
      ctx.fillStyle = night ? "#1f3a24" : i % 2 ? "#3f7a3a" : "#4d8a40";
      ctx.beginPath();
      ctx.arc(top.x, top.y - r * 0.4, r, 0, Math.PI * 2);
      ctx.arc(top.x - side * r * 0.6, top.y, r * 0.7, 0, Math.PI * 2);
      ctx.fill();
      if (night) {
        const l = project(X - side * 0.8, 5, z);
        const gl = ctx.createRadialGradient(l.x, l.y, 1, l.x, l.y, 1.5 * l.s);
        gl.addColorStop(0, "rgba(255,220,140,0.8)");
        gl.addColorStop(1, "rgba(255,220,140,0)");
        ctx.fillStyle = gl;
        ctx.fillRect(l.x - 1.5 * l.s, l.y - 1.5 * l.s, 3 * l.s, 3 * l.s);
      }
    });
  }
  ctx.globalAlpha = 1;

  if (phase === "night") {
    // rain streaks
    ctx.strokeStyle = "rgba(180,200,230,0.35)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 50; i++) {
      const x = (i * 73 + t * 40) % VW;
      const y = (i * 151 + t * 900) % VH;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 4, y + 16);
      ctx.stroke();
    }
  }
}

/** Generic ground under the tree stage is the photo; nothing extra needed. */
export { frontQuad };
