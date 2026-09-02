"use client";

import { useEffect, useRef } from "react";
import { drawPortrait } from "@/game/render";
import type { Character } from "@/game/theme";

type Props = {
  character: Character;
  width?: number;
  height?: number;
  gun?: boolean;
  jetpack?: boolean;
};

/** A small canvas that draws the real in-game figure, idling. */
export default function CharacterPortrait({
  character,
  width = 64,
  height = 64,
  gun = false,
  jetpack = false,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useRef({ character, gun, jetpack });

  useEffect(() => {
    state.current = { character, gun, jetpack };
  });

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const current = state.current;
      drawPortrait(ctx, width, height, current.character, (now - start) / 1000, {
        gun: current.gun,
        jetpack: current.jetpack,
      });
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [width, height]);

  return (
    <canvas
      ref={ref}
      style={{ width, height }}
      className="block"
      aria-hidden
    />
  );
}
