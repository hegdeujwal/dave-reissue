import { LEVEL_ROWS, PLAYER_H, PLAYER_W, TILE } from "./theme";

/**
 * Levels are hand-authored as arrays of strings, 16 rows tall, one character
 * per 32px tile.
 *
 *   #  solid    ^  spike     *  gem      k  key
 *   D  door     C  checkpoint  e  enemy  P  spawn   .  empty
 */
export const SOLID = "#";
export const SPIKE = "^";
export const GEM = "*";
export const KEY = "k";
export const DOOR = "D";
export const CHECKPOINT = "C";
export const ENEMY = "e";
export const SPAWN = "P";

export type LevelData = {
  name: string;
  rows: string[];
};

export const LEVELS: LevelData[] = [
  {
    name: "First Light",
    rows: [
    "................................................",
    "................................................",
    "................................................",
    "................................................",
    "................................................",
    "................................................",
    "................................................",
    "................................................",
    "................................................",
    "................................................",
    "................................................",
    "................................................",
    "...............*.*..............................",
    "...P.*.*......#####.....^..*..C..*..k.......D...",
    "################################################",
    "################################################",
    ],
  },
];

export type Point = { x: number; y: number };
export type Cell = { col: number; row: number };

/** A parsed level: the solid grid, its entities, and the camera bounds. */
export class Level {
  readonly cols: number;
  readonly rows: number;
  readonly widthPx: number;
  readonly heightPx: number;
  readonly spawn: Point;
  readonly gems: Cell[] = [];
  readonly checkpoints: Cell[] = [];
  readonly enemies: Cell[] = [];
  readonly key: Cell | null = null;
  readonly door: Cell | null = null;
  private readonly cells: string[];

  constructor(readonly data: LevelData) {
    this.cells = data.rows;
    this.rows = data.rows.length;
    this.cols = data.rows[0]?.length ?? 0;
    this.widthPx = this.cols * TILE;
    this.heightPx = this.rows * TILE;
    this.spawn = { x: 0, y: 0 };

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        switch (this.cells[row][col]) {
          case SPAWN:
            this.spawn = tileToBox(col, row);
            break;
          case GEM:
            this.gems.push({ col, row });
            break;
          case CHECKPOINT:
            this.checkpoints.push({ col, row });
            break;
          case ENEMY:
            this.enemies.push({ col, row });
            break;
          case KEY:
            this.key = { col, row };
            break;
          case DOOR:
            this.door = { col, row };
            break;
        }
      }
    }
  }

  at(col: number, row: number): string {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return ".";
    return this.cells[row][col];
  }

  /** Off the left and right edges is solid, so the player cannot leave the map. */
  isSolid = (col: number, row: number): boolean => {
    if (col < 0 || col >= this.cols) return true;
    return this.at(col, row) === SOLID;
  };
}

/** Top-left of a player-sized box standing on the floor of the given tile. */
export function tileToBox(col: number, row: number): Point {
  return {
    x: col * TILE + (TILE - PLAYER_W) / 2,
    y: (row + 1) * TILE - PLAYER_H,
  };
}

/** The pixel box of a tile, inset so pickups need a real overlap. */
export function tileBox(cell: Cell, inset = 0) {
  return {
    x: cell.col * TILE + inset,
    y: cell.row * TILE + inset,
    w: TILE - inset * 2,
    h: TILE - inset * 2,
  };
}

/** Every level must be exactly 16 rows tall. */
export const EXPECTED_ROWS = LEVEL_ROWS;
