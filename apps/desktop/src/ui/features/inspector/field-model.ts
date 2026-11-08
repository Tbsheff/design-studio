import type { IconName } from "@design-studio/ui";

import { colorHex, resolveTokenValue } from "../../../shared/token-match.js";
import { copy } from "./copy.js";
import { colorToHex } from "./css-values.js";
import type { TokenUi } from "./deps.js";

const ALIGN_OPTIONS: readonly {
  readonly value: string;
  readonly icon: IconName;
  readonly label: string;
}[] = [
  { icon: "alignLeft", label: copy.alignLeft, value: "left" },
  { icon: "alignCenter", label: copy.alignCenter, value: "center" },
  { icon: "alignRight", label: copy.alignRight, value: "right" },
  { icon: "alignJustify", label: copy.justify, value: "justify" },
];

const toResolvedColor = (value: string, ui: TokenUi | null): string => {
  if (ui) {
    return resolveTokenValue(value, ui.entries, ui.mode);
  }

  return value;
};

const toColorHex = (resolved: string, ui: TokenUi | null): string | null => {
  const direct = colorToHex(resolved);

  if (direct || !ui) {
    return direct;
  }

  return colorHex(resolved);
};

const toModifiedClass = (
  base: string,
  modifier: string,
  isOn: boolean
): string => {
  if (isOn) {
    return `${base} ${modifier}`;
  }

  return `${base} `;
};

const toOnClass = (isOn: boolean): string => {
  if (isOn) {
    return "on";
  }

  return "";
};

const toPlaceholder = (isMixed: boolean, fallback: string): string => {
  if (isMixed) {
    return copy.mixed;
  }

  return fallback;
};

interface SelectOption {
  readonly label: string;
  readonly value: string;
}

const toSelectList = (
  value: string,
  options: readonly string[]
): readonly SelectOption[] => {
  const list = [...options];

  if (value && !options.includes(value)) {
    list.unshift(value);
  }

  return list.map((option) => ({ label: option, value: option }));
};

const toAlign = (value: string): string => {
  if (value === "start") {
    return "left";
  }

  if (value === "end") {
    return "right";
  }

  return value;
};

export {
  ALIGN_OPTIONS,
  toAlign,
  toColorHex,
  toModifiedClass,
  toOnClass,
  toPlaceholder,
  toResolvedColor,
  toSelectList,
};
