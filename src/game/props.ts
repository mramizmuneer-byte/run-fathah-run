import { project } from "./proj";
import { roundRect } from "./bossArt";
import { EMAIL_TEXTS } from "@/config/game";

export type ObKind =
  | "plant" | "files" | "gst" | "notice" | "calculator" | "chair" | "trolley"
  | "ac" | "pipe" | "email" | "plane"
  | "branch" | "crow" | "vine"
  | "pothole" | "breaker" | "auto" | "scooter" | "bus" | "cow" | "dog"
  | "rider" | "cart" | "cable" | "walker";

export type ObAction = "block" | "jump" | "slide";
/** Visual size multiplier so obstacles read clearly at depth. */
export const OB_SIZE = 1.5;

export const OB_ACTION: Record<ObKind, ObAction> = {
  plant: "jump", files: "jump", gst: "jump", notice: "jump", calculator: "jump",
  chair: "block", trolley: "block", ac: "block", pipe: "slide",
  email: "slide", plane: "slide",
  branch: "block", crow: "block", vine: "slide",
  pothole: "jump", breaker: "jump", auto: "block", scooter: "block",
  bus: "block", cow: "block", dog: "block", rider: "block", cart: "block",
  cable: "slide", walker: "block",
};

export const STAGE1_OBS: ObKind[] = [
  "plant", "files", "gst", "notice", "calculator", "chair", "trolley", "ac",
  "pipe", "email", "plane",
];
export const STAGE2_OBS: ObKind[] = ["branch", "crow", "vine"];
export const STAGE3_OBS: ObKind[] = [
  "pothole", "breaker", "auto", "scooter", "bus", "cow", "dog", "rider",
  "cart", "cable", "walker",
];

export type ColKind =
  | "coin" | "chai" | "stamp" | "letter" | "shield" | "filter" | "dosa"
  | "vada" | "leaf" | "torch" | "watch" | "rapido" | "book";

/* ------------------------------------------------------------------ */

