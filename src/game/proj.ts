/**
 * ONE shared pinhole camera. Every renderer (ground, obstacles, pickups, shadows,
 * warnings, debug hitboxes, Fathu) projects world points through project().
 * World units are metres; z = metres ahead of Fathu (Fathu stands at z = 0).
 */
import { TUNING } from "@/config/tuning";

export const VW = 390;
export const VH = 844;
export const CX = VW / 2;
export const HORIZON = Math.round(VH * TUNING.horizon);
export const LANE_X = [-TUNING.laneWidth, 0, TUNING.laneWidth];
export const FAR = TUNING.spawnDistance;

const DEG = Math.PI / 180;

/** Camera state; the engine updates it once per rendered frame. */
export const cam = {
  x: 0,
  y: TUNING.cameraHeight,
  back: TUNING.cameraDistance,
  fovDeg: TUNING.fov,
  // derived
  f: 0,
  cy: 0,
  cos: 1,
  sin: 0,
};

function derive() {
  cam.f = VH / 2 / Math.tan((cam.fovDeg * DEG) / 2);
  // pitch chosen so that the horizon sits at TUNING.horizon of the screen
  const tanP = (VH / 2 - HORIZON) / cam.f;
  const p = Math.atan(tanP);
  cam.cos = Math.cos(p);
  cam.sin = Math.sin(p);
  cam.cy = VH / 2;
}
derive();

export function setCamera(x: number, yOffset: number, fovDeg: number) {
  cam.x = x;
  cam.y = TUNING.cameraHeight + yOffset;
  cam.fovDeg = fovDeg;
  derive();
}

export interface Projected {
  x: number;
  y: number;
  /** screen pixels per metre at this depth */
  s: number;
  /** camera-space depth (m); <= 0.2 means behind / too close */
  d: number;
}

/** Screen position of a world point (metres). */
export function project(x: number, y: number, z: number): Projected {
  const dx = x - cam.x;
  const dy = y - cam.y;
  const dz = z + cam.back;
  const depth = Math.max(0.2, dz * cam.cos - dy * cam.sin);
  const up = dy * cam.cos + dz * cam.sin;
  const s = cam.f / depth;
  return { x: CX + dx * s, y: cam.cy - up * s, s, d: depth };
}

/** Screen y of the ground at Fathu's feet with the default camera. */
export const GROUND_Y = (() => {
  return project(0, 0, 0).y;
})();
