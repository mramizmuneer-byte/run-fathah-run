import { buildLayers, drawLayered, lRun, lSet, lMix, LPOSES, lStand, type Layers, type LPose } from "@/game/layered";
import {
  BOSSES,
  CATCHPHRASE_COMBOS,
  CATCHPHRASE_MEEK,
  CATCHPHRASE_RATE,
  CATCHPHRASE_SHOUT,
  DUET,
  GOLDEN_BUBBLE_RATE,
  SHARED_LINES,
} from "@/config/bosses";
import {
  BOSS_VEHICLE_AT,
  CLEAN_RUN_RECOVER_SECONDS,
  EASTER_EGG,
  FLASHLIGHT_SECONDS,
  LEAP,
  MILESTONES,
  MILESTONES_EXTRA,
  PHONE_CALLS,
  SCORING,
  SHIELD_SECONDS,
  STAGE1_LENGTH,
  STAGE2_LENGTH,
} from "@/config/game";
import turnSheetAsset from "@/assets/fathu-turn-sheet.png.asset.json";
import { BACK_RIG, FRONT_RIG, LAYER_RIG, OPTIONAL_FRAMES, RIG_BLEND_TAU, FRAME_SCALE } from "@/config/rig";
import { TUNING as T } from "@/config/tuning";
import { audio } from "./audio";
import { circle, drawBossPlaceholder, drawNameTag, roundRect } from "./bossArt";
import { groundQuad, poly } from "./draw3d";
import { OB_LOOK, drawObShadow, drawObstacle3D, type ObBox, type ObCat } from "./obstacles3d";
import { backdrop } from "./photos";
import { type ColKind, type ObKind, drawCollectible } from "./props";
import { CX, FAR, HORIZON, LANE_X, VH, VW, cam, project, setCamera } from "./proj";
import {
  basePose,
  blendPose,
  buildRig,
  clampBackPose,
  drawRig,
  drawRigTinted,
  fromSet,
  mixPose,
  poseAir,
  poseAnticipation,
  poseDuck,
  poseHit,
  poseIdleFront,
  poseLand,
  poseRun,
  poseTakeoff,
  type Pose,
  type Rig,
} from "./rig";
import { POSES } from "@/config/anim";
import { ROAD_SEGMENTS, type RoadSegment, SEGMENT_LABELS, drawNameplate, drawTreeCanopy } from "./scenery";
import { loadFathu, loadSprite, type Sprite } from "./sprites";
import { drawCorridorWorld, drawDeadEndWorld, drawRoadWorld } from "./world";

const TURN_FRAMES = 32;
const TURN_LEN = 1.3;
const INTRO_LEN = TURN_LEN + 0.5;

export type Phase =
  | "home"
  | "intro"
  | "countdown"
  | "run1"
  | "leapPrompt"
  | "leapCinematic"
  | "run2"
  | "landing"
  | "run3"
  | "dying"
  | "over";

export interface PublicState {
  phase: Phase;
  paused: boolean;
  distance: number;
  best: number;
  newBest: boolean;
  coins: number;
  letters: number;
  score: number;
  lives: number;
  chase: number;
  dnd: boolean;
  shield: number;
  torch: number;
  count: number;
  segment: string;
  stage: number;
  hints: boolean;
}

export type Action = "left" | "right" | "jump" | "slide" | "tap";

type Anim = "RUN" | "JUMP_START" | "AIR" | "LAND" | "DUCK_START" | "DUCK" | "DUCK_END" | "HIT";

interface Obstacle extends ObBox {
  active: boolean;
  kind: ObKind;
  cat: ObCat;
  lane: number;
  span: number;
  len: number;
  warned: boolean;
  hit: boolean;
  minGap: number;
  seen: boolean;
}
interface Collectible {
  active: boolean;
  z: number;
  lane: number;
  h: number;
  kind: ColKind;
  seed: number;
}
interface Pending {
  z: number;
  ob?: { kind: ObKind; lane: number; span: number };
  col?: { kind: ColKind; lane: number; h: number };
}
interface Particle {
  active: boolean;
  kind: "dot" | "dust" | "ring" | "spark";
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  life: number;
  max: number;
  col: string;
  size: number;
}
interface Popup {
  active: boolean;
  text: string;
  x: number;
  y: number;
  life: number;
  col: string;
  size: number;
}
interface Bubble {
  text: string;
  boss: number;
  golden: boolean;
  big: boolean;
  life: number;
  max: number;
}
interface Toast {
  text: string;
  life: number;
  max: number;
  gold: boolean;
}

const BEST_KEY = "fathu-escape-best";
const HINTS_KEY = "fathu-escape-hints";
/** Boss scale per chase step: far, near, about to catch. */
const BOSS_STEPS = [0.85, 1.0, 1.18];
/** Who chases at a distance: 0 = Murali only, 1 = Sumeet only, 2 = both. Cycles every 3000 m. */
export function crewAt(distance: number): 0 | 1 | 2 {
  return (Math.floor(Math.max(0, distance) / 1000) % 3) as 0 | 1 | 2;
}
function crewHas(crew: number, boss: number) {
  return crew === 2 || crew === boss;
}
const CREW_LINES: Record<0 | 1 | 2, { boss: number; text: string; toast: string }> = {
  0: { boss: 0, text: "Rest, Sumeet. My turn!", toast: "Sumeet takes a break. Murali is back!" },
  1: { boss: 1, text: "Move aside!", toast: "Sumeet takes over. Murali goes to rest!" },
  2: { boss: 0, text: "Wait for me!", toast: "Murali is back. Both bosses are chasing!" },
};
/** On-screen height (px at scale 1) of real boss photos — matches Fathu (~290px). */
const BOSS_PHOTO_HEIGHT = 300;

function rnd(n: number) {
  return Math.floor(Math.random() * n);
}
function pick<T>(a: T[]): T {
  return a[rnd(a.length)];
}
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
const smooth = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

/* stage obstacle pools, by action */
const POOLS: Record<number, { jump: ObKind[]; block: ObKind[]; slide: ObKind[] }> = {
  1: { jump: ["files", "gst", "notice", "calculator", "plant"], block: ["chair", "trolley", "ac"], slide: ["pipe", "email", "plane"] },
  2: { jump: [], block: ["branch", "crow"], slide: ["vine"] },
  3: {
    jump: ["pothole", "breaker"],
    block: ["auto", "scooter", "cow", "dog", "rider", "cart", "walker"],
    slide: ["cable"],
  },
};

type ChunkItem =
  | { t: "ob"; a: "jump" | "block" | "slide" | "bus"; lane: number; dz: number; span?: number }
  | { t: "coins"; lane: number; dz: number; n: number; arc?: boolean; low?: boolean }
  | { t: "special"; lane: number; dz: number };

/** Hand-designed chunks, 20–30 m long. Lanes 0..2. Every chunk leaves a safe path. */
function makeChunk(stage: number, easy: boolean): { items: ChunkItem[]; len: number } {
  const L = rnd(3);
  const o = (L + 1 + rnd(2)) % 3;
  const free = [0, 1, 2].filter((x) => x !== L && x !== o)[0];
  const tree = stage === 2;
  const options: (() => { items: ChunkItem[]; len: number })[] = [];

  // (a) low box with a coin arc over it — jump
  if (!tree)
    options.push(() => ({
      items: [
        { t: "ob", a: "jump", lane: L, dz: 12 },
        { t: "coins", lane: L, dz: 12 - 4.5, n: 7, arc: true },
      ],
      len: 22,
    }));
  // (e) tall block — change lane
  options.push(() => ({
    items: [
      { t: "ob", a: "block", lane: L, dz: 10 },
      { t: "coins", lane: o, dz: 4, n: 6 },
    ],
    len: 20,
  }));
  // (f) rest: coin line + special
  options.push(() => ({
    items: [
      { t: "coins", lane: L, dz: 2, n: 8 },
      { t: "special", lane: L, dz: 20 },
    ],
    len: 24,
  }));
  if (!easy) {
    // (b) long barrier across two lanes, one free lane
    if (!tree)
      options.push(() => {
        const start = rnd(2);
        const fr = start === 0 ? 2 : 0;
        return {
          items: [
            { t: "ob", a: "jump", lane: start, dz: 12, span: 2 },
            { t: "coins", lane: fr, dz: 6, n: 6 },
          ],
          len: 24,
        };
      });
    // (c) duck gate across all three lanes
    options.push(() => ({
      items: [
        { t: "ob", a: "slide", lane: 0, dz: 12 },
        { t: "ob", a: "slide", lane: 1, dz: 12 },
        { t: "ob", a: "slide", lane: 2, dz: 12 },
        { t: "coins", lane: 1, dz: 8, n: 5, low: true },
      ],
      len: 22,
    }));
    // (d) slalom of alternating blocked lanes
    options.push(() => {
      const f1 = rnd(3);
      const f2 = (f1 + 1 + rnd(2)) % 3;
      const it: ChunkItem[] = [];
      for (const l of [0, 1, 2]) if (l !== f1) it.push({ t: "ob", a: "block", lane: l, dz: 6 });
      for (const l of [0, 1, 2]) if (l !== f2) it.push({ t: "ob", a: "block", lane: l, dz: 22 });
      it.push({ t: "coins", lane: f1, dz: 2, n: 4 });
      it.push({ t: "coins", lane: f2, dz: 17, n: 4 });
      return { items: it, len: 30 };
    });
    // (g) mixed — jump one lane, block another, free third
    if (!tree)
      options.push(() => ({
        items: [
          { t: "ob", a: "jump", lane: L, dz: 12 },
          { t: "ob", a: "block", lane: o, dz: 12 },
          { t: "coins", lane: free, dz: 6, n: 5 },
          { t: "special", lane: free, dz: 20 },
        ],
        len: 24,
      }));
    // the bus (stage 3) — two lanes, one free
    if (stage === 3)
      options.push(() => {
        const start = rnd(2);
        const fr = start === 0 ? 2 : 0;
        return {
          items: [
            { t: "ob", a: "bus", lane: start, dz: 10, span: 2 },
            { t: "coins", lane: fr, dz: 6, n: 7 },
          ],
          len: 26,
        };
      });
  }
  return pick(options)();
}

function readFlags() {
  const none = { stage: 1, god: false, debug: false, pose: "", speed: 1 };
  if (typeof window === "undefined") return none;
  const q = new URLSearchParams(window.location.search);
  const st = Number(q.get("stage"));
  const sp = Number(q.get("speed"));
  const pose = q.get("pose") ?? "";
  return {
    stage: st === 2 || st === 3 ? st : 1,
    god: q.get("god") === "1" || !!pose,
    debug: q.get("debug") === "1",
    pose: ["run", "jump", "duck", "land"].includes(pose) ? pose : "",
    speed: sp > 0 && sp < 5 ? sp : 1,
  };
}

export class Engine {
  private ctx: CanvasRenderingContext2D;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private alpha = 0;
  private running = false;
  private flags = readFlags();
  private fps = 60;

  private fathu: { back: Sprite; side: Sprite; front: Sprite };
  private rigBack: Rig | null = null;
  private layers: Layers | null = null;
  private rigFront: Rig | null = null;
  private rigBackReal = false;
  private rigFrontReal = false;
  private frames: { run: Sprite[] | null; jump: Sprite[] | null; slide: Sprite[] | null } = { run: null, jump: null, slide: null };
  private bossSprites: (Sprite | null)[] = [];
  private bossRun: (Sprite[] | null)[] = [];
  private vignette: HTMLCanvasElement | null = null;

  // world
  t = 0;
  phase: Phase = "home";
  paused = false;
  timeScale = 1;
  distance = 0;
  prevDistance = 0;
  stageDist = 0;
  runTime = 0;
  scroll = 0;
  prevScroll = 0;
  speed: number = T.baseSpeed;
  best = 0;
  newBest = false;
  coins = 0;
  letters = 0;
  score = 0;
  startStage = 1;
  hints = true;

  // player (metres)
  lane = 1;
  laneFrom = 1;
  laneT = 1;
  laneX = 0;
  prevLaneX = 0;
  lean = 0;
  leanDir = 0;
  sway = 0;
  anim: Anim = "RUN";
  animT = 0;
  airborne = false;
  jumpT = 0;
  airT: number = T.airTime;
  jumpBuffer = 0;
  laneBuffer = 0;
  laneBufferDir = 0;
  yUp = 0;
  prevYUp = 0;
  duckHeld = false;
  duckTouch = false;
  duckTime = 0;
  duckAmt = 0;
  phi = 0;
  runFrameT = 0;
  pose: Pose = basePose();
  flash = 0;

  // power-ups
  dndShield = false;
  paaShield = 0;
  flashlight = 0;
  iFrames = 0;

  // bosses
  hits = 0;
  chaseVis = 0;
  cleanTimer = 0;
  bossIntro = 0;
  bubble: Bubble | null = null;
  bubbleTimer = 2.2;
  bubbleTurn = 0;
  /** 0..1 on-screen presence per boss (slides in/out on crew changes). */
  bossPres = [1, 0];
  crew = 0;
  phoneCall = 0;
  phoneText = "";

