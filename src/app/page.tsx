"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import GameCanvas from "@/components/GameCanvas";
import Hud from "@/components/Hud";
import LevelComplete from "@/components/LevelComplete";
import MainMenu from "@/components/MainMenu";
import PauseMenu from "@/components/PauseMenu";
import type { Game, Snapshot } from "@/game/engine";
import { LEVELS, type Point } from "@/game/levels";
import {
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
    setSnapshot(null);
    setScreen("game");
  }, []);

  const startNewRun = useCallback(() => {
    resetSave();
    setStartLevel(0);
    setStartCheckpoint(null);
    setSnapshot(null);
    setScreen("game");
  }, []);

  const chooseCharacter = useCallback((id: CharacterId) => {
    patchSave({ character: id });
    gameRef.current?.setCharacter(id);
  }, []);

  const quitToMenu = useCallback(() => {
    gameRef.current = null;
    setScreen("menu");
  }, []);

  if (screen === "menu") {
    return (
      <MainMenu
        save={save}
        onContinue={startContinue}
        onNewRun={startNewRun}
        onReset={() => resetSave()}
        onCharacter={chooseCharacter}
      />
    );
  }

  const finished =
    snapshot?.mode === "levelComplete" || snapshot?.mode === "runComplete";

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="flex flex-col gap-3">
        <header className="flex items-baseline justify-between gap-8">
          <h1 className="font-display text-xl uppercase tracking-tight">
            Dave: Reissue
          </h1>
          <p className="text-xs uppercase tracking-widest text-dim">
            {snapshot
              ? `Level ${snapshot.levelIndex + 1} of ${snapshot.levelCount} — ${snapshot.levelName}`
              : `${LEVELS.length} levels`}
          </p>
        </header>

        <div className="relative ink border-2 border-bone">
          <GameCanvas
            onSnapshot={setSnapshot}
            onReady={(game) => {
              gameRef.current = game;
            }}
            startLevel={startLevel}
            startCheckpoint={startCheckpoint}
            character={save.character}
          />

          {snapshot ? <Hud snapshot={snapshot} /> : null}

          {snapshot?.hint && snapshot.mode === "playing" ? (
            <p className="pointer-events-none absolute inset-x-0 bottom-6 mx-auto w-fit border-2 border-bone bg-navy px-4 py-2 text-center text-sm">
              {snapshot.hint}
            </p>
          ) : null}

          {snapshot?.toast ? (
            <p className="pointer-events-none absolute inset-x-0 top-20 mx-auto w-fit border-2 border-mint bg-navy px-4 py-2 font-display text-xs uppercase tracking-widest text-mint">
              {snapshot.toast}
            </p>
          ) : null}

          {snapshot?.mode === "paused" ? (
            <PauseMenu
              character={save.character}
              onResume={() => gameRef.current?.setPaused(false)}
              onRestart={() => gameRef.current?.restartLevel()}
              onQuit={quitToMenu}
              onCharacter={chooseCharacter}
            />
          ) : null}

          {finished && snapshot ? (
            <LevelComplete
              snapshot={snapshot}
              totalGems={save.gems}
              onNext={() => gameRef.current?.nextLevel()}
              onQuit={quitToMenu}
            />
          ) : null}
        </div>

        <footer className="flex justify-between text-xs uppercase tracking-widest text-dim">
          <span>Esc pauses</span>
          <span>R restarts the level</span>
        </footer>
      </div>
    </main>
  );
}
