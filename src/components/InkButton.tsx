"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  onClick: () => void;
  /** Primary buttons carry the orange ink block, the rest stay bone. */
  tone?: "primary" | "plain" | "quiet";
  disabled?: boolean;
};

const TONES = {
  primary: "border-orange text-orange ink-orange hover:bg-orange hover:text-navy",
  plain: "border-bone text-bone ink hover:bg-bone hover:text-navy",
  quiet: "border-dim text-dim ink-dim hover:bg-dim hover:text-navy",
} as const;

/** A left-aligned block button with a hard 4px offset instead of a shadow. */
export default function InkButton({
  children,
  onClick,
  tone = "plain",
  disabled = false,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`block w-full border-2 px-4 py-2 text-left font-display text-lg uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:border-dim disabled:text-dim disabled:shadow-none disabled:hover:bg-transparent disabled:hover:text-dim ${TONES[tone]}`}
    >
      {children}
    </button>
  );
}
