"use client";

import Button from "@/components/Button";
import CharacterStrip from "@/components/CharacterStrip";
import ControlsPanel from "@/components/ControlsPanel";
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
    <div className="scrim absolute inset-0 flex items-center gap-10 px-10">
      <div className="flex w-56 shrink-0 flex-col gap-2.5">
        <div className="mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-faint">
            Level {snapshot.levelIndex + 1} of {snapshot.levelCount}
          </p>
          <h2 className="mt-1.5 font-display text-3xl leading-none tracking-[-0.03em]">
            Paused
          </h2>
          <p className="mt-2 text-sm text-muted">{snapshot.levelName}</p>
        </div>
        <Button tone="primary" onClick={onResume} hint="Esc">
          Resume
        </Button>
        <Button onClick={onRestart} hint="R">
          Restart level
        </Button>
        <Button tone="ghost" onClick={onQuit}>
          Quit to menu
        </Button>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <div>
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-faint">
            Swap pilot
          </h3>
          <CharacterStrip value={character} onChange={onCharacter} compact />
        </div>
        <ControlsPanel />
      </div>
    </div>
  );
}
