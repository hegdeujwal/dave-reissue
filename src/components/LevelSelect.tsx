"use client";

import { LEVELS } from "@/game/levels";

type Props = {
  unlocked: number;
  onPick: (index: number) => void;
};

function LockIcon() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden fill="none">
      <rect
        x="2"
        y="5"
        width="8"
        height="6"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M4 5V3.6a2 2 0 0 1 4 0V5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Every level, with the locked ones held back. */
export default function LevelSelect({ unlocked, onPick }: Props) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {LEVELS.map((level, index) => {
        const open = index < unlocked;
        const isNext = index === unlocked - 1;
        return (
          <button
            key={level.name}
            type="button"
            disabled={!open}
            onClick={() => onPick(index)}
            title={open ? level.name : "Locked"}
            className={`lift group flex flex-col gap-1.5 rounded-xl px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-orange/70 ${
              open
                ? isNext
                  ? "bg-orange/12 text-bone ring-1 ring-inset ring-orange/40 hover:-translate-y-0.5 hover:bg-orange/20"
                  : "bg-bone/[0.04] text-bone ring-1 ring-inset ring-bone/10 hover:-translate-y-0.5 hover:bg-bone/[0.09] hover:ring-bone/20"
                : "cursor-not-allowed bg-bone/[0.02] text-faint/60 ring-1 ring-inset ring-bone/[0.06]"
            }`}
          >
            <span className="flex items-baseline justify-between">
              <span className="font-display text-lg leading-none tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              {open ? null : (
                <span className="text-faint/70">
                  <LockIcon />
                </span>
              )}
            </span>
            <span className="truncate text-[10px] tracking-wide text-muted">
              {open ? level.name : "Locked"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
