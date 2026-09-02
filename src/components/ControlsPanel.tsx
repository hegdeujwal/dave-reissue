import { CONTROL_ROWS } from "@/game/input";

/** The one place the controls are listed, on the menu and in the pause screen. */
export default function ControlsPanel() {
  return (
    <div className="min-w-[280px] flex-1 border-2 border-dim/60 bg-bone/[0.02] p-4">
      <h2 className="mb-3 font-display text-xs uppercase tracking-[0.28em] text-dim">
        Controls
      </h2>
      <dl className="flex flex-col gap-2 text-sm">
        {CONTROL_ROWS.map((row) => (
          <div key={row.action} className="flex items-baseline justify-between gap-6">
            <dt className="text-bone">
              {row.action}
              {row.note ? (
                <span className="ml-2 text-[10px] uppercase tracking-widest text-dim">
                  {row.note}
                </span>
              ) : null}
            </dt>
            <dd className="shrink-0 border border-dim/50 px-2 py-0.5 font-mono text-xs text-dim">
              {row.keys}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
