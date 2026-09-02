"use client";

import type { ReactNode } from "react";
import type { Snapshot } from "@/game/engine";
import { CHARACTERS } from "@/game/theme";

function formatTime(seconds: number) {
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  const tenths = Math.floor((seconds * 10) % 10);
  return `${minutes}:${String(rest).padStart(2, "0")}.${tenths}`;
}

/** The chunky bordered plate every HUD group sits on. */
function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 border-2 border-bone/80 bg-navy/90 px-3 py-2 shadow-[4px_4px_0_0_rgba(0,0,0,0.45)] ${className}`}
    >
      {children}
    </div>
  );
}

function Heart({ filled, color }: { filled: boolean; color: string }) {
  return (
    <svg viewBox="0 0 16 16" className="h-[18px] w-[18px]" aria-hidden>
      <path
        d="M8 14.6 1.5 8.1C-0.5 6.1 0.6 2.5 4.1 2.5c1.9 0 3.2 1.2 3.9 2.4.7-1.2 2-2.4 3.9-2.4 3.5 0 4.6 3.6 2.6 5.6L8 14.6Z"
        fill={filled ? color : "transparent"}
        stroke={filled ? color : "#4A4F7A"}
        strokeWidth="1.6"
      />
    </svg>
  );
}

function GemIcon() {
  return (
    <svg viewBox="0 0 12 12" className="h-3.5 w-3.5" aria-hidden>
      <path d="M6 0 10 4.5 6 12 2 4.5Z" fill="currentColor" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
      <circle cx="5" cy="5" r="3.6" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M7.4 7.4 14 14M11 14h3M12.5 11.2l2 2" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  );
}

function FlameIcon() {
  return (
    <svg viewBox="0 0 12 16" className="h-4 w-3" aria-hidden>
      <path
        d="M6 0C6 4 2 4.6 2 8.8A4 4 0 0 0 10 9c0-2.2-1.4-3-2.2-4.6C7.2 3.2 7.4 1.6 6 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Hearts, gems, key, gear and the level timer, laid over the canvas. */
export default function Hud({ snapshot }: { snapshot: Snapshot }) {
  const color = CHARACTERS[snapshot.characterId].color;
  const hearts = Array.from({ length: snapshot.maxHearts }, (_, i) => i);
  const rounds = Array.from({ length: snapshot.maxAmmo }, (_, i) => i);
  const fuelSegments = Array.from({ length: 10 }, (_, i) => i);
  const lowFuel = snapshot.fuel <= 0.25;
  const hasGear = snapshot.hasGun || snapshot.hasJetpack;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-3 font-display text-[11px] uppercase tracking-widest">
      <div className="flex flex-col items-start gap-2">
        <Panel>
          <span className="flex gap-1">
            {hearts.map((i) => (
              <Heart key={i} filled={i < snapshot.hearts} color={color} />
            ))}
          </span>

          <span className="h-5 w-px bg-bone/25" />

          <span className="flex items-center gap-1.5 text-mint">
            <GemIcon />
            <span className="tabular-nums">
              {snapshot.gems}/{snapshot.gemsTotal}
            </span>
          </span>

          <span className="h-5 w-px bg-bone/25" />

          <span
            className={`flex items-center gap-1.5 ${
              snapshot.hasKey ? "text-mint" : "text-dim"
            }`}
          >
            <KeyIcon />
            {snapshot.hasKey ? "Held" : "None"}
          </span>
        </Panel>

        {hasGear ? (
          <Panel>
            {snapshot.hasGun ? (
              <span className="flex items-center gap-2">
                <span className="text-dim">Ammo</span>
                <span className="flex gap-1">
                  {rounds.map((i) => (
                    <span
                      key={i}
                      className={`block h-3.5 w-1.5 ${
                        i < snapshot.ammo ? "bg-orange" : "bg-dim/40"
                      }`}
                    />
                  ))}
                </span>
              </span>
            ) : null}

            {snapshot.hasGun && snapshot.hasJetpack ? (
              <span className="h-5 w-px bg-bone/25" />
            ) : null}

            {snapshot.hasJetpack ? (
              <span className="flex items-center gap-2">
                <span className={lowFuel ? "text-pink" : "text-mint"}>
                  <FlameIcon />
                </span>
                <span className="flex gap-[3px]">
                  {fuelSegments.map((i) => (
                    <span
                      key={i}
                      className={`block h-3.5 w-1.5 ${
                        i < Math.round(snapshot.fuel * 10)
                          ? lowFuel
                            ? "bg-pink"
                            : "bg-mint"
                          : "bg-dim/40"
                      }`}
                    />
                  ))}
                </span>
              </span>
            ) : null}
          </Panel>
        ) : null}
      </div>

      <Panel className="flex-col items-end gap-1 py-2">
        <span className="text-dim">
          Level {snapshot.levelIndex + 1}/{snapshot.levelCount}
        </span>
        <span className="text-base tabular-nums text-bone">
          {formatTime(snapshot.time)}
        </span>
      </Panel>
    </div>
  );
}
