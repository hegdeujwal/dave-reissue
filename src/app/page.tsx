import GameCanvas from "@/components/GameCanvas";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="font-display text-4xl uppercase tracking-tight">
        Dave: Reissue
      </h1>
      <div className="ink border-2 border-bone">
        <GameCanvas />
      </div>
    </main>
  );
}
