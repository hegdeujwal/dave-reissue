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
    {
      label: "Jump",
      pct: bar(-character.jumpVelocity, 540, 680),
      tone: "bg-mint",
    },
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
            className={`group relative flex flex-col gap-2 border-2 p-3 text-left transition-all ${
              compact ? "w-[124px]" : "w-[150px]"
            } ${
              selected
                ? "border-bone bg-bone/[0.06] shadow-[4px_4px_0_0_var(--color-bone)]"
                : "border-dim/70 hover:border-bone/70 hover:bg-bone/[0.03]"
            }`}
          >
            <span
              className="absolute right-2 top-2 block h-2 w-2"
              style={{ backgroundColor: selected ? character.color : "transparent" }}
              aria-hidden
            />

            <span className="flex justify-center">
              <CharacterPortrait
                character={character}
                width={compact ? 54 : 64}
                height={compact ? 54 : 64}
                jetpack={selected}
              />
            </span>

            <span className="font-display text-base uppercase tracking-wide">
              {character.name}
            </span>

            <span className="flex flex-col gap-1">
              {stats(character).map((stat) => (
                <span key={stat.label} className="flex items-center gap-2">
                  <span className="w-11 shrink-0 text-[9px] uppercase tracking-widest text-dim">
                    {stat.label}
                  </span>
                  <span className="h-1.5 flex-1 bg-dim/25">
                    <span
                      className={`block h-full ${stat.tone}`}
                      style={{ width: `${stat.pct}%` }}
                    />
                  </span>
                </span>
              ))}
            </span>

            {compact ? null : (
              <span className="text-[11px] leading-snug text-dim">
                {character.note}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