  // flow
  leapMeter = 0;
  leapDir = 1;
  leapResult: "good" | "bad" | null = null;
  cineT = 0;
  introT = 0;
  private turnSheet: Sprite = loadSprite(turnSheetAsset.url);
  countT = 0;
  dyingT = 0;
  segment: RoadSegment = "avenue";
  segmentUntil = 0;
  nextMilestone = 500;
  milestoneIdx = 0;
  tutorial = { jump: false, slide: false, block: false };
  tutText = "";
  tutLife = 0;

  // camera + juice
  shake = 0;
  bump = 0;
  speedBurst = 0;
  fade = 0;
  toast: Toast | null = null;
  stampAnim = 0;
  private emitT = 0;
  private lastPhase: Phase = "home";

  private obstacles: Obstacle[] = [];
  private collects: Collectible[] = [];
  private pending: Pending[] = [];
  private particles: Particle[] = [];
  private popups: Popup[] = [];
  private nextChunkZ = 0;
  private dust: { x: number; y: number; r: number; a: number }[] = [];

  constructor(
    private canvas: HTMLCanvasElement,
    private onState: (s: PublicState) => void,
  ) {
    const c = canvas.getContext("2d");
    if (!c) throw new Error("no 2d context");
    this.ctx = c;

    for (let i = 0; i < 40; i++)
      this.obstacles.push({
        active: false, kind: "files", cat: "jump", lane: 1, span: 1, len: 1,
        x0: 0, x1: 0, y0: 0, y1: 0, z0: 0, z1: 0, warned: false, hit: false, minGap: 9, seen: false,
      });
    for (let i = 0; i < 90; i++) this.collects.push({ active: false, z: 0, lane: 1, h: 0.5, kind: "coin", seed: 0 });
    for (let i = 0; i < 160; i++)
      this.particles.push({ active: false, kind: "dot", x: 0, y: 0, vx: 0, vy: 0, g: 0, life: 0, max: 1, col: "#fff", size: 3 });
    for (let i = 0; i < 12; i++) this.popups.push({ active: false, text: "", x: 0, y: 0, life: 0, col: "#fff", size: 18 });
    for (let i = 0; i < 26; i++)
      this.dust.push({ x: Math.random() * VW, y: Math.random() * VH, r: 0.6 + Math.random() * 1.8, a: Math.random() * 6 });

    this.fathu = loadFathu();
    this.bossSprites = BOSSES.map((b) => (b.images.chase ? loadSprite(b.images.chase) : null));
    this.bossRun = BOSSES.map((b) => (b.runFrames && b.runFrames.length ? b.runFrames.map((u) => loadSprite(u)) : null));
    this.rigBack = buildRig(BACK_RIG, null, false);
    this.rigFront = buildRig(FRONT_RIG, null, true);
    this.tryOptionalFrames();
    this.buildVignette();

    try {
      this.best = Number(localStorage.getItem(BEST_KEY) || 0) || 0;
      this.hints = localStorage.getItem(HINTS_KEY) !== "0";
    } catch {
      this.best = 0;
    }
  }

  private tryOptionalFrames() {
    if (typeof window === "undefined") return;
    (["run", "jump", "slide"] as const).forEach((k) => {
      const probe = new Image();
      probe.onload = () => {
        this.frames[k] = OPTIONAL_FRAMES[k].map((u) => loadSprite(u));
      };
      probe.onerror = () => {
        /* no custom frames — the rig is used */
      };
      probe.src = OPTIONAL_FRAMES[k][0];
    });
  }

  private buildVignette() {
    if (typeof document === "undefined") return;
    const v = document.createElement("canvas");
    v.width = VW;
    v.height = VH;
    const c = v.getContext("2d");
    if (!c) return;
    const g = c.createRadialGradient(CX, VH * 0.55, VH * 0.3, CX, VH * 0.55, VH * 0.75);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(20,8,0,0.5)");
    c.fillStyle = g;
    c.fillRect(0, 0, VW, VH);
    const w = c.createLinearGradient(0, 0, 0, VH);
    w.addColorStop(0, "rgba(255,180,100,0.06)");
    w.addColorStop(1, "rgba(120,60,20,0.06)");
    c.fillStyle = w;
    c.fillRect(0, 0, VW, VH);
    this.vignette = v;
  }

  private ensureRigs() {
    if (!this.rigBackReal && this.fathu.back.ready && this.fathu.back.img) {
      this.rigBack = buildRig(BACK_RIG, this.fathu.back.img, false) ?? this.rigBack;
      this.rigBackReal = true;
      this.layers = buildLayers(this.fathu.back.img);
    }
    if (!this.rigFrontReal && this.fathu.front.ready && this.fathu.front.img) {
      this.rigFront = buildRig(FRONT_RIG, this.fathu.front.img, true) ?? this.rigFront;
      this.rigFrontReal = true;
    }
  }

  /* ---------------- lifecycle ---------------- */

