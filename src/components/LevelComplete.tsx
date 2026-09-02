"use client";

import InkButton from "@/components/InkButton";
import type { Snapshot } from "@/game/engine";

type Props = {
  snapshot: Snapshot;
  totalGems: number;
  onNext: () => void;
  onQuit: () => void;
};

/** Shown on a finished level, and again with different copy on a finished run. */
export default function LevelComplete({
  snapshot,
  totalGems,
  onNext,
  onQuit,
}: Props) {
  const done = snapshot.mode === "runComplete";

  return (
    <div className="absolute inset-0 flex flex-col justify-center gap-6 bg-navy/95 px-12">
      <div>
        <h2 className="font-display text-4xl uppercase tracking-tight">
          {done ? "Run complete" : "Level complete"}
        </h2>
        <p className="mt-2 text-sm text-dim">
          {snapshot.levelName} — gems {snapshot.gems}/{snapshot.gemsTotal} — time{" "}
          {snapshot.time.toFixed(1)}s
        </p>
        {done ? (
          <p className="mt-1 text-sm text-mint">
            {totalGems} gems banked across all five levels
          </p>
        ) : null}
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
