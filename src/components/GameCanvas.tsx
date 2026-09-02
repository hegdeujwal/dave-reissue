"use client";

import { useEffect, useRef } from "react";
import { Game, type Snapshot } from "@/game/engine";
import type { Point } from "@/game/levels";
import type { CharacterId } from "@/game/theme";

type Props = {
  onSnapshot: (snapshot: Snapshot) => void;
  onReady?: (game: Game) => void;
  startLevel?: number;
  startCheckpoint?: Point | null;
  /** Only read when the game is created; later swaps go through setCharacter. */
  character?: CharacterId;
};

/** Owns the single <canvas> and the Game instance that draws into it. */
export default function GameCanvas({
  onSnapshot,
  onReady,
  startLevel = 0,
  startCheckpoint = null,
  character = "dave",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onSnapshotRef = useRef(onSnapshot);
  const onReadyRef = useRef(onReady);
  const characterRef = useRef(character);
  // Keep the latest callbacks reachable without re-creating the game.
  useEffect(() => {
    onSnapshotRef.current = onSnapshot;
    onReadyRef.current = onReady;
    characterRef.current = character;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = new Game(canvas, {
      onSnapshot: (snapshot) => onSnapshotRef.current(snapshot),
      startLevel,
      startCheckpoint,
      character: characterRef.current,
    });
    onReadyRef.current?.(game);
    game.start();

    const onResize = () => game.resize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      game.stop();
    };
  }, [startLevel, startCheckpoint]);

  return <canvas ref={canvasRef} className="block bg-navy" />;
}
