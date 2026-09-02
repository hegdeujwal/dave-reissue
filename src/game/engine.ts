import {
  CAMERA,
  CHARACTER_COLORS,
  FIXED_DT,
  MAX_FRAME_DT,
  PHYSICS,
  VIEW_W,
} from "./theme";
import { drawBackdrop, drawPlayer, drawTiles, setupCanvas } from "./render";
import { LEVELS, Level } from "./levels";
import { Input } from "./input";
import {
  createPlayer,
  landSquash,
  stepCoyote,
  stepGravity,
  stepHorizontal,
  stepJump,
  stepSquash,
  approach,
  clamp,
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
  private readonly input = new Input();
  private paused = false;
  private readonly intent: Intent = {
    left: false,
    right: false,
    jumpHeld: false,
    jumpBuffer: 0,
  };

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = setupCanvas(canvas);
    this.player = createPlayer(this.level.spawn.x, this.level.spawn.y);
    this.snapCamera();
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

  private readFromKeys() {
    this.intent.left = this.input.isDown("left");
    this.intent.right = this.input.isDown("right");
    this.intent.jumpHeld = this.input.isDown("jump");
    if (this.input.consumeJumpPress()) {
      this.intent.jumpBuffer = PHYSICS.jumpBuffer;
    }

    if (this.input.consumePause()) this.paused = !this.paused;
    if (this.input.consumeRestart()) this.restartLevel();
  }

  /** R drops the player back at the start of the level. */
  restartLevel() {
    const p = this.player;
    p.x = p.px = this.level.spawn.x;
    p.y = p.py = this.level.spawn.y;
    p.vx = 0;
    p.vy = 0;
    p.grounded = false;
    p.coyote = 0;
    p.rising = false;
    p.sx = 1;
    p.sy = 1;
    this.paused = false;
    this.snapCamera();
  }

  private readonly frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);

    const frameDt = Math.min((now - this.lastTime) / 1000, MAX_FRAME_DT);
    this.lastTime = now;
    this.accumulator += frameDt;

    this.readFromKeys();

    if (this.paused) {
      this.accumulator = 0;
      this.draw(1);
      return;
    }

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
    // A jump pressed just before touchdown stays alive until the player lands.
    this.intent.jumpBuffer = Math.max(0, this.intent.jumpBuffer - dt);

    this.updateCamera(dt);
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
    drawBackdrop(this.ctx, camX);
    drawTiles(this.ctx, this.level, camX);
    drawPlayer(this.ctx, this.player, alpha, camX, CHARACTER_COLORS.dave, false, 0);
  }
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
