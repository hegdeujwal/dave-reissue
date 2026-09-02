"use client";

import CharacterStrip from "@/components/CharacterStrip";
import ControlsPanel from "@/components/ControlsPanel";
import InkButton from "@/components/InkButton";
import { LEVELS } from "@/game/levels";
import { hasProgress, type SaveData } from "@/game/save";
import type { CharacterId } from "@/game/theme";

type Props = {
  save: SaveData;
  onContinue: () => void;
  onNewRun: () => void;
  onReset: () => void;
  onCharacter: (id: CharacterId) => void;
};

export default function MainMenu({
  save,
  onContinue,
  onNewRun,
  onReset,
  onCharacter,
}: Props) {
  const canContinue = hasProgress(save);

  return (
    <main className="flex min-h-screen items-center px-16 py-12">
      <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-24">
        <div className="flex flex-col gap-8">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.3em] text-dim">
              A Dangerous Dave remake
            </p>
            <h1 className="font-display text-7xl uppercase leading-[0.85] tracking-tight">
              Dave:
              <br />
              Reissue
            </h1>
          </div>

          <div className="flex w-64 flex-col gap-3">
            <InkButton tone="primary" onClick={onContinue} disabled={!canContinue}>
              Continue
            </InkButton>
            <InkButton onClick={onNewRun}>New run</InkButton>
          </div>

          <p className="text-xs uppercase tracking-widest text-dim">
            {canContinue
              ? `Level ${save.unlockedLevels} of ${LEVELS.length} — ${save.gems} gems banked`
              : `${LEVELS.length} levels — no run in progress`}
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <h2 className="mb-3 font-display text-sm uppercase tracking-widest text-dim">
              Character
            </h2>
            <CharacterStrip value={save.character} onChange={onCharacter} />
          </div>

          <ControlsPanel />

          <div className="w-full max-w-sm">
            <InkButton tone="quiet" onClick={onReset}>
              Reset progress
            </InkButton>
          </div>
        </div>
      </div>
    </main>
  );
}
