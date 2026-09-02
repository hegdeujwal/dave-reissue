import {
  CAMERA,
  CHARACTER_COLORS,
  COMBAT,
  FIXED_DT,
  MAX_FRAME_DT,
  PHYSICS,
  TILE,
  VIEW_W,
} from "./theme";
import {
  drawBackdrop,
  drawDoor,
  drawGem,
  drawKey,
  drawPlayer,
  drawTiles,
  setupCanvas,
} from "./render";
import { LEVELS, Level, tileBox } from "./levels";
import { Input } from "./input";
import {
  approach,
  clamp,
  createPlayer,
  landSquash,
  overlaps,
  resolveX,
  resolveY,
  stepCoyote,
  stepGravity,
  stepHorizontal,
  stepJump,
  stepSquash,
  type Intent,
  type Player,
  type Stats,
} from "./physics";

const BASE_STATS: Stats = {
  maxSpeed: PHYSICS.maxSpeed,
  jumpVelocity: PHYSICS.jumpVelocity,
  hearts: COMBAT.hearts,
};

export type Mode = "playing" | "paused" | "levelComplete";

/** What the React layer needs in order to draw the HUD and the menus. */
export type Snapshot = {
  mode: Mode;
  levelIndex: number;
  levelName: string;
  levelCount: number;
  gems: number;
  gemsTotal: number;
  hasKey: boolean;
  time: number;
};

export type GameHooks = {
  onSnapshot: (snapshot: Snapshot) => void;
};

/**
 * The game loop. Physics runs on a fixed 1/120s step and rendering
 * interpolates between the last two steps, so behaviour does not change
 * with the refresh rate.
 */
export class Game {
  private readonly ctx: CanvasRenderingContext2D;
  private raf = 0;
  private lastTime = 0;
  private accumulator = 0;

  /** Elapsed simulated time, used by cosmetic animations. */
  private clock = 0;
  private camX = 0;
  private prevCamX = 0;

  private levelIndex = 0;
  private level: Level;
  private readonly player: Player;
  private readonly stats: Stats = BASE_STATS;
  private readonly input = new Input();
  private mode: Mode = "playing";
  private elapsed = 0;

  /** Per-level run state. */
  private gemsTaken: boolean[] = [];
  private hasKey = false;

  private lastSignature = "";

