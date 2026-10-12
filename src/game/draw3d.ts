/** Small helpers for drawing world-space (metre) geometry through the shared camera. */
import { project, type Projected } from "./proj";

export function poly(ctx: CanvasRenderingContext2D, pts: Projected[]) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

/** Flat quad on a horizontal plane at height y. */
export function groundQuad(ctx: CanvasRenderingContext2D, x0: number, x1: number, z0: number, z1: number, y = 0) {
  poly(ctx, [project(x0, y, z0), project(x1, y, z0), project(x1, y, z1), project(x0, y, z1)]);
}

/** Vertical quad facing sideways (constant x). */
export function sideQuad(ctx: CanvasRenderingContext2D, x: number, y0: number, y1: number, z0: number, z1: number) {
  poly(ctx, [project(x, y0, z0), project(x, y0, z1), project(x, y1, z1), project(x, y1, z0)]);
}

/** Vertical quad facing the camera (constant z). */
export function frontQuad(ctx: CanvasRenderingContext2D, x0: number, x1: number, y0: number, y1: number, z: number) {
  poly(ctx, [project(x0, y0, z), project(x1, y0, z), project(x1, y1, z), project(x0, y1, z)]);
}

export interface BoxStyle {
  front: string;
  top: string;
  side: string;
  outline?: string;
  lw?: number;
}

/**
 * Solid box between the given world bounds. Draws the faces visible from the camera
 * (side, top, front) with a bold outline.
 */
export function drawBox(
  ctx: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
  st: BoxStyle,
  camX: number,
  camY: number,
) {
  const near = project((x0 + x1) / 2, (y0 + y1) / 2, z0);
  const lw = st.lw ?? Math.max(1.2, Math.min(3.5, near.s * 0.035));
  ctx.lineJoin = "round";
  ctx.lineWidth = lw;
  ctx.strokeStyle = st.outline ?? "#16110c";
  // side face
  if (x1 < camX) {
    sideQuad(ctx, x1, y0, y1, z0, z1);
    ctx.fillStyle = st.side;
    ctx.fill();
    ctx.stroke();
  } else if (x0 > camX) {
    sideQuad(ctx, x0, y0, y1, z0, z1);
    ctx.fillStyle = st.side;
    ctx.fill();
    ctx.stroke();
  }
  // top
  if (y1 < camY) {
    groundQuad(ctx, x0, x1, z0, z1, y1);
    ctx.fillStyle = st.top;
    ctx.fill();
    ctx.stroke();
  } else if (y0 > camY) {
    groundQuad(ctx, x0, x1, z0, z1, y0);
    ctx.fillStyle = st.side;
    ctx.fill();
    ctx.stroke();
  }
  // front
  frontQuad(ctx, x0, x1, y0, y1, z0);
  ctx.fillStyle = st.front;
  ctx.fill();
  ctx.stroke();
}

/** Deterministic hash 0..1 for repeating scenery. */
export function hash(i: number) {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}
