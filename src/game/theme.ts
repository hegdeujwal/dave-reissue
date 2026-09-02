/**
 * Every colour and every tuning number for Dave: Reissue lives here.
 * Nothing else in the game is allowed to hard-code a constant.
 */

/** Flat palette. Danger is readable by colour alone: pink hurts, mint helps. */
export const COLORS = {
  /** Background navy. */
  bg: "#14162B",
  /** Text / ink bone. */
  ink: "#F2EDE3",
  /** Player and doors. */
  orange: "#FF5A1F",
  /** Anything that hurts. */
  pink: "#FF48B0",
  /** Anything that helps. */
  mint: "#4CE0B3",

  /** Derived navies for solid tiles and backdrop. Flat fills, never gradients. */
  wall: "#272B4E",
  wallEdge: "#3C4278",
  grid: "#1B1E38",
  dim: "#4A4F7A",
} as const;

/** Player body colours. Kept clear of pink and mint so danger stays unambiguous. */
export const CHARACTER_COLORS = {
  dave: COLORS.orange,
  nyx: COLORS.ink,
  bram: "#FFB020",
} as const;

export type CharacterId = keyof typeof CHARACTER_COLORS;

/** Tile grid. Levels are always 16 rows tall. */
export const TILE = 32;
export const LEVEL_ROWS = 16;

/** Canvas viewport, in CSS pixels. 30 x 16 tiles. */
export const VIEW_W = 30 * TILE;
export const VIEW_H = LEVEL_ROWS * TILE;

/** Player collision box. */
export const PLAYER_W = 20;
export const PLAYER_H = 28;

/** Simulation. Fixed timestep, interpolated rendering, frame-rate independent. */
export const FIXED_DT = 1 / 120;
/** Never advance more than this much wall-clock time in one frame. */
export const MAX_FRAME_DT = 0.25;

export const PHYSICS = {
  gravity: 2200,
  accel: 3000,
  friction: 2600,
  maxSpeed: 260,
  jumpVelocity: -620,
  terminalFall: 900,
  /** Grace period after walking off a ledge during which a jump still fires. */
  coyoteTime: 0.1,
  /** A jump pressed this long before landing still fires on touchdown. */
  jumpBuffer: 0.12,
  /** Releasing jump while rising cuts the remaining upward speed to this. */
  jumpCut: 0.4,
} as const;

/** Camera. Exponential lerp toward the player, clamped to level bounds. */
export const CAMERA = {
  /** Higher follows harder. Applied as 1 - e^(-k * dt) so it is dt independent. */
  lerp: 7.5,
  /** Look ahead in the direction of travel, in pixels. */
  lookahead: 48,
} as const;

/** Health and damage. */
export const COMBAT = {
  hearts: 3,
  invulnTime: 1.2,
  knockbackX: 240,
  knockbackY: -320,
  /** Flicker period while invulnerable, in seconds. */
  flicker: 0.09,
} as const;

/** Patrolling enemies. */
export const ENEMY = {
  speed: 62,
  w: 24,
  h: 24,
} as const;

/** Squash and stretch, purely cosmetic. */
export const JUICE = {
  jumpStretch: 0.26,
  landSquash: 0.3,
  /** How fast the scale springs back to 1. */
  recover: 11,
  /** Gem bob amplitude in pixels and speed in radians per second. */
  bobAmp: 3,
  bobSpeed: 3.2,
} as const;

/** How long a toast such as "Checkpoint saved" stays on screen. */
export const TOAST_TIME = 1.8;
