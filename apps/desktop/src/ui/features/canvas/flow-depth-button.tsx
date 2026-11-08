import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

const toDepthTip = (value: number): string => {
  if (value === 0) {
    return copy.onlyTheChosenRoutes;
  }

  if (value === 1) {
    return `Add routes up to ${value} click away`;
  }

  return `Add routes up to ${value} clicks away`;
};

const FlowDepthButton = ({
  depth,
  onPick,
  value,
}: {
  depth: number;
  onPick: (value: number) => void;
  value: number;
}): ReactElement => {
  const pick = useCallback(() => onPick(value), [onPick, value]);

  let className: "" | "on" = "";
  let label: number | string = value;

  if (depth === value) {
    className = "on";
  }

  if (value === 0) {
    label = copy.none;
  }

  return (
    <button
      type="button"
      aria-pressed={depth === value}
      className={className}
      data-tip={toDepthTip(value)}
      onClick={pick}
    >
      {label}
    </button>
  );
};

export { FlowDepthButton };
