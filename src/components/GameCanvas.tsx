"use client";

import { useEffect, useRef } from "react";
import { Game } from "@/game/engine";

/** Owns the single <canvas> and the Game instance that draws into it. */
export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = new Game(canvas);
    game.start();

    const onResize = () => game.resize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      game.stop();
    };
  }, []);

  return <canvas ref={canvasRef} className="block bg-navy" />;
}
