import type { ReactElement } from "react";

import type { StarProps } from "./home-model.js";

const STAR_SIZE = 14;

const STAR_STROKE = 1.4;

const toStarFill = (isFilled: boolean): string => {
  if (isFilled) {
    return "currentColor";
  }

  return "none";
};

const Star = ({ isFilled, size = STAR_SIZE }: StarProps): ReactElement => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    aria-hidden="true"
    fill={toStarFill(isFilled)}
    stroke="currentColor"
    strokeWidth={STAR_STROKE}
    strokeLinejoin="round"
  >
    <path d="M8 1.9l1.8 3.8 4.1.5-3 2.9.8 4.1L8 11.2l-3.7 2 .8-4.1-3-2.9 4.1-.5z" />
  </svg>
);

export { Star };
