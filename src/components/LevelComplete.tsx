"use client";

import InkButton from "@/components/InkButton";
import type { Snapshot } from "@/game/engine";

type Props = {
  snapshot: Snapshot;
  totalGems: number;
  onNext: () => void;
  onQuit: () => void;
};

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="border-2 border-dim/50 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.28em] text-dim">{label}</p>
      <p className={`font-display text-2xl tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

/** Shown on a finished level, and again with different copy on a finished run. */
export default function LevelComplete({
  snapshot,
  totalGems,
  onNext,
  onQuit,
}: Props) {
  const done = snapshot.mode === "runComplete";
  const perfect = snapshot.gems === snapshot.gemsTotal;

  return (
    <div className="absolute inset-0 flex flex-col justify-center gap-6 bg-navy/95 px-12">
      <div>
        <p className="mb-1 text-[11px] uppercase tracking-[0.3em] text-dim">
          {done
            ? "Ten of ten"
            : `Level ${snapshot.levelIndex + 1} of ${snapshot.levelCount} — ${snapshot.levelName}`}
        </p>
        <h2 className="font-display text-5xl uppercase leading-none tracking-tight">
          {done ? "Run complete" : "Level complete"}
        </h2>
      </div>

      <div className="flex flex-wrap gap-3">
        <Stat
          label="Gems"
          value={`${snapshot.gems}/${snapshot.gemsTotal}`}
          tone={perfect ? "text-mint" : "text-bone"}
        />
        <Stat label="Time" value={`${snapshot.time.toFixed(1)}s`} tone="text-bone" />
        <Stat label="Hearts left" value={`${snapshot.hearts}`} tone="text-orange" />
        <Stat label="Banked" value={`${totalGems}`} tone="text-mint" />
      </div>

      <div className="flex w-64 flex-col gap-3">
        {done ? null : (
          <InkButton tone="primary" onClick={onNext}>
            Next level
          </InkButton>
        )}
        <InkButton tone={done ? "primary" : "quiet"} onClick={onQuit}>
          Back to menu
        </InkButton>
      </div>
    </div>
  );
}
