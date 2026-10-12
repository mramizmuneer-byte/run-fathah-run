import type { BossConfig } from "@/config/bosses";

/**
 * Drawn cartoon placeholders for Murali and Sumeet.
 * Used whenever a boss has no image in src/config/bosses.ts (or it failed to load).
 * yBase = ground line, scale 1 ≈ 200px tall.
 */
export function drawBossPlaceholder(
  ctx: CanvasRenderingContext2D,
  cfg: BossConfig,
  x: number,
  yBase: number,
  scale: number,
  t: number,
  back: boolean,
) {
  const s = scale * cfg.scale;
  const P = cfg.palette;
  const bob = Math.sin(t * 11) * 5 * s;
  const lean = Math.sin(t * 11) * 0.05;
  const stocky = cfg.id === "murali";

  ctx.save();
  ctx.translate(x, yBase + bob);
  ctx.scale(s, s);
  ctx.rotate(lean * 0.3);

  // shadow
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(0, 4 - bob / s, 34, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const bodyW = stocky ? 46 : 34;
  const bodyH = stocky ? 66 : 78;
  const headR = stocky ? 19 : 16;
  const legTop = -bodyH;

  const swing = Math.sin(t * 11);

  // legs
  ctx.strokeStyle = P.trousers;
  ctx.lineWidth = stocky ? 13 : 11;
  ctx.lineCap = "round";
  for (const dir of [1, -1]) {
    ctx.beginPath();
    ctx.moveTo(dir * 8, legTop + bodyH * 0.02);
    ctx.lineTo(dir * 8 + swing * dir * 16, -6);
    ctx.stroke();
  }
  // shoes
  ctx.fillStyle = "#2a2118";
  for (const dir of [1, -1]) {
    ctx.beginPath();
    ctx.ellipse(dir * 8 + swing * dir * 16, -2, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // torso
  ctx.fillStyle = P.shirt;
  roundRect(ctx, -bodyW / 2, legTop, bodyW, bodyH, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = 2;
  ctx.stroke();

  if (stocky) {
    // loose tie
    ctx.fillStyle = P.accent;
    ctx.beginPath();
    ctx.moveTo(0, legTop + 6);
    ctx.lineTo(6, legTop + 14);
    ctx.lineTo(2, legTop + 40);
    ctx.lineTo(-4, legTop + 38);
    ctx.closePath();
    ctx.fill();
  } else {
    // vest
    ctx.fillStyle = P.accent;
    roundRect(ctx, -bodyW / 2 + 3, legTop + 6, bodyW - 6, bodyH - 16, 8);
    ctx.fill();
  }

  // arms flailing
  ctx.strokeStyle = P.shirt;
  ctx.lineWidth = 9;
  const armY = legTop + 16;
  const flail = Math.sin(t * 13 + 1) * 0.9;
  ctx.beginPath();
  ctx.moveTo(-bodyW / 2 + 2, armY);
  ctx.lineTo(-bodyW / 2 - 16, armY - 18 + flail * 14);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bodyW / 2 - 2, armY);
  ctx.lineTo(bodyW / 2 + 16, armY - 18 - flail * 14);
  ctx.stroke();

  // hands + props
  ctx.fillStyle = P.skin;
  const lhx = -bodyW / 2 - 16;
  const lhy = armY - 18 + flail * 14;
  const rhx = bodyW / 2 + 16;
  const rhy = armY - 18 - flail * 14;
  circle(ctx, lhx, lhy, 5);
  circle(ctx, rhx, rhy, 5);

  if (stocky) {
    // coffee mug (sloshing)
    ctx.save();
    ctx.translate(lhx - 4, lhy - 2);
    ctx.rotate(Math.sin(t * 9) * 0.35);
    ctx.fillStyle = "#f2f2ef";
    roundRect(ctx, -7, -9, 14, 13, 2);
    ctx.fill();
    ctx.fillStyle = "#6b3d1e";
    ctx.fillRect(-5, -7, 10, 3 + Math.sin(t * 9) * 1.5);
    ctx.strokeStyle = "#f2f2ef";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(8, -3, 4, -1.2, 1.2);
    ctx.stroke();
    ctx.restore();
    // stack of files
    ctx.save();
    ctx.translate(rhx + 3, rhy);
    ctx.rotate(Math.sin(t * 7) * 0.15);
    const fileCols = ["#d9a441", "#c46a52", "#8fa86b"];
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = fileCols[i];
      roundRect(ctx, -9, -4 - i * 5, 18, 5, 1);
      ctx.fill();
    }
    ctx.restore();
  } else {
    // calculator with paper tape
    ctx.save();
    ctx.translate(lhx - 3, lhy);
    ctx.fillStyle = "#3b4048";
    roundRect(ctx, -6, -8, 12, 16, 2);
    ctx.fill();
    ctx.fillStyle = "#9fd8a8";
    ctx.fillRect(-4, -6, 8, 4);
    ctx.restore();
    // laptop under arm
    ctx.save();
    ctx.translate(rhx + 2, rhy + 4);
    ctx.rotate(-0.25);
    ctx.fillStyle = "#6b7078";
    roundRect(ctx, -11, -6, 22, 12, 2);
    ctx.fill();
    ctx.fillStyle = "#c9ced6";
    ctx.fillRect(-9, -4, 18, 8);
    ctx.restore();
  }

  // head
  ctx.fillStyle = P.skin;
  circle(ctx, 0, legTop - headR + 2, headR);
  // hair
  ctx.fillStyle = P.hair;
  ctx.beginPath();
  if (stocky) {
    // balding: side tufts only
    ctx.ellipse(-headR + 3, legTop - headR - 1, 6, 7, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(headR - 3, legTop - headR - 1, 6, 7, -0.3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // neat side part
    ctx.ellipse(0, legTop - headR * 1.7, headR, headR * 0.62, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-headR, legTop - headR * 1.75, headR * 2, 5);
  }

  if (!back) {
    const hy = legTop - headR + 2;
    if (stocky) {
      // big bushy eyebrows
      ctx.strokeStyle = P.hair;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-11, hy - 8);
      ctx.lineTo(-3, hy - 10);
      ctx.moveTo(3, hy - 10);
      ctx.lineTo(11, hy - 8);
      ctx.stroke();
      // round glasses
      ctx.strokeStyle = "#2b2b2b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-6, hy - 2, 5.5, 0, Math.PI * 2);
      ctx.arc(6, hy - 2, 5.5, 0, Math.PI * 2);
      ctx.moveTo(-0.5, hy - 2);
      ctx.lineTo(0.5, hy - 2);
      ctx.stroke();
      ctx.fillStyle = "#1b1b1b";
      circle(ctx, -6, hy - 2, 2);
      circle(ctx, 6, hy - 2, 2);
    } else {
      ctx.fillStyle = "#1b1b1b";
      circle(ctx, -5, hy - 3, 2);
      circle(ctx, 5, hy - 3, 2);
      // moustache
      ctx.fillStyle = P.hair;
      roundRect(ctx, -7, hy + 3, 14, 4, 2);
      ctx.fill();
    }
    // shouting mouth
    ctx.fillStyle = "#6e2b2b";
    ctx.beginPath();
    ctx.ellipse(0, hy + 10, 5, 4 + Math.abs(Math.sin(t * 6)) * 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function drawNameTag(
  ctx: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  scale: number,
) {
  const w = Math.max(44, name.length * 8) * scale;
  const h = 17 * scale;
  ctx.save();
  ctx.fillStyle = "rgba(24,22,30,0.85)";
  roundRect(ctx, x - w / 2, y - h, w, h, 6 * scale);
  ctx.fill();
  ctx.fillStyle = "#ffd77a";
  ctx.font = `700 ${Math.round(10 * scale)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name, x, y - h / 2);
  ctx.restore();
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function circle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}
