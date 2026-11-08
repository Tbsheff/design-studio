import type { ReactNode } from "react";

const KNOB_SIZE = "14";

const WipeKnob = (): ReactNode => (
  <span className="compare-knob" aria-hidden="true">
    <svg
      viewBox="0 0 16 16"
      width={KNOB_SIZE}
      height={KNOB_SIZE}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 4 2 8l4 4M10 4l4 4-4 4" />
    </svg>
  </span>
);

export { WipeKnob };
