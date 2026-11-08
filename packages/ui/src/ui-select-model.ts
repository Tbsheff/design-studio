import type { CSSProperties, ReactNode } from "react";

import { pick } from "./pick.js";

interface UiSelectOption<OptionValue extends string = string> {
  value: OptionValue;
  label: string;
  disabled?: boolean;
}

interface UiSelectProps<OptionValue extends string> {
  value: OptionValue;
  options: readonly UiSelectOption<OptionValue>[];
  onChange: (value: OptionValue) => void;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
  placeholder?: string;
  tip?: string;
  icon?: ReactNode;
}

const HIDDEN: CSSProperties = {
  left: 0,
  opacity: 0,
  pointerEvents: "none",
  top: 0,
};

const TYPEAHEAD_RESET_MS = 700;
const MENU_EXIT_MS = 100;
const CHEVRON_SIZE = 12;
const COMBOBOX_ROLE = "combobox";
const LISTBOX_ROLE = "listbox";
const OPTION_ROLE = "option";

const toSelectClass = (size: "sm" | "md" | undefined): string =>
  `ui-select${pick(size === "sm", " sm", "")}`;

const toStep = (
  options: readonly UiSelectOption[],
  from: number,
  delta: 1 | -1
): number => {
  for (let index = 1; index <= options.length; index += 1) {
    const at = (from + delta * index + options.length * 2) % options.length;

    if (!options[at]?.disabled) {
      return at;
    }
  }

  return from;
};

const toEdge = (
  options: readonly UiSelectOption[],
  isLast: boolean
): number => {
  const order = [...options.keys()];

  if (isLast) {
    order.reverse();
  }

  return order.find((index) => !options[index]?.disabled) ?? -1;
};

const toTypeahead = (
  options: readonly UiSelectOption[],
  from: number,
  query: string
): number => {
  const needle = query.toLowerCase();

  for (let index = 1; index <= options.length; index += 1) {
    const at = (from + index) % options.length;
    const option = options[at];

    if (
      option &&
      !option.disabled &&
      option.label.toLowerCase().startsWith(needle)
    ) {
      return at;
    }
  }

  return -1;
};

const toStartIndex = (
  options: readonly UiSelectOption[],
  current: number
): number => {
  if (current !== -1 && !options[current]?.disabled) {
    return current;
  }

  return toEdge(options, false);
};

const toMove = (
  key: string,
  options: readonly UiSelectOption[],
  active: number
): number | null => {
  if (key === "ArrowDown") {
    return toStep(options, active, 1);
  }

  if (key === "ArrowUp") {
    return toStep(options, active, -1);
  }

  if (key === "Home" || key === "PageUp") {
    return toEdge(options, false);
  }

  if (key === "End" || key === "PageDown") {
    return toEdge(options, true);
  }

  return null;
};

const isOpenKey = (key: string): boolean =>
  key === "ArrowDown" || key === "ArrowUp" || key === "Enter" || key === " ";

const isPrintable = (key: string): boolean => key.length === 1;

export {
  CHEVRON_SIZE,
  COMBOBOX_ROLE,
  HIDDEN,
  LISTBOX_ROLE,
  MENU_EXIT_MS,
  OPTION_ROLE,
  TYPEAHEAD_RESET_MS,
  isOpenKey,
  isPrintable,
  toEdge,
  toMove,
  toSelectClass,
  toStartIndex,
  toTypeahead,
};

export type { UiSelectOption, UiSelectProps };
