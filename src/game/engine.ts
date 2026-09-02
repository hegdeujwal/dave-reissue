import { FIXED_DT, MAX_FRAME_DT, VIEW_H, VIEW_W } from "./theme";
import { drawBackdrop, setupCanvas } from "./render";

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
  protected clock = 0;
  protected camX = 0;
  protected prevCamX = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = setupCanvas(canvas);
  }

  start() {
    if (this.raf) return;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.raf = requestAnimationFrame(this.frame);
  }

  stop() {
    if (!this.raf) return;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /** Re-measure after a device pixel ratio change. */
  resize() {
    setupCanvas(this.canvas);
  }

  private readonly frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);

    const frameDt = Math.min((now - this.lastTime) / 1000, MAX_FRAME_DT);
    this.lastTime = now;
    this.accumulator += frameDt;

    while (this.accumulator >= FIXED_DT) {
      this.savePrevious();
      this.fixedUpdate(FIXED_DT);
      this.clock += FIXED_DT;
      this.accumulator -= FIXED_DT;
    }

    this.draw(this.accumulator / FIXED_DT);
  };

  /** Snapshot the values the renderer interpolates from. */
  protected savePrevious() {
    this.prevCamX = this.camX;
  }

  protected fixedUpdate(_dt: number) {}

  protected draw(alpha: number) {
    const camX = lerp(this.prevCamX, this.camX, alpha);
    drawBackdrop(this.ctx, camX);
  }

  protected get context() {
    return this.ctx;
  }

  protected get viewport() {
    return { w: VIEW_W, h: VIEW_H };
  }
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
