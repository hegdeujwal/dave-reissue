export type Binding = "left" | "right" | "jump" | "pause" | "restart";

/**
 * Every key the game listens to, keyed by `event.code` so the bindings do not
 * depend on the keyboard layout. WASD, the arrow keys and Space are all live
 * at the same time; none of them shadows another.
 */
export const BINDINGS: Record<string, Binding> = {
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  Space: "jump",
  KeyW: "jump",
  ArrowUp: "jump",
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

/** Tracks held keys and one-shot presses for the whole game. */
export class Input {
  private readonly held = new Set<string>();
  private jumpPressed = false;
  private pausePressed = false;
  private restartPressed = false;

  attach() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.clear);
  }

  detach() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
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

    if (binding === "jump") this.jumpPressed = true;
    if (binding === "pause") this.pausePressed = true;
    if (binding === "restart") this.restartPressed = true;
    this.held.add(event.code);
  };

  private readonly onKeyUp = (event: KeyboardEvent) => {
    if (SWALLOW.has(event.code)) event.preventDefault();
    this.held.delete(event.code);
  };

  /** Drop every held key, so alt-tabbing does not leave the player running. */
  readonly clear = () => {
    this.held.clear();
    this.jumpPressed = false;
    this.pausePressed = false;
    this.restartPressed = false;
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
export const CONTROL_ROWS: { action: string; keys: string }[] = [
  { action: "Move", keys: "A / D  or  ← / →" },
  { action: "Jump", keys: "Space,  W  or  ↑" },
  { action: "Pause", keys: "Esc" },
  { action: "Restart level", keys: "R" },
];
