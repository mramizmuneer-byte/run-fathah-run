# Escape from M&S — understanding + baseline import

## What the game is (confirmed from the code)

A portrait, mobile-first endless runner farewell gift for Fathu, drawn entirely on one HTML5 canvas. React + TypeScript on TanStack Start, Tailwind, no backend, no audio files.

**Story flow (phases in `src/game/engine.ts`):**
`home → intro → countdown → run1 → leapPrompt → leapCinematic → run2 → landing → run3 → dying → over`

- **Stage 1 — 3rd-floor balcony/corridor** (420 m): office obstacles (audit files, GST returns, chairs, pipes, urgent emails).
- **Stage 2 — The Leap** (260 m): a "TAP TO LEAP!" timing prompt, a cinematic, then a tree-canopy descent (branches, crows, vines).
- **Stage 3 — Bangalore road** (endless): potholes, autos, cows, buses, low cables; sky cycles morning → night; bosses get a scooter/auto at 2000 m.

**Core mechanics:**
- 3 lives (`lives = 3 - hits`); each hit brings the bosses closer (chase meter, 3 boss scale steps); a 15 s clean run in stage 3 recovers one hit; 3rd hit → `dying` → `over` (unless `?god=1`).
- Speed ramps 16 → 38 m/s over 150 s; stage 1 runs at 0.7×, stage 2 at 0.8×.
- Hand-designed spawn chunks (20–30 m) that always leave a safe path; per-stage obstacle pools by action (jump / block / slide / bus).
- Collectibles: coins, chai, stamps, food, leaves, and 5 letters spell the "RESIGNATION ACCEPTED" easter egg (+500). Power-ups: PAA shield (5 s), flashlight (5 s), DND.
- Best score in localStorage (`fathu-escape-best`); hints setting persisted too.
- Input: swipes + tap on touch, arrows/WASD/space on keyboard, Esc/P pause, auto-pause on tab blur.
- Debug flags: `?stage=2|3`, `?god=1`, `?debug=1`, `?speed=1.5`, `?pose=run|jump|duck|land`.

**Rendering architecture:**
- Shared pinhole camera (`proj.ts`) — everything placed in metres, projected to pseudo-3D (`draw3d.ts`).
- Fathu is a puppet rig cut from your three renders (back/side/front) via polygons + pivots (`config/rig.ts`, `game/rig.ts`, `game/layered.ts`), with pose data in `config/anim.ts` and optional frame-by-frame sprite override from `/public/sprites`.
- Bosses use cartoon placeholders drawn in `bossArt.ts` — `config/bosses.ts` has `images: null` slots ready for real photos.
- Office photos become blurred/warm-graded backdrops (`photos.ts`); sound is 100% synthesised WebAudio (`audio.ts`).
- All editable text (title, farewell, wishes, milestones, obstacle names, scoring) lives in `config/game.ts`; all gameplay numbers in `config/tuning.ts`.

## Plan

1. **Import the game into this project as the working baseline** — copy `src/game/*`, `src/config/*`, `src/components/Game.tsx`, and the image assets (via Lovable Assets), wire `Game` into `src/routes/index.tsx`, and match the template's root/styles setup.
2. **Verify it runs** in the preview: home screen loads, a run starts, stage flags (`?stage=2`, `?god=1`) work.
3. **Then iterate together** on whatever upgrades you want next (real boss photos, new obstacles, tuning, more stages, etc.) — discussed before building.

## Technical notes

- No backend needed; no Lovable Cloud required.
- Asset pointers via `lovable-assets` for the three Fathu renders and the office photos; no binaries committed to the repo.
- The uploaded zip is only extracted to a temp folder for reading — nothing is copied until this plan is approved.
