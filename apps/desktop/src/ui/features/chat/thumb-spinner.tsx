import type { ReactElement } from "react";

const RADIUS = 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SHARE = 0.75;

const ThumbSpinner = (): ReactElement => (
  <svg
    aria-hidden
    className="size-5 text-current motion-safe:animate-spin"
    data-slot="attachment-progress"
    viewBox="0 0 24 24"
  >
    <circle
      className="stroke-current opacity-25"
      cx="12"
      cy="12"
      fill="none"
      r={RADIUS}
      strokeWidth="2"
    />
    <circle
      className="stroke-current transition-[stroke-dashoffset] duration-300"
      cx="12"
      cy="12"
      fill="none"
      r={RADIUS}
      strokeDasharray={CIRCUMFERENCE}
      strokeDashoffset={CIRCUMFERENCE * SHARE}
      strokeLinecap="round"
      strokeWidth="2"
    />
  </svg>
);

export { ThumbSpinner };
