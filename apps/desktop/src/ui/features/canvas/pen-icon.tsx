import type { ReactElement } from "react";

const DEFAULT_SIZE = 16;

const PenIcon = ({ size = DEFAULT_SIZE }: { size?: number }): ReactElement => (
  <svg
    className="icon"
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M2.5 12.5c1.6-2.6 3-3.4 4-2.6 1.1.9-.6 2.8.6 3.3 1.1.5 2.6-1.2 3.6-2.2" />
    <path d="m9.6 7.4 3.6-3.6a1.13 1.13 0 0 0-1.6-1.6L8 5.8l-.5 2.1 2.1-.5Z" />
  </svg>
);

export { PenIcon };
