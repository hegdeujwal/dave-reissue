"use client";

import { CHARACTERS, type CharacterId } from "@/game/theme";

type Props = {
  value: CharacterId;
  onChange: (id: CharacterId) => void;
  compact?: boolean;
};

/** The three characters, side by side, with the trade-off each one makes. */
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
            className={`flex flex-col gap-2 border-2 p-3 text-left transition-colors ${
              compact ? "w-36" : "w-44"
            } ${
              selected
                ? "border-bone bg-bone/5 ink"
                : "border-dim hover:border-bone"
            }`}
          >
            <span
              aria-hidden
              className="block h-5 w-5"
              style={{ backgroundColor: character.color }}
            />
            <span className="font-display text-base uppercase tracking-wide">
              {character.name}
            </span>
            <span className="text-xs leading-snug text-dim">
              {character.note}
            </span>
          </button>
        );
      })}
    </div>
  );
}
