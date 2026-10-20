/**
 * ALL gameplay tuning numbers, in real-world units (metres, seconds, degrees).
 * The world: x = sideways (lanes), y = height above the ground, z = metres ahead of Fathu (Fathu is at z = 0).
 */
export const TUNING = {
  /* ---------- speed ---------- */
  /** Speed at the start of a run (m/s). */
  baseSpeed: 16,
  /** Top speed (m/s), reached after rampTime with an ease-out. */
  maxSpeed: 38,
  /** Seconds to ramp from baseSpeed to maxSpeed. */
  rampTime: 150,
  /** Stage 1 (corridor) runs at this fraction of the speed curve. */
  stage1SpeedFactor: 0.7,
  /** Stage 2 (tree descent) speed factor. */
  stage2SpeedFactor: 0.8,

  /* ---------- lanes & player ---------- */
  /** Distance between lane centres (m). Lanes are at -laneWidth, 0, +laneWidth. */
  laneWidth: 2.2,
  /** Lane change duration (s), ease-out. */
  laneChangeTime: 0.11,
  /** Fathu's standing height (m) — also his hitbox height. */
  playerHeight: 1.95,
  /** Half-width of Fathu's hitbox (m). */
  playerHalfWidth: 0.32,
  /** Half-depth of Fathu's hitbox along z (m). */
  playerHalfDepth: 0.5,
  /** Hitbox height while ducking (m). */
  duckHeight: 0.8,

  /* ---------- jump & duck ---------- */
  /** Jump apex height (m). */
  jumpHeight: 1.8,
  /** Airtime at base speed (s). */
  airTime: 0.62,
  /** Distance a jump covers at high speed (m); airtime shrinks to keep this constant. */
  jumpDistance: 9.9,
  /** Never shorten the airtime below this (s), so the jump never feels like a twitch. */
  minAirTime: 0.36,
  /** Anticipation crouch before takeoff (s). */
  jumpAnticipation: 0.08,
  /** Landing recovery (s). */
  landTime: 0.12,
  /** Duck length for a swipe (s). */
  duckTime: 0.6,
  /** Minimum duck length when a key is held (s). */
  duckMinTime: 0.45,
  /** Swipes during a jump/landing are queued for this long (s). */
  inputBuffer: 0.15,

  /* ---------- camera ---------- */
  /** Camera height above the ground (m). */
  cameraHeight: 3.0,
  /** Camera distance behind Fathu (m). */
  cameraDistance: 5.0,
  /** Vertical field of view at base speed (deg). */
  fov: 62,
  /** Extra FOV at top speed (deg). */
  fovBoost: 6,
  /** Horizon line as a fraction of the screen height. */
  horizon: 0.36,
  /** How much the camera follows Fathu sideways (0..1). */
  cameraFollow: 0.72,
  /** Extra sideways sway toward a new lane (m). */
  cameraSway: 0.4,
  /** Vertical camera bob while running (m). */
  cameraBob: 0.035,
  /** Speed lines appear above this speed (m/s). */
  speedLinesFrom: 28,

  /* ---------- spawning & warnings ---------- */
  /** Objects spawn at this distance ahead (m). */
  spawnDistance: 95,
  /** Objects are fully faded in at this distance (m). */
  fadeInEnd: 75,
  /** Never spawn closer than this (m). */
  noSpawnZone: 12,
  /** Minimum empty gap between chunks (m). */
  chunkGap: 12,
  /** Lane chevron glows from this distance (m). */
  warnDistance: 25,
  /** Action arrow pulses during the last N metres. */
  arrowDistance: 18,
  /** Seconds of easy, single-lane obstacles at the start. */
  easyTime: 10,
  /** Ideal take-off ring is shown for this many seconds of a run. */
  jumpRingTime: 60,

  /* ---------- hits ---------- */
  /** Invulnerability after a hit (s). */
  invulnTime: 1.5,
  /** Near-miss bonus when passing within this gap (m). */
  nearMiss: 0.3,
  /** Hit stop slow-motion only on the final hit. */
  deathSlowMo: 0.25,
};

/** Per-kind obstacle footprints (metres). len = along z, w = across, y0..y1 = solid height range. */
export const OB_DIMS = {
  jumpLow: { len: 1.0, w: 1.8, y0: 0, y1: 0.7 },
  jumpFiles: { len: 1.2, w: 1.8, y0: 0, y1: 0.7 },
  pothole: { len: 1.4, w: 1.9, y0: 0, y1: 0.35 },
  barrier: { len: 2.5, w: 1.9, y0: 0, y1: 0.75 },
  gate: { len: 0.6, w: 2.1, y0: 1.0, y1: 1.45 },
  tall: { len: 1.2, w: 1.8, y0: 0, y1: 2.4 },
  vehicle: { len: 3.2, w: 1.9, y0: 0, y1: 2.1 },
  bus: { len: 9, w: 2.6, y0: 0, y1: 3.3 },
} as const;
