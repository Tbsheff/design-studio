import type { ReactElement } from "react";

const THUMB_PATH =
  "M5 7.25v6.25H2.5V7.25zM5 7.25 7.6 2.5c.9 0 1.6.7 1.6 1.6v2.4h3.3c.8 0 1.4.7 1.3 1.5l-.8 4.4c-.1.6-.7 1.1-1.3 1.1H5";

const FLIP = "matrix(1 0 0 -1 0 16)";
const KEEP = "matrix(1 0 0 1 0 0)";

const toTransform = (isDown: boolean): string => {
  if (isDown) {
    return FLIP;
  }

  return KEEP;
};

const ThumbIcon = ({ isDown }: { isDown: boolean }): ReactElement => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d={THUMB_PATH} transform={toTransform(isDown)} />
  </svg>
);

export { ThumbIcon };