  private readonly intent: Intent = {
    left: false,
    right: false,
    jumpHeld: false,
    jumpBuffer: 0,
  };

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly hooks: GameHooks,
    startLevel = 0,
  ) {
    this.ctx = setupCanvas(canvas);
    this.levelIndex = clamp(startLevel, 0, LEVELS.length - 1);
    this.level = new Level(LEVELS[this.levelIndex]);
    this.player = createPlayer(this.level.spawn.x, this.level.spawn.y);
    this.loadLevel(this.levelIndex);
  }

  start() {
    if (this.raf) return;
    this.input.attach();
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.raf = requestAnimationFrame(this.frame);
  }

  stop() {
    this.input.detach();
    if (!this.raf) return;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /** Re-measure after a device pixel ratio change. */
  resize() {
    setupCanvas(this.canvas);
  }

  loadLevel(index: number) {
    this.levelIndex = clamp(index, 0, LEVELS.length - 1);
    this.level = new Level(LEVELS[this.levelIndex]);
    this.gemsTaken = this.level.gems.map(() => false);
    this.hasKey = false;
    this.elapsed = 0;
    this.mode = "playing";
    this.respawn();
    this.publish(true);
  }

  nextLevel() {
    if (this.levelIndex + 1 < LEVELS.length) this.loadLevel(this.levelIndex + 1);
  }

  /** R drops the player back at the start of the level. */
  restartLevel() {
    this.loadLevel(this.levelIndex);
  }

  /** Put the player back on their feet without touching level progress. */
  private respawn() {
    const p = this.player;
    p.x = p.px = this.level.spawn.x;
    p.y = p.py = this.level.spawn.y;
    p.vx = 0;
    p.vy = 0;
    p.grounded = false;
    p.coyote = 0;
    p.rising = false;
    p.facing = 1;
    p.sx = 1;
    p.sy = 1;
    this.snapCamera();
  }

  setPaused(paused: boolean) {
    if (this.mode === "levelComplete") return;
    this.mode = paused ? "paused" : "playing";
    this.publish();
  }

  private readFromKeys() {
    this.intent.left = this.input.isDown("left");
    this.intent.right = this.input.isDown("right");
    this.intent.jumpHeld = this.input.isDown("jump");
    if (this.input.consumeJumpPress()) {
      this.intent.jumpBuffer = PHYSICS.jumpBuffer;
    }

    if (this.input.consumePause() && this.mode !== "levelComplete") {
      this.setPaused(this.mode === "playing");
    }
    if (this.input.consumeRestart()) this.restartLevel();
  }

  private readonly frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);

    const frameDt = Math.min((now - this.lastTime) / 1000, MAX_FRAME_DT);
    this.lastTime = now;
    this.accumulator += frameDt;

    this.readFromKeys();

    if (this.mode !== "playing") {
      this.accumulator = 0;
      this.draw(1);
      return;
    }

    while (this.accumulator >= FIXED_DT) {
      this.savePrevious();
      this.fixedUpdate(FIXED_DT);
      this.clock += FIXED_DT;
      this.elapsed += FIXED_DT;
      this.accumulator -= FIXED_DT;
    }

    this.draw(this.accumulator / FIXED_DT);
    this.publish();
  };

  /** Snapshot the values the renderer interpolates from. */
  private savePrevious() {
    this.prevCamX = this.camX;
    this.player.px = this.player.x;
    this.player.py = this.player.y;
  }

  private fixedUpdate(dt: number) {
    const p = this.player;

    stepHorizontal(p, this.intent, this.stats, dt);
    stepJump(p, this.intent, this.stats);
    stepGravity(p, dt);

    const wasGrounded = p.grounded;
    p.x += p.vx * dt;
    resolveX(p, this.level.isSolid);
    p.y += p.vy * dt;
    resolveY(p, this.level.isSolid);
    if (p.grounded && !wasGrounded) landSquash(p);

    stepCoyote(p, dt);
    stepSquash(p, dt);
    // A jump pressed just before touchdown stays alive until the player lands.
    this.intent.jumpBuffer = Math.max(0, this.intent.jumpBuffer - dt);

    this.collectPickups();
    this.updateCamera(dt);
  }

  /** Gems, the key, and the door that only opens once the key is held. */
  private collectPickups() {
    const p = this.player;

    this.level.gems.forEach((cell, i) => {
      if (this.gemsTaken[i]) return;
      if (overlaps(p, tileBox(cell, 6))) this.gemsTaken[i] = true;
    });

    if (this.level.key && !this.hasKey) {
      if (overlaps(p, tileBox(this.level.key, 5))) this.hasKey = true;
    }

    if (this.level.door && this.hasKey) {
      if (overlaps(p, tileBox(this.level.door, 4))) {
        this.mode = "levelComplete";
        this.publish(true);
      }
    }
  }

  /**
   * Smooth camera. It eases toward the player with a frame-rate independent
   * lerp and looks a little way ahead of the direction of travel. The target
   * is clamped to the level bounds, so the view never leaves the map and
   * never flips forward by a whole screen the way the original did.
   */
  private updateCamera(dt: number) {
    this.camX = approach(this.camX, this.cameraTarget(), CAMERA.lerp, dt);
  }

  private cameraTarget() {
    const p = this.player;
    const wanted = p.x + p.w / 2 + CAMERA.lookahead * p.facing - VIEW_W / 2;
    return clamp(wanted, 0, Math.max(0, this.level.widthPx - VIEW_W));
  }

  /** Jump the camera straight to the target, for level loads and respawns. */
  private snapCamera() {
    this.camX = this.cameraTarget();
    this.prevCamX = this.camX;
  }

  private draw(alpha: number) {
    const camX = lerp(this.prevCamX, this.camX, alpha);
    const ctx = this.ctx;

    drawBackdrop(ctx, camX);
    drawTiles(ctx, this.level, camX);

    this.level.gems.forEach((cell, i) => {
      if (this.gemsTaken[i]) return;
      drawGem(ctx, cell.col * TILE - camX, cell.row * TILE, this.clock);
    });

    if (this.level.key && !this.hasKey) {
      drawKey(
        ctx,
        this.level.key.col * TILE - camX,
        this.level.key.row * TILE,
        this.clock,
      );
    }

    if (this.level.door) {
      drawDoor(
        ctx,
        this.level.door.col * TILE - camX,
        this.level.door.row * TILE,
        this.hasKey,
      );
    }

    drawPlayer(ctx, this.player, alpha, camX, CHARACTER_COLORS.dave, false, 0);
  }

  private snapshot(): Snapshot {
    return {
      mode: this.mode,
      levelIndex: this.levelIndex,
      levelName: this.level.data.name,
      levelCount: LEVELS.length,
      gems: this.gemsTaken.filter(Boolean).length,
      gemsTotal: this.level.gems.length,
      hasKey: this.hasKey,
      time: this.elapsed,
    };
  }

  /** Push to React only when something visible actually changed. */
  private publish(force = false) {
    const snapshot = this.snapshot();
    const signature = [
      snapshot.mode,
      snapshot.levelIndex,
      snapshot.gems,
      snapshot.hasKey,
      snapshot.time.toFixed(1),
    ].join("|");
    if (!force && signature === this.lastSignature) return;
    this.lastSignature = signature;
    this.hooks.onSnapshot(snapshot);
  }
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
