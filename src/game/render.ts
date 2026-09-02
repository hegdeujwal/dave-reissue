import {
  COLORS,
  COMBAT,
  JETPACK,
  JUICE,
  TILE,
  TURRET,
  VIEW_H,
  VIEW_W,
  type Character,
} from "./theme";
import type { Bullet, Enemy, Player } from "./physics";
import { BREAKABLE, SOLID, SPIKE, type Level } from "./levels";
import type { Particle, Turret } from "./engine";

/**
 * Size the backing store to the device pixel ratio so every shape stays crisp
 * on retina screens. Everything after this draws in CSS pixels.
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
  return ctx;
}

/** Pick bone or navy for detail work, whichever reads on the given fill. */
export function contrastInk(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? COLORS.bg : COLORS.ink;
}

function glow(ctx: CanvasRenderingContext2D, color: string, blur: number) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}

function noGlow(ctx: CanvasRenderingContext2D) {
  ctx.shadowBlur = 0;
}

/** A thick round-capped segment. Used for every arm and leg. */
function limb(
  ctx: CanvasRenderingContext2D,
  points: [number, number][],
  width: number,
  color: string,
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.stroke();
}

/* ------------------------------------------------------------------ */
/* Backdrop                                                            */
/* ------------------------------------------------------------------ */

const STARS = Array.from({ length: 90 }, (_, i) => ({
  x: (i * 977) % 3600,
  y: (i * 613) % 300,
  r: (i % 3) * 0.5 + 0.6,
}));

