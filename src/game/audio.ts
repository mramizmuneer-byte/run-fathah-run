/** Tiny synthesised sound effects. No audio files. */

type Kind =
  | "step"
  | "coin"
  | "hit"
  | "whoosh"
  | "boing"
  | "pop"
  | "stamp"
  | "shield"
  | "ring"
  | "thud"
  | "scrape"
  | "tick"
  | "go"
  | "warn"
  | "close";

class Audio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  unlock() {
    this.ensure();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.35;
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    slideTo?: number,
  ) {
    const ctx = this.ensure();
    if (!ctx || !this.master || this.muted) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    const t = ctx.currentTime;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol: number, hp: number) {
    const ctx = this.ensure();
    if (!ctx || !this.master || this.muted) return;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = hp;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start();
  }

  play(kind: Kind) {
    switch (kind) {
      case "step":
        this.noise(0.05, 0.12, 900);
        break;
      case "coin":
        this.tone(880, 0.07, "square", 0.16);
        window.setTimeout(() => this.tone(1320, 0.09, "square", 0.13), 55);
        break;
      case "hit":
        this.tone(160, 0.25, "sawtooth", 0.3, 55);
        this.noise(0.18, 0.2, 200);
        break;
      case "whoosh":
        this.noise(0.22, 0.16, 500);
        break;
      case "boing":
        this.tone(520, 0.32, "triangle", 0.28, 120);
        window.setTimeout(() => this.tone(300, 0.2, "triangle", 0.16, 640), 110);
        break;
      case "pop":
        this.tone(620, 0.05, "sine", 0.14, 980);
        break;
      case "stamp":
        this.noise(0.09, 0.3, 120);
        this.tone(200, 0.16, "square", 0.2, 90);
        break;
      case "shield":
        this.tone(660, 0.1, "sine", 0.18);
        window.setTimeout(() => this.tone(990, 0.14, "sine", 0.16), 80);
        window.setTimeout(() => this.tone(1320, 0.18, "sine", 0.14), 170);
        break;
      case "ring":
        this.tone(1000, 0.1, "sine", 0.1);
        window.setTimeout(() => this.tone(800, 0.1, "sine", 0.1), 140);
        break;
      case "thud":
        this.tone(110, 0.12, "sine", 0.28, 60);
        this.noise(0.06, 0.1, 300);
        break;
      case "scrape":
        this.noise(0.28, 0.1, 1800);
        break;
      case "tick":
        this.tone(660, 0.12, "triangle", 0.22);
        break;
      case "go":
        this.tone(880, 0.1, "square", 0.18);
        window.setTimeout(() => this.tone(1320, 0.25, "square", 0.16), 90);
        break;
      case "warn":
        this.tone(1400, 0.04, "sine", 0.06);
        break;
      case "close":
        this.tone(740, 0.06, "triangle", 0.14, 1100);
        break;
    }
  }
}

export const audio = new Audio();
