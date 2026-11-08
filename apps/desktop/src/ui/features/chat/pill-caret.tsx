import type { ReactElement } from "react";

const CARET_STROKE_WIDTH = 1.6;

const PillCaret = (): ReactElement => (
  <svg
    className="ui-pill-select-caret"
    width="10"
    height="10"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth={CARET_STROKE_WIDTH}
    aria-hidden="true"
  >
    <path d="M3.5 6L8 10.5 12.5 6" />
  </svg>
);

export { PillCaret };
