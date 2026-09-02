"use client";

import type { Snapshot } from "@/game/engine";
import { CHARACTERS } from "@/game/theme";

function formatTime(seconds: number) {
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  const tenths = Math.floor((seconds * 10) % 10);
  return `${minutes}:${String(rest).padStart(2, "0")}.${tenths}`;
}

function Heart({ filled, color }: { filled: boolean; color: string }) {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
      <path
        d="M8 14.5 1.6 8.1C-0.4 6.1 0.7 2.6 4.1 2.6c1.9 0 3.2 1.2 3.9 2.4.7-1.2 2-2.4 3.9-2.4 3.4 0 4.5 3.5 2.5 5.5L8 14.5Z"
        fill={filled ? color : "transparent"}
        stroke={filled ? color : "#4A4F7A"}
        strokeWidth="1.5"
      />
    </svg>
  );
}

/** Hearts, gems, the key and the level timer, laid over the canvas. */
export default function Hud({ snapshot }: { snapshot: Snapshot }) {
  const color = CHARACTERS[snapshot.characterId].color;
  const hearts = Array.from({ length: snapshot.maxHearts }, (_, i) => i);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3 font-display text-xs uppercase tracking-widest">
      <div className="flex items-center gap-4 border-2 border-bone bg-navy px-3 py-2">
        <span className="flex gap-1">
          {hearts.map((i) => (
            <Heart key={i} filled={i < snapshot.hearts} color={color} />
          ))}
        </span>

        <span className="flex items-center gap-2 text-mint">
          <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
            <path d="M6 0 10 6 6 12 2 6Z" fill="currentColor" />
          </svg>
          {snapshot.gems}/{snapshot.gemsTotal}
        </span>

        <span className={snapshot.hasKey ? "text-mint" : "text-dim"}>
          {snapshot.hasKey ? "Key held" : "No key"}
        </span>
      </div>

      <div className="border-2 border-bone bg-navy px-3 py-2 tabular-nums text-bone">
        {formatTime(snapshot.time)}
      </div>
    </div>
  );
}
