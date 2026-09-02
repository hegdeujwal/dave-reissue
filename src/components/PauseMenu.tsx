"use client";

import CharacterStrip from "@/components/CharacterStrip";
import ControlsPanel from "@/components/ControlsPanel";
import InkButton from "@/components/InkButton";
import type { Snapshot } from "@/game/engine";
import type { CharacterId } from "@/game/theme";

type Props = {
  snapshot: Snapshot;
  character: CharacterId;
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
  onCharacter: (id: CharacterId) => void;
};

export default function PauseMenu({
  snapshot,
  character,
  onResume,
  onRestart,
  onQuit,
  onCharacter,
}: Props) {
  return (
    <div className="absolute inset-0 flex items-center gap-8 bg-navy/95 px-8">
      <div className="flex w-52 shrink-0 flex-col gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-dim">
            Level {snapshot.levelIndex + 1} of {snapshot.levelCount}
          </p>
          <h2 className="font-display text-3xl uppercase leading-none tracking-tight">
            Paused
          </h2>
          <p className="mt-1 text-xs uppercase tracking-widest text-dim">
            {snapshot.levelName}
          </p>
        </div>
        <InkButton tone="primary" onClick={onResume}>
          Resume
        </InkButton>
        <InkButton onClick={onRestart}>Restart level</InkButton>
        <InkButton tone="quiet" onClick={onQuit}>
          Quit to menu
        </InkButton>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div>
          <h3 className="mb-2 font-display text-xs uppercase tracking-[0.28em] text-dim">
            Swap pilot
          </h3>
          <CharacterStrip value={character} onChange={onCharacter} compact />
        </div>
        <ControlsPanel />
      </div>
    </div>
  );
}
