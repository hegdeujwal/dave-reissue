"use client";

import Button from "@/components/Button";
import type { Snapshot } from "@/game/engine";

type Props = {
  snapshot: Snapshot;
  totalGems: number;
  onNext: () => void;
  onQuit: () => void;
};

function Stat({
  label,
  value,
  tone = "text-bone",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="panel min-w-[116px] rounded-2xl px-5 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-faint">
        {label}
      </p>
      <p className={`mt-1.5 font-display text-2xl leading-none tabular-nums ${tone}`}>
        {value}
      </p>
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
    <div className="scrim absolute inset-0 flex flex-col justify-center gap-7 px-14">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-faint">
          {done
            ? "Ten of ten"
            : `Level ${snapshot.levelIndex + 1} of ${snapshot.levelCount} — ${snapshot.levelName}`}
        </p>
        <h2 className="mt-2 font-display text-5xl leading-none tracking-[-0.035em]">
          {done ? "Run complete" : "Level complete"}
        </h2>
      </div>

      <div className="flex flex-wrap gap-3">
        <Stat
          label="Gems"
          value={`${snapshot.gems}/${snapshot.gemsTotal}`}
          tone={perfect ? "text-mint" : "text-bone"}
        />
        <Stat label="Time" value={`${snapshot.time.toFixed(1)}s`} />
        <Stat label="Hearts left" value={`${snapshot.hearts}`} tone="text-orange" />
        <Stat label="Banked" value={`${totalGems}`} tone="text-mint" />
      </div>

      <div className="flex w-64 flex-col gap-2.5">
        {done ? null : (
          <Button tone="primary" onClick={onNext}>
            Next level
          </Button>
        )}
        <Button tone={done ? "primary" : "ghost"} onClick={onQuit}>
          Back to menu
        </Button>
      </div>
    </div>
  );
}
