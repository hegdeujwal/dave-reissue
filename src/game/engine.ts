import {
  CHARACTER_COLORS,
  FIXED_DT,
  MAX_FRAME_DT,
  PHYSICS,
  TILE,
  VIEW_H,
  VIEW_W,
} from "./theme";
import { drawBackdrop, drawPlayer, setupCanvas } from "./render";
import {
  createPlayer,
  landSquash,
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
    this.player = createPlayer(TILE * 3, VIEW_H - TILE * 3);
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

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Placeholder bounds. Real tile collision replaces this next.
    const floor = VIEW_H - TILE - p.h;
    const wasGrounded = p.grounded;
    p.grounded = false;
    if (p.y >= floor) {
      p.y = floor;
      p.vy = 0;
      p.grounded = true;
      if (!wasGrounded) landSquash(p);
    }
    if (p.x < 0) {
      p.x = 0;
      p.vx = 0;
    }
    if (p.x + p.w > VIEW_W) {
      p.x = VIEW_W - p.w;
      p.vx = 0;
    }

    stepCoyote(p, dt);
    stepSquash(p, dt);
    this.intent.jumpBuffer = Math.max(0, this.intent.jumpBuffer - dt);
  }

  private draw(alpha: number) {
    const camX = lerp(this.prevCamX, this.camX, alpha);
    drawBackdrop(this.ctx, camX);
    drawPlayer(this.ctx, this.player, alpha, camX, CHARACTER_COLORS.dave, false, 0);
  }
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
