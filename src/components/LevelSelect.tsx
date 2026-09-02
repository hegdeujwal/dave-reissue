"use client";

import { LEVELS } from "@/game/levels";

type Props = {
  unlocked: number;
  onPick: (index: number) => void;
};

/** Every level, with the locked ones greyed out. */
export default function LevelSelect({ unlocked, onPick }: Props) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {LEVELS.map((level, index) => {
        const open = index < unlocked;
        return (
          <button
            key={level.name}
            type="button"
            disabled={!open}
            onClick={() => onPick(index)}
            title={open ? level.name : "Locked"}
            className={`flex flex-col gap-1 border-2 px-2 py-2 text-left transition-colors ${
              open
                ? "border-bone/60 text-bone hover:border-orange hover:bg-orange hover:text-navy"
                : "cursor-not-allowed border-dim/40 text-dim/60"
            }`}
          >
            <span className="font-display text-lg leading-none tabular-nums">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="truncate text-[10px] uppercase tracking-wider">
              {open ? level.name : "Locked"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
