"use client";

import { useState } from "react";
import GameCanvas from "@/components/GameCanvas";
import type { Snapshot } from "@/game/engine";

export default function Home() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="font-display text-3xl uppercase tracking-tight">
        Dave: Reissue
      </h1>
      <div className="ink border-2 border-bone">
        <GameCanvas onSnapshot={setSnapshot} />
      </div>
      <p className="text-sm text-dim">
        {snapshot
          ? `${snapshot.levelName} — gems ${snapshot.gems}/${snapshot.gemsTotal}`
          : "Loading"}
      </p>
    </main>
  );
}
