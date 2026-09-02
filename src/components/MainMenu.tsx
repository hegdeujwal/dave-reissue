"use client";

import CharacterStrip from "@/components/CharacterStrip";
import ControlsPanel from "@/components/ControlsPanel";
import InkButton from "@/components/InkButton";
import LevelSelect from "@/components/LevelSelect";
import MenuBackdrop from "@/components/MenuBackdrop";
import { LEVELS } from "@/game/levels";
import { hasProgress, type SaveData } from "@/game/save";
import type { CharacterId } from "@/game/theme";

type Props = {
  save: SaveData;
  onContinue: () => void;
  onNewRun: () => void;
  onReset: () => void;
  onCharacter: (id: CharacterId) => void;
  onPickLevel: (index: number) => void;
};

/** The title, stacked in three offset colours instead of a drop shadow. */
function Title() {
  const lines = ["Dave:", "Reissue"];
  return (
    <h1 className="relative font-display text-6xl uppercase leading-[0.85] tracking-tight xl:text-7xl">
      <span
        aria-hidden
        className="absolute left-[6px] top-[6px] text-pink/70 select-none"
      >
        {lines.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </span>
      <span
        aria-hidden
        className="absolute left-[3px] top-[3px] text-orange select-none"
      >
        {lines.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </span>
      <span className="relative block text-bone">
        {lines.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </span>
    </h1>
  );
}

export default function MainMenu({
  save,
  onContinue,
  onNewRun,
  onReset,
  onCharacter,
  onPickLevel,
}: Props) {
  const canContinue = hasProgress(save);

  return (
    <main className="relative flex min-h-screen items-center px-10 py-10 xl:px-16">
      <MenuBackdrop />
      <div className="flex w-full max-w-6xl flex-col gap-10 lg:flex-row lg:items-start lg:gap-16">
        <div className="flex shrink-0 flex-col gap-7">
          <div>
            <p className="mb-3 text-[11px] uppercase tracking-[0.32em] text-dim">
              A Dangerous Dave remake
            </p>
            <Title />
          </div>

          <p className="max-w-xs text-sm leading-relaxed text-dim">
            Ten levels. Find the key, reach the door. Later on you will need a
            gun to open the way and a jetpack to get off the ground.
          </p>

          <div className="flex w-64 flex-col gap-3">
            <InkButton tone="primary" onClick={onContinue} disabled={!canContinue}>
              Continue
            </InkButton>
            <InkButton onClick={onNewRun}>New run</InkButton>
          </div>

          <dl className="flex gap-6 border-t-2 border-dim/40 pt-4 text-xs uppercase tracking-widest">
            <div>
              <dt className="text-dim">Unlocked</dt>
              <dd className="font-display text-lg text-bone tabular-nums">
                {save.unlockedLevels}/{LEVELS.length}
              </dd>
            </div>
            <div>
              <dt className="text-dim">Gems</dt>
              <dd className="font-display text-lg text-mint tabular-nums">
                {save.gems}
              </dd>
            </div>
            <div>
              <dt className="text-dim">Pilot</dt>
              <dd className="font-display text-lg capitalize text-bone">
                {save.character}
              </dd>
            </div>
          </dl>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <section>
            <h2 className="mb-3 font-display text-xs uppercase tracking-[0.28em] text-dim">
              Pilot
            </h2>
            <CharacterStrip value={save.character} onChange={onCharacter} />
          </section>

          <section>
            <h2 className="mb-3 font-display text-xs uppercase tracking-[0.28em] text-dim">
              Levels
            </h2>
            <LevelSelect unlocked={save.unlockedLevels} onPick={onPickLevel} />
          </section>

          <div className="flex flex-wrap items-start gap-4">
            <ControlsPanel />
            <div className="w-52">
              <InkButton tone="quiet" onClick={onReset}>
                Reset progress
              </InkButton>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
