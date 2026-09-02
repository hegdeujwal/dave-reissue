"use client";

import Button from "@/components/Button";
import CharacterStrip from "@/components/CharacterStrip";
import ControlsPanel from "@/components/ControlsPanel";
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

function SectionLabel({ children }: { children: string }) {
  return (
    <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-faint">
      {children}
    </h2>
  );
}

function Stat({
  label,
  value,
  tone = "text-bone",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
        {label}
      </dt>
      <dd className={`font-display text-xl leading-none tabular-nums ${tone}`}>
        {value}
      </dd>
    </div>
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
    <main className="relative flex min-h-screen items-center px-8 py-12 lg:px-14">
      <MenuBackdrop />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 lg:flex-row lg:items-start lg:gap-16">
        <div className="flex shrink-0 flex-col gap-8 lg:w-[360px]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-faint">
              A Dangerous Dave remake
            </p>
            <h1 className="mt-4 font-display text-[64px] leading-[0.92] tracking-[-0.035em] xl:text-7xl">
              <span className="text-orange">Dave:</span>
              <br />
              <span className="text-bone">Reissue</span>
            </h1>
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-muted">
              Ten levels. Find the key, reach the door. Later on you will need a
              gun to open the way and a jetpack to get off the ground.
            </p>
          </div>

          <div className="flex w-full max-w-xs flex-col gap-2.5">
            <Button
              tone="primary"
              onClick={onContinue}
              disabled={!canContinue}
              hint={canContinue ? `Level ${save.unlockedLevels}` : undefined}
            >
              Continue
            </Button>
            <Button onClick={onNewRun}>New run</Button>
          </div>

          <dl className="panel flex gap-8 rounded-2xl px-5 py-4">
            <Stat
              label="Unlocked"
              value={`${save.unlockedLevels}/${LEVELS.length}`}
            />
            <Stat label="Gems" value={`${save.gems}`} tone="text-mint" />
            <Stat
              label="Pilot"
              value={save.character[0].toUpperCase() + save.character.slice(1)}
            />
          </dl>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-8">
          <section>
            <SectionLabel>Pilot</SectionLabel>
            <CharacterStrip value={save.character} onChange={onCharacter} />
          </section>

          <section>
            <SectionLabel>Levels</SectionLabel>
            <LevelSelect unlocked={save.unlockedLevels} onPick={onPickLevel} />
          </section>

          <div className="flex flex-wrap items-start gap-4">
            <ControlsPanel />
            <div className="w-full max-w-[200px]">
              <Button tone="ghost" size="sm" onClick={onReset}>
                Reset progress
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
