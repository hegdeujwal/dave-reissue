import { COLORS, COMBAT, TILE, VIEW_H, VIEW_W } from "./theme";
import type { Player } from "./physics";

/**
 * Size the backing store to the device pixel ratio so the flat vector shapes
 * stay crisp on retina screens. Everything after this draws in CSS pixels.
 */
export function setupCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = Math.round(VIEW_W * dpr);
  canvas.height = Math.round(VIEW_H * dpr);
  canvas.style.width = `${VIEW_W}px`;
  canvas.style.height = `${VIEW_H}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context is not available");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

/** Flat navy ground plus a slow parallax grid, so motion is legible. */
export function drawBackdrop(ctx: CanvasRenderingContext2D, camX: number) {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const step = TILE * 2;
  const offset = -((camX * 0.5) % step);
  ctx.fillStyle = COLORS.grid;
  for (let x = offset; x < VIEW_W; x += step) {
    ctx.fillRect(Math.round(x), 0, 2, VIEW_H);
  }
  for (let y = 0; y < VIEW_H; y += step) {
    ctx.fillRect(0, y, VIEW_W, 2);
  }
}

/** Pick bone or navy for detail work, whichever reads on the given fill. */
export function contrastInk(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? COLORS.bg : COLORS.ink;
}

/**
 * The player: a flat block with a visor and boots, scaled by the squash and
 * stretch factors around its feet, and flickering while invulnerable.
 */
export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  p: Player,
  alpha: number,
  camX: number,
  color: string,
  invulnerable: boolean,
  clock: number,
) {
  if (invulnerable && Math.floor(clock / COMBAT.flicker) % 2 === 1) return;

  const x = p.px + (p.x - p.px) * alpha - camX;
  const y = p.py + (p.y - p.py) * alpha;
  const w = p.w * p.sx;
  const h = p.h * p.sy;
  const left = x + p.w / 2 - w / 2;
  const bottom = y + p.h;
  const top = bottom - h;

  ctx.fillStyle = color;
  ctx.fillRect(Math.round(left), Math.round(top), Math.round(w), Math.round(h));

  ctx.fillStyle = contrastInk(color);
  const visorW = w * 0.5;
  const visorH = Math.max(3, h * 0.16);
  const visorX = p.facing === 1 ? left + w * 0.88 - visorW : left + w * 0.12;
  ctx.fillRect(
    Math.round(visorX),
    Math.round(top + h * 0.2),
    Math.round(visorW),
    Math.round(visorH),
  );

  const bootH = Math.max(3, Math.round(h * 0.14));
  ctx.fillRect(Math.round(left), Math.round(bottom - bootH), Math.round(w), bootH);
}
