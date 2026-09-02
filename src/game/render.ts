import { COLORS, COMBAT, JUICE, TILE, VIEW_H, VIEW_W } from "./theme";
import type { Enemy, Player } from "./physics";
import { SOLID, SPIKE, type Level } from "./levels";

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

/** Solid tiles: flat navy blocks with a bright 4px lip on any exposed top. */
export function drawTiles(
  ctx: CanvasRenderingContext2D,
  level: Level,
  camX: number,
) {
  const first = Math.max(0, Math.floor(camX / TILE));
  const last = Math.min(level.cols - 1, Math.floor((camX + VIEW_W) / TILE));

  for (let row = 0; row < level.rows; row++) {
    for (let col = first; col <= last; col++) {
      const tile = level.at(col, row);
      if (tile !== SOLID && tile !== SPIKE) continue;
      const x = Math.round(col * TILE - camX);
      const y = row * TILE;

      if (tile === SPIKE) {
        drawSpike(ctx, x, y);
        continue;
      }

      ctx.fillStyle = COLORS.wall;
      ctx.fillRect(x, y, TILE, TILE);
      if (level.at(col, row - 1) !== SOLID) {
        ctx.fillStyle = COLORS.wallEdge;
        ctx.fillRect(x, y, TILE, 4);
      }
    }
  }
}

/** Spikes: three flat pink teeth, base on the floor of the tile. */
export function drawSpike(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const teeth = 3;
  const w = TILE / teeth;
  ctx.fillStyle = COLORS.pink;
  ctx.beginPath();
  for (let i = 0; i < teeth; i++) {
    const left = x + i * w;
    ctx.moveTo(left, y + TILE);
    ctx.lineTo(left + w / 2, y + TILE * 0.26);
    ctx.lineTo(left + w, y + TILE);
  }
  ctx.fill();
}

/** Gems: mint diamonds that bob gently so they read as collectable. */
export function drawGem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  clock: number,
) {
  const cx = x + TILE / 2;
  const cy =
    y + TILE / 2 + Math.sin(clock * JUICE.bobSpeed + x * 0.04) * JUICE.bobAmp;
  const r = 9;

  ctx.fillStyle = COLORS.mint;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r * 0.74, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r * 0.74, cy);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(Math.round(cx - 3), Math.round(cy - 2), 3, 3);
}

/** The key: a mint bow, stem and two teeth. */
export function drawKey(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  clock: number,
) {
  const cx = x + TILE / 2;
  const top =
    y + 7 + Math.sin(clock * JUICE.bobSpeed + 1) * JUICE.bobAmp;

  ctx.fillStyle = COLORS.mint;
  ctx.fillRect(Math.round(cx - 6), Math.round(top), 12, 10);
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(Math.round(cx - 3), Math.round(top + 3), 6, 4);

  ctx.fillStyle = COLORS.mint;
  ctx.fillRect(Math.round(cx - 2), Math.round(top + 10), 4, 11);
  ctx.fillRect(Math.round(cx + 2), Math.round(top + 13), 5, 3);
  ctx.fillRect(Math.round(cx + 2), Math.round(top + 18), 5, 3);
}

/** The door. Locked shows a bone plate; unlocked gets a mint outline. */
export function drawDoor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  unlocked: boolean,
) {
  const w = 26;
  const h = 46;
  const left = Math.round(x + (TILE - w) / 2);
  const top = Math.round(y + TILE - h);

  ctx.fillStyle = COLORS.orange;
  ctx.fillRect(left, top, w, h);

  ctx.fillStyle = COLORS.ink;
  ctx.fillRect(left + 4, top + 4, w - 8, 3);

  if (unlocked) {
    ctx.fillStyle = COLORS.mint;
    ctx.fillRect(left - 3, top - 3, w + 6, 3);
    ctx.fillRect(left - 3, top + h, w + 6, 3);
    ctx.fillRect(left - 3, top, 3, h);
    ctx.fillRect(left + w, top, 3, h);
  } else {
    ctx.fillStyle = COLORS.ink;
    ctx.fillRect(left + w / 2 - 5, top + h / 2 - 5, 10, 10);
    ctx.fillStyle = COLORS.orange;
    ctx.fillRect(left + w / 2 - 2, top + h / 2 - 2, 4, 4);
  }
}

/** Enemies: pink, spiked, with an eye that points where they are walking. */
export function drawEnemy(
  ctx: CanvasRenderingContext2D,
  e: Enemy,
  alpha: number,
  camX: number,
) {
  const x = Math.round(e.px + (e.x - e.px) * alpha - camX);
  const y = Math.round(e.py + (e.y - e.py) * alpha);

  ctx.fillStyle = COLORS.pink;
  ctx.fillRect(x, y + 6, e.w, e.h - 6);

  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const left = x + (i * e.w) / 3;
    ctx.moveTo(left, y + 6);
    ctx.lineTo(left + e.w / 6, y);
    ctx.lineTo(left + e.w / 3, y + 6);
  }
  ctx.fill();

  ctx.fillStyle = COLORS.bg;
  const eyeX = e.dir === 1 ? x + e.w - 11 : x + 4;
  ctx.fillRect(eyeX, y + 11, 7, 5);
}

/** Checkpoint flags: outlined until touched, then filled mint. */
export function drawCheckpoint(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  active: boolean,
) {
  const poleX = Math.round(x + 8);
  const base = y + TILE;
  const top = base - 27;

  ctx.fillStyle = active ? COLORS.mint : COLORS.dim;
  ctx.fillRect(poleX, top, 4, 27);
  ctx.fillRect(poleX - 4, base - 4, 12, 4);

  ctx.beginPath();
  ctx.moveTo(poleX + 4, top);
  ctx.lineTo(poleX + 19, top + 6);
  ctx.lineTo(poleX + 4, top + 12);
  ctx.closePath();

  if (active) {
    ctx.fillStyle = COLORS.mint;
    ctx.fill();
  } else {
    ctx.strokeStyle = COLORS.dim;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