/** Four parallax layers: sky, stars, a far skyline, and near structures. */
export function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  camX: number,
  clock: number,
) {
  // Canvas state survives between frames, so reset the bits the figures and
  // effects change before anything else is drawn.
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";

  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  sky.addColorStop(0, COLORS.skyTop);
  sky.addColorStop(1, COLORS.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Stars, drifting very slowly.
  for (const star of STARS) {
    const x = ((star.x - camX * 0.12) % 3600 + 3600) % 3600;
    if (x > VIEW_W) continue;
    const twinkle = 0.5 + 0.5 * Math.sin(clock * 1.6 + star.x);
    ctx.globalAlpha = 0.25 + twinkle * 0.45;
    ctx.fillStyle = COLORS.star;
    ctx.fillRect(x, star.y, star.r * 2, star.r * 2);
  }
  ctx.globalAlpha = 1;

  // Far skyline.
  drawSkyline(ctx, camX * 0.18, 150, 92, COLORS.far);
  // Nearer blocks.
  drawSkyline(ctx, camX * 0.36, 96, 128, COLORS.mid);

  // The faint structural grid that sells the parallax.
  const step = TILE * 2;
  const offset = -(((camX * 0.5) % step) + step) % step;
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = COLORS.grid;
  for (let x = offset; x < VIEW_W; x += step) ctx.fillRect(Math.round(x), 0, 1, VIEW_H);
  for (let y = 0; y < VIEW_H; y += step) ctx.fillRect(0, y, VIEW_W, 1);
  ctx.globalAlpha = 1;
}

function drawSkyline(
  ctx: CanvasRenderingContext2D,
  offset: number,
  seed: number,
  baseHeight: number,
  color: string,
) {
  ctx.fillStyle = color;
  const width = 74;
  const start = Math.floor(offset / width) - 1;
  for (let i = start; i < start + VIEW_W / width + 3; i++) {
    const n = Math.abs(Math.sin(i * 12.9898 + seed) * 43758.5453) % 1;
    const h = baseHeight + n * 92;
    const x = Math.round(i * width - offset);
    ctx.fillRect(x, VIEW_H - h, width - 8, h);
    // A couple of lit windows so the blocks read as buildings.
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = COLORS.star;
    for (let w = 0; w < 3; w++) {
      const wy = VIEW_H - h + 14 + w * 22;
      if (wy > VIEW_H - 20) break;
      ctx.fillRect(x + 12 + (w % 2) * 22, wy, 7, 9);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
  }
}

/* ------------------------------------------------------------------ */
/* Tiles                                                               */
/* ------------------------------------------------------------------ */

/** Solid blocks, spikes and crates, shaded so the level has depth. */
export function drawTiles(
  ctx: CanvasRenderingContext2D,
  level: Level,
  camX: number,
  broken: Set<number>,
) {
  const first = Math.max(0, Math.floor(camX / TILE));
  const last = Math.min(level.cols - 1, Math.floor((camX + VIEW_W) / TILE));

  for (let row = 0; row < level.rows; row++) {
    for (let col = first; col <= last; col++) {
      const tile = level.at(col, row);
      const x = Math.round(col * TILE - camX);
      const y = row * TILE;

      if (tile === SPIKE) {
        drawSpike(ctx, x, y);
        continue;
      }
      if (tile === BREAKABLE) {
        if (!broken.has(row * level.cols + col)) drawCrate(ctx, x, y);
        continue;
      }
      if (tile !== SOLID) continue;

      ctx.fillStyle = COLORS.wall;
      ctx.fillRect(x, y, TILE, TILE);

      // Inner shadow on the two sides that face away from the light.
      ctx.fillStyle = COLORS.wallShade;
      ctx.fillRect(x, y + TILE - 5, TILE, 5);
      ctx.fillRect(x + TILE - 4, y, 4, TILE);

      // Lit lip wherever the block is exposed to the sky.
      if (level.at(col, row - 1) !== SOLID) {
        ctx.fillStyle = COLORS.wallEdge;
        ctx.fillRect(x, y, TILE, 4);
        ctx.fillStyle = COLORS.dim;
        ctx.fillRect(x, y + 4, TILE, 1);
      }
      // Rivets.
      ctx.fillStyle = COLORS.wallShade;
      ctx.fillRect(x + 5, y + 9, 3, 3);
      ctx.fillRect(x + TILE - 10, y + TILE - 12, 3, 3);
    }
  }
}

/** Spikes: pink teeth with a steel base plate. */
export function drawSpike(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = COLORS.steelDark;
  ctx.fillRect(x, y + TILE - 5, TILE, 5);

  const teeth = 3;
  const w = TILE / teeth;
  glow(ctx, COLORS.pink, 8);
  ctx.fillStyle = COLORS.pink;
  ctx.beginPath();
  for (let i = 0; i < teeth; i++) {
    const left = x + i * w;
    ctx.moveTo(left + 1, y + TILE - 4);
    ctx.lineTo(left + w / 2, y + TILE * 0.2);
    ctx.lineTo(left + w - 1, y + TILE - 4);
  }
  ctx.fill();
  noGlow(ctx);

  ctx.fillStyle = COLORS.ink;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  for (let i = 0; i < teeth; i++) {
    const left = x + i * w;
    ctx.moveTo(left + w / 2 - 1.5, y + TILE * 0.34);
    ctx.lineTo(left + w / 2, y + TILE * 0.2);
    ctx.lineTo(left + w / 2 + 1, y + TILE * 0.36);
  }
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Breakable crates. Warm timber so they never read as level structure. */
export function drawCrate(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = COLORS.crate;
  ctx.fillRect(x, y, TILE, TILE);

  ctx.fillStyle = COLORS.crateDark;
  ctx.fillRect(x, y + TILE - 4, TILE, 4);
  ctx.fillRect(x + TILE - 4, y, 4, TILE);
  ctx.fillStyle = COLORS.crateLight;
  ctx.fillRect(x, y, TILE, 3);
  ctx.fillRect(x, y, 3, TILE);

  // Diagonal bracing.
  ctx.strokeStyle = COLORS.crateDark;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 4, y + 4);
  ctx.lineTo(x + TILE - 5, y + TILE - 5);
  ctx.moveTo(x + TILE - 5, y + 4);
  ctx.lineTo(x + 4, y + TILE - 5);
  ctx.stroke();

  ctx.fillStyle = COLORS.steel;
  for (const [bx, by] of [
    [5, 5],
    [TILE - 8, 5],
    [5, TILE - 8],
    [TILE - 8, TILE - 8],
  ]) {
    ctx.fillRect(x + bx, y + by, 3, 3);
  }
}

/* ------------------------------------------------------------------ */
/* Pickups and fixtures                                                */
/* ------------------------------------------------------------------ */

function bob(clock: number, phase: number) {
  return Math.sin(clock * JUICE.bobSpeed + phase) * JUICE.bobAmp;
}

export function drawGem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  clock: number,
) {
  const cx = x + TILE / 2;
  const cy = y + TILE / 2 + bob(clock, x * 0.04);
  const r = 9;

  glow(ctx, COLORS.mint, 12);
  ctx.fillStyle = COLORS.mint;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r * 0.74, cy - r * 0.2);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r * 0.74, cy - r * 0.2);
  ctx.closePath();
  ctx.fill();
  noGlow(ctx);

  ctx.fillStyle = COLORS.ink;
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r + 1);
  ctx.lineTo(cx + 3.5, cy - r * 0.2);
  ctx.lineTo(cx, cy - r * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function drawKey(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  clock: number,
) {
  const cx = x + TILE / 2;
  const top = y + 7 + bob(clock, 1);

  glow(ctx, COLORS.mint, 10);
  ctx.fillStyle = COLORS.mint;
  ctx.beginPath();
  ctx.arc(cx, top + 5, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(Math.round(cx - 2), Math.round(top + 10), 4, 11);
  ctx.fillRect(Math.round(cx + 2), Math.round(top + 13), 5, 3);
  ctx.fillRect(Math.round(cx + 2), Math.round(top + 18), 5, 3);
  noGlow(ctx);

  ctx.fillStyle = COLORS.bg;
  ctx.beginPath();
  ctx.arc(cx, top + 5, 2.6, 0, Math.PI * 2);
  ctx.fill();
}

export function drawDoor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  unlocked: boolean,
  clock: number,
) {
  const w = 28;
  const h = 48;
  const left = Math.round(x + (TILE - w) / 2);
  const top = Math.round(y + TILE - h);

  // Frame.
  ctx.fillStyle = COLORS.steelDark;
  ctx.fillRect(left - 4, top - 4, w + 8, h + 4);

  if (unlocked) glow(ctx, COLORS.orange, 16);
  ctx.fillStyle = COLORS.orange;
  ctx.fillRect(left, top, w, h);
  noGlow(ctx);

  // Panelling.
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(left + 3, top + 5, w - 6, 16);
  ctx.fillRect(left + 3, top + 25, w - 6, 16);
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(left, top, w, 2);

  if (unlocked) {
    const pulse = 0.55 + 0.45 * Math.sin(clock * 5);
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = COLORS.mint;
    ctx.lineWidth = 3;
    ctx.strokeRect(left - 3.5, top - 3.5, w + 7, h + 7);
    ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = COLORS.steel;
    ctx.beginPath();
    ctx.arc(left + w / 2, top + h / 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.bg;
    ctx.beginPath();
    ctx.arc(left + w / 2, top + h / 2 - 1, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(left + w / 2 - 1.5, top + h / 2 - 1, 3, 6);
  }
}

export function drawCheckpoint(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  active: boolean,
  clock: number,
) {
  const poleX = Math.round(x + 9);
  const base = y + TILE;
  const top = base - 29;
  const color = active ? COLORS.mint : COLORS.dim;

  ctx.fillStyle = COLORS.steelDark;
  ctx.fillRect(poleX - 6, base - 4, 16, 4);
  ctx.fillStyle = COLORS.steel;
  ctx.fillRect(poleX, top, 3, 29);

  if (active) glow(ctx, COLORS.mint, 12);
  ctx.fillStyle = color;
  const wave = active ? Math.sin(clock * 6) * 2 : 0;
  ctx.beginPath();
  ctx.moveTo(poleX + 3, top + 1);
  ctx.lineTo(poleX + 19, top + 6 + wave);
  ctx.lineTo(poleX + 3, top + 13);
  ctx.closePath();
  ctx.fill();
  noGlow(ctx);
}

/** The gun crate. Mint, because picking it up helps you. */
export function drawGunPickup(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  clock: number,
) {
  const cx = x + TILE / 2;
  const cy = y + TILE / 2 + bob(clock, 2);

  glow(ctx, COLORS.mint, 12);
  ctx.fillStyle = COLORS.steel;
  ctx.fillRect(cx - 12, cy - 4, 20, 7);
  ctx.fillStyle = COLORS.steelDark;
  ctx.fillRect(cx - 4, cy + 3, 5, 7);
  ctx.fillRect(cx - 12, cy - 6, 6, 4);
  ctx.fillStyle = COLORS.mint;
  ctx.fillRect(cx + 6, cy - 3, 6, 5);
  noGlow(ctx);
}

/** The jetpack crate. */
export function drawJetpackPickup(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  clock: number,
) {
  const cx = x + TILE / 2;
  const cy = y + TILE / 2 + bob(clock, 3);

  glow(ctx, COLORS.mint, 12);
  ctx.fillStyle = COLORS.steel;
  ctx.fillRect(cx - 9, cy - 10, 7, 15);
  ctx.fillRect(cx + 2, cy - 10, 7, 15);
  ctx.fillStyle = COLORS.mint;
  ctx.fillRect(cx - 9, cy - 10, 7, 4);
  ctx.fillRect(cx + 2, cy - 10, 7, 4);
  ctx.fillStyle = COLORS.steelDark;
  ctx.fillRect(cx - 8, cy + 5, 5, 4);
  ctx.fillRect(cx + 3, cy + 5, 5, 4);
  noGlow(ctx);
}

/** A fuel canister. Dimmed while it is on its respawn timer. */
export function drawFuel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  clock: number,
  available: boolean,
) {
  const cx = x + TILE / 2;
  const cy = y + TILE / 2 + (available ? bob(clock, 4) : 0);

  ctx.globalAlpha = available ? 1 : 0.22;
  if (available) glow(ctx, COLORS.mint, 10);
  ctx.fillStyle = COLORS.mint;
  ctx.fillRect(cx - 7, cy - 9, 14, 18);
  noGlow(ctx);
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(cx - 4, cy - 5, 8, 3);
  ctx.fillRect(cx - 4, cy + 1, 8, 3);
  ctx.fillStyle = COLORS.steelDark;
  ctx.fillRect(cx - 3, cy - 12, 6, 3);
  ctx.globalAlpha = 1;
}

/** A wall turret: armoured housing, a barrel, and a charging eye. */
export function drawTurret(
  ctx: CanvasRenderingContext2D,
  turret: Turret,
  camX: number,
  clock: number,
) {
  const x = Math.round(turret.x - camX);
  const y = Math.round(turret.y);

  ctx.fillStyle = COLORS.steelDark;
  ctx.fillRect(x, y + 4, turret.w, turret.h - 4);
  ctx.fillStyle = COLORS.steel;
  ctx.fillRect(x + 2, y + 6, turret.w - 4, 8);
  ctx.fillRect(x, y + turret.h - 5, turret.w, 5);

  // Barrel, pointing wherever it last saw the player.
  const barrelX = turret.dir === 1 ? x + turret.w - 2 : x - 10;
  ctx.fillStyle = COLORS.steelDark;
  ctx.fillRect(barrelX, y + 12, 12, 7);

  // Eye, brightening as the shot charges.
  const charge = 1 - Math.min(1, turret.cooldown / TURRET.interval);
  glow(ctx, COLORS.pink, 6 + charge * 12);
  ctx.fillStyle = COLORS.pink;
  ctx.globalAlpha = 0.5 + charge * 0.5;
  ctx.beginPath();
  ctx.arc(x + turret.w / 2, y + 14, 4.5 + Math.sin(clock * 8) * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  noGlow(ctx);

  if (turret.hp < 2) {
    ctx.strokeStyle = COLORS.bg;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 8);
    ctx.lineTo(x + 12, y + 18);
    ctx.lineTo(x + 8, y + 22);
    ctx.stroke();
  }
}

/* ------------------------------------------------------------------ */
/* Actors                                                              */
/* ------------------------------------------------------------------ */

/** Enemies: a hunched pink creature with a shell, legs and a single eye. */
export function drawEnemy(
  ctx: CanvasRenderingContext2D,
  e: Enemy,
  alpha: number,
  camX: number,
  clock: number,
) {
  const x = e.px + (e.x - e.px) * alpha - camX;
  const y = e.py + (e.y - e.py) * alpha;
  const cx = x + e.w / 2;
  const bottom = y + e.h;
  const step = Math.sin(clock * 11) * 2.5;

  // Legs.
  limb(ctx, [[cx - 5, bottom - 8], [cx - 6 + step, bottom]], 3, COLORS.steelDark);
  limb(ctx, [[cx + 5, bottom - 8], [cx + 6 - step, bottom]], 3, COLORS.steelDark);

  // Shell.
  glow(ctx, COLORS.pink, 8);
  ctx.fillStyle = COLORS.pink;
  ctx.beginPath();
  ctx.ellipse(cx, bottom - 11, e.w / 2, e.h / 2 - 1, 0, 0, Math.PI * 2);
  ctx.fill();
  noGlow(ctx);

  // Spines.
  ctx.fillStyle = COLORS.pink;
  ctx.beginPath();
  for (let i = -1; i <= 1; i++) {
    ctx.moveTo(cx + i * 7 - 3, bottom - 18);
    ctx.lineTo(cx + i * 7, bottom - 25);
    ctx.lineTo(cx + i * 7 + 3, bottom - 18);
  }
  ctx.fill();

  // Shading and eye.
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(cx, bottom - 7, e.w / 2 - 2, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  const eyeX = cx + e.dir * 4;
  ctx.fillStyle = COLORS.ink;
  ctx.beginPath();
  ctx.arc(eyeX, bottom - 12, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.bg;
  ctx.beginPath();
  ctx.arc(eyeX + e.dir * 1.4, bottom - 12, 2.2, 0, Math.PI * 2);
  ctx.fill();
}

export type PlayerLook = {
  character: Character;
  hasGun: boolean;
  hasJetpack: boolean;
  thrusting: boolean;
  /** Seconds since the last shot, for the muzzle flash and recoil. */
  sinceShot: number;
  invulnerable: boolean;
  maxSpeed: number;
};

/**
 * The player: an articulated figure drawn from limbs and shaded panels, with
 * a walk cycle, an airborne pose, a held gun and a jetpack that fires.
 */
export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  p: Player,
  alpha: number,
  camX: number,
  look: PlayerLook,
  clock: number,
) {
  if (look.invulnerable && Math.floor(clock / COMBAT.flicker) % 2 === 1) return;

  const x = p.px + (p.x - p.px) * alpha - camX;
  const y = p.py + (p.y - p.py) * alpha;

  ctx.save();
  ctx.translate(x + p.w / 2, y + p.h);
  ctx.scale(p.facing * p.sx, p.sy);

  const c = look.character;
  const speed = Math.min(1, Math.abs(p.vx) / look.maxSpeed);
  const walking = p.grounded && speed > 0.08;
  const phase = clock * 13;
  const swing = walking ? Math.sin(phase) * 7 * speed : 0;
  const bounce = walking ? Math.abs(Math.cos(phase)) * 1.4 * speed : 0;

  const hipY = -13 + bounce;
  const shoulderY = -24 + bounce;
  const headY = -30 + bounce;

  // --- jetpack, behind everything ---
  if (look.hasJetpack) {
    ctx.fillStyle = COLORS.steelDark;
    ctx.fillRect(-11, shoulderY + 1, 7, 15);
    ctx.fillStyle = COLORS.steel;
    ctx.fillRect(-11, shoulderY + 1, 7, 4);
    ctx.fillStyle = COLORS.steelDark;
    ctx.fillRect(-10, shoulderY + 16, 5, 3);

    if (look.thrusting) {
      const flicker = 0.7 + Math.random() * 0.6;
      glow(ctx, COLORS.flame, 14);
      ctx.fillStyle = COLORS.flame;
      ctx.beginPath();
      ctx.moveTo(-10, shoulderY + 19);
      ctx.lineTo(-5, shoulderY + 19);
      ctx.lineTo(-7.5, shoulderY + 19 + 16 * flicker);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = COLORS.flameHot;
      ctx.beginPath();
      ctx.moveTo(-9, shoulderY + 19);
      ctx.lineTo(-6, shoulderY + 19);
      ctx.lineTo(-7.5, shoulderY + 19 + 8 * flicker);
      ctx.closePath();
      ctx.fill();
      noGlow(ctx);
    }
  }

  // --- back leg ---
  const backFoot = walking ? -swing : p.grounded ? -3 : -6;
  const frontFoot = walking ? swing : p.grounded ? 3 : 5;
  const airLift = p.grounded ? 0 : 4;
  limb(
    ctx,
    [
      [-2, hipY],
      [-3 + backFoot * 0.5, hipY + 7],
      [backFoot, -airLift],
    ],
    6,
    c.dark,
  );

  // --- torso ---
  ctx.fillStyle = c.color;
  ctx.beginPath();
  ctx.moveTo(-7, hipY + 2);
  ctx.lineTo(-8, shoulderY + 3);
  ctx.lineTo(-5, shoulderY - 1);
  ctx.lineTo(5, shoulderY - 1);
  ctx.lineTo(8, shoulderY + 3);
  ctx.lineTo(7, hipY + 2);
  ctx.closePath();
  ctx.fill();

  // Chest shading and harness.
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(-8, hipY - 1, 16, 4);
  ctx.fillStyle = c.trim;
  ctx.fillRect(-8, hipY - 2, 16, 3);
  ctx.strokeStyle = c.trim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-4, shoulderY + 1);
  ctx.lineTo(2, hipY - 1);
  ctx.stroke();
  ctx.fillStyle = COLORS.mint;
  ctx.fillRect(2, shoulderY + 4, 3, 3);

  // --- head ---
  ctx.fillStyle = c.skin;
  ctx.beginPath();
  ctx.arc(1, headY + 4, 6.4, 0, Math.PI * 2);
  ctx.fill();

  // Helmet dome over the top and back of the head.
  ctx.fillStyle = c.color;
  ctx.beginPath();
  ctx.arc(1, headY + 4, 7.4, Math.PI * 0.85, Math.PI * 2.08);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = c.dark;
  ctx.fillRect(-7, headY + 2, 4, 6);

  // Visor.
  glow(ctx, COLORS.visor, 6);
  ctx.fillStyle = COLORS.visor;
  ctx.beginPath();
  ctx.ellipse(4, headY + 4, 4.2, 3, -0.2, 0, Math.PI * 2);
  ctx.fill();
  noGlow(ctx);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillRect(3, headY + 2, 2, 2);

  // --- front leg ---
  limb(
    ctx,
    [
      [2, hipY],
      [3 + frontFoot * 0.5, hipY + 7],
      [frontFoot, -airLift],
    ],
    6.5,
    c.color,
  );
  ctx.fillStyle = c.trim;
  ctx.fillRect(frontFoot - 4, -airLift - 3, 8, 3);
  ctx.fillRect(backFoot - 4, -airLift - 3, 7, 3);

  // --- arms ---
  const recoil = Math.max(0, 1 - look.sinceShot / 0.14);
  if (look.hasGun) {
    // Back arm braces, front arm holds the gun level.
    limb(ctx, [[-2, shoulderY + 3], [-6, shoulderY + 11]], 5, c.dark);
    const gunY = shoulderY + 7;
    limb(ctx, [[2, shoulderY + 3], [10 - recoil * 3, gunY]], 5, c.color);

    ctx.fillStyle = COLORS.steelDark;
    ctx.fillRect(9 - recoil * 3, gunY - 3, 14, 6);
    ctx.fillStyle = COLORS.steel;
    ctx.fillRect(9 - recoil * 3, gunY - 3, 14, 2);
    ctx.fillRect(11 - recoil * 3, gunY + 3, 4, 5);

    if (recoil > 0) {
      glow(ctx, COLORS.flame, 12);
      ctx.fillStyle = COLORS.flameHot;
      ctx.beginPath();
      ctx.moveTo(23 - recoil * 3, gunY);
      ctx.lineTo(29 + recoil * 5, gunY - 4 * recoil);
      ctx.lineTo(29 + recoil * 5, gunY + 4 * recoil);
      ctx.closePath();
      ctx.fill();
      noGlow(ctx);
    }
  } else {
    const armSwing = walking ? -swing : 0;
    limb(ctx, [[-2, shoulderY + 3], [-5 + armSwing, shoulderY + 12]], 5, c.dark);
    limb(ctx, [[2, shoulderY + 3], [5 - armSwing, shoulderY + 12]], 5, c.color);
  }

  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Shots and debris                                                    */
/* ------------------------------------------------------------------ */

export function drawBullet(
  ctx: CanvasRenderingContext2D,
  b: Bullet,
  alpha: number,
  camX: number,
) {
  const x = b.px + (b.x - b.px) * alpha - camX;
  const y = b.py + (b.y - b.py) * alpha;
  const color = b.friendly ? COLORS.flameHot : COLORS.pink;

  ctx.globalAlpha = 0.35;
  ctx.fillStyle = color;
  ctx.fillRect(x - Math.sign(b.vx) * 10, y + b.h / 2 - 1, b.w + 10, 2);
  ctx.globalAlpha = 1;

  glow(ctx, color, 10);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, b.w, b.h);
  noGlow(ctx);
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  camX: number,
) {
  for (const q of particles) {
    ctx.globalAlpha = Math.max(0, Math.min(1, q.life / q.maxLife));
    ctx.fillStyle = q.color;
    const s = q.size * (0.4 + 0.6 * (q.life / q.maxLife));
    ctx.fillRect(Math.round(q.x - camX - s / 2), Math.round(q.y - s / 2), s, s);
  }
  ctx.globalAlpha = 1;
}

/** A pink wash across the screen the instant the player is hit. */
export function drawHitFlash(ctx: CanvasRenderingContext2D, strength: number) {
  if (strength <= 0) return;
  ctx.globalAlpha = strength * 0.32;
  ctx.fillStyle = COLORS.pink;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.globalAlpha = 1;
}

/** Corner darkening, so the middle of the screen reads as the focus. */
export function drawVignette(ctx: CanvasRenderingContext2D) {
  // Kept gentle: enemies come in from the edges, so the corners still have
  // to be readable.
  const g = ctx.createRadialGradient(
    VIEW_W / 2,
    VIEW_H / 2,
    VIEW_H * 0.5,
    VIEW_W / 2,
    VIEW_H / 2,
    VIEW_W * 0.75,
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.42)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

/** A thin fuel bar floating over the player while the pack is in use. */
export function drawFuelPip(
  ctx: CanvasRenderingContext2D,
  p: Player,
  alpha: number,
  camX: number,
  fuel: number,
) {
  const x = p.px + (p.x - p.px) * alpha - camX + p.w / 2;
  const y = p.py + (p.y - p.py) * alpha - 12;
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(x - 13, y, 26, 4);
  ctx.fillStyle = fuel > 0.25 ? COLORS.mint : COLORS.pink;
  ctx.fillRect(x - 12, y + 1, 24 * Math.max(0, fuel / JETPACK.maxFuel), 2);
}

/**
 * Draw a character standing idle, for the menu cards. Reuses the in-game
 * figure so the preview is always exactly what you get.
 */
export function drawPortrait(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  character: Character,
  clock: number,
  opts: { gun: boolean; jetpack: boolean },
) {
  ctx.clearRect(0, 0, w, h);
  const scale = Math.min(w / 46, h / 44);

  ctx.save();
  ctx.translate(w / 2, h - 8 + Math.sin(clock * 2) * 1.5);
  ctx.scale(scale, scale);

  const figure: Player = {
    x: -10,
    y: -28,
    px: -10,
    py: -28,
    vx: 0,
    vy: 0,
    w: 20,
    h: 28,
    grounded: true,
    coyote: 0,
    rising: false,
    facing: 1,
    sx: 1,
    sy: 1,
  };

  drawPlayer(
    ctx,
    figure,
    1,
    0,
    {
      character,
      hasGun: opts.gun,
      hasJetpack: opts.jetpack,
      thrusting: false,
      sinceShot: 99,
      invulnerable: false,
      maxSpeed: character.maxSpeed,
    },
    clock,
  );
  ctx.restore();
}
