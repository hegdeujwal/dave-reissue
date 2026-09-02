import {
  CHARACTER_COLORS,
  FIXED_DT,
  MAX_FRAME_DT,
  PHYSICS,
  VIEW_W,
} from "./theme";
import { drawBackdrop, drawPlayer, drawTiles, setupCanvas } from "./render";
import { LEVELS, Level } from "./levels";
import {
  createPlayer,
  landSquash,
  stepCoyote,
  stepGravity,
  stepHorizontal,
  stepJump,
  stepSquash,
  resolveX,
  resolveY,
  type Intent,
  type Player,
  type Stats,
} from "./physics";

const BASE_STATS: Stats = {
  maxSpeed: PHYSICS.maxSpeed,
  jumpVelocity: PHYSICS.jumpVelocity,
  hearts: 3,
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

  private readonly level = new Level(LEVELS[0]);
  private readonly player: Player;
  private readonly stats: Stats = BASE_STATS;
  private readonly held = new Set<string>();
  private readonly intent: Intent = {
    left: false,
    right: false,
    jumpHeld: false,
    jumpBuffer: 0,
  };

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = setupCanvas(canvas);
    this.player = createPlayer(this.level.spawn.x, this.level.spawn.y);
  }

  start() {
    if (this.raf) return;
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.raf = requestAnimationFrame(this.frame);
  }

  stop() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    if (!this.raf) return;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /** Re-measure after a device pixel ratio change. */
  resize() {
    setupCanvas(this.canvas);
  }

  private readonly onKeyDown = (e: KeyboardEvent) => {
    if (!this.held.has(e.code) && (e.code === "Space" || e.code === "ArrowUp")) {
      this.intent.jumpBuffer = PHYSICS.jumpBuffer;
    }
    this.held.add(e.code);
  };

  private readonly onKeyUp = (e: KeyboardEvent) => {
    this.held.delete(e.code);
  };

  private readFromKeys() {
    this.intent.left = this.held.has("ArrowLeft");
    this.intent.right = this.held.has("ArrowRight");
    this.intent.jumpHeld = this.held.has("Space") || this.held.has("ArrowUp");
  }

  private readonly frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);

    const frameDt = Math.min((now - this.lastTime) / 1000, MAX_FRAME_DT);
    this.lastTime = now;
    this.accumulator += frameDt;

    this.readFromKeys();

    while (this.accumulator >= FIXED_DT) {
      this.savePrevious();
      this.fixedUpdate(FIXED_DT);
      this.clock += FIXED_DT;
      this.accumulator -= FIXED_DT;
    }

    this.draw(this.accumulator / FIXED_DT);
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
    this.intent.jumpBuffer = Math.max(0, this.intent.jumpBuffer - dt);

    this.updateCamera();
  }

  /** Follow the player, clamped so the view never leaves the level. */
  private updateCamera() {
    const target = this.player.x + this.player.w / 2 - VIEW_W / 2;
    this.camX = Math.max(0, Math.min(this.level.widthPx - VIEW_W, target));
  }

  private draw(alpha: number) {
    const camX = lerp(this.prevCamX, this.camX, alpha);
    drawBackdrop(this.ctx, camX);
    drawTiles(this.ctx, this.level, camX);
    drawPlayer(this.ctx, this.player, alpha, camX, CHARACTER_COLORS.dave, false, 0);
  }
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
