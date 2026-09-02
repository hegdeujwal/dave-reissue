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

  /** Derived navies for solid tiles and backdrop. */
  wall: "#272B4E",
  wallEdge: "#3C4278",
  wallShade: "#1B1E3C",
  grid: "#1B1E38",
  dim: "#4A4F7A",

  /** Parallax layers, back to front. */
  skyTop: "#0B0D1C",
  skyBottom: "#1A1D3A",
  far: "#191C34",
  mid: "#202444",
  star: "#3A4070",

  /** Breakable crates: warm and obviously not part of the navy structure. */
  crate: "#8A5A3B",
  crateLight: "#B87F51",
  crateDark: "#5C3A24",

  /** Hardware. */
  steel: "#9AA3C7",
  steelDark: "#5B628A",
  visor: "#9FE8FF",
  flame: "#FFB020",
  flameHot: "#FFF0BE",
} as const;

/** Player body colours. Kept clear of pink and mint so danger stays unambiguous. */
export const CHARACTER_COLORS = {
  dave: COLORS.orange,
  nyx: COLORS.ink,
  bram: "#FFB020",
} as const;

export type CharacterId = keyof typeof CHARACTER_COLORS;

export type Character = {
  id: CharacterId;
  name: string;
  /** Suit colour, and the two tones used to shade it. */
  color: string;
  dark: string;
  trim: string;
  skin: string;
  hearts: number;
  maxSpeed: number;
  jumpVelocity: number;
  /** One line for the character strip. */
  note: string;
};

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

/** Starting hearts for the two characters that do not change it. */
export const COMBAT_HEARTS = 3;

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

/**
 * The three playable characters. Dave is the baseline, the other two trade
 * one number for another rather than being strictly better.
 */
export const CHARACTERS: Record<CharacterId, Character> = {
  dave: {
    id: "dave",
    name: "Dave",
    color: CHARACTER_COLORS.dave,
    dark: "#B23B0F",
    trim: "#2E3157",
    skin: "#E8B183",
    hearts: COMBAT_HEARTS,
    maxSpeed: PHYSICS.maxSpeed,
    jumpVelocity: PHYSICS.jumpVelocity,
    note: "3 hearts. The baseline.",
  },
  nyx: {
    id: "nyx",
    name: "Nyx",
    color: CHARACTER_COLORS.nyx,
    dark: "#A8A296",
    trim: "#2E3157",
    skin: "#6E4A34",
    hearts: COMBAT_HEARTS,
    maxSpeed: 320,
    jumpVelocity: -560,
    note: "3 hearts. Faster, jumps lower.",
  },
  bram: {
    id: "bram",
    name: "Bram",
    color: CHARACTER_COLORS.bram,
    dark: "#B0740D",
    trim: "#2E3157",
    skin: "#C98B5E",
    hearts: 4,
    maxSpeed: 210,
    jumpVelocity: -660,
    note: "4 hearts. Slower, jumps higher.",
  },
};

/** Camera. Exponential lerp toward the player, clamped to level bounds. */
export const CAMERA = {
  /** Higher follows harder. Applied as 1 - e^(-k * dt) so it is dt independent. */
  lerp: 7.5,
  /** Look ahead in the direction of travel, in pixels. */
  lookahead: 48,
} as const;

/** Health and damage. */
export const COMBAT = {
  hearts: COMBAT_HEARTS,
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

/** The gun. Ammo is capped but trickles back, so a level can never be lost. */
export const WEAPON = {
  maxAmmo: 6,
  /** Seconds to regenerate one round. */
  reload: 1.5,
  /** Minimum gap between shots. */
  cooldown: 0.22,
  bulletSpeed: 640,
  bulletW: 12,
  bulletH: 4,
  /** Seconds before a bullet gives up. */
  life: 1.1,
  /** How far the muzzle sits from the middle of the player. */
  muzzle: 14,
} as const;

/** The jetpack. Fuel refills on the ground, so a shaft can always be retried. */
export const JETPACK = {
  /** Upward acceleration while thrusting, fighting gravity 2200. */
  thrust: 3700,
  /** Fastest the pack will lift you. */
  maxRise: 300,
  /** Seconds of thrust in a full tank. */
  maxFuel: 2.6,
  burn: 1,
  /** Fuel per second recovered while standing still on the ground. */
  recharge: 0.9,
  /** Seconds before a spent canister comes back. */
  canisterRespawn: 7,
} as const;

/** Wall-mounted turrets. Stationary, dangerous, and destructible. */
export const TURRET = {
  w: 26,
  h: 28,
  /** Seconds between shots. */
  interval: 1.8,
  /** It only fires when the player is this close and roughly level with it. */
  range: 420,
  boltSpeed: 300,
  boltW: 14,
  boltH: 6,
  life: 2.4,
} as const;

/** Screen shake, in pixels of initial offset. */
export const SHAKE = {
  hit: 9,
  explosion: 6,
  land: 2,
  /** How fast the shake dies away. */
  decay: 9,
} as const;

/** How long a toast such as "Checkpoint saved" stays on screen. */
export const TOAST_TIME = 1.8;
