import { JUICE, PHYSICS, PLAYER_H, PLAYER_W, TILE } from "./theme";

/** What the player is asking for this step. Comes from input, never from keys. */
export type Intent = {
  left: boolean;
  right: boolean;
  /** Jump is currently held down, used for variable jump height. */
  jumpHeld: boolean;
  /** Seconds of buffered jump left. Set on the frame jump was pressed. */
  jumpBuffer: number;
};

/** The per-character numbers that override the defaults in theme.ts. */
export type Stats = {
  maxSpeed: number;
  jumpVelocity: number;
  hearts: number;
};

export type Player = {
  x: number;
  y: number;
  /** Position at the end of the previous fixed step, for render interpolation. */
  px: number;
  py: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  grounded: boolean;
  /** Seconds of coyote time left after leaving the ground. */
  coyote: number;
  /** True while rising from a jump that has not been cut short yet. */
  rising: boolean;
  facing: 1 | -1;
  /** Squash and stretch scale, springs back to 1. */
  sx: number;
  sy: number;
};

export function createPlayer(x: number, y: number): Player {
  return {
    x,
    y,
    px: x,
    py: y,
    vx: 0,
    vy: 0,
    w: PLAYER_W,
    h: PLAYER_H,
    grounded: false,
    coyote: 0,
    rising: false,
    facing: 1,
    sx: 1,
    sy: 1,
  };
}

export function clamp(v: number, min: number, max: number) {
  return v < min ? min : v > max ? max : v;
}

/** Frame-rate independent exponential approach. */
export function approach(current: number, target: number, rate: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

/** Horizontal acceleration and friction. */
export function stepHorizontal(p: Player, intent: Intent, stats: Stats, dt: number) {
  const dir = (intent.right ? 1 : 0) - (intent.left ? 1 : 0);

  if (dir !== 0) {
    p.facing = dir as 1 | -1;
    p.vx += dir * PHYSICS.accel * dt;
    if (Math.sign(p.vx) === dir && Math.abs(p.vx) > stats.maxSpeed) {
      p.vx = dir * stats.maxSpeed;
    }
  } else {
    const drop = PHYSICS.friction * dt;
    p.vx = Math.abs(p.vx) <= drop ? 0 : p.vx - Math.sign(p.vx) * drop;
  }
}

/**
 * Jump with 100ms coyote time and a 120ms input buffer, plus variable height:
 * letting go while still rising cuts the remaining upward speed.
 * Returns true if a jump started this step.
 */
export function stepJump(p: Player, intent: Intent, stats: Stats): boolean {
  let jumped = false;

  if (intent.jumpBuffer > 0 && p.coyote > 0) {
    p.vy = stats.jumpVelocity;
    p.grounded = false;
    p.coyote = 0;
    p.rising = true;
    intent.jumpBuffer = 0;
    jumped = true;
    p.sy = 1 + JUICE.jumpStretch;
    p.sx = 1 - JUICE.jumpStretch * 0.7;
  }

  if (p.rising) {
    if (p.vy >= 0) {
      p.rising = false;
    } else if (!intent.jumpHeld) {
      p.vy *= PHYSICS.jumpCut;
      p.rising = false;
    }
  }

  return jumped;
}

/** Gravity, capped at terminal fall speed. */
export function stepGravity(p: Player, dt: number) {
  p.vy = Math.min(p.vy + PHYSICS.gravity * dt, PHYSICS.terminalFall);
}

/** Tick the coyote timer. Call after collision has settled `grounded`. */
export function stepCoyote(p: Player, dt: number) {
  if (p.grounded) {
    p.coyote = PHYSICS.coyoteTime;
  } else {
    p.coyote = Math.max(0, p.coyote - dt);
  }
}

/** Spring the squash and stretch scales back toward 1. */
export function stepSquash(p: Player, dt: number) {
  p.sx = approach(p.sx, 1, JUICE.recover, dt);
  p.sy = approach(p.sy, 1, JUICE.recover, dt);
}

/** Cosmetic squash applied the moment the player touches down. */
export function landSquash(p: Player) {
  p.sy = 1 - JUICE.landSquash;
  p.sx = 1 + JUICE.landSquash * 0.7;
}

/** Is the tile at this grid cell solid? Out of bounds sideways counts as solid. */
export type SolidFn = (col: number, row: number) => boolean;

const EPS = 1e-6;

/**
 * Axis-by-axis AABB resolution against the tile grid. The fixed step keeps
 * the largest possible move (900 px/s at 1/120s) under 8px, well below one
 * tile, so nothing can tunnel through a wall.
 */
export function resolveX(p: Player, isSolid: SolidFn) {
  if (p.vx === 0) return;
  const c0 = Math.floor(p.x / TILE);
  const c1 = Math.floor((p.x + p.w - EPS) / TILE);
  const r0 = Math.floor(p.y / TILE);
  const r1 = Math.floor((p.y + p.h - EPS) / TILE);

  const blocked = (col: number) => {
    for (let r = r0; r <= r1; r++) if (isSolid(col, r)) return true;
    return false;
  };

  if (p.vx > 0) {
    for (let c = c0; c <= c1; c++) {
      if (blocked(c)) {
        p.x = c * TILE - p.w;
        p.vx = 0;
        return;
      }
    }
  } else {
    for (let c = c1; c >= c0; c--) {
      if (blocked(c)) {
        p.x = (c + 1) * TILE;
        p.vx = 0;
        return;
      }
    }
  }
}

/** Vertical resolution. Sets `grounded` when the player lands on a tile top. */
export function resolveY(p: Player, isSolid: SolidFn) {
  p.grounded = false;
  if (p.vy === 0) return;
  const c0 = Math.floor(p.x / TILE);
  const c1 = Math.floor((p.x + p.w - EPS) / TILE);
  const r0 = Math.floor(p.y / TILE);
  const r1 = Math.floor((p.y + p.h - EPS) / TILE);

  const blocked = (row: number) => {
    for (let c = c0; c <= c1; c++) if (isSolid(c, row)) return true;
    return false;
  };

  if (p.vy > 0) {
    for (let r = r0; r <= r1; r++) {
      if (blocked(r)) {
        p.y = r * TILE - p.h;
        p.vy = 0;
        p.grounded = true;
        return;
      }
    }
  } else {
    for (let r = r1; r >= r0; r--) {
      if (blocked(r)) {
        p.y = (r + 1) * TILE;
        p.vy = 0;
        return;
      }
    }
  }
}
