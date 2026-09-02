import { CONTROL_ROWS } from "@/game/input";

/** The one place the controls are listed, on the menu and in the pause screen. */
export default function ControlsPanel() {
  return (
    <div className="w-full max-w-sm border-2 border-dim p-4">
      <h2 className="mb-3 font-display text-sm uppercase tracking-widest text-dim">
        Controls
      </h2>
      <dl className="flex flex-col gap-2 text-sm">
        {CONTROL_ROWS.map((row) => (
          <div key={row.action} className="flex justify-between gap-6">
            <dt className="text-bone">{row.action}</dt>
            <dd className="text-dim">{row.keys}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
