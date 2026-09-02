"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  onClick: () => void;
  tone?: "primary" | "secondary" | "ghost";
  size?: "md" | "sm";
  disabled?: boolean;
  hint?: string;
};

const TONES = {
  primary:
    "bg-orange text-navy shadow-[0_10px_28px_-10px_rgb(255_90_31_/_0.6)] hover:bg-[#ff6d38] hover:shadow-[0_14px_34px_-10px_rgb(255_90_31_/_0.7)]",
  secondary:
    "bg-bone/[0.06] text-bone ring-1 ring-inset ring-bone/12 hover:bg-bone/[0.11] hover:ring-bone/20",
  ghost: "text-muted ring-1 ring-inset ring-transparent hover:bg-bone/[0.06] hover:text-bone",
} as const;

const SIZES = {
  md: "px-4 py-2.5 text-sm rounded-xl",
  sm: "px-3 py-2 text-[13px] rounded-lg",
} as const;

/** One button for the whole game: solid, quiet, or barely there. */
export default function Button({
  children,
  onClick,
  tone = "secondary",
  size = "md",
  disabled = false,
  hint,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`lift flex w-full items-center justify-between gap-3 font-semibold tracking-[-0.01em] outline-none focus-visible:ring-2 focus-visible:ring-orange/70 active:translate-y-px disabled:pointer-events-none disabled:opacity-35 ${SIZES[size]} ${TONES[tone]}`}
    >
      <span>{children}</span>
      {hint ? (
        <span className="text-[11px] font-medium tracking-wide opacity-60">
          {hint}
        </span>
      ) : null}
    </button>
  );
}
