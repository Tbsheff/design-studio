import type { KeyboardEvent } from "react";

import { toDisplayLength } from "./number-field-model.js";
import type { NumberSpec } from "./number-field-model.js";

const INCOMPLETE_MATH = /[-+*/(]\s*$/u;

const isIncompleteMath = (raw: string): boolean => INCOMPLETE_MATH.test(raw);

const toShownText = (
  text: string | null,
  isFocused: boolean,
  current: string,
  spec: NumberSpec
): string => {
  if (text !== null) {
    return text;
  }

  if (isFocused) {
    return current;
  }

  return spec.display ?? toDisplayLength(current);
};

const toRefusedTip = (isRefused: boolean): string => {
  if (isRefused) {
    return "Values differ. Type a number, not a change.";
  }

  return "";
};

const toInputClass = (className: string, isInherited: boolean): string => {
  if (isInherited) {
    return `ins-input num ${className} inherited`;
  }

  return `ins-input num ${className} `;
};

const toArrowSign = (event: Pick<KeyboardEvent, "key">): number => {
  if (event.key === "ArrowUp") {
    return 1;
  }

  return -1;
};

const toPlaceholder = (isMixed: boolean): string => {
  if (isMixed) {
    return "Mixed";
  }

  return "—";
};

export {
  isIncompleteMath,
  toArrowSign,
  toInputClass,
  toPlaceholder,
  toRefusedTip,
  toShownText,
};