  mount() {
    this.running = true;
    this.last = performance.now();
    this.loop();
    this.emit(true);
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  play() {
    audio.unlock();
    if (this.phase !== "home") return;
    this.phase = "intro";
    this.introT = 0;
    audio.play("whoosh");
    this.emit(true);
  }

  retry() {
    audio.unlock();
    this.resetRun();
    this.phase = "countdown";
    this.countT = 0;
    this.paused = false;
    this.emit(true);
  }

  goHome() {
    this.paused = false;
    this.phase = "home";
    this.timeScale = 1;
    this.fade = 1;
    this.emit(true);
  }

  pause() {
    if (this.isPlayable() || this.phase === "countdown" || this.phase === "leapPrompt") {
      this.paused = true;
      this.emit(true);
    }
  }
  resume() {
    this.paused = false;
    this.last = performance.now();
    this.emit(true);
  }
  setHints(on: boolean) {
    this.hints = on;
    try {
      localStorage.setItem(HINTS_KEY, on ? "1" : "0");
    } catch {
      /* ignore */
    }
    this.emit(true);
  }

  private clearWorld() {
    for (const o of this.obstacles) o.active = false;
    for (const c of this.collects) c.active = false;
    this.pending.length = 0;
    this.nextChunkZ = 40;
  }

  private resetRun() {
    this.t = 0;
    this.distance = this.prevDistance = 0;
    this.bossPres = [1, 0];
    this.crew = 0;
    this.stageDist = 0;
    this.runTime = 0;
    this.scroll = this.prevScroll = 0;
    this.speed = T.baseSpeed;
    this.coins = 0;
    this.letters = 0;
    this.score = 0;
    this.newBest = false;
    this.lane = this.laneFrom = 1;
    this.laneT = 1;
    this.laneX = this.prevLaneX = 0;
    this.lean = 0;
    this.sway = 0;
    this.anim = "RUN";
    this.animT = 0;
    this.airborne = false;
    this.jumpT = 0;
    this.jumpBuffer = 0;
    this.laneBuffer = 0;
    this.yUp = this.prevYUp = 0;
    this.duckHeld = false;
    this.duckAmt = 0;
    this.pose = basePose();
    this.flash = 0;
    this.dndShield = false;
    this.paaShield = 0;
    this.flashlight = 0;
    this.iFrames = 0;
    this.hits = 0;
    this.chaseVis = 0;
    this.cleanTimer = 0;
    this.bossIntro = 0;
    this.bubble = null;
    this.bubbleTimer = 2.4;
    this.leapMeter = 0;
    this.leapResult = null;
    this.cineT = 0;
    this.dyingT = 0;
    this.timeScale = 1;
    this.segment = "avenue";
    this.segmentUntil = 0;
    this.nextMilestone = 500;
    this.milestoneIdx = 0;
    this.shake = 0;
    this.toast = null;
    this.stampAnim = 0;
    this.phoneCall = 0;
    this.tutorial = { jump: false, slide: false, block: false };
    this.tutLife = 0;
    this.clearWorld();
    for (const p of this.particles) p.active = false;
    for (const p of this.popups) p.active = false;
    this.startStage = this.flags.stage;
  }

  private beginRun() {
    const st = this.startStage;
    if (st === 2) this.phase = "run2";
    else if (st === 3) {
      this.phase = "run3";
      this.segment = pick(ROAD_SEGMENTS);
      this.segmentUntil = 220;
    } else this.phase = "run1";
    this.stageDist = 0;
    this.clearWorld();
  }

  private stageNum() {
    if (this.phase === "run2" || this.phase === "leapCinematic") return 2;
    if (this.phase === "run3" || this.phase === "landing") return 3;
    if ((this.phase === "countdown" || this.phase === "dying" || this.phase === "over") && this.startStage > 1)
      return this.startStage;
    return 1;
  }

  private emit(force = false) {
    if (!force && this.emitT > 0 && this.phase === this.lastPhase) return;
    this.emitT = 0.08;
    this.lastPhase = this.phase;
    this.onState({
      phase: this.phase,
      paused: this.paused,
      distance: Math.floor(this.distance),
      best: Math.floor(this.best),
      newBest: this.newBest,
      coins: this.coins,
      letters: this.letters,
      score: this.score,
      lives: Math.max(0, 3 - this.hits),
      chase: Math.min(1, this.chaseVis / 2),
      dnd: this.dndShield,
      shield: this.paaShield / SHIELD_SECONDS,
      torch: this.flashlight / FLASHLIGHT_SECONDS,
      count: Math.max(0, 3 - Math.floor(this.countT / 0.8)),
      segment: SEGMENT_LABELS[this.segment],
      stage: this.stageNum(),
      hints: this.hints,
    });
  }

  /* ---------------- input ---------------- */

  input(a: Action, touch = false) {
    audio.unlock();
    if (this.paused) return;
    if (this.phase === "leapPrompt") {
      if (a === "tap" || a === "jump") this.resolveLeap();
      return;
    }
    if (!this.isPlayable()) return;
    switch (a) {
      case "left":
      case "right": {
        const dir = a === "left" ? -1 : 1;
        // landing frames: queue the lane change
        if (this.anim === "LAND" || this.anim === "JUMP_START") {
          this.laneBuffer = T.inputBuffer;
          this.laneBufferDir = dir;
          return;
        }
        this.changeLane(dir);
        break;
      }
      case "jump":
        this.tryJump();
        break;
      case "slide":
        this.duckHeld = true;
        this.duckTouch = touch;
        this.duckTime = 0;
        if (this.airborne) {
          // fast-fall, then duck on touch-down
          this.jumpT = Math.max(this.jumpT, this.airT * 0.8);
          this.jumpBuffer = 0;
          this.duckTouch = true;
        } else if (this.anim !== "DUCK" && this.anim !== "DUCK_START") {
          this.setAnim("DUCK_START");
          audio.play("scrape");
        }
        break;
    }
  }

  private changeLane(dir: number) {
    const nl = this.lane + dir;
    if (nl < 0 || nl > 2) return;
    this.laneFrom = this.lane;
    this.lane = nl;
    this.laneT = 0;
    this.leanDir = dir;
    this.sway = dir;
    audio.play("whoosh");
  }

  release(a: Action) {
    if (a === "slide") this.duckHeld = false;
  }

  private tryJump() {
    if (this.airborne || this.anim === "LAND") {
      this.jumpBuffer = T.inputBuffer;
      return;
    }
    if (this.anim === "JUMP_START") return;
    this.duckHeld = false;
    this.setAnim("JUMP_START");
  }

  private setAnim(a: Anim) {
    this.anim = a;
    this.animT = 0;
  }

  private isPlayable() {
    return this.phase === "run1" || this.phase === "run2" || this.phase === "run3";
  }

  /* ---------------- loop (fixed 120 Hz + interpolation) ---------------- */

  private loop = () => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    const now = performance.now();
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0) this.fps += (1 / dt - this.fps) * 0.05;
    if (dt > 0.1) dt = 0.1;
    const step = 1 / 120;
    if (!this.paused) {
      this.acc += dt;
      let steps = 0;
      while (this.acc >= step && steps < 12) {
        try {
          this.update(step * this.timeScale, step);
        } catch (e) {
          console.error(e);
        }
        this.acc -= step;
        steps++;
      }
      this.alpha = this.acc / step;
    }
    try {
      this.render();
    } catch (e) {
      console.error(e);
    }
  };

  /* ---------------- update ---------------- */

  private speedCurve() {
    const k = clamp01(this.runTime / T.rampTime);
    const e = 1 - (1 - k) * (1 - k);
    let v = T.baseSpeed + (T.maxSpeed - T.baseSpeed) * e;
    if (this.phase === "run1") v *= T.stage1SpeedFactor;
    else if (this.phase === "run2") v *= T.stage2SpeedFactor;
    return v * this.flags.speed;
  }

  private update(dt: number, realDt: number) {
    this.t += dt;
    this.emitT -= realDt;
    this.prevScroll = this.scroll;
    this.prevDistance = this.distance;
    this.prevLaneX = this.laneX;
    this.prevYUp = this.yUp;
    this.ensureRigs();
    if (this.shake > 0) this.shake = Math.max(0, this.shake - realDt * 2.5);
    if (this.bump > 0) this.bump = Math.max(0, this.bump - realDt * 6);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - realDt * 6);
    if (this.fade > 0) this.fade = Math.max(0, this.fade - realDt * 2.5);
    if (this.speedBurst > 0) this.speedBurst = Math.max(0, this.speedBurst - realDt * 2.5);
    if (this.tutLife > 0) this.tutLife = Math.max(0, this.tutLife - realDt);
    if (this.toast) {
      this.toast.life -= realDt;
      if (this.toast.life <= 0) this.toast = null;
    }
    if (this.stampAnim > 0) this.stampAnim = Math.max(0, this.stampAnim - realDt);
    if (this.phoneCall > 0) this.phoneCall = Math.max(0, this.phoneCall - realDt);
    this.updateParticles(dt);
    for (const d of this.dust) {
      d.y -= realDt * (6 + d.r * 4);
      d.x += Math.sin(this.t * 0.6 + d.a) * realDt * 5;
      if (d.y < -4) {
        d.y = VH + 4;
        d.x = Math.random() * VW;
      }
    }

    switch (this.phase) {
      case "home":
        this.emit();
        return;
      case "intro":
        this.introT += dt;
        if (this.introT > INTRO_LEN) {
          this.resetRun();
          this.phase = "countdown";
          this.countT = 0;
          this.fade = 1;
        }
        this.emit();
        return;
      case "countdown": {
        const before = Math.floor(this.countT / 0.8);
        this.countT += dt;
        const after = Math.floor(this.countT / 0.8);
        if (after !== before || this.countT === dt) {
          if (after < 3) audio.play("tick");
          else if (after === 3) audio.play("go");
        }
        this.updatePlayerPose(dt, true);
        if (this.countT >= 2.6) {
          this.beginRun();
          this.emit(true);
        }
        this.emit();
        return;
      }
      case "over":
        this.updateBubbles(dt);
        return;
      case "dying":
        this.dyingT += realDt;
        this.scroll += this.speed * dt * 0.3;
        this.updatePlayerPose(dt, false);
        this.updateBubbles(dt);
        if (this.dyingT > 1.1) {
          this.phase = "over";
          this.timeScale = 1;
          this.bubble = { text: CATCHPHRASE_SHOUT, boss: this.speaker(), golden: false, big: true, life: 999, max: 999 };
          this.emit(true);
        }
        return;
      case "leapPrompt":
        this.leapMeter += this.leapDir * dt * 1.25;
        if (this.leapMeter >= 1) {
          this.leapMeter = 1;
          this.leapDir = -1;
        }
        if (this.leapMeter <= 0) {
          this.leapMeter = 0;
          this.leapDir = 1;
        }
        this.updatePlayerPose(dt, true);
        this.updateBubbles(dt * 0.5);
        this.emit();
        return;
      case "leapCinematic":
        this.cineT += dt;
        if (this.cineT > 2.1) {
          this.phase = "run2";
          this.stageDist = 0;
          this.timeScale = 1;
          this.clearWorld();
          this.emit(true);
        } else this.timeScale = this.cineT < 1.2 ? 0.6 : 1;
        this.emit();
        return;
      case "landing":
        this.cineT += dt;
        this.landingPose(dt);
        if (this.cineT > 1.2) {
          this.phase = "run3";
          this.stageDist = 0;
          this.segment = pick(ROAD_SEGMENTS);
          this.segmentUntil = this.distance + 220;
          this.clearWorld();
          this.emit(true);
        }
        this.emit();
        return;
    }

    // ---------------- running ----------------
    this.runTime += dt;
    if (this.phase === "run1") this.bossIntro = Math.min(1, this.bossIntro + dt * 0.6);
    if (this.phase === "run3" && this.distance > this.segmentUntil) {
      this.segment = pick(ROAD_SEGMENTS);
      this.segmentUntil = this.distance + 200 + rnd(160);
    }
    this.speed = this.speedCurve();

    const move = this.speed * dt;
    this.scroll += move;
    this.distance += move;
    this.stageDist += move;

    this.updatePlayerPose(dt, false);

    if (this.iFrames > 0) this.iFrames -= dt;
    if (this.paaShield > 0) this.paaShield = Math.max(0, this.paaShield - dt);
    if (this.flashlight > 0) this.flashlight = Math.max(0, this.flashlight - dt);

    if (this.phase === "run3" && this.hits > 0) {
      this.cleanTimer += dt;
      if (this.cleanTimer >= CLEAN_RUN_RECOVER_SECONDS) {
        this.cleanTimer = 0;
        this.hits--;
        this.pushToast("The bosses fell back!", false);
      }
    }
    this.chaseVis += (Math.min(2, this.hits) - this.chaseVis) * Math.min(1, dt * 3);

    this.spawnLogic(move);
    this.moveWorld(move);
    this.collide();
    this.updateCrew(dt);
    this.updateBubbles(dt);

    if (this.distance >= this.nextMilestone) {
      this.nextMilestone += 500;
      const fixed = this.milestoneIdx < MILESTONES.length;
      const text = fixed
        ? MILESTONES[this.milestoneIdx]
        : MILESTONES_EXTRA[(this.milestoneIdx - MILESTONES.length) % MILESTONES_EXTRA.length];
      this.pushToast(text, true);
      this.milestoneIdx++;
      this.speedBurst = 1;
      audio.play("whoosh");
    }

    if (this.phase === "run1" && this.stageDist >= STAGE1_LENGTH) {
      this.phase = "leapPrompt";
      this.leapMeter = 0;
      this.leapDir = 1;
      this.duckHeld = false;
      this.airborne = false;
      this.yUp = 0;
      this.setAnim("RUN");
      this.clearWorld();
      audio.play("pop");
      this.emit(true);
    }
    if (this.phase === "run2" && this.stageDist >= STAGE2_LENGTH) {
      this.phase = "landing";
      this.cineT = 0;
      this.clearWorld();
      audio.play("boing");
      this.emit(true);
    }

    if (this.phase === "run3" && this.phoneCall <= 0 && Math.random() < dt * 0.05) {
      this.phoneCall = 3.2;
      this.phoneText = pick(PHONE_CALLS);
      audio.play("ring");
    }

    this.emit();
  }

  /* ---------------- player animation state machine ---------------- */

  private bodyHeight() {
    return T.playerHeight + (T.duckHeight - T.playerHeight) * clamp01(this.duckAmt * 1.15);
  }

  private updatePlayerPose(dt: number, standing: boolean) {
    if (this.laneT < 1) this.laneT = Math.min(1, this.laneT + dt / T.laneChangeTime);
    const from = LANE_X[this.laneFrom];
    const to = LANE_X[this.lane];
    this.laneX = from + (to - from) * easeOut(this.laneT);
    const leanTarget = this.laneT < 1 ? this.leanDir : 0;
    this.lean += (leanTarget - this.lean) * Math.min(1, dt * (leanTarget ? 22 : 9));
    this.sway *= Math.exp(-dt / 0.18);

    this.animT += dt;
    if (this.jumpBuffer > 0) this.jumpBuffer -= dt;
    if (this.laneBuffer > 0) {
      this.laneBuffer -= dt;
      if (this.anim !== "LAND" && this.anim !== "JUMP_START") {
        this.laneBuffer = 0;
        this.changeLane(this.laneBufferDir);
      }
    }

    // vertical: exact parabola
    if (this.airborne) {
      this.jumpT += dt;
      const u = Math.min(1, this.jumpT / this.airT);
      this.yUp = 4 * T.jumpHeight * u * (1 - u);
      if (u >= 1) {
        this.airborne = false;
        this.yUp = 0;
        this.bump = 1;
        this.dustRing();
        audio.play("thud");
        if (this.duckHeld || this.duckTouch) {
          this.duckTime = 0;
          this.setAnim("DUCK_START");
        } else this.setAnim("LAND");
      }
    } else this.yUp = 0;

    switch (this.anim) {
      case "JUMP_START":
        if (this.animT >= T.jumpAnticipation) {
          this.setAnim("AIR");
          this.airborne = true;
          this.jumpT = 0;
          this.airT = Math.max(T.minAirTime, Math.min(T.airTime, T.jumpDistance / Math.max(1, this.speed)));
          this.dustBurst(6);
          audio.play("whoosh");
        }
        break;
      case "LAND":
        if (this.jumpBuffer > 0) {
          this.jumpBuffer = 0;
          this.setAnim("JUMP_START");
        } else if (this.animT >= T.landTime) this.setAnim("RUN");
        break;
      case "DUCK_START":
        this.duckTime += dt;
        if (this.animT >= 0.09) this.setAnim("DUCK");
        break;
      case "DUCK": {
        this.duckTime += dt;
        if (Math.random() < dt * 40) {
          const f = this.feet();
          const side = Math.random() < 0.5 ? -1 : 1;
          this.spawnP("dust", f.x + side * (8 + Math.random() * 18), f.y - 2, side * (40 + Math.random() * 80), -Math.random() * 40, -10, 0.35 + Math.random() * 0.2, "rgba(205,195,178,1)", 4 + Math.random() * 5);
          if (Math.random() < 0.5)
            this.spawnP("spark", f.x + (Math.random() - 0.5) * 120, f.y - 30 - Math.random() * 120, 0, 380, 0, 0.18, "rgba(255,255,255,0.8)", 1.5);
        }
        const release = this.duckTouch
          ? this.duckTime >= T.duckTime
          : !this.duckHeld && this.duckTime >= T.duckMinTime;
        if (release) this.setAnim("DUCK_END");
        if (Math.random() < dt * 14) this.dustTrail();
        break;
      }
      case "DUCK_END":
        if (this.animT >= 0.11) {
          this.duckTouch = false;
          if (this.jumpBuffer > 0) {
            this.jumpBuffer = 0;
            this.setAnim("JUMP_START");
          } else this.setAnim("RUN");
        }
        break;
      case "HIT":
        if (this.animT >= 0.4 && !this.airborne) this.setAnim("RUN");
        break;
    }

    const ducking = this.anim === "DUCK" || (this.anim === "DUCK_START" && this.animT > 0.03);
    const dk = this.anim === "DUCK_START" ? 0.09 : 0.11;
    this.duckAmt += ((ducking ? 1 : 0) - this.duckAmt) * Math.min(1, dt / (dk / 3));

    const speedK = Math.sqrt(this.speed / T.baseSpeed);
    if (!standing) {
      const prev = Math.floor(this.phi / Math.PI + 0.5);
      this.phi += dt * Math.PI * 3.2 * speedK;
      this.runFrameT += dt;
      const now = Math.floor(this.phi / Math.PI + 0.5);
      if (now !== prev && this.anim === "RUN" && this.phase !== "dying") {
        audio.play("step");
        this.footDust(now % 2 === 0 ? -1 : 1);
      }
    }

    let target: Pose;
    if (standing) {
      target = basePose();
      target.torsoSY = 1 + 0.015 * Math.sin(this.t * 1.8);
      if (this.phase === "leapPrompt") target = mixPose(target, poseAnticipation(), 0.4 + 0.6 * this.leapMeter);
    } else {
      switch (this.anim) {
        case "JUMP_START":
          target = poseAnticipation();
          break;
        case "AIR": {
          const u = this.jumpT / this.airT;
          if (this.jumpT < 0.1) target = poseTakeoff();
          else if (u > 0.85) target = mixPose(poseAir(this.t), poseLand(), (u - 0.85) / 0.15);
          else target = poseAir(this.t);
          break;
        }
        case "LAND":
          target = mixPose(poseLand(), poseRun(this.phi), smooth(this.animT / T.landTime));
          break;
        case "DUCK_START":
        case "DUCK":
          target = poseDuck(this.t);
          break;
        case "DUCK_END":
          target = mixPose(poseDuck(this.t), poseRun(this.phi), smooth(this.animT / 0.11));
          break;
        case "HIT":
          target = poseHit(this.t);
          break;
        default:
          target = poseRun(this.phi);
      }
    }
    // a touch of whole-body tilt into the lane direction (<= 6deg)
    target.rot += this.lean * 0.09;
    const k = 1 - Math.exp(-dt / RIG_BLEND_TAU);
    blendPose(this.pose, target, k);
    clampBackPose(this.pose);
  }

  private landingPose(dt: number) {
    const k = Math.min(1, this.cineT / 0.55);
    this.laneX += (0 - this.laneX) * Math.min(1, dt * 6);
    this.lane = this.laneFrom = 1;
    this.laneT = 1;
    if (k < 1) {
      this.yUp = (1 - k * k) * 8;
      blendPose(this.pose, poseAir(this.t), 1 - Math.exp(-dt / RIG_BLEND_TAU));
    } else {
      if (this.yUp > 0) {
        this.yUp = 0;
        this.bump = 1.4;
        this.shake = 0.35;
        this.dustRing();
        this.dustBurst(12);
        audio.play("thud");
      }
      const target = this.cineT < 0.8 ? poseLand() : poseRun(this.phi);
      if (this.cineT >= 0.8) this.phi += dt * 10;
      blendPose(this.pose, target, 1 - Math.exp(-dt / RIG_BLEND_TAU));
    }
    clampBackPose(this.pose);
  }

  /* ---------------- leap ---------------- */

  private resolveLeap() {
    const m = this.leapMeter;
    const good = m > 0.62 && m < 0.9;
    this.leapResult = good ? "good" : "bad";
    this.phase = "leapCinematic";
    this.cineT = 0;
    if (good) {
      this.score += 200;
      this.pushToast(LEAP.good, true);
      audio.play("whoosh");
    } else {
      this.pushToast(LEAP.bad, false);
      this.takeHit(true);
    }
    this.emit(true);
  }

  /* ---------------- spawning (world metres) ---------------- */

  private spawnLogic(move: number) {
    this.nextChunkZ -= move;
    for (const p of this.pending) p.z -= move;
    // generate chunks ahead of the spawn line
    while (this.nextChunkZ < T.spawnDistance + 40) {
      const stage = this.phase === "run1" ? 1 : this.phase === "run2" ? 2 : 3;
      const easy = this.runTime < T.easyTime;
      const chunk = makeChunk(stage, easy);
      const base = Math.max(this.nextChunkZ, T.noSpawnZone + 20);
      for (const it of chunk.items) {
        const z = base + it.dz;
        if (it.t === "ob") {
          const pool = POOLS[stage];
          let kind: ObKind;
          if (it.a === "bus") kind = "bus";
          else {
            const list = pool[it.a].length ? pool[it.a] : pool.block;
            kind = pick(list);
          }
          const span = it.span ?? 1;
          if (span === 2) kind = it.a === "bus" ? "bus" : pick(pool.jump.length ? pool.jump : pool.block);
          this.pending.push({ z, ob: { kind, lane: it.lane, span } });
        } else if (it.t === "coins") {
          for (let i = 0; i < it.n; i++) {
            const u = it.n > 1 ? i / (it.n - 1) : 0.5;
            const h = it.arc ? 0.5 + Math.sin(u * Math.PI) * 1.0 : 0.5;
            this.pending.push({ z: z + i * 1.5, col: { kind: "coin", lane: it.lane, h } });
          }
        } else {
          this.pending.push({ z, col: { kind: this.pickSpecial(stage), lane: it.lane, h: 0.7 } });
        }
      }
      const gap = T.chunkGap + (easy ? 14 : Math.max(0, 10 - this.runTime * 0.05));
      this.nextChunkZ = base + chunk.len + gap;
    }
    // release pending items as they reach the spawn line
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const p = this.pending[i];
      if (p.z > T.spawnDistance) continue;
      if (p.ob) this.addObstacle(p.ob.kind, p.ob.lane, p.z, p.ob.span);
      else if (p.col) this.addCollect(p.col.kind, p.col.lane, p.z, p.col.h);
      this.pending.splice(i, 1);
    }
  }

  private pickSpecial(stage: number): ColKind {
    const r = Math.random();
    if (stage === 2) return r < 0.6 ? "leaf" : "coin";
    if (stage === 3) {
      if (r < 0.26) return "filter";
      if (r < 0.44) return "dosa";
      if (r < 0.58) return "vada";
      if (r < 0.7) return "stamp";
      if (r < 0.8) return "letter";
      if (r < 0.88) return "shield";
      return Math.random() < 0.5 ? "torch" : "watch";
    }
    if (r < 0.34) return "chai";
    if (r < 0.54) return "stamp";
    if (r < 0.7) return "letter";
    if (r < 0.82) return "shield";
    return Math.random() < 0.5 ? "torch" : "watch";
  }

  private addObstacle(kind: ObKind, lane: number, z: number, span: number) {
    const o = this.obstacles.find((x) => !x.active);
    if (!o) return;
    const look = OB_LOOK[kind];
    const cx = span === 2 ? (LANE_X[lane] + LANE_X[lane + 1]) / 2 : LANE_X[lane];
    const w = look.dims.w + (span === 2 ? T.laneWidth : 0);
    o.active = true;
    o.kind = kind;
    o.cat = look.cat;
    o.lane = lane;
    o.span = span;
    o.len = look.cat === "jump" && span === 2 ? 2.5 : look.dims.len;
    o.x0 = cx - w / 2;
    o.x1 = cx + w / 2;
    o.y0 = look.dims.y0;
    o.y1 = look.dims.y1;
    o.z0 = z;
    o.z1 = z + o.len;
    o.warned = false;
    o.hit = false;
    o.seen = false;
    o.minGap = 9;
  }

  private addCollect(kind: ColKind, lane: number, z: number, h: number) {
    const c = this.collects.find((x) => !x.active);
    if (!c) return;
    c.active = true;
    c.kind = kind;
    c.lane = lane;
    c.z = z;
    c.h = h;
    c.seed = Math.random() * 6;
  }

  private moveWorld(move: number) {
    for (const o of this.obstacles) {
      if (!o.active) continue;
      o.z0 -= move;
      o.z1 -= move;
      if (o.z1 < -4) {
        o.active = false;
        continue;
      }
      const inLane = o.x0 < this.laneX + 0.4 && o.x1 > this.laneX - 0.4;
      if (!o.warned && o.z0 < T.warnDistance && inLane) {
        o.warned = true;
        if (this.hints) audio.play("warn");
      }
      // one-time tutorial hint at the first relevant obstacle
      if (!o.seen && o.z0 < 20 && inLane) {
        o.seen = true;
        const tut = this.tutorial;
        if (this.hints && !tut[o.cat]) {
          tut[o.cat] = true;
          this.tutText = o.cat === "jump" ? "Swipe up to jump" : o.cat === "slide" ? "Swipe down to duck" : "Swipe left/right to change lane";
          this.tutLife = 2.2;
        }
      }
    }
    for (const c of this.collects) {
      if (!c.active) continue;
      c.z -= move;
      if (c.z < -4) c.active = false;
    }
  }

  /** World-space AABB collision — the same numbers that are drawn. */
  private collide() {
    const px0 = this.laneX - T.playerHalfWidth;
    const px1 = this.laneX + T.playerHalfWidth;
    const py0 = this.yUp;
    const py1 = this.yUp + this.bodyHeight();
    const pz0 = -T.playerHalfDepth;
    const pz1 = T.playerHalfDepth;
    for (const o of this.obstacles) {
      if (!o.active || o.hit) continue;
      const zOver = o.z0 < pz1 && o.z1 > pz0;
      if (zOver) {
        if (this.flashlight > 0 && o.x0 < px1 + 0.3 && o.x1 > px0 - 0.3) {
          o.active = false;
          const p = project(this.laneX, 1, 0);
          this.sparks(p.x, p.y, "#ffe9a8", 10);
          continue;
        }
        const xg = Math.max(o.x0 - px1, px0 - o.x1);
        const yg = Math.max(o.y0 - py1, py0 - o.y1);
        const gap = Math.max(xg, yg);
        if (gap < 0) {
          o.hit = true;
          this.takeHit(false);
          continue;
        }
        o.minGap = Math.min(o.minGap, gap);
      } else if (o.z1 <= pz0 && o.minGap < T.nearMiss) {
        o.minGap = 9;
        this.nearMiss();
      }
    }
    for (const c of this.collects) {
      if (!c.active) continue;
      if (c.z > 0.7 || c.z < -0.7) continue;
      if (Math.abs(LANE_X[c.lane] - this.laneX) > 0.8) continue;
      if (c.h > this.yUp - 0.35 && c.h < this.yUp + this.bodyHeight() + 0.3) {
        c.active = false;
        this.collect(c.kind, c.h);
      }
    }
  }

  private nearMiss() {
    this.score += 25;
    const p = project(this.laneX, T.playerHeight + 0.3, 0);
    this.popup("CLOSE!", p.x, p.y - 10, "#7fe3ff", 26);
    audio.play("close");
  }

  private collect(kind: ColKind, h: number) {
    const p = project(this.laneX, h, 0);
    switch (kind) {
      case "coin":
        this.coins++;
        this.score += SCORING.coin;
        this.sparks(p.x, p.y, "#ffd65a", 7);
        this.popup("+1", p.x + 18, p.y - 8, "#ffe08a", 16);
        audio.play("coin");
        break;
      case "chai":
      case "filter":
        this.score += SCORING.chai;
        this.sparks(p.x, p.y, "#e8c9a0", 6);
        this.popup(`+${SCORING.chai}`, p.x, p.y - 10, "#fff1d6", 18);
        audio.play("coin");
        break;
      case "stamp":
        this.score += SCORING.stamp;
        this.sparks(p.x, p.y, "#6ed19a", 8);
        this.popup(`+${SCORING.stamp}`, p.x, p.y - 10, "#9ff0c0", 18);
        audio.play("coin");
        break;
      case "dosa":
      case "vada":
        this.score += SCORING.food;
        this.sparks(p.x, p.y, "#f0b96c", 8);
        this.popup(`+${SCORING.food}`, p.x, p.y - 10, "#ffd9a0", 18);
        audio.play("coin");
        break;
      case "leaf":
        this.score += SCORING.leaf;
        this.sparks(p.x, p.y, "#7fc05a", 5);
        audio.play("coin");
        break;
      case "letter":
        this.letters++;
        this.score += SCORING.letter;
        this.sparks(p.x, p.y, "#ffe6a3", 16);
        this.ring(p.x, p.y, "#ffe6a3");
        audio.play("shield");
        this.pushToast("Relieving Letter!", true);
        if (this.letters % EASTER_EGG.lettersNeeded === 0) {
          this.score += EASTER_EGG.bonus;
          this.stampAnim = 2.2;
          audio.play("stamp");
        }
        break;
      case "shield":
        this.paaShield = SHIELD_SECONDS;
        this.sparks(p.x, p.y, "#ffd34d", 16);
        this.ring(p.x, p.y, "#ffd34d");
        audio.play("shield");
        this.pushToast("PAA-SHIELD!", true);
        break;
      case "torch":
        this.flashlight = FLASHLIGHT_SECONDS;
        this.sparks(p.x, p.y, "#ffe9a8", 12);
        audio.play("shield");
        this.pushToast("Flashlight on — hazards cleared!", false);
        break;
      case "watch":
        this.dndShield = true;
        this.sparks(p.x, p.y, "#8fd4ff", 12);
        this.ring(p.x, p.y, "#8fd4ff");
        audio.play("shield");
        this.pushToast("Do Not Disturb — blocks one hit", false);
        break;
    }
  }

  private takeHit(force: boolean) {
    if (!force) {
      if (this.flags.god) return;
      if (this.iFrames > 0 || this.paaShield > 0) return;
      if (this.dndShield) {
        this.dndShield = false;
        this.iFrames = T.invulnTime;
        this.shake = 0.4;
        this.flash = 0.6;
        audio.play("pop");
        this.pushToast("Do Not Disturb blocked it!", false);
        return;
      }
    }
    this.hits++;
    this.cleanTimer = 0;
    this.iFrames = T.invulnTime;
    this.shake = 1;
    this.flash = 1;
    if (!this.airborne) this.setAnim("HIT");
    try {
      navigator.vibrate?.(120);
    } catch {
      /* ignore */
    }
    audio.play("hit");
    audio.play("boing");
    this.bubble = { text: CATCHPHRASE_SHOUT, boss: this.speaker(), golden: false, big: true, life: 1.5, max: 1.5 };
    this.bubbleTimer = 2.6;
    const p = project(this.laneX, 1.1, 0);
    this.sparks(p.x, p.y, "#ffffff", 14);
    if (this.hits >= 3 && !this.flags.god) this.gameOver();
  }

  private gameOver() {
    this.phase = "dying";
    this.dyingT = 0;
    this.timeScale = T.deathSlowMo;
    this.setAnim("HIT");
    if (this.distance > this.best) {
      this.best = this.distance;
      this.newBest = true;
      try {
        localStorage.setItem(BEST_KEY, String(Math.floor(this.best)));
      } catch {
        /* ignore */
      }
    }
    this.emit(true);
  }

  /* ---------------- bubbles ---------------- */

  private updateBubbles(dt: number) {
    if (this.bubble) {
      this.bubble.life -= dt;
      if (this.bubble.life <= 0) this.bubble = null;
    }
    if (this.phase === "over" || this.phase === "dying") return;
    this.bubbleTimer -= dt;
    if (this.bubbleTimer <= 0 && !this.bubble) {
      this.bubbleTimer = 2.4 + Math.random() * 2.2;
      this.bubbleTurn++;
      const bossIdx = this.speaker();
      let text: string;
      const golden = Math.random() < GOLDEN_BUBBLE_RATE;
      if (this.paaShield > 0) text = CATCHPHRASE_MEEK;
      else if (crewHas(this.crew, 0) && crewHas(this.crew, 1) && Math.random() < 0.08) text = bossIdx === 0 ? DUET.a : DUET.b;
      else if (Math.random() < CATCHPHRASE_RATE || golden) text = pick(CATCHPHRASE_COMBOS);
      else text = pick(SHARED_LINES);
      this.bubble = { text, boss: bossIdx, golden, big: false, life: 2.4, max: 2.4 };
      audio.play("pop");
      if (golden) this.confetti();
    }
  }

  /** Crew rotates every 1000 m: Murali → Sumeet → both, repeating every 3000 m. */
  private updateCrew(dt: number) {
    const c = crewAt(this.distance);
    if (c !== this.crew) {
      this.crew = c;
      const line = CREW_LINES[c];
      this.bubble = { text: line.text, boss: line.boss, golden: false, big: true, life: 2.6, max: 2.6 };
      this.bubbleTimer = 3.2;
      this.pushToast(line.toast, false);
      audio.play("pop");
    }
    for (let i = 0; i < 2; i++) {
      const target = crewHas(this.crew, i) ? 1 : 0;
      this.bossPres[i] += (target - this.bossPres[i]) * Math.min(1, dt * 2.5);
    }
  }

  /** A boss currently on screen to speak (alternates when both chase). */
  private speaker(): number {
    if (this.crew === 0) return 0;
    if (this.crew === 1) return 1;
    return this.bubbleTurn % 2;
  }

  private pushToast(text: string, gold: boolean) {
    this.toast = { text, life: 2.6, max: 2.6, gold };
  }

  /* ---------------- particles ---------------- */

  private spawnP(kind: Particle["kind"], x: number, y: number, vx: number, vy: number, g: number, life: number, col: string, size: number) {
    const p = this.particles.find((q) => !q.active);
    if (!p) return;
    p.active = true;
    p.kind = kind;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.g = g;
    p.life = p.max = life;
    p.col = col;
    p.size = size;
  }
  private sparks(x: number, y: number, col: string, n: number) {
    for (let i = 0; i < n; i++)
      this.spawnP("spark", x, y, (Math.random() - 0.5) * 260, -Math.random() * 260 - 40, 600, 0.5 + Math.random() * 0.4, col, 2 + Math.random() * 3);
  }
  private ring(x: number, y: number, col: string) {
    this.spawnP("ring", x, y, 0, 0, 0, 0.5, col, 10);
  }
  private feet() {
    return project(this.laneX, 0, 0);
  }
  private footDust(side: number) {
    const f = this.feet();
    this.spawnP("dust", f.x + side * 14, f.y - 2, side * 20, -18, -10, 0.45, "rgba(200,190,172,1)", 6);
  }
  private dustBurst(n: number) {
    const f = this.feet();
    for (let i = 0; i < n; i++)
      this.spawnP("dust", f.x + (Math.random() - 0.5) * 30, f.y - 2, (Math.random() - 0.5) * 140, -Math.random() * 50, -20, 0.5 + Math.random() * 0.3, "rgba(205,195,178,1)", 6 + Math.random() * 6);
  }
  private dustRing() {
    const f = this.feet();
    this.spawnP("ring", f.x, f.y, 0, 0, 0, 0.4, "rgba(220,210,190,1)", 16);
    this.dustBurst(8);
  }
  private dustTrail() {
    const f = this.feet();
    this.spawnP("dust", f.x + (Math.random() - 0.5) * 36, f.y + 4, (Math.random() - 0.5) * 30, 30, -10, 0.4, "rgba(200,190,172,1)", 5);
  }
  private confetti() {
    const cols = ["#ffd34d", "#ff8ac2", "#7fe3ff", "#9ef08a"];
    for (let i = 0; i < 26; i++)
      this.spawnP("spark", CX + (Math.random() - 0.5) * 200, 560, (Math.random() - 0.5) * 220, -Math.random() * 320 - 80, 500, 1 + Math.random() * 0.6, cols[i % 4], 3 + Math.random() * 3);
  }
  private popup(text: string, x: number, y: number, col: string, size: number) {
    const p = this.popups.find((q) => !q.active) ?? this.popups[0];
    p.active = true;
    p.text = text;
    p.x = x;
    p.y = y;
    p.life = 0.8;
    p.col = col;
    p.size = size;
  }

  private updateParticles(dt: number) {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.g * dt;
      if (p.kind === "dust") {
        p.vx *= 0.96;
        p.size += dt * 22;
      }
    }
    for (const p of this.popups) {
      if (!p.active) continue;
      p.life -= dt;
      p.y -= dt * 60;
      if (p.life <= 0) p.active = false;
    }
  }

  /* ================================================================ */
  /* RENDER                                                           */
  /* ================================================================ */

  /** interpolated values for smooth rendering between fixed steps */
  private rx = 0;
  private ry = 0;
  private rScroll = 0;
  private rMove = 0;

  private render() {
    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, VW, VH);

    if (this.phase === "home" || this.phase === "intro") {
      this.renderHome(ctx);
      this.drawFade(ctx);
      ctx.restore();
      return;
    }

    const a = this.paused ? 1 : this.alpha;
    this.rx = this.prevLaneX + (this.laneX - this.prevLaneX) * a;
    this.ry = this.prevYUp + (this.yUp - this.prevYUp) * a;
    this.rScroll = this.prevScroll + (this.scroll - this.prevScroll) * a;
    this.rMove = this.rScroll - this.scroll; // <= 0: world objects are drawn this much further back

    // camera
    const speedFrac = clamp01((this.speed - T.baseSpeed) / (T.maxSpeed - T.baseSpeed));
    const running = this.isPlayable() && !this.airborne && this.anim === "RUN";
    const bob = running ? Math.sin(this.phi * 2) * T.cameraBob : 0;
    const camX = this.rx * T.cameraFollow + this.sway * T.cameraSway * (this.laneT < 1 ? 1 : 0.6);
    setCamera(camX, bob - this.bump * 0.08 - this.duckAmt * 0.12, T.fov + T.fovBoost * speedFrac);

    ctx.save();
    if (this.shake > 0)
      ctx.translate((Math.random() - 0.5) * 14 * this.shake, (Math.random() - 0.5) * 14 * this.shake);

    this.drawWorldBackground(ctx);
    if (this.phase !== "leapCinematic") {
      this.drawGroundMarks(ctx);

      // depth-sorted: far objects, Fathu, then anything that has passed him
      const obs = this.obstacles.filter((o) => o.active).sort((p, q) => q.z0 - p.z0);
      const cols = this.collects.filter((c) => c.active).sort((p, q) => q.z - p.z);
      for (const o of obs) this.drawObShadowFor(ctx, o);
      let oi = 0;
      let ci = 0;
      const drawUntil = (minZ: number) => {
        while ((oi < obs.length && obs[oi].z0 > minZ) || (ci < cols.length && cols[ci].z > minZ)) {
          const oz = oi < obs.length ? obs[oi].z0 : -Infinity;
          const cz = ci < cols.length ? cols[ci].z : -Infinity;
          if (oz >= cz) this.drawObstacleFull(ctx, obs[oi++]);
          else this.drawCollectibleFull(ctx, cols[ci++]);
        }
      };
      drawUntil(T.playerHalfDepth);
      if (this.flashlight > 0 && this.isPlayable()) this.drawFlashlight(ctx);
      this.drawPlayer(ctx);
      drawUntil(-Infinity);
      this.drawWarnings(ctx);
    }
    this.drawBosses(ctx);
    this.drawParticles(ctx);
    this.drawBubble(ctx);
    ctx.restore();

    this.drawSpeedLines(ctx);
    if (this.vignette) ctx.drawImage(this.vignette, 0, 0);
    if (this.flash > 0.4 && this.phase !== "over") {
      ctx.fillStyle = `rgba(255,255,255,${(this.flash - 0.4) * 0.6})`;
      ctx.fillRect(0, 0, VW, VH);
    }
    this.drawOverlays(ctx);
    if (this.phase === "over") {
      ctx.fillStyle = "rgba(12,8,6,0.55)";
      ctx.fillRect(0, 0, VW, VH);
      this.drawGameOverBosses(ctx);
    }
    if (this.flags.debug) this.drawDebug(ctx);
    this.drawFade(ctx);
    ctx.restore();
  }

  private drawFade(ctx: CanvasRenderingContext2D) {
    if (this.fade <= 0) return;
    ctx.fillStyle = `rgba(10,6,4,${this.fade})`;
    ctx.fillRect(0, 0, VW, VH);
  }

  private drawWorldBackground(ctx: CanvasRenderingContext2D) {
    const st = this.stageNum();
    if (this.phase === "leapCinematic") {
      this.drawLeapScene(ctx);
      return;
    }
    if (st === 2) drawTreeCanopy(ctx, this.rScroll * 24, Math.min(1, this.stageDist / 260));
    else if (st === 3) drawRoadWorld(ctx, this.rScroll, this.segment, this.distance, this.t);
    else {
      drawCorridorWorld(ctx, this.rScroll, this.t);
      if (this.phase === "leapPrompt") drawDeadEndWorld(ctx, 7);
    }
  }

  /** Ground-level guides: take-off ring + lane chevrons. Drawn before objects. */
  private drawGroundMarks(ctx: CanvasRenderingContext2D) {
    if (!this.isPlayable() || !this.hints) return;
    const ringA = this.runTime < T.jumpRingTime ? clamp01((T.jumpRingTime - this.runTime) / 10) : 0;
    for (const o of this.obstacles) {
      if (!o.active || o.hit) continue;
      const z0 = o.z0 + this.rMove;
      if (z0 > 48 || z0 < 0.5) continue;
      // lane chevrons in front of the obstacle
      const a = clamp01((48 - z0) / 23) * clamp01((z0 - 1) / 4);
      const col = o.cat === "jump" ? "255,210,40" : o.cat === "slide" ? "255,80,70" : "120,220,255";
      ctx.save();
      for (let i = 0; i < 3; i++) {
        const cz = z0 - 2 - i * 1.4;
        if (cz < 0.3) continue;
        const pulse = 0.5 + 0.5 * Math.sin(this.t * 10 - i * 1.2);
        ctx.globalAlpha = a * (0.25 + 0.3 * pulse);
        ctx.fillStyle = `rgb(${col})`;
        const cx = (o.x0 + o.x1) / 2;
        const hw = Math.min(0.75, (o.x1 - o.x0) / 2 - 0.1);
        poly(ctx, [
          project(cx - hw, 0.01, cz - 0.5),
          project(cx, 0.01, cz + 0.1),
          project(cx + hw, 0.01, cz - 0.5),
          project(cx + hw, 0.01, cz - 0.15),
          project(cx, 0.01, cz + 0.45),
          project(cx - hw, 0.01, cz - 0.15),
        ]);
        ctx.fill();
      }
      ctx.restore();
      // ideal take-off ring (tutorial assist)
      if (ringA > 0 && o.cat === "jump") {
        const travel = this.speed * (this.airT + T.jumpAnticipation);
        const air = Math.max(T.minAirTime, Math.min(T.airTime, T.jumpDistance / Math.max(1, this.speed)));
        const rz = z0 + o.len / 2 - this.speed * (air / 2 + T.jumpAnticipation);
        void travel;
        if (rz > 0.2 && rz < 40) {
          const cx = (o.x0 + o.x1) / 2;
          const p = project(cx, 0.01, rz);
          const q = project(cx, 0.01, rz + 0.5);
          ctx.save();
          ctx.globalAlpha = ringA * 0.7 * clamp01((40 - rz) / 10);
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = Math.max(1.5, 0.06 * p.s);
          ctx.beginPath();
          ctx.ellipse(p.x, (p.y + q.y) / 2, 0.55 * p.s, Math.max(1.5, (p.y - q.y) * 1.2), 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  }

  /** Action arrows above dangerous lanes, pulsing in the last metres. */
  private drawWarnings(ctx: CanvasRenderingContext2D) {
    if (!this.isPlayable() || !this.hints) return;
    for (const o of this.obstacles) {
      if (!o.active || o.hit) continue;
      const z0 = o.z0 + this.rMove;
      if (z0 > T.arrowDistance || z0 < 2) continue;
      if (o.lane !== this.lane && !(o.span === 2 && o.lane + 1 === this.lane)) continue;
      const cx = (o.x0 + o.x1) / 2;
      const p = project(cx, o.y1 + 0.6, z0);
      const pulse = 1 + 0.18 * Math.sin(this.t * 16);
      const r = Math.max(9, Math.min(22, 0.32 * p.s)) * pulse;
      ctx.save();
      ctx.globalAlpha = clamp01((T.arrowDistance - z0) / 4) * 0.9;
      ctx.translate(p.x, p.y - r);
      ctx.fillStyle = "rgba(20,14,10,0.7)";
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = o.cat === "jump" ? "#ffd21f" : o.cat === "slide" ? "#ff5a4a" : "#7fe3ff";
      ctx.beginPath();
      if (o.cat === "jump") {
        ctx.moveTo(0, -r * 0.6);
        ctx.lineTo(r * 0.55, r * 0.25);
        ctx.lineTo(-r * 0.55, r * 0.25);
      } else if (o.cat === "slide") {
        ctx.moveTo(0, r * 0.6);
        ctx.lineTo(r * 0.55, -r * 0.25);
        ctx.lineTo(-r * 0.55, -r * 0.25);
      } else {
        const d = this.lane === 0 ? 1 : this.lane === 2 ? -1 : cx >= 0 ? -1 : 1;
        ctx.moveTo(d * r * 0.6, 0);
        ctx.lineTo(-d * r * 0.25, -r * 0.55);
        ctx.lineTo(-d * r * 0.25, r * 0.55);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  private obFade(z: number) {
    return clamp01((T.spawnDistance - z) / (T.spawnDistance - T.fadeInEnd));
  }

  /** interpolated + scale-in box (scale-in only happens in the far fade zone) */
  private viewBox(o: Obstacle): ObBox {
    const z0 = o.z0 + this.rMove;
    const z1 = o.z1 + this.rMove;
    const f = this.obFade(z0);
    if (f >= 1) return { x0: o.x0, x1: o.x1, y0: o.y0, y1: o.y1, z0, z1 };
    const k = 0.6 + 0.4 * f;
    const cx = (o.x0 + o.x1) / 2;
    const hw = ((o.x1 - o.x0) / 2) * k;
    return { x0: cx - hw, x1: cx + hw, y0: o.y0 * k, y1: o.y1 * k, z0, z1: z0 + (z1 - z0) * k };
  }

  private drawObShadowFor(ctx: CanvasRenderingContext2D, o: Obstacle) {
    const b = this.viewBox(o);
    if (b.z0 > FAR) return;
    drawObShadow(ctx, b, o.cat, this.obFade(b.z0));
  }

  private drawObstacleFull(ctx: CanvasRenderingContext2D, o: Obstacle) {
    const b = this.viewBox(o);
    if (b.z0 > FAR || b.z1 < -3) return;
    ctx.save();
    ctx.globalAlpha = this.obFade(b.z0);
    drawObstacle3D(ctx, o.kind, b, cam.x, cam.y, this.t);
    ctx.restore();
  }

  private drawCollectibleFull(ctx: CanvasRenderingContext2D, c: Collectible) {
    const z = c.z + this.rMove;
    const y = c.h + Math.sin(this.t * 3 + c.seed) * 0.06;
    const p = project(LANE_X[c.lane], y, z);
    if (z > FAR || z < -3) return;
    const special = c.kind === "letter" || c.kind === "shield" || c.kind === "watch" || c.kind === "torch";
    ctx.save();
    ctx.globalAlpha = this.obFade(z);
    const r = (special ? 0.75 : 0.42) * p.s;
    const g = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, r);
    g.addColorStop(0, special ? "rgba(255,236,160,0.6)" : "rgba(255,210,90,0.5)");
    g.addColorStop(1, "rgba(255,210,90,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    if (special) {
      ctx.strokeStyle = c.kind === "shield" ? "rgba(255,211,77,0.9)" : "rgba(160,225,255,0.85)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 0.5 * p.s, 0.5 * p.s * (0.6 + 0.4 * Math.abs(Math.sin(this.t * 3))), this.t, 0, Math.PI * 2);
      ctx.stroke();
    }
    drawCollectible(ctx, c.kind, p, p.s * (special ? 0.016 : 0.012), this.t, c.seed);
    ctx.restore();
  }

  private drawFlashlight(ctx: CanvasRenderingContext2D) {
    const p = project(this.rx, 1.5, 0);
    const g = ctx.createLinearGradient(0, p.y, 0, HORIZON);
    g.addColorStop(0, "rgba(255,240,190,0.4)");
    g.addColorStop(1, "rgba(255,240,190,0)");
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(p.x - 20, p.y);
    ctx.lineTo(p.x - 170, HORIZON - 20);
    ctx.lineTo(p.x + 170, HORIZON - 20);
    ctx.lineTo(p.x + 20, p.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /* ---------------- Fathu ---------------- */

  private renderPose(): Pose {
    const f = this.flags.pose;
    if (!f) return this.pose;
    const p = f === "run" ? poseRun(Math.PI / 2) : f === "jump" ? fromSet(POSES.air) : f === "duck" ? fromSet(POSES.duck) : fromSet(POSES.land);
    clampBackPose(p);
    return p;
  }

  private frameFor(): HTMLImageElement | null {
    const pick = (set: Sprite[] | null, u: number) => {
      if (!set || !set.every((s) => s.ready && s.img)) return null;
      return set[Math.min(set.length - 1, Math.max(0, Math.floor(u * set.length)))].img;
    };
    if (this.phase === "dying" || this.flags.pose) return null;
    if (this.anim === "RUN") return pick(this.frames.run, (this.runFrameT * 24 / 8) % 1);
    if (this.anim === "AIR") return pick(this.frames.jump, this.jumpT / this.airT);
    if (this.anim === "DUCK" || this.anim === "DUCK_START") return pick(this.frames.slide, Math.min(0.99, this.duckTime / T.duckTime));
    return null;
  }

  private layerPose(): LPose {
    const fp = this.flags.pose;
    if (fp === "duck" || fp === "slide") return lSet(LPOSES.slide);
    if (fp === "jump" || fp === "air") return lSet(LPOSES.air);
    let p: LPose = this.anim === "RUN" || this.anim === "DUCK_START" ? lRun(this.t * 14) : lStand();
    if (this.airborne) {
      const u = this.jumpT / Math.max(0.01, this.airT);
      p = u < 0.12 ? lMix(lSet(LPOSES.takeoff), lSet(LPOSES.air), u / 0.12) : u > 0.85 ? lMix(lSet(LPOSES.air), lSet(LPOSES.land), (u - 0.85) / 0.15) : lSet(LPOSES.air);
    } else if (this.anim === "LAND") p = lMix(lSet(LPOSES.land), p, clamp01(this.animT / 0.12));
    else if (this.anim === "HIT") p = lMix(lSet(LPOSES.hit), p, clamp01(this.animT / 0.3));
    const e = this.duckAmt * this.duckAmt * (3 - 2 * this.duckAmt);
    if (e > 0.01) p = lMix(p, lSet(LPOSES.slide), e);
    p.lean = (this.lean ?? 0) * 0.1 + (e > 0.01 ? Math.sign(this.lean || 0) * 0.1 * e : 0);
    return p;
  }

  private drawPlayer(ctx: CanvasRenderingContext2D) {
    const st = this.stageNum();
    if (st === 2 && this.phase !== "landing") {
      this.drawFallingSide(ctx);
      return;
    }
    const rig = this.rigBack;
    const ground = project(this.rx, 0, 0);
    const feet = project(this.rx, this.ry, 0);
    const k = (T.playerHeight * ground.s) / BACK_RIG.height;

    // ground shadow, directly under him: smaller + softer with height, tight while ducking
    const air = clamp01(this.ry / T.jumpHeight);
    const sw = 0.55 * ground.s * (1 - 0.45 * air) * (1 - 0.12 * this.duckAmt);
    ctx.save();
    ctx.globalAlpha = (0.45 + 0.15 * this.duckAmt) * (1 - 0.55 * air);
    const sg = ctx.createRadialGradient(ground.x, ground.y, 1, ground.x, ground.y, sw);
    sg.addColorStop(0, "rgba(0,0,0,0.95)");
    sg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.ellipse(ground.x, ground.y, sw, sw * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (this.paaShield > 0) {
      const c = project(this.rx, this.ry + 1, 0);
      const r = 1.1 * ground.s;
      const g = ctx.createRadialGradient(c.x, c.y, r * 0.2, c.x, c.y, r * 1.1);
      g.addColorStop(0, "rgba(255,214,90,0.35)");
      g.addColorStop(1, "rgba(255,214,90,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, r * 0.8, r * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!rig) return;
    const blink = this.iFrames > 0 && this.phase !== "dying" && Math.floor(this.t * 14) % 2 === 0;
    ctx.save();
    if (blink) ctx.globalAlpha = 0.4;
    if (this.dndShield) {
      ctx.shadowColor = "rgba(90,220,255,0.95)";
      ctx.shadowBlur = 16;
    } else if (this.paaShield > 0) {
      ctx.shadowColor = "rgba(255,210,80,0.95)";
      ctx.shadowBlur = 18;
    }
    const img = this.frameFor();
    const pose = this.renderPose();
    if (img) {
      const h = T.playerHeight * ground.s * FRAME_SCALE;
      const w = (h * img.width) / img.height;
      ctx.translate(feet.x, feet.y);
      ctx.rotate(pose.rot);
      ctx.drawImage(img, -w / 2, -h, w, h);
    } else if (this.layers || (this.layers = buildLayers(null))) {
      ctx.globalAlpha = 1;
      const a = this.iFrames > 0 && this.phase !== "dying" && Math.floor(this.t * 12) % 2 === 0 ? 0.35 : 1;
      drawLayered(ctx, this.layers!, this.layerPose(), feet.x, feet.y, (T.playerHeight * ground.s) / LAYER_RIG.height, a, this.flash > 0.05 ? this.flash : 0);
    } else if (this.flash > 0.05) {
      ctx.shadowBlur = 0;
      drawRigTinted(ctx, rig, pose, feet.x, feet.y, k, "#ffffff", Math.min(1, this.flash * 1.1));
    } else {
      drawRig(ctx, rig, pose, feet.x, feet.y, k);
    }
    ctx.restore();
  }

  private drawFallingSide(ctx: CanvasRenderingContext2D) {
    const p = project(this.rx, 0.5, 0);
    const h = T.playerHeight * p.s;
    if (!this.layers) this.layers = buildLayers(this.fathu.back.ready ? this.fathu.back.img : null);
    if (!this.layers) return;
    // back-view skydive: knees tucked, boots flutter, body sways with steering
    const f = Math.sin(this.t * 7);
    const pose = lSet({
      ...LPOSES.air,
      liftL: 30 + f * 8,
      liftR: 30 - f * 8,
      pitch: 8 * (Math.PI / 180) + Math.sin(this.t * 2.3) * 0.05,
      lean: Math.sin(this.t * 3) * 0.08 + this.lean * 0.3,
      headDX: -this.lean * 4,
    });
    const a = this.iFrames > 0 && Math.floor(this.t * 14) % 2 === 0 ? 0.4 : 1;
    drawLayered(ctx, this.layers, pose, p.x, p.y + h * 0.35, h / LAYER_RIG.height, a, this.flash > 0.05 ? this.flash : 0);
  }

  private drawLeapScene(ctx: CanvasRenderingContext2D) {
    const k = Math.min(1, this.cineT / 2.1);
    const sky = backdrop("streetView", VW, VH, 6, 0.18);
    if (sky) {
      const z = 1.1 + k * 0.2;
      ctx.drawImage(sky, CX - (VW * z) / 2, VH / 2 - (VH * z) / 2 - k * 120, VW * z, VH * z);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, VH);
      g.addColorStop(0, "#9fc7e0");
      g.addColorStop(1, "#4f7a48");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, VW, VH);
    }
    const ry = 560 - k * 260;
    ctx.fillStyle = "#d9d2c4";
    ctx.fillRect(-10, ry, 240, VH);
    ctx.strokeStyle = "#dfe4e8";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-10, ry - 90);
    ctx.lineTo(230, ry - 90);
    ctx.stroke();
    ctx.lineWidth = 3;
    for (let x = 0; x < 230; x += 46) {
      ctx.beginPath();
      ctx.moveTo(x, ry);
      ctx.lineTo(x, ry - 90);
      ctx.stroke();
    }
    const s = this.fathu.side;
    const px = 90 + k * 230;
    const py = ry - 120 - Math.sin(Math.min(1, k * 1.4) * Math.PI) * 150 + Math.max(0, k - 0.6) * 700;
    const h = 250;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-0.25 + k * 1.1);
    if (s.ready && s.img) {
      const w = (h * s.img.width) / s.img.height;
      ctx.drawImage(s.img, -w / 2, -h / 2, w, h);
    } else if (this.rigBack) drawRig(ctx, this.rigBack, poseAir(this.t), 0, h / 2, h / 512);
    ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const y = (i * 113 + this.t * 600) % VH;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(60 + (i % 3) * 30, y);
      ctx.stroke();
    }
  }

  /* ---------------- bosses ---------------- */

  /** Bosses sit centred behind Fathu at the bottom edge, inside the middle lane's width. */
  private bossLayout(i: number) {
    const step = this.phase === "leapPrompt" ? 1 : this.chaseVis;
    const i0 = Math.floor(step);
    const f = step - i0;
    const sc = BOSS_STEPS[Math.min(2, i0)] + (BOSS_STEPS[Math.min(2, i0 + 1)] - BOSS_STEPS[Math.min(2, i0)]) * f;
    const intro = this.phase === "run1" ? smooth(this.bossIntro) : 1;
    const scale = sc * BOSSES[i].scale * (0.75 + 0.25 * intro);
    const side = i === 0 ? -1 : 1;
    const feet = project(this.rx, 0, 0);
    const x = feet.x * 0.4 + CX * 0.6 + side * 92;
    const bob = Math.abs(Math.sin(this.t * 9 + i * 1.3)) * 6;
    const y = VH - 70 - bob + (1 - intro) * 80 + (1 - this.bossPres[i]) * 320;
    return { x, y, scale, headY: y - 100 * scale };
  }

  private drawBosses(ctx: CanvasRenderingContext2D) {
    const show = ["run1", "run3", "leapPrompt", "dying", "countdown", "run2"].includes(this.phase);
    if (!show) return;
    if (this.phase === "run2") {
      this.drawBossesAbove(ctx);
      return;
    }
    if (this.phase === "countdown" && this.startStage !== 1) return;
    for (let i = 0; i < BOSSES.length; i++) {
      if (this.bossPres[i] < 0.02) continue;
      const cfg = BOSSES[i];
      const L = this.bossLayout(i);
      const onVehicle = this.distance >= BOSS_VEHICLE_AT && this.phase === "run3";
      let y = L.y;
      if (onVehicle) {
        this.drawVehicle(ctx, i, L.x, y, L.scale);
        y -= 30 * L.scale;
      }
      const run = this.bossRun[i];
      const runIdx = run ? Math.floor((this.t * 13 + i * 3) % run.length) : 0;
      const runSprite = run && run.every((s) => s.ready && s.img) && !onVehicle && this.phase !== "countdown" ? run[runIdx] : null;
      const sprite = runSprite ?? this.bossSprites[i];
      let tagY = L.headY - 12 * L.scale;
      if (sprite && sprite.ready && sprite.img) {
        // real photos: sized to match Fathu's on-screen height (~290px)
        const h = BOSS_PHOTO_HEIGHT * L.scale;
        const w = (h * sprite.img.width) / sprite.img.height;
        ctx.drawImage(sprite.img, L.x - w / 2, y - h, w, h);
        tagY = y - h - 10 * L.scale;
      } else {
        drawBossPlaceholder(ctx, cfg, L.x, y, L.scale / cfg.scale, this.t * 1.2 + i * 0.6, true);
      }
      drawNameTag(ctx, cfg.name, L.x, tagY, Math.max(0.7, L.scale * 0.8));
    }
  }

  private drawBossesAbove(ctx: CanvasRenderingContext2D) {
    const k = Math.min(1, this.stageDist / 200);
    for (let i = 0; i < BOSSES.length; i++) {
      if (this.bossPres[i] < 0.5) continue;
      const scale = 0.55 * (1 - k * 0.8);
      if (scale < 0.08) continue;
      const x = CX + (i === 0 ? -50 : 50);
      const y = 120 - k * 60;
      drawBossPlaceholder(ctx, BOSSES[i], x, y, scale, this.t + i, false);
    }
  }

  private drawGameOverBosses(ctx: CanvasRenderingContext2D) {
    const scale = 1.55;
    const xs = [112, 282];
    const baseY = VH + 30;
    for (let i = 0; i < 2; i++) {
      if (!crewHas(this.crew, i)) continue;
      const cfg = BOSSES[i];
      const bob = Math.sin(this.t * 3 + i) * 4;
      const sprite = cfg.images.angry ? loadSprite(cfg.images.angry) : null;
      if (sprite && sprite.ready && sprite.img) {
        const h = 200 * scale;
        const w = (h * sprite.img.width) / sprite.img.height;
        ctx.drawImage(sprite.img, xs[i] - w / 2, baseY - h + bob, w, h);
      } else drawBossPlaceholder(ctx, cfg, xs[i], baseY + bob, scale, this.t * 0.4 + i, false);
      drawNameTag(ctx, cfg.name, xs[i], baseY + bob - 190 * scale * cfg.scale - 4, 1);
    }
    const who = this.crew === 1 ? 1 : 0;
    const hx = xs[who];
    const hy = baseY - 165 * scale * BOSSES[who].scale;
    if (who === 0) this.bubbleAt(ctx, CATCHPHRASE_SHOUT, hx + 40, hy - 30, hx + 18, hy + 4, true, false, 1, BOSSES[0].name, "right");
    else this.bubbleAt(ctx, CATCHPHRASE_SHOUT, hx - 40, hy - 30, hx - 18, hy + 4, true, false, 1, BOSSES[1].name, "left");
  }

  private drawVehicle(ctx: CanvasRenderingContext2D, i: number, x: number, y: number, scale: number) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    const wob = Math.sin(this.t * 20) * 1.5;
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(0, 0, 60, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    const wheel = (wx: number, r: number) => {
      ctx.fillStyle = "#1c1d21";
      circle(ctx, wx, -r, r);
      ctx.fillStyle = "#8d939c";
      circle(ctx, wx, -r, r * 0.4);
    };
    if (i === 0) {
      // scooter seen from behind: tyre, body, tail light, mirrors
      wheel(0, 16);
      ctx.fillStyle = "#3f78b8";
      roundRect(ctx, -30, -66 + wob, 60, 44, 16);
      ctx.fill();
      ctx.fillStyle = "#e23b3b";
      roundRect(ctx, -12, -42 + wob, 24, 7, 3);
      ctx.fill();
      ctx.fillStyle = "#222";
      roundRect(ctx, -26, -74 + wob, 52, 10, 5);
      ctx.fill();
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-38, -112 + wob); ctx.lineTo(-24, -96 + wob);
      ctx.moveTo(38, -112 + wob); ctx.lineTo(24, -96 + wob);
      ctx.stroke();
      ctx.fillStyle = "#cfd6de";
      circle(ctx, -40, -114 + wob, 6);
      circle(ctx, 40, -114 + wob, 6);
    } else {
      // auto-rickshaw from behind: yellow canopy, green body, plate
      wheel(-42, 15);
      wheel(42, 15);
      ctx.fillStyle = "#1f7a33";
      roundRect(ctx, -54, -78 + wob, 108, 56, 12);
      ctx.fill();
      ctx.fillStyle = "#f2c230";
      ctx.beginPath();
      ctx.moveTo(-58, -76 + wob);
      ctx.quadraticCurveTo(0, -150 + wob, 58, -76 + wob);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#191919";
      roundRect(ctx, -40, -108 + wob, 80, 26, 8);
      ctx.fill();
      ctx.fillStyle = "#f6f1df";
      roundRect(ctx, -22, -46 + wob, 44, 14, 3);
      ctx.fill();
      ctx.fillStyle = "#222";
      ctx.font = "700 9px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("KA 01 MS", 0, -39 + wob);
      ctx.fillStyle = "#e23b3b";
      circle(ctx, -46, -36 + wob, 5);
      circle(ctx, 46, -36 + wob, 5);
    }
    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      if (!p.active) continue;
      const a = Math.max(0, p.life / p.max);
      if (p.kind === "ring") {
        const r = p.size + (1 - a) * 50;
        ctx.globalAlpha = a;
        ctx.strokeStyle = p.col;
        ctx.lineWidth = 3 * a + 1;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, r, r * 0.35, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.kind === "dust") {
        ctx.globalAlpha = a * 0.5;
        ctx.fillStyle = p.col;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.globalAlpha = a;
        ctx.fillStyle = p.col;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const p of this.popups) {
      if (!p.active) continue;
      const a = Math.min(1, p.life / 0.3);
      const s = 1 + Math.max(0, p.life - 0.6) * 1.5;
      ctx.globalAlpha = a;
      ctx.font = `${Math.round(p.size * s)}px Bangers, Impact, sans-serif`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(20,12,6,0.9)";
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = p.col;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------------- speech bubbles ---------------- */

  private drawBubble(ctx: CanvasRenderingContext2D) {
    const b = this.bubble;
    if (!b || this.phase === "over") return;
    if (this.phase === "run2" || this.phase === "landing" || this.phase === "leapCinematic") return;
    const L = this.bossLayout(b.boss);
    const k = 1 - b.life / b.max;
    const pop = k < 0.12 ? 0.6 + (k / 0.12) * 0.45 : k < 0.2 ? 1.05 - ((k - 0.12) / 0.08) * 0.05 : 1;
    const alpha = b.life < 0.3 ? b.life / 0.3 : 1;
    const side = b.boss === 0 ? "left" : "right";
    // bubble sits in the bottom corner beside the speaker, clear of the lanes
    const ax = b.boss === 0 ? 100 : VW - 100;
    const ay = L.headY - 70;
    this.bubbleAt(ctx, b.text, ax, ay, L.x, L.headY, b.big, b.golden, alpha, BOSSES[b.boss].name, side, pop, true);
  }

  private bubbleAt(
    ctx: CanvasRenderingContext2D,
    text: string,
    ax: number,
    ay: number,
    tx: number,
    ty: number,
    big: boolean,
    golden: boolean,
    alpha: number,
    name: string,
    side: "left" | "right",
    pop = 1,
    edge = false,
  ) {
    const fs = edge ? (big ? 22 : 15) : big ? 30 : 17;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `${fs}px Bangers, Impact, sans-serif`;
    const maxW = edge ? 104 : big ? 210 : 170;
    const words = text.split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(test).width > maxW && cur) {
        lines.push(cur);
        cur = w;
      } else cur = test;
    }
    if (cur) lines.push(cur);
    const lh = fs * 1.08;
    const bw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 30;
    const bh = lines.length * lh + 26;
    let bx = edge ? (side === "left" ? 8 : VW - bw - 8) : side === "left" ? ax - bw * 0.35 : ax - bw * 0.65;
    bx = Math.max(8, Math.min(VW - bw - 8, bx));
    const by = Math.max(70, ay - bh - 18);

    ctx.translate(tx, ty);
    ctx.scale(pop, pop);
    ctx.translate(-tx, -ty);

    const fill = golden ? "#ffdf86" : big ? "#fff3e2" : "#ffffff";
    ctx.shadowColor = golden ? "rgba(255,200,60,0.9)" : "rgba(0,0,0,0.35)";
    ctx.shadowBlur = golden ? 22 : 8;
    ctx.shadowOffsetY = golden ? 0 : 3;
    ctx.fillStyle = fill;
    roundRect(ctx, bx, by, bw, bh, 16);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    const baseX = Math.max(bx + 20, Math.min(bx + bw - 20, tx));
    const tipY = Math.min(ty - 6, by + bh + 26);
    ctx.beginPath();
    ctx.moveTo(baseX - 11, by + bh - 2);
    ctx.lineTo(baseX + 11, by + bh - 2);
    ctx.lineTo(tx, tipY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = golden ? "#b8860b" : "#1d1d22";
    ctx.lineWidth = big ? 3.5 : 2.5;
    ctx.beginPath();
    ctx.moveTo(baseX + 11, by + bh);
    ctx.lineTo(tx, tipY);
    ctx.lineTo(baseX - 11, by + bh);
    ctx.stroke();
    roundRect(ctx, bx, by, bw, bh, 16);
    ctx.stroke();
    ctx.fillStyle = fill;
    ctx.fillRect(baseX - 9, by + bh - 4, 18, 5);

    ctx.fillStyle = golden ? "#6b4a06" : "#1d1d22";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    lines.forEach((l, i) => ctx.fillText(l, bx + bw / 2, by + 13 + lh / 2 + i * lh));
    ctx.font = "700 9px Inter, system-ui, sans-serif";
    ctx.fillStyle = golden ? "#8a6a12" : "#8a8a94";
    ctx.fillText(name, bx + bw / 2, by + bh - 7);
    ctx.restore();
  }

  /* ---------------- overlays ---------------- */

  private drawSpeedLines(ctx: CanvasRenderingContext2D) {
    const over = clamp01((this.speed - T.speedLinesFrom) / (T.maxSpeed - T.speedLinesFrom));
    const amt = Math.max(this.speedBurst * 0.6, this.isPlayable() ? over : 0);
    if (amt <= 0.02) return;
    ctx.save();
    ctx.strokeStyle = `rgba(255,248,230,${0.4 * amt})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 22; i++) {
      const ang = i * 2.4 + Math.floor(this.t * 20) * 0.37;
      const dx = Math.cos(ang);
      const dy = Math.sin(ang);
      // only near the screen edges
      const r0 = 300 + ((i * 53 + this.t * 900) % 160);
      const r1 = r0 + 60 + amt * 90;
      ctx.beginPath();
      ctx.moveTo(CX + dx * r0, HORIZON + dy * r0);
      ctx.lineTo(CX + dx * r1, HORIZON + dy * r1);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawOverlays(ctx: CanvasRenderingContext2D) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (this.phase === "countdown") {
      const i = Math.floor(this.countT / 0.8);
      const f = (this.countT % 0.8) / 0.8;
      const label = i < 3 ? String(3 - i) : "GO!";
      const s = 1.5 - easeOut(f * 2) * 0.5;
      ctx.save();
      ctx.globalAlpha = f > 0.75 ? (1 - f) / 0.25 : 1;
      ctx.translate(CX, 330);
      ctx.scale(s, s);
      ctx.font = `${i < 3 ? 120 : 96}px Bangers, Impact, sans-serif`;
      ctx.lineWidth = 10;
      ctx.strokeStyle = "#2a1406";
      ctx.strokeText(label, 0, 0);
      ctx.fillStyle = i < 3 ? "#ffd34d" : "#7fe39a";
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }

    if (this.phase === "leapPrompt") {
      ctx.save();
      ctx.fillStyle = "rgba(10,12,18,0.35)";
      ctx.fillRect(0, 0, VW, VH);
      const pulse = 1 + Math.sin(this.t * 6) * 0.06;
      ctx.translate(CX, 250);
      ctx.scale(pulse, pulse);
      ctx.font = "54px Bangers, Impact, sans-serif";
      ctx.lineWidth = 8;
      ctx.strokeStyle = "#2a1406";
      ctx.strokeText(LEAP.prompt, 0, 0);
      ctx.fillStyle = "#ffe07a";
      ctx.fillText(LEAP.prompt, 0, 0);
      ctx.restore();
      const mw = 270;
      const mx = CX - mw / 2;
      const my = 300;
      ctx.fillStyle = "rgba(20,14,10,0.6)";
      roundRect(ctx, mx - 4, my - 4, mw + 8, 28, 14);
      ctx.fill();
      ctx.fillStyle = "rgba(110,225,150,0.85)";
      roundRect(ctx, mx + mw * 0.62, my, mw * 0.28, 20, 10);
      ctx.fill();
      ctx.fillStyle = "#fff";
      roundRect(ctx, mx + mw * this.leapMeter - 4, my - 8, 8, 36, 4);
      ctx.fill();
      ctx.font = "600 12px Inter, system-ui, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillText("tap inside the green band", CX, my + 46);
    }

    if (this.tutLife > 0 && this.isPlayable()) {
      const a = Math.min(1, this.tutLife / 0.3, (2.2 - this.tutLife) / 0.2);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = "700 15px Inter, system-ui, sans-serif";
      const w = ctx.measureText(this.tutText).width + 36;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      roundRect(ctx, CX - w / 2, 236, w, 36, 18);
      ctx.fill();
      ctx.fillStyle = "#1d1d22";
      ctx.fillText(this.tutText, CX, 254);
      ctx.restore();
    }

    if (this.toast) {
      const k = 1 - this.toast.life / this.toast.max;
      const a = k < 0.1 ? k / 0.1 : k > 0.88 ? (1 - k) / 0.12 : 1;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = "700 14px Inter, system-ui, sans-serif";
      const w = Math.min(340, ctx.measureText(this.toast.text).width + 36);
      const y = 132 - (1 - Math.min(1, k / 0.1)) * 14;
      ctx.fillStyle = this.toast.gold ? "rgba(255,213,102,0.96)" : "rgba(22,18,16,0.86)";
      roundRect(ctx, CX - w / 2, y, w, 38, 19);
      ctx.fill();
      ctx.fillStyle = this.toast.gold ? "#3a2a04" : "#f4f1ea";
      ctx.fillText(this.toast.text, CX, y + 19, w - 20);
      ctx.restore();
    }

    if (this.stampAnim > 0) {
      const k = 1 - this.stampAnim / 2.2;
      const s = k < 0.2 ? 2.4 - (k / 0.2) * 1.4 : 1;
      ctx.save();
      ctx.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1;
      ctx.translate(CX, 380);
      ctx.rotate(-0.22);
      ctx.scale(s, s);
      ctx.strokeStyle = "#c0392b";
      ctx.lineWidth = 5;
      roundRect(ctx, -140, -34, 280, 68, 8);
      ctx.stroke();
      ctx.fillStyle = "#c0392b";
      ctx.font = "30px Bangers, Impact, sans-serif";
      ctx.fillText(EASTER_EGG.stamp, 0, 2);
      ctx.restore();
    }

    if (this.phoneCall > 0 && this.isPlayable()) {
      ctx.save();
      const wob = Math.sin(this.t * 22) * 3;
      ctx.translate(VW - 80 + wob, 200);
      ctx.fillStyle = "rgba(20,22,28,0.92)";
      roundRect(ctx, -66, -30, 132, 60, 12);
      ctx.fill();
      ctx.strokeStyle = "#5ad07a";
      ctx.lineWidth = 2;
      roundRect(ctx, -66, -30, 132, 60, 12);
      ctx.stroke();
      ctx.fillStyle = "#5ad07a";
      ctx.font = "700 10px Inter, system-ui, sans-serif";
      ctx.fillText("INCOMING", 0, -13);
      ctx.fillStyle = "#f4f1ea";
      ctx.font = "800 12px Inter, system-ui, sans-serif";
      ctx.fillText(this.phoneText, 0, 5);
      ctx.font = "600 9px Inter, system-ui, sans-serif";
      ctx.fillStyle = "#9aa0aa";
      ctx.fillText(BOSSES[this.speaker()].name, 0, 19);
      ctx.restore();
    }

    if (this.phase === "run3") {
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = "#fff";
      ctx.font = "700 10px Inter, system-ui, sans-serif";
      ctx.fillText(SEGMENT_LABELS[this.segment], CX, 180);
      ctx.restore();
    }
  }

  /** ?debug=1 — world-space hitboxes projected through the same camera. */
  private drawDebug(ctx: CanvasRenderingContext2D) {
    ctx.save();
    const wire = (b: ObBox, col: string) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.5;
      const c = [
        project(b.x0, b.y0, b.z0), project(b.x1, b.y0, b.z0), project(b.x1, b.y1, b.z0), project(b.x0, b.y1, b.z0),
        project(b.x0, b.y0, b.z1), project(b.x1, b.y0, b.z1), project(b.x1, b.y1, b.z1), project(b.x0, b.y1, b.z1),
      ];
      const e = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
      ctx.beginPath();
      for (const [i, j] of e) {
        ctx.moveTo(c[i].x, c[i].y);
        ctx.lineTo(c[j].x, c[j].y);
      }
      ctx.stroke();
    };
    // lane centre lines
    ctx.strokeStyle = "rgba(0,255,255,0.5)";
    ctx.lineWidth = 1;
    for (const lx of LANE_X) {
      const a = project(lx, 0, -2);
      const b = project(lx, 0, FAR);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(255,255,0,0.6)";
    groundQuad(ctx, -4, 4, -0.01, 0.01, 0.01);
    ctx.fill();
    wire({
      x0: this.rx - T.playerHalfWidth, x1: this.rx + T.playerHalfWidth,
      y0: this.ry, y1: this.ry + this.bodyHeight(), z0: -T.playerHalfDepth, z1: T.playerHalfDepth,
    }, "#0f0");
    let nearest: Obstacle | null = null;
    for (const o of this.obstacles) {
      if (!o.active) continue;
      const b = { ...o, z0: o.z0 + this.rMove, z1: o.z1 + this.rMove };
      wire(b, o.hit ? "#f00" : "#f0f");
      if (o.z1 > -0.5 && (!nearest || o.z0 < nearest.z0)) nearest = o;
    }
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(8, VH - 88, 230, 80);
    ctx.fillStyle = "#0f0";
    ctx.font = "11px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(`fps ${this.fps.toFixed(0)}  speed ${this.speed.toFixed(1)} m/s`, 14, VH - 72);
    ctx.fillText(`anim ${this.anim} t=${this.animT.toFixed(2)} air=${this.airT.toFixed(2)}`, 14, VH - 58);
    ctx.fillText(`y=${this.yUp.toFixed(2)}m  h=${this.bodyHeight().toFixed(2)}m  x=${this.laneX.toFixed(2)}`, 14, VH - 44);
    ctx.fillText(nearest ? `nearest ${nearest.kind} z=${nearest.z0.toFixed(1)}m` : "nearest —", 14, VH - 30);
    ctx.fillText(`phase ${this.phase} god=${this.flags.god} x${this.flags.speed}`, 14, VH - 16);
    ctx.restore();
  }

  /* ---------------- HOME scene ---------------- */

  private renderHome(ctx: CanvasRenderingContext2D) {
    const intro = this.phase === "intro" ? this.introT : 0;
    const push = 1 + smooth(intro / INTRO_LEN) * 0.28;
    ctx.save();
    ctx.translate(CX, VH * 0.55);
    ctx.scale(push, push);
    ctx.translate(-CX, -VH * 0.55);

    const bg = backdrop("corridor", VW + 80, VH + 80, 12, 0.42, 0.28);
    const dx = Math.sin(this.t * 0.12) * 30 - 40;
    const dy = Math.cos(this.t * 0.09) * 14 - 40;
    if (bg) ctx.drawImage(bg, dx, dy);
    else {
      const g = ctx.createLinearGradient(0, 0, 0, VH);
      g.addColorStop(0, "#5a4632");
      g.addColorStop(1, "#1e140c");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, VW, VH);
    }
    const fg = backdrop("grass", 220, 320, 10, 0.5, 0.3);
    if (fg) {
      ctx.globalAlpha = 0.45;
      ctx.drawImage(fg, VW - 170 + Math.sin(this.t * 0.2) * 16, 420);
      ctx.globalAlpha = 1;
    }
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 3; i++) {
      const x = 20 + i * 70 + Math.sin(this.t * 0.3 + i) * 12;
      const g = ctx.createLinearGradient(x, 0, x + 160, VH * 0.7);
      g.addColorStop(0, "rgba(255,214,150,0.14)");
      g.addColorStop(1, "rgba(255,214,150,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 40, 0);
      ctx.lineTo(x + 230, VH * 0.75);
      ctx.lineTo(x + 130, VH * 0.75);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    const fl = ctx.createRadialGradient(CX, 700, 20, CX, 700, 260);
    fl.addColorStop(0, "rgba(255,190,120,0.35)");
    fl.addColorStop(1, "rgba(255,190,120,0)");
    ctx.fillStyle = fl;
    ctx.fillRect(0, 440, VW, VH - 440);

    ctx.save();
    ctx.globalAlpha = 0.85;
    drawNameplate(ctx, 0, { x: 66, y: 330, s: 0.55 });
    ctx.restore();

    const feetY = 702;
    const H = VH * 0.6;
    const k = H / FRONT_RIG.height;
    ctx.save();
    ctx.globalAlpha = 0.5;
    const sh = ctx.createRadialGradient(CX, feetY, 2, CX, feetY, 90);
    sh.addColorStop(0, "rgba(0,0,0,0.85)");
    sh.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.ellipse(CX, feetY, 90, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    let pose = poseIdleFront(this.t);
    let rig = this.rigFront;
    if (intro > 0) {
      const tt = intro / 0.5;
      if (tt < 0.5) pose = { ...pose, turn: Math.max(0.04, 1 - tt * 2) };
      else {
        rig = this.rigBack;
        pose = { ...basePose(), turn: Math.max(0.04, Math.min(1, (tt - 0.5) * 2)) };
      }
    }
    const ts = this.turnSheet;
    if (ts.ready && ts.img) {
      // real video frames: front -> side -> back turn
      const n = TURN_FRAMES;
      const fw = ts.img.width / n;
      const u = intro > 0 ? smooth(Math.min(1, intro / TURN_LEN)) : 0;
      const fi = Math.min(n - 1, Math.floor(u * n));
      const dh = H * 1.02;
      const dw = (dh * fw) / ts.img.height;
      const sway = intro > 0 ? 0 : Math.sin(this.t * 0.75) * 2;
      ctx.save();
      ctx.shadowColor = "rgba(255,196,130,0.75)";
      ctx.shadowBlur = 22;
      ctx.drawImage(ts.img, fi * fw, 0, fw, ts.img.height, CX - dw / 2 + sway, feetY - dh, dw, dh);
      ctx.restore();
    } else if (rig) {
      ctx.save();
      ctx.shadowColor = "rgba(255,196,130,0.75)";
      ctx.shadowBlur = 22;
      drawRig(ctx, rig, pose, CX, feetY, k);
      ctx.restore();
    }
    ctx.restore();

    ctx.fillStyle = "rgba(255,236,200,0.6)";
    for (const d of this.dust) {
      ctx.globalAlpha = 0.3 + 0.3 * Math.sin(this.t + d.a);
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (this.vignette) ctx.drawImage(this.vignette, 0, 0);
    if (intro > TURN_LEN + 0.15) {
      ctx.fillStyle = `rgba(10,6,4,${Math.min(1, (intro - TURN_LEN - 0.15) / 0.35)})`;
      ctx.fillRect(0, 0, VW, VH);
    }
  }
}
