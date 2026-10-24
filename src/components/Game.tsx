import { useEffect, useRef, useState } from "react";
import { Engine, type Action, type PublicState } from "@/game/engine";
import { VH, VW } from "@/game/proj";
import { audio } from "@/game/audio";
import { preloadAll } from "@/game/preload";
import { CREDIT, FAREWELL, TAGLINE, TITLE, UI, WISHES, WISH_ROTATE_MS } from "@/config/game";
import { GAME_OVER_SECOND_LINE } from "@/config/bosses";

const INIT: PublicState = {
  phase: "home", paused: false, distance: 0, best: 0, newBest: false, coins: 0, letters: 0, books: 0,
  score: 0, lives: 3, chase: 0, dnd: false, shield: 0, torch: 0, count: 3, segment: "", stage: 1, hints: true,
};

const display = { fontFamily: "Bangers, Impact, sans-serif", letterSpacing: "0.03em" };
const outline = { ...display, WebkitTextStroke: "2px #2a1406", textShadow: "0 4px 0 #2a1406" };

function Ring({ v, label, color }: { v: number; label: string; color: string }) {
  const c = 2 * Math.PI * 16;
  return (
    <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-[9px] font-bold text-white">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="16" fill="none" stroke={color} strokeWidth="4" strokeDasharray={c} strokeDashoffset={c * (1 - v)} />
      </svg>
      {label}
    </div>
  );
}

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const [s, setS] = useState<PublicState>(INIT);
  const [muted, setMuted] = useState(false);
  const [wish, setWish] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const [ready, setReady] = useState(false);
  const [team, setTeam] = useState(false);

  useEffect(() => {
    let alive = true;
    preloadAll((p) => alive && setLoaded(p)).finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = VW * dpr;
    c.height = VH * dpr;
    c.getContext("2d")?.scale(dpr, dpr);
    let eng: Engine | null = null;
    try {
      eng = new Engine(c, setS);
      eng.mount();
      engineRef.current = eng;
    } catch (e) {
      console.error(e);
    }
    const vis = () => document.hidden && engineRef.current?.pause();
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("blur", vis);
    return () => {
      eng?.destroy();
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener("blur", vis);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setWish((w) => (w + 1) % WISHES.length), WISH_ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const m: Record<string, Action> = {
      ArrowLeft: "left", ArrowRight: "right", ArrowUp: "jump", ArrowDown: "slide",
      a: "left", d: "right", w: "jump", s: "slide", " ": "tap",
    };
    const down = (e: KeyboardEvent) => {
      const a = m[e.key];
      if (e.key === "Escape" || e.key === "p") engineRef.current?.pause();
      if (!a) return;
      e.preventDefault();
      if (e.repeat) return;
      engineRef.current?.input(a);
    };
    const up = (e: KeyboardEvent) => {
      const a = m[e.key];
      if (a) engineRef.current?.release(a);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    let sx = 0, sy = 0, st = 0, fired = false;
    const start = (e: TouchEvent) => {
      const t = e.touches[0];
      sx = t.clientX; sy = t.clientY; st = Date.now(); fired = false;
    };
    const move = (e: TouchEvent) => {
      if (fired) return;
      const t = e.touches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return;
      fired = true;
      const eng = engineRef.current;
      if (!eng) return;
      if (Math.abs(dx) > Math.abs(dy)) eng.input(dx > 0 ? "right" : "left");
      else eng.input(dy > 0 ? "slide" : "jump", true);
    };
    const end = () => {
      const eng = engineRef.current;
      if (!fired && Date.now() - st < 350) eng?.input("tap");
      eng?.release("slide");
    };
    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchmove", move, { passive: true });
    el.addEventListener("touchend", end, { passive: true });
    return () => {
      el.removeEventListener("touchstart", start);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", end);
    };
  }, []);

  const toggleSound = () => {
    const m = !muted;
    audio.setMuted(m);
    setMuted(m);
  };
  const eng = () => engineRef.current;
  const playing = ["run1", "run2", "run3", "leapPrompt", "countdown", "landing", "leapCinematic", "dying"].includes(s.phase);
  const w = WISHES[wish % WISHES.length];

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-neutral-950 sm:p-4" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <div className="relative overflow-hidden bg-black shadow-2xl sm:rounded-3xl" style={{ width: "min(100vw, calc(100dvh * 390 / 844))", aspectRatio: "390 / 844" }}>
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none select-none" onClick={() => eng()?.input("tap")} />

        {/* HUD */}
        {playing && (
          <div className="pointer-events-none absolute inset-0 text-white">
            <div className="absolute left-3 top-3 leading-none">
              <div className="text-4xl" style={outline}>{s.distance}<span className="text-xl"> m</span></div>
              <div className="mt-1 flex gap-0.5 text-lg">
                {[0, 1, 2].map((i) => <span key={i} className={i < s.lives ? "" : "opacity-25 grayscale"}>❤️</span>)}
              </div>
            </div>
            <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1">
              <span className="inline-block h-4 w-4 rounded-full border-2 border-amber-200 bg-amber-400" />
              <span className="text-2xl leading-none" style={display}>{s.coins}</span>
            </div>
            {/* chase meter */}
            <div className="absolute right-4 top-16 flex h-32 w-7 flex-col items-center justify-between rounded-full bg-black/45 py-1.5">
              <span className="text-base">🏃</span>
              <div className="relative w-full flex-1">
                <span className="absolute left-1/2 -translate-x-1/2 text-sm transition-all duration-300" style={{ bottom: `${s.chase * 70}%` }}>😠</span>
              </div>
            </div>
            <div className="absolute bottom-4 left-3 flex gap-2">
              {s.shield > 0 && <Ring v={s.shield} label="PAA" color="#ffd34d" />}
              {s.torch > 0 && <Ring v={s.torch} label="LIGHT" color="#ffe9a8" />}
              {s.dnd && <Ring v={1} label="DND" color="#5adcff" />}
            </div>
          </div>
        )}
        {playing && !s.paused && (
          <button aria-label="Pause" onClick={() => eng()?.pause()} className="absolute left-1/2 top-3 h-9 w-9 -translate-x-1/2 rounded-full bg-black/50 text-sm font-black text-white">❚❚</button>
        )}

        {/* Pause */}
        {s.paused && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 text-white">
            <div className="mb-2 text-5xl" style={outline}>PAUSED</div>
            <button onClick={() => eng()?.resume()} className="w-48 rounded-full bg-amber-400 py-3 text-2xl text-black" style={display}>RESUME</button>
            <button onClick={() => eng()?.goHome()} className="w-48 rounded-full bg-white/15 py-2.5 text-xl" style={display}>HOME</button>
            <button onClick={toggleSound} className="w-48 rounded-full bg-white/15 py-2.5 text-xl" style={display}>SOUND {muted ? "OFF" : "ON"}</button>
            <button onClick={() => eng()?.setHints(!s.hints)} className="w-48 rounded-full bg-white/15 py-2.5 text-xl" style={display}>HINTS {s.hints ? "ON" : "OFF"}</button>
          </div>
        )}

        {/* Home */}
        {s.phase === "home" && ready && (
          <div className="pointer-events-none absolute inset-0 text-white">
            <div className="absolute inset-x-0 top-0 h-[42%] bg-gradient-to-b from-black/70 via-black/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-black/75 to-transparent" />
            <div className="relative px-5 pt-6 text-center">
              <h1 className="leading-[0.9]"><span className="block text-[30px] text-white" style={outline}>ESCAPE FROM</span><span className="block text-[78px] text-amber-300" style={{ ...outline, WebkitTextStroke: "3px #2a1406", textShadow: "0 6px 0 #2a1406" }}>M&amp;S</span></h1>
              <div className="mx-auto mt-1 inline-block rounded-md border border-amber-200 bg-gradient-to-b from-amber-300 to-amber-600 px-3 py-0.5 text-[11px] font-bold text-amber-950 shadow">Murali &amp; Sumeet, Chartered Accountants</div>
              <p className="mt-2 text-[13px] font-semibold text-white/85">{TAGLINE}</p>
              {s.best > 0 && <div className="mx-auto mt-2 inline-flex items-center gap-1 rounded-full bg-black/50 px-3 py-1 text-[12px] font-bold text-amber-200">🏆 Best {s.best} m</div>}
            </div>
            <div className="absolute inset-x-0 bottom-[150px] flex justify-center gap-3 text-[10px] font-semibold text-white/80">
              <span className="rounded-lg bg-black/45 px-2 py-1">⇆ Swipe to change lane</span>
              <span className="rounded-lg bg-black/45 px-2 py-1">⇡ Jump</span>
              <span className="rounded-lg bg-black/45 px-2 py-1">⇣ Slide</span>
            </div>
            <div className="pointer-events-auto absolute inset-x-0 bottom-5 flex flex-col items-center gap-2">
              <button onClick={() => eng()?.play()} className="animate-pulse rounded-full bg-amber-400 px-14 py-3 text-4xl text-black shadow-[0_0_30px_rgba(255,200,80,0.7)] active:scale-95" style={display}>{UI.play}</button>
              <div className="flex gap-2">
                <button onClick={() => setTeam(true)} className="rounded-full bg-black/55 px-4 py-1.5 text-xs font-semibold">{FAREWELL.heading}</button>
                <button onClick={toggleSound} className="rounded-full bg-black/55 px-3 py-1.5 text-xs">{muted ? "🔇" : "🔊"}</button>
              </div>
              <div className="text-[10px] text-white/55">{CREDIT}</div>
            </div>
          </div>
        )}

        {team && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/75 p-6" onClick={() => setTeam(false)}>
            <div className="rounded-2xl bg-amber-50 p-5 text-neutral-900 shadow-2xl">
              <div className="text-3xl text-amber-700" style={display}>{FAREWELL.heading}</div>
              <p className="mt-2 text-[13px] leading-relaxed">{FAREWELL.message}</p>
              <p className="mt-3 text-[13px] italic">“{w?.text}”</p>
              <p className="text-[11px] text-neutral-500">— {w?.from}</p>
              <button className="mt-4 w-full rounded-full bg-neutral-900 py-2 text-sm font-bold text-amber-50">Close</button>
            </div>
          </div>
        )}

        {/* Game over — stacked, top 70%; bosses are drawn below */}
        {s.phase === "over" && (
          <div className="absolute inset-x-0 top-0 flex h-[70%] flex-col items-center gap-2 px-6 pt-6 text-center text-white">
            <div className="text-4xl text-amber-300" style={outline}>{UI.gameOverTitle}</div>
            <div className="text-xs text-white/75">{GAME_OVER_SECOND_LINE}</div>
            <div className="text-6xl leading-none" style={outline}>{s.distance}<span className="text-2xl"> m</span></div>
            <div className="flex items-center gap-2 text-xs text-white/75">
              Best {s.best} m {s.newBest && <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-black">NEW BEST!</span>}
            </div>
            <div className="text-xs text-white/75">🪙 {s.coins} coins · 📄 {s.letters} Form 108 · 📘 {s.books} modules</div>
            <div className="w-full rounded-2xl bg-white/10 p-3">
              <div className="text-lg text-amber-300" style={display}>{FAREWELL.heading}</div>
              <p className="text-[12px] leading-snug text-white/90">{w?.text}</p>
              <p className="text-[10px] text-white/55">— {w?.from}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => eng()?.retry()} className="rounded-full bg-amber-400 px-8 py-2.5 text-2xl text-black" style={display}>{UI.retry}</button>
              <button onClick={() => eng()?.goHome()} className="rounded-full bg-white/15 px-6 py-2.5 text-2xl" style={display}>HOME</button>
            </div>
          </div>
        )}

        {/* Loading */}
        {!ready && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-neutral-950 text-white">
            <div className="text-3xl text-amber-300" style={outline}>{TITLE}</div>
            <div className="h-2 w-56 overflow-hidden rounded-full bg-white/15">
              <div className="h-full bg-amber-400 transition-all" style={{ width: `${Math.round(loaded * 100)}%` }} />
            </div>
            <div className="text-xs text-white/60">Loading… {Math.round(loaded * 100)}%</div>
          </div>
        )}
      </div>
    </div>
  );
}
