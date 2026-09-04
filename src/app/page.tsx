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
    // A new run clears progress but keeps whoever you picked on the menu.
    const character = loadSave().character;
    resetSave();
    patchSave({ character });
    setStartLevel(0);
    setStartCheckpoint(null);
    setSnapshot(null);
    setScreen("game");
  }, []);

  const pickLevel = useCallback((index: number) => {
    setStartLevel(index);
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
        onPickLevel={pickLevel}
      />
    );
  }

  const finished =
    snapshot?.mode === "levelComplete" || snapshot?.mode === "runComplete";

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="flex flex-col gap-4">
        <header className="flex items-end justify-between gap-8 px-1">
          <h1 className="font-display text-lg tracking-[-0.02em]">
            <span className="text-orange">Dave:</span>{" "}
            <span className="text-bone">Reissue</span>
          </h1>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-faint">
            {snapshot ? (
              <>
                {snapshot.levelName}
                <span className="mx-2 text-faint/40">/</span>
                <span className="tabular-nums">
                  {snapshot.levelIndex + 1} of {snapshot.levelCount}
                </span>
              </>
            ) : (
              `${LEVELS.length} levels`
            )}
          </p>
        </header>

        <div className="relative overflow-hidden rounded-2xl ring-1 ring-bone/12 shadow-[0_40px_80px_-30px_rgb(0_0_0_/_0.9)]">
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
            <p className="panel-glass pointer-events-none absolute inset-x-0 bottom-6 mx-auto w-fit max-w-[80%] rounded-full px-5 py-2.5 text-center text-sm text-bone">
              {snapshot.hint}
            </p>
          ) : null}

          {snapshot?.toast ? (
            <p className="panel-glass pointer-events-none absolute inset-x-0 top-28 mx-auto w-fit rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-mint ring-1 ring-mint/30">
              {snapshot.toast}
            </p>
          ) : null}

          {snapshot?.mode === "paused" ? (
            <PauseMenu
              snapshot={snapshot}
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

        <footer className="flex flex-wrap justify-between gap-x-8 gap-y-2 px-1 text-[11px] text-faint">
          <span>Move A/D · Jump Space</span>
          <span>Shoot left click/E · Jetpack double-tap Space</span>
          <span>Esc pause · R restart</span>
        </footer>
      </div>
    </main>
  );
}
