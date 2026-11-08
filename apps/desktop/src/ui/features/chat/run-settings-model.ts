import type { RunEffort, RunLevel } from "@design-studio/contracts";
import { placeFixed } from "@design-studio/ui";
import type { CSSProperties } from "react";

import { findElements } from "../../platform/find-element.js";
import { pick } from "../../platform/pick.js";
import { MODE_LABEL } from "./composer-mode-model.js";
import type { ComposerMode } from "./composer-mode-model.js";
import { levelLabel } from "./level-model.js";

interface DesignsSetting {
  value: number;
  max: number;
  onChange: (count: number) => void;
  disabledReason: string | null;
}

const EFFORTS = ["auto", "low", "medium", "high"] as const;

type EffortChoice = (typeof EFFORTS)[number];

const EFFORT_HINT: Record<EffortChoice, string> = {
  auto: "The model picks how hard to think.",
  high: "Thinks the longest. Best for large or tricky work.",
  low: "Fastest and cheapest. Good for small changes.",
  medium: "A balance of speed and care.",
};

interface ModeSetting {
  value: ComposerMode;
  onChange: (mode: ComposerMode) => void;
}

interface EffortSetting {
  value: RunEffort | null;
  onChange: (effort: RunEffort | null) => void;
}

const MODE_HINT: Record<ComposerMode, string> = {
  critique: "Send asks for a review. The design does not change.",
  edit: "Send changes the design.",
  plan: "Send makes a plan first. Files change only after you approve it.",
};

const UNPLACED: CSSProperties = {
  left: 0,
  opacity: 0,
  pointerEvents: "none",
  top: 0,
};

const EFFORT_LABEL: Record<EffortChoice, string> = {
  auto: "Auto",
  high: "High",
  low: "Low",
  medium: "Medium",
};

const MODES = ["edit", "plan", "critique"] as const;

const MIN_PLURAL_DESIGNS = 1;

const runSettingsSummary = (input: {
  mode?: ComposerMode;
  level: RunLevel;
  designs?: number;
  designsOn?: boolean;
  effort?: RunEffort | null;
}): string => {
  const parts: string[] = [];

  if (input.mode) {
    parts.push(MODE_LABEL[input.mode]);
  }

  parts.push(levelLabel(input.level));

  if (input.effort) {
    parts.push(`${EFFORT_LABEL[input.effort]} effort`);
  }

  if ((input.designsOn ?? true) && (input.designs ?? 0) > MIN_PLURAL_DESIGNS) {
    parts.push(`${input.designs} designs`);
  }

  return parts.join(" · ");
};

const designsHint = (designs: DesignsSetting): string => {
  if (designs.disabledReason) {
    return designs.disabledReason;
  }

  if (designs.value > 1) {
    return `Send makes ${designs.value} designs side by side.`;
  }

  return `Pick 2 to ${designs.max} to compare options.`;
};

const toPlacedLeft = (placed: CSSProperties, fallback: number): number => {
  const left = Number(placed.left);

  if (Number.isNaN(left)) {
    return fallback;
  }

  return left;
};

const placeAboveOrBelow = (
  trigger: HTMLElement,
  panel: HTMLElement
): CSSProperties => {
  const placed = placeFixed(trigger, panel, { prefer: "above" });
  const rect = trigger.getBoundingClientRect();
  const left = toPlacedLeft(placed, rect.left);
  const centerX = Math.round(rect.left + rect.width / 2 - left);
  const isAbove = Object.hasOwn(placed, "bottom");

  return {
    ...placed,
    "--pop-dy": pick(isAbove, "4px", "-4px"),
    transformOrigin: `${centerX}px ${pick(isAbove, "bottom", "top")}`,
  } as CSSProperties;
};

const toTabStops = (panel: HTMLElement): HTMLElement[] =>
  findElements(panel, '[tabindex="0"]:not(:disabled)');

const toEffortValue = (choice: EffortChoice): RunEffort | null => {
  if (choice === "auto") {
    return null;
  }

  return choice;
};

export {
  EFFORTS,
  EFFORT_HINT,
  EFFORT_LABEL,
  MODES,
  MODE_HINT,
  UNPLACED,
  designsHint,
  placeAboveOrBelow,
  runSettingsSummary,
  toEffortValue,
  toTabStops,
};

export type { DesignsSetting, EffortChoice, EffortSetting, ModeSetting };
