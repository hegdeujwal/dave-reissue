"use client";

import CharacterStrip from "@/components/CharacterStrip";
import ControlsPanel from "@/components/ControlsPanel";
import InkButton from "@/components/InkButton";
import type { CharacterId } from "@/game/theme";

type Props = {
  character: CharacterId;
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
  onCharacter: (id: CharacterId) => void;
};

export default function PauseMenu({
  character,
  onResume,
  onRestart,
  onQuit,
  onCharacter,
}: Props) {
  return (
    <div className="absolute inset-0 flex items-center gap-10 bg-navy/95 px-10">
      <div className="flex w-56 flex-col gap-3">
        <h2 className="font-display text-3xl uppercase tracking-tight">Paused</h2>
        <InkButton tone="primary" onClick={onResume}>
          Resume
        </InkButton>
        <InkButton onClick={onRestart}>Restart level</InkButton>
        <InkButton tone="quiet" onClick={onQuit}>
          Quit to menu
        </InkButton>
      </div>

      <div className="flex flex-1 flex-col gap-4">
        <div>
          <h3 className="mb-2 font-display text-sm uppercase tracking-widest text-dim">
            Character
          </h3>
          <CharacterStrip value={character} onChange={onCharacter} compact />
        </div>
        <ControlsPanel />
      </div>
    </div>
  );
}
