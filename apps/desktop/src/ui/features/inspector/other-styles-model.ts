import { toOtherStyles } from "./authored-css-model.js";
import type { AuthoredCss, AuthoredDeclaration } from "./authored-css-model.js";
import { copy } from "./copy.js";

type CopyState = "idle" | "copied" | "failed";

const toCopyLabel = (state: CopyState): string => {
  if (state === "copied") {
    return copy.copied;
  }

  if (state === "failed") {
    return copy.copyFailed;
  }

  return copy.copyCss;
};

const toCopyIcon = (state: CopyState): "check" | "copy" => {
  if (state === "copied") {
    return "check";
  }

  return "copy";
};

const toToggleIcon = (isOpen: boolean): "chevronDown" | "chevronRight" => {
  if (isOpen) {
    return "chevronDown";
  }

  return "chevronRight";
};

const getOtherRows = (css: AuthoredCss | null): AuthoredDeclaration[] => {
  if (!css) {
    return [];
  }

  return toOtherStyles(css);
};

export { getOtherRows, toCopyIcon, toCopyLabel, toToggleIcon };

export type { CopyState };
