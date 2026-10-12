/**
 * Fathu's poses, seen from BEHIND. Forward/back limb motion is shown as
 * FORESHORTENING (shorter scaleY + vertical shift), never as sideways rotation.
 *
 * Units: rotations in radians (legs <= 0.07 = 4deg, arms <= 0.35 = 20deg),
 * scales are fractions (1 = full length), translations in source-image pixels
 * (the cutout is 512 px tall; negative = up).
 *
 * Each named pose only lists what differs from standing. Tune freely.
 */
import type { Pose } from "@/game/rig";

export type PoseSet = Partial<Pose>;

/** Hard limits applied to every back-view pose. */
export const ANIM_LIMITS = {
  legRot: 0.07,
  armRot: 0.35,
  bodyRot: 0.105,
};

/** Run cycle amplitudes (multiplied by the step phase). */
export const RUN_CYCLE = {
  /** Steps per second at base speed; scales with speed. */
  cadence: 3.2,
  shinLift: 0.42, // lifting shin scaleY goes 1 -> 0.58
  thighLift: 0.08, // thigh 1 -> 0.92
  bootRaise: 22, // px the lifting boot rises (~10% of leg)
  bootShrink: 0.1, // lifting boot gets narrower (sole toward camera)
  hipBob: 14, // px (about 3% of height)
  hipRock: 0.035, // rad (2deg)
  armSwing: 0.18, // rad max (12deg)
  forearmShorten: 0.4, // forward forearm scaleY 1 -> 0.6
  forearmRaise: 22, // px the forward forearm rises
  torsoShear: 0.045, // ~2.5deg twist as horizontal shear
  torsoBob: 0.015,
};

export const POSES = {
  stand: {},
  /** 80 ms before take-off: whole rig lowers, shins + torso compress, arms drop. */
  anticipation: {
    shSYL: 0.7, shSYR: 0.7, thSYL: 0.94, thSYR: 0.94,
    torsoSY: 0.92, headDY: 4,
    uaL: 0.02, uaR: -0.02, faSYL: 1, faSYR: 1, faDYL: 4, faDYR: 4,
  },
  /** First 100 ms of air: fast vertical stretch. */
  takeoff: {
    thSYL: 1.08, thSYR: 1.08, shSYL: 1.08, shSYR: 1.08,
    torsoSY: 1.04, faSYL: 0.85, faSYR: 0.85, faDYL: -10, faDYR: -10,
  },
  /** Tucked: knees forward (foreshortened shins), boots up and smaller, arms close. */
  air: {
    thSYL: 0.8, thSYR: 0.8, shSYL: 0.6, shSYR: 0.62,
    shSXL: 0.84, shSXR: 0.84, liftL: 30, liftR: 26,
    hipSX: 0.96, torsoSY: 0.94, headDY: 5,
    uaL: 0.12, uaR: -0.12, uaSYL: 0.86, uaSYR: 0.86,
    faSYL: 0.55, faSYR: 0.55, faDYL: -34, faDYR: -34,
  },
  /** Touch-down, recovers over 120 ms. */
  land: {
    thSYL: 0.78, thSYR: 0.78, shSYL: 0.76, shSYR: 0.76,
    torsoSY: 0.95, headDY: 4, faDYL: -8, faDYR: -8, faSYL: 0.85, faSYR: 0.85,
  },
  /** Forward crouch seen from behind — no frog split. */
  duck: {
    torsoSY: 0.6, headDY: 40, headS: 0.9,
    thSYL: 0.45, thSYR: 0.45, shSYL: 0.5, shSYR: 0.5,
    thL: 0.09, thR: -0.09, shL: -0.1, shR: 0.1,
    hipSX: 1.02,
    uaL: -0.14, uaR: 0.14, uaSYL: 0.62, uaSYR: 0.62,
    faSYL: 0.42, faSYR: 0.42, faDYL: -24, faDYR: -24,
  },
  /** Hit stagger — arms up a little, never a T-pose. */
  hit: {
    torsoSY: 1.04, headDY: -4,
    uaL: 0.3, uaR: -0.3, faSYL: 0.6, faSYR: 0.6, faDYL: -30, faDYR: -30,
  },
} satisfies Record<string, PoseSet>;

/** Transition timings (s). */
export const ANIM_TIMES = {
  blend: 0.08,
  duckIn: 0.09,
  duckOut: 0.11,
  takeoff: 0.1,
};
