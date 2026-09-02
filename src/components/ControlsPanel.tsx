import { CONTROL_ROWS } from "@/game/input";

/** The one place the controls are listed, on the menu and in the pause screen. */
export default function ControlsPanel() {
  return (
    <div className="panel min-w-[300px] flex-1 rounded-2xl p-5">
      <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-faint">
        Controls
      </h2>
      <dl className="flex flex-col gap-3">
        {CONTROL_ROWS.map((row) => (
          <div
            key={row.action}
            className="flex items-baseline justify-between gap-6"
          >
            <dt className="text-sm text-bone">
              {row.action}
              {row.note ? (
                <span className="ml-2 text-xs text-faint">{row.note}</span>
              ) : null}
            </dt>
            <dd className="shrink-0 rounded-md bg-bone/[0.06] px-2 py-1 text-[11px] tracking-wide text-muted ring-1 ring-inset ring-bone/10">
              {row.keys}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
