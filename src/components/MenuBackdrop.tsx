"use client";

import { useEffect, useRef } from "react";
import { drawBackdrop } from "@/game/render";

/**
 * The in-game parallax layers, running full-bleed and drifting slowly behind
 * the menu, so the title screen is part of the same world.
 */
export default function MenuBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const clock = (now - start) / 1000;
      drawBackdrop(ctx, clock * 26, clock, width, height);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <canvas
        ref={ref}
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-20 h-full w-full opacity-45"
      />
      {/* A scrim, so the menu text stays readable over the skyline. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "linear-gradient(to bottom, rgb(20 22 43 / 0.62), rgb(20 22 43 / 0.88))",
        }}
      />
    </>
  );
}