export function drawObstacle(
  ctx: CanvasRenderingContext2D,
  kind: ObKind,
  x: number,
  z: number,
  t: number,
) {
  const g = project(x, 0, z);
  const s = g.s;
  if (s < 0.05) return;
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.scale(s * OB_SIZE, s * OB_SIZE);

  // soft shadow
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(0, 0, 40, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  switch (kind) {
    case "plant": {
      ctx.fillStyle = "#a8613c";
      roundRect(ctx, -20, -34, 40, 34, 5);
      ctx.fill();
      ctx.fillStyle = "#3f8038";
      for (let i = -2; i <= 2; i++) {
        ctx.save();
        ctx.translate(0, -34);
        ctx.rotate(i * 0.42);
        ctx.beginPath();
        ctx.ellipse(0, -30, 9, 32, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      break;
    }
    case "files": case "gst": {
      const cols = kind === "files"
        ? ["#d9a441", "#c46a52", "#8fa86b", "#d9a441"]
        : ["#4c7fae", "#6fa0c8", "#3d6b93", "#5b8fba"];
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = cols[i];
        roundRect(ctx, -30 + (i % 2) * 3, -14 - i * 14, 58, 14, 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.2)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      label(ctx, kind === "files" ? "AUDIT" : "GST", 0, -62, 11, "#fff8e6");
      break;
    }
    case "notice": {
      ctx.fillStyle = "#f3ece0";
      roundRect(ctx, -30, -44, 60, 44, 3);
      ctx.fill();
      ctx.strokeStyle = "#b5442f";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-30, -44);
      ctx.lineTo(0, -20);
      ctx.lineTo(30, -44);
      ctx.stroke();
      label(ctx, "TAX NOTICE", 0, -54, 9, "#b5442f");
      break;
    }
    case "calculator": {
      ctx.fillStyle = "#3c4149";
      roundRect(ctx, -22, -42, 44, 42, 4);
      ctx.fill();
      ctx.fillStyle = "#9fd8a8";
      ctx.fillRect(-16, -36, 32, 10);
      ctx.fillStyle = "#6c727c";
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++) ctx.fillRect(-15 + c * 11, -22 + r * 7, 8, 5);
      ctx.fillStyle = "#f6f2e8";
      ctx.fillRect(-8, -74, 16, 34);
      break;
    }
    case "chair": {
      ctx.fillStyle = "#2f333a";
      roundRect(ctx, -24, -46, 48, 12, 4);
      ctx.fill();
      roundRect(ctx, -22, -92, 44, 46, 8);
      ctx.fill();
      ctx.strokeStyle = "#54595f";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, -34);
      ctx.lineTo(0, -12);
      ctx.moveTo(-20, -6);
      ctx.lineTo(20, -6);
      ctx.moveTo(-14, -12);
      ctx.lineTo(14, -12);
      ctx.stroke();
      break;
    }
    case "trolley": {
      ctx.strokeStyle = "#8d949c";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-22, -6);
      ctx.lineTo(-22, -96);
      ctx.lineTo(16, -96);
      ctx.stroke();
      ctx.fillStyle = "#b3763f";
      roundRect(ctx, -24, -56, 50, 48, 3);
      ctx.fill();
      ctx.fillStyle = "#2b2b2f";
      ctx.beginPath();
      ctx.arc(-18, -4, 7, 0, Math.PI * 2);
      ctx.arc(14, -4, 7, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "ac": {
      ctx.fillStyle = "#b8bcbe";
      roundRect(ctx, -34, -116, 68, 116, 4);
      ctx.fill();
      ctx.strokeStyle = "#8d9194";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = "#9aa0a3";
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(-26, -100 + i * 9);
        ctx.lineTo(26, -100 + i * 9);
        ctx.stroke();
      }
      break;
    }
    case "pipe": {
      ctx.fillStyle = "#8e9298";
      roundRect(ctx, -70, -156, 140, 16, 8);
      ctx.fill();
      ctx.fillStyle = "#6d7176";
      ctx.fillRect(-58, -140, 8, 10);
      ctx.fillRect(50, -140, 8, 10);
      break;
    }
    case "email": {
      const bobY = Math.sin(t * 4) * 6;
      ctx.translate(0, bobY);
      ctx.fillStyle = "#fdf7ea";
      roundRect(ctx, -40, -170, 80, 46, 4);
      ctx.fill();
      ctx.strokeStyle = "#c0503f";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-40, -170);
      ctx.lineTo(0, -142);
      ctx.lineTo(40, -170);
      ctx.stroke();
      label(ctx, EMAIL_TEXTS[0], 0, -134, 9, "#c0503f");
      break;
    }
    case "plane": {
      ctx.translate(0, Math.sin(t * 5) * 8);
      ctx.fillStyle = "#f6e37a";
      ctx.beginPath();
      ctx.moveTo(-42, -150);
      ctx.lineTo(42, -162);
      ctx.lineTo(-10, -132);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#c7b44e";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      break;
    }
    case "branch": {
      ctx.strokeStyle = "#5a3d24";
      ctx.lineWidth = 20;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-50, -56);
      ctx.lineTo(50, -40);
      ctx.stroke();
      ctx.fillStyle = "#3f7a37";
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.arc(i * 24, -62 + Math.abs(i) * 5, 16, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "crow": {
      ctx.translate(0, -70 + Math.sin(t * 6) * 10);
      ctx.fillStyle = "#1d1f24";
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      const flap = Math.sin(t * 14) * 0.7;
      for (const d of [1, -1]) {
        ctx.save();
        ctx.rotate(d * flap);
        ctx.beginPath();
        ctx.ellipse(d * 24, -6, 22, 7, d * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = "#e8b53d";
      ctx.beginPath();
      ctx.moveTo(-22, -2);
      ctx.lineTo(-34, 1);
      ctx.lineTo(-22, 4);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "vine": {
      ctx.strokeStyle = "#4f7d3a";
      ctx.lineWidth = 6;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 26, -190);
        ctx.quadraticCurveTo(i * 26 + Math.sin(t * 2 + i) * 12, -150, i * 26, -110);
        ctx.stroke();
      }
      break;
    }
    case "pothole": {
      ctx.fillStyle = "#1b1c20";
      ctx.beginPath();
      ctx.ellipse(0, -2, 40, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(120,160,175,0.6)";
      ctx.beginPath();
      ctx.ellipse(-4, -3, 28, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "breaker": {
      ctx.fillStyle = "#d8d3c6";
      roundRect(ctx, -52, -16, 104, 16, 8);
      ctx.fill();
      ctx.fillStyle = "#c9502f";
      for (let i = 0; i < 4; i++) ctx.fillRect(-48 + i * 26, -16, 12, 16);
      break;
    }
    case "auto": {
      ctx.fillStyle = "#1f7a33";
      roundRect(ctx, -36, -66, 72, 50, 10);
      ctx.fill();
      ctx.fillStyle = "#f2f2ec";
      roundRect(ctx, -30, -98, 60, 36, 14);
      ctx.fill();
      ctx.fillStyle = "#1f7a33";
      roundRect(ctx, -30, -98, 60, 12, 6);
      ctx.fill();
      ctx.fillStyle = "#26282d";
      ctx.beginPath();
      ctx.arc(-24, -10, 10, 0, Math.PI * 2);
      ctx.arc(24, -10, 10, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "scooter": {
      ctx.fillStyle = "#26282d";
      ctx.beginPath();
      ctx.arc(-22, -12, 12, 0, Math.PI * 2);
      ctx.arc(22, -12, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#37618f";
      roundRect(ctx, -26, -46, 52, 30, 8);
      ctx.fill();
      ctx.strokeStyle = "#8c9299";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(20, -44);
      ctx.lineTo(26, -74);
      ctx.moveTo(14, -74);
      ctx.lineTo(38, -74);
      ctx.stroke();
      break;
    }
    case "bus": {
      ctx.fillStyle = "#c9432e";
      roundRect(ctx, -92, -140, 184, 124, 10);
      ctx.fill();
      ctx.fillStyle = "#f0efe6";
      ctx.fillRect(-84, -132, 168, 14);
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = "#9fc3d4";
        roundRect(ctx, -80 + i * 44, -106, 36, 34, 3);
        ctx.fill();
      }
      ctx.fillStyle = "#26282d";
      ctx.beginPath();
      ctx.arc(-58, -10, 14, 0, Math.PI * 2);
      ctx.arc(58, -10, 14, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "cow": {
      ctx.fillStyle = "#e8e2d4";
      roundRect(ctx, -46, -74, 92, 44, 16);
      ctx.fill();
      ctx.fillStyle = "#6d5b48";
      ctx.beginPath();
      ctx.ellipse(-16, -60, 16, 11, 0.2, 0, Math.PI * 2);
      ctx.ellipse(22, -50, 12, 8, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#d8d1c2";
      ctx.lineWidth = 8;
      for (const dx of [-32, -14, 16, 34]) {
        ctx.beginPath();
        ctx.moveTo(dx, -32);
        ctx.lineTo(dx, -4);
        ctx.stroke();
      }
      ctx.fillStyle = "#e8e2d4";
      ctx.beginPath();
      ctx.ellipse(-56, -80, 18, 14, -0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "dog": {
      ctx.fillStyle = "#c08f52";
      roundRect(ctx, -30, -46, 60, 26, 12);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-34, -54, 14, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#a87a44";
      ctx.lineWidth = 6;
      for (const dx of [-20, -6, 10, 22]) {
        ctx.beginPath();
        ctx.moveTo(dx, -22);
        ctx.lineTo(dx, -3);
        ctx.stroke();
      }
      break;
    }
    case "rider": {
      ctx.fillStyle = "#26282d";
      ctx.beginPath();
      ctx.arc(-22, -12, 12, 0, Math.PI * 2);
      ctx.arc(22, -12, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3a3f47";
      roundRect(ctx, -24, -46, 50, 28, 8);
      ctx.fill();
      ctx.fillStyle = "#2f6e4f";
      roundRect(ctx, -16, -104, 34, 42, 8);
      ctx.fill();
      ctx.fillStyle = "#c98d63";
      ctx.beginPath();
      ctx.arc(0, -116, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#d8622f";
      roundRect(ctx, -22, -92, 20, 24, 4);
      ctx.fill();
      break;
    }
    case "cart": {
      ctx.fillStyle = "#9c6634";
      roundRect(ctx, -52, -68, 104, 46, 4);
      ctx.fill();
      ctx.fillStyle = "#e0d4bb";
      ctx.fillRect(-48, -64, 96, 8);
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = ["#e0603f", "#e9b53d", "#78a84f"][i % 3];
        ctx.beginPath();
        ctx.arc(-40 + i * 16, -50, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#3a3229";
      ctx.beginPath();
      ctx.arc(-30, -10, 12, 0, Math.PI * 2);
      ctx.arc(30, -10, 12, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "cable": {
      ctx.strokeStyle = "#22242a";
      ctx.lineWidth = 5;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-110, -180 + i * 10);
        ctx.quadraticCurveTo(0, -150 + i * 10, 110, -180 + i * 10);
        ctx.stroke();
      }
      break;
    }
    case "walker": {
      ctx.fillStyle = "#3f4a5c";
      roundRect(ctx, -14, -78, 28, 50, 8);
      ctx.fill();
      ctx.fillStyle = "#c98d63";
      ctx.beginPath();
      ctx.arc(0, -90, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2b2f36";
      ctx.fillRect(-12, -30, 9, 28);
      ctx.fillRect(3, -30, 9, 28);
      break;
    }
  }
  ctx.restore();
}

function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.font = `700 ${size}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}

/* ------------------------------------------------------------------ */

/** Draw a pickup at an already-projected point. `scale` = screen px per design px. */
export function drawCollectible(
  ctx: CanvasRenderingContext2D,
  kind: ColKind,
  g: { x: number; y: number },
  scale: number,
  t: number,
  seed: number,
) {
  if (scale < 0.04) return;
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.scale(scale, scale);
  const spin = Math.cos(t * 4.2 + seed);

  switch (kind) {
    case "coin": {
      ctx.fillStyle = "#e9b93c";
      ctx.beginPath();
      ctx.ellipse(0, 0, 18 * Math.abs(spin) + 3, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f7dd8a";
      ctx.beginPath();
      ctx.ellipse(0, 0, 12 * Math.abs(spin) + 2, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "chai": case "filter": {
      ctx.fillStyle = kind === "chai" ? "#f4efe4" : "#d8d2c4";
      ctx.beginPath();
      ctx.moveTo(-12, -14);
      ctx.lineTo(12, -14);
      ctx.lineTo(8, 14);
      ctx.lineTo(-8, 14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#8a5a2c";
      ctx.fillRect(-10, -12, 20, 6);
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-4, -22);
      ctx.quadraticCurveTo(2, -28, -2, -34);
      ctx.stroke();
      break;
    }
    case "stamp": {
      ctx.save();
      ctx.rotate(-0.2);
      ctx.strokeStyle = "#2d8a4e";
      ctx.lineWidth = 3;
      roundRect(ctx, -28, -14, 56, 28, 4);
      ctx.stroke();
      ctx.fillStyle = "#2d8a4e";
      ctx.font = "700 9px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("REFUND", 0, -5);
      ctx.fillText("APPROVED", 0, 6);
      ctx.restore();
      break;
    }
    case "letter": {
      ctx.save();
      ctx.rotate(Math.sin(t * 2) * 0.12);
      ctx.shadowColor = "rgba(255,215,120,0.9)";
      ctx.shadowBlur = 18;
      ctx.fillStyle = "#fdf8ec";
      roundRect(ctx, -22, -28, 44, 56, 3);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#c9a24a";
      ctx.lineWidth = 2;
      roundRect(ctx, -22, -28, 44, 56, 3);
      ctx.stroke();
      ctx.fillStyle = "#8a7340";
      for (let i = 0; i < 5; i++) ctx.fillRect(-15, -18 + i * 9, 30, 2.5);
      ctx.fillStyle = "#c0392b";
      ctx.beginPath();
      ctx.arc(12, 18, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
    case "shield": {
      ctx.save();
      ctx.shadowColor = "rgba(120,220,255,0.9)";
      ctx.shadowBlur = 20;
      ctx.fillStyle = "#3fc4e8";
      ctx.beginPath();
      ctx.moveTo(0, -24);
      ctx.lineTo(20, -12);
      ctx.lineTo(16, 16);
      ctx.lineTo(0, 26);
      ctx.lineTo(-16, 16);
      ctx.lineTo(-20, -12);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#08303d";
      ctx.font = "800 13px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("PAA", 0, 0);
      ctx.restore();
      break;
    }
    case "dosa": {
      ctx.fillStyle = "#e8c07a";
      ctx.beginPath();
      ctx.ellipse(0, 4, 24, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#c98f3f";
      ctx.beginPath();
      ctx.ellipse(0, -2, 20, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "vada": {
      ctx.fillStyle = "#c98a4b";
      roundRect(ctx, -18, -12, 36, 24, 10);
      ctx.fill();
      ctx.fillStyle = "#e8b96f";
      ctx.fillRect(-16, -2, 32, 4);
      break;
    }
    case "leaf": {
      ctx.save();
      ctx.rotate(t * 1.5);
      ctx.fillStyle = "#6bb04a";
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 14, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
    case "torch": {
      ctx.save();
      ctx.shadowColor = "rgba(255,230,150,0.9)";
      ctx.shadowBlur = 20;
      ctx.fillStyle = "#2f3238";
      roundRect(ctx, -7, -22, 14, 44, 4);
      ctx.fill();
      ctx.fillStyle = "#ffe9a8";
      roundRect(ctx, -9, -28, 18, 10, 3);
      ctx.fill();
      ctx.restore();
      break;
    }
    case "watch": {
      ctx.save();
      ctx.shadowColor = "rgba(150,200,255,0.9)";
      ctx.shadowBlur = 16;
      ctx.fillStyle = "#23262c";
      roundRect(ctx, -14, -16, 28, 32, 7);
      ctx.fill();
      ctx.fillStyle = "#63d1ff";
      roundRect(ctx, -10, -12, 20, 24, 5);
      ctx.fill();
      ctx.fillStyle = "#0d1b24";
      ctx.font = "800 11px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("DND", 0, 0);
      ctx.restore();
      break;
    }
  }
  ctx.restore();
}
