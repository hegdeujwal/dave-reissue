"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import CharacterStrip from "@/components/CharacterStrip";
import GameCanvas from "@/components/GameCanvas";
import InkButton from "@/components/InkButton";
import type { Game, Snapshot } from "@/game/engine";
import type { Point } from "@/game/levels";
import {
  hasProgress,
  loadSave,
  patchSave,
  resetSave,
  serverSave,
  subscribeSave,
} from "@/game/save";
import type { CharacterId } from "@/game/theme";

type Screen = "menu" | "game";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [startLevel, setStartLevel] = useState(0);
  const [startCheckpoint, setStartCheckpoint] = useState<Point | null>(null);
  const gameRef = useRef<Game | null>(null);

  // localStorage only exists in the browser, so the server renders the empty
  // save and the client swaps in the real one after hydration.
  const save = useSyncExternalStore(subscribeSave, loadSave, serverSave);

  const startContinue = useCallback(() => {
    const current = loadSave();
    setStartLevel(current.checkpoint?.level ?? current.unlockedLevels - 1);
    setStartCheckpoint(
      current.checkpoint
        ? { x: current.checkpoint.x, y: current.checkpoint.y }
        : null,
    );
    setScreen("game");
  }, []);

  const startNewRun = useCallback(() => {
    resetSave();
    setStartLevel(0);
    setStartCheckpoint(null);
    setScreen("game");
  }, []);

  const chooseCharacter = useCallback((id: CharacterId) => {
    patchSave({ character: id });
    gameRef.current?.setCharacter(id);
  }, []);

  if (screen === "menu") {
    return (
      <main className="flex min-h-screen flex-col justify-center gap-8 px-16">
        <h1 className="font-display text-6xl uppercase tracking-tight">
          Dave: Reissue
        </h1>
        <div className="flex w-72 flex-col gap-3">
          <InkButton
            tone="primary"
            onClick={startContinue}
            disabled={!hasProgress(save)}
          >
            Continue
          </InkButton>
          <InkButton onClick={startNewRun}>New run</InkButton>
          <InkButton tone="quiet" onClick={() => resetSave()}>
            Reset progress
          </InkButton>
        </div>
        <CharacterStrip value={save.character} onChange={chooseCharacter} />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <div className="ink border-2 border-bone">
        <GameCanvas
          onSnapshot={setSnapshot}
          onReady={(game) => {
            gameRef.current = game;
          }}
          startLevel={startLevel}
          startCheckpoint={startCheckpoint}
          character={save.character}
        />
      </div>
      <p className="text-sm text-dim">
        {snapshot
          ? `${snapshot.levelName} — hearts ${snapshot.hearts}/${snapshot.maxHearts} — gems ${snapshot.gems}/${snapshot.gemsTotal}`
          : "Loading"}
      </p>
      {snapshot?.toast ? (
        <p className="font-display text-sm uppercase text-mint">{snapshot.toast}</p>
      ) : null}
      <InkButton tone="quiet" onClick={() => setScreen("menu")}>
        Quit to menu
      </InkButton>
    </main>
  );
}
