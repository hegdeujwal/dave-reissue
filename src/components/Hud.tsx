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

function Pill({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`panel-glass flex items-center gap-3 rounded-full px-3.5 py-2 ${className}`}
    >
      {children}
    </div>
  );
}

function Divider() {
  return <span className="h-4 w-px bg-bone/12" aria-hidden />;
}

function Heart({ filled, color }: { filled: boolean; color: string }) {
  return (
    <svg viewBox="0 0 16 16" className="h-[17px] w-[17px]" aria-hidden>
      <path
        d="M8 14.4 1.7 8.2C-0.2 6.3 0.8 2.8 4.1 2.8c1.8 0 3.1 1.1 3.9 2.3.8-1.2 2.1-2.3 3.9-2.3 3.3 0 4.3 3.5 2.4 5.4L8 14.4Z"
        fill={filled ? color : "transparent"}
        stroke={filled ? color : "rgba(154,160,200,0.45)"}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GemIcon() {
  return (
    <svg viewBox="0 0 12 12" className="h-3.5 w-3.5" aria-hidden>
      <path d="M6 0.5 10.2 4.6 6 11.5 1.8 4.6Z" fill="currentColor" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden fill="none">
      <circle cx="5.2" cy="5.2" r="3.4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M7.6 7.6 13.6 13.6M10.8 14h2.8M12.2 11.4l1.6 1.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
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

/** A run of small segments, used for ammo and for fuel. */
function Gauge({
  count,
  filled,
  tone,
}: {
  count: number;
  filled: number;
  tone: string;
}) {
  return (
    <span className="flex gap-[3px]">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={`block h-3 w-[5px] rounded-[2px] transition-colors duration-150 ${
            i < filled ? tone : "bg-bone/12"
          }`}
        />
      ))}
    </span>
  );
}

/** Hearts, gems, key, gear and the level timer, laid over the canvas. */
export default function Hud({ snapshot }: { snapshot: Snapshot }) {
  const color = CHARACTERS[snapshot.characterId].color;
  const lowFuel = snapshot.fuel <= 0.25;
  const hasGear = snapshot.hasGun || snapshot.hasJetpack;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4 text-[13px]">
      <div className="flex flex-col items-start gap-2">
        <Pill>
          <span className="flex gap-1">
            {Array.from({ length: snapshot.maxHearts }, (_, i) => (
              <Heart key={i} filled={i < snapshot.hearts} color={color} />
            ))}
          </span>

          <Divider />

          <span className="flex items-center gap-1.5 font-semibold text-mint">
            <GemIcon />
            <span className="tabular-nums">
              {snapshot.gems}
              <span className="text-mint/50">/{snapshot.gemsTotal}</span>
            </span>
          </span>

          <Divider />

          <span
            className={`flex items-center transition-colors duration-200 ${
              snapshot.hasKey ? "text-mint" : "text-faint"
            }`}
            title={snapshot.hasKey ? "Key held" : "No key yet"}
          >
            <KeyIcon />
          </span>
        </Pill>

        {hasGear ? (
          <Pill>
            {snapshot.hasGun ? (
              <span className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">
                  Ammo
                </span>
                <Gauge
                  count={snapshot.maxAmmo}
                  filled={snapshot.ammo}
                  tone="bg-orange"
                />
              </span>
            ) : null}

            {snapshot.hasGun && snapshot.hasJetpack ? <Divider /> : null}

            {snapshot.hasJetpack ? (
              <span className="flex items-center gap-2">
                <span className={lowFuel ? "text-pink" : "text-mint"}>
                  <FlameIcon />
                </span>
                <Gauge
                  count={10}
                  filled={Math.round(snapshot.fuel * 10)}
                  tone={lowFuel ? "bg-pink" : "bg-mint"}
                />
              </span>
            ) : null}
          </Pill>
        ) : null}
      </div>

      <Pill className="flex-col items-end gap-0.5 rounded-2xl px-4">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
          Level {snapshot.levelIndex + 1}
          <span className="text-faint/60">/{snapshot.levelCount}</span>
        </span>
        <span className="font-display text-lg leading-none tabular-nums">
          {formatTime(snapshot.time)}
        </span>
      </Pill>
    </div>
  );
}
