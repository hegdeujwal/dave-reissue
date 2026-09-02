"use client";

import { useEffect, useRef } from "react";
import { Game, type Snapshot } from "@/game/engine";

type Props = {
  onSnapshot: (snapshot: Snapshot) => void;
  onReady?: (game: Game) => void;
  startLevel?: number;
};

/** Owns the single <canvas> and the Game instance that draws into it. */
export default function GameCanvas({ onSnapshot, onReady, startLevel = 0 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onSnapshotRef = useRef(onSnapshot);
  const onReadyRef = useRef(onReady);
  // Keep the latest callbacks reachable without re-creating the game.
  useEffect(() => {
    onSnapshotRef.current = onSnapshot;
    onReadyRef.current = onReady;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = new Game(
      canvas,
      { onSnapshot: (snapshot) => onSnapshotRef.current(snapshot) },
      startLevel,
    );
    onReadyRef.current?.(game);
    game.start();

    const onResize = () => game.resize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      game.stop();
    };
  }, [startLevel]);

  return <canvas ref={canvasRef} className="block bg-navy" />;
}
