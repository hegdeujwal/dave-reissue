import { JETPACK } from "./theme";

export type Binding =
  | "left"
  | "right"
  | "jump"
  | "shoot"
  | "jet"
  | "pause"
  | "restart";

/**
 * Every key (and the left mouse button) the game listens to. Real keys are
 * keyed by `event.code` so the bindings do not depend on the keyboard
 * layout. "MouseLeft" and "SpaceDoubleTap" are not real codes — they are
 * synthetic markers this module adds to and removes from the same held-keys
 * set, which lets `isDown()` treat a held mouse button or an engaged
 * double-tap exactly like a held key.
 */
export const BINDINGS: Record<string, Binding> = {
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  Space: "jump",
  ArrowUp: "jump",
  KeyE: "shoot",
  MouseLeft: "shoot",
  SpaceDoubleTap: "jet",
  Escape: "pause",
  KeyR: "restart",
};

/** Keys the browser would otherwise use to scroll the page. */
const SWALLOW = new Set([
  "Space",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
]);

const INTERACTIVE = "button, a[href], input, select, textarea";

const DOUBLE_TAP_MS = JETPACK.doubleTap * 1000;

/** Tracks held keys, the held mouse button, and one-shot presses. */
export class Input {
  private readonly held = new Set<string>();
  private jumpPressed = false;
  private pausePressed = false;
  private restartPressed = false;
  /**
   * Timestamp of the last non-repeat Space keydown, for double-tap timing.
   * Starts at -Infinity (not 0) so the very first press right after page
   * load — when performance.now() is itself close to 0 — is never mistaken
   * for a double-tap.
   */
  private lastSpaceDown = -Infinity;

  attach() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);
    window.addEventListener("blur", this.clear);
  }

  detach() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mouseup", this.onMouseUp);
    window.removeEventListener("blur", this.clear);
    this.clear();
  }

  private readonly onKeyDown = (event: KeyboardEvent) => {
    const binding = BINDINGS[event.code];
    if (!binding) return;

    // Let the menu buttons keep their own keyboard behaviour.
    const target = event.target as HTMLElement | null;
    const inMenu = !!target?.closest?.(INTERACTIVE);
    if (SWALLOW.has(event.code) && !inMenu) event.preventDefault();

    if (event.repeat) return;

    if (binding === "jump") {
      if (event.code === "Space") {
        // A second Space press within the window is a double-tap: engage
        // the jetpack instead of buffering another jump for this press.
        const now = performance.now();
        const isDoubleTap = now - this.lastSpaceDown <= DOUBLE_TAP_MS;
        this.lastSpaceDown = now;
        if (isDoubleTap) {
          this.held.add("SpaceDoubleTap");
        } else {
          this.jumpPressed = true;
        }
      } else {
        this.jumpPressed = true;
      }
    }
    if (binding === "pause") this.pausePressed = true;
    if (binding === "restart") this.restartPressed = true;
    this.held.add(event.code);
  };

  private readonly onKeyUp = (event: KeyboardEvent) => {
    if (SWALLOW.has(event.code)) event.preventDefault();
    this.held.delete(event.code);
    // Releasing Space always stops a double-tap thrust in progress.
    if (event.code === "Space") this.held.delete("SpaceDoubleTap");
  };

  private readonly onMouseDown = (event: MouseEvent) => {
    if (event.button !== 0) return;
    // Let menu buttons and other UI keep their own click behaviour.
    const target = event.target as HTMLElement | null;
    if (target?.closest?.(INTERACTIVE)) return;
    event.preventDefault();
    this.held.add("MouseLeft");
  };

  private readonly onMouseUp = (event: MouseEvent) => {
    if (event.button !== 0) return;
    this.held.delete("MouseLeft");
  };

  /** Drop every held key and the mouse button, so alt-tabbing does not leave
   *  the player firing or flying. */
  readonly clear = () => {
    this.held.clear();
    this.jumpPressed = false;
    this.pausePressed = false;
    this.restartPressed = false;
    this.lastSpaceDown = -Infinity;
  };

  isDown(binding: Binding) {
    for (const code of this.held) {
      if (BINDINGS[code] === binding) return true;
    }
    return false;
  }

  /** True once per press, then reset. Feeds the 120ms jump buffer. */
  consumeJumpPress() {
    const pressed = this.jumpPressed;
    this.jumpPressed = false;
    return pressed;
  }

  consumePause() {
    const pressed = this.pausePressed;
    this.pausePressed = false;
    return pressed;
  }

  consumeRestart() {
    const pressed = this.restartPressed;
    this.restartPressed = false;
    return pressed;
  }
}

/** Rows for the Controls panel, so the UI and the bindings cannot drift apart. */
export const CONTROL_ROWS: { action: string; keys: string; note?: string }[] = [
  { action: "Move", keys: "A / D" },
  { action: "Jump", keys: "Space" },
  { action: "Shoot", keys: "Left click or E", note: "Needs the gun" },
  {
    action: "Jetpack",
    keys: "Double-tap Space, hold",
    note: "Needs the jetpack",
  },
  { action: "Pause", keys: "Esc" },
  { action: "Restart level", keys: "R" },
];
