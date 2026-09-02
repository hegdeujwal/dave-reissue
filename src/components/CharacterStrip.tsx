"use client";

import CharacterPortrait from "@/components/CharacterPortrait";
import { CHARACTERS, type Character, type CharacterId } from "@/game/theme";

type Props = {
  value: CharacterId;
  onChange: (id: CharacterId) => void;
  compact?: boolean;
};

/** Normalise a stat across the three characters so the bars are comparable. */
function bar(value: number, min: number, max: number) {
  return Math.round(((value - min) / (max - min)) * 100);
}

function stats(character: Character) {
  return [
    { label: "Speed", pct: bar(character.maxSpeed, 190, 340), tone: "bg-orange" },
    { label: "Jump", pct: bar(-character.jumpVelocity, 540, 680), tone: "bg-mint" },
    { label: "Hearts", pct: bar(character.hearts, 2, 5), tone: "bg-pink" },
  ];
}

/** The three characters as cards, with a live figure and their trade-offs. */
export default function CharacterStrip({ value, onChange, compact }: Props) {
  return (
    <div className="flex gap-3">
      {Object.values(CHARACTERS).map((character) => {
        const selected = character.id === value;
        return (
          <button
            key={character.id}
            type="button"
            onClick={() => onChange(character.id)}
            aria-pressed={selected}
            className={`lift group relative flex flex-col items-stretch gap-2.5 overflow-hidden rounded-2xl p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-orange/70 ${
              compact ? "w-[132px]" : "w-[158px]"
            } ${
              selected
                ? "bg-bone/[0.08] ring-1 ring-inset ring-bone/25 shadow-[0_14px_36px_-18px_rgb(0_0_0_/_0.9)]"
                : "bg-bone/[0.03] ring-1 ring-inset ring-bone/8 hover:-translate-y-0.5 hover:bg-bone/[0.06] hover:ring-bone/16"
            }`}
          >
            {/* A wash of the character's own colour behind the figure. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-[0.16] transition-opacity duration-200 group-hover:opacity-25"
              style={{
                background: `radial-gradient(60% 80% at 50% 0%, ${character.color}, transparent 70%)`,
                opacity: selected ? 0.28 : undefined,
              }}
            />

            <span className="relative flex justify-center">
              <CharacterPortrait
                character={character}
                width={compact ? 56 : 68}
                height={compact ? 56 : 68}
                jetpack={selected}
              />
            </span>

            <span className="relative flex items-center justify-between">
              <span className="font-display text-[15px] tracking-tight">
                {character.name}
              </span>
              <span
                className={`block h-1.5 w-1.5 rounded-full transition-opacity duration-200 ${
                  selected ? "opacity-100" : "opacity-0"
                }`}
                style={{ backgroundColor: character.color }}
                aria-hidden
              />
            </span>

            <span className="relative flex flex-col gap-1.5">
              {stats(character).map((stat) => (
                <span key={stat.label} className="flex items-center gap-2">
                  <span className="w-10 shrink-0 text-[9px] font-semibold uppercase tracking-[0.14em] text-faint">
                    {stat.label}
                  </span>
                  <span className="h-1 flex-1 overflow-hidden rounded-full bg-bone/10">
                    <span
                      className={`block h-full rounded-full ${stat.tone}`}
                      style={{ width: `${stat.pct}%` }}
                    />
                  </span>
                </span>
              ))}
            </span>

            {compact ? null : (
              <span className="relative text-[11px] leading-snug text-muted">
                {character.note}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
