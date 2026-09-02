import { LEVELS } from "./levels";
import { CHARACTER_COLORS, type CharacterId } from "./theme";

const STORAGE_KEY = "dave-reissue.save.v1";
const VERSION = 1;

export type SavedCheckpoint = {
  level: number;
  x: number;
  y: number;
};

export type SaveData = {
  version: number;
  /** How many levels the player has unlocked, always at least one. */
  unlockedLevels: number;
  character: CharacterId;
  /** Gems banked across the run. */
  gems: number;
  checkpoint: SavedCheckpoint | null;
};

export const CHARACTER_IDS = Object.keys(CHARACTER_COLORS) as CharacterId[];

export const DEFAULT_SAVE: SaveData = {
  version: VERSION,
  unlockedLevels: 1,
  character: "dave",
  gems: 0,
  checkpoint: null,
};

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Rebuild a save out of whatever was in storage, field by field. Anything
 * missing, mistyped or out of range falls back to the default, so a hand
 * edited or half-written value can never white-screen the game.
 */
function coerce(raw: unknown): SaveData {
  const save: SaveData = { ...DEFAULT_SAVE };
  if (!raw || typeof raw !== "object") return save;
  const data = raw as Record<string, unknown>;

  if (isFiniteNumber(data.unlockedLevels)) {
    save.unlockedLevels = clampInt(data.unlockedLevels, 1, LEVELS.length);
  }
  if (
    typeof data.character === "string" &&
    CHARACTER_IDS.includes(data.character as CharacterId)
  ) {
    save.character = data.character as CharacterId;
  }
  if (isFiniteNumber(data.gems)) {
    save.gems = Math.max(0, Math.floor(data.gems));
  }

  const checkpoint = data.checkpoint;
  if (checkpoint && typeof checkpoint === "object") {
    const cp = checkpoint as Record<string, unknown>;
    if (isFiniteNumber(cp.level) && isFiniteNumber(cp.x) && isFiniteNumber(cp.y)) {
      save.checkpoint = {
        level: clampInt(cp.level, 0, LEVELS.length - 1),
        x: cp.x,
        y: cp.y,
      };
    }
  }

  if (save.checkpoint && save.checkpoint.level >= save.unlockedLevels) {
    save.unlockedLevels = save.checkpoint.level + 1;
  }

  return save;
}

function readStorage(): SaveData {
  if (typeof window === "undefined") return { ...DEFAULT_SAVE };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SAVE };
    return coerce(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

/**
 * The save doubles as a tiny external store so the menu can subscribe to it
 * with useSyncExternalStore. `cached` is only ever replaced, never mutated,
 * which is what makes the snapshot safe to compare by reference.
 */
let cached: SaveData = DEFAULT_SAVE;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function loadSave(): SaveData {
  if (!hydrated) {
    cached = readStorage();
    hydrated = true;
  }
  return cached;
}

export function writeSave(save: SaveData): SaveData {
  const clean = coerce(save);
  cached = clean;
  hydrated = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  } catch {
    // Private mode or a full quota. The run still works, it just is not saved.
  }
  emit();
  return clean;
}

/** Merge a patch into whatever is stored and write it back. */
export function patchSave(patch: Partial<SaveData>): SaveData {
  return writeSave({ ...loadSave(), ...patch });
}

export function resetSave(): SaveData {
  cached = { ...DEFAULT_SAVE };
  hydrated = true;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clean up.
  }
  emit();
  return cached;
}

export function subscribeSave(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The server has no storage, so it always renders the empty save. */
export function serverSave(): SaveData {
  return DEFAULT_SAVE;
}

/** Is there anything worth continuing from? */
export function hasProgress(save: SaveData) {
  return save.unlockedLevels > 1 || save.checkpoint !== null || save.gems > 0;
}
