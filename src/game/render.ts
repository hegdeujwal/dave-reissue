import { COLORS, TILE, VIEW_H, VIEW_W } from "./theme";

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
