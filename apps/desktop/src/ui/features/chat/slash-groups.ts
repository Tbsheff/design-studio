import { RUN_EFFORTS, RUN_LEVELS } from "@design-studio/contracts";
import type { RunEffort, RunLevel } from "@design-studio/contracts";

import { LEVEL_PRESETS } from "../../../shared/run-levels.js";
import { levelGist, levelHint, levelLabel } from "./level-control.js";
import { MODEL_OPTIONS, modelLabel } from "./settings-draft-model.js";
import type { SlashGroup } from "./slash-menu-model.js";

const effectiveModel = (model: string, level: RunLevel): string => {
  const preset = LEVEL_PRESETS[level].model;

  if (preset === "project") {
    return model;
  }

  return preset;
};

const shortModel = (id: string): string =>
  modelLabel(id).replace(/^Claude /u, "");

const MODEL_HINT = {
  "claude-haiku-5-5": "Fast and cheap",
  "claude-opus-5-5": "Most capable",
  "claude-sonnet-5-5": "Balanced",
} as const;

const MODEL_HINT_BY_ID = new Map<string, string>(Object.entries(MODEL_HINT));

const toModelHint = (id: string): string => MODEL_HINT_BY_ID.get(id) ?? "";

const EFFORT_SHORT: Record<RunEffort | "auto", string> = {
  auto: "Model decides",
  high: "Thinks longest",
  low: "Fastest",
  medium: "Balanced",
};

const EFFORT_NAME: Record<RunEffort | "auto", string> = {
  auto: "Auto",
  high: "High",
  low: "Low",
  medium: "Medium",
};

const levelGroup = (
  level: RunLevel,
  onLevel: (level: RunLevel) => void
): SlashGroup => ({
  choices: RUN_LEVELS.map((item) => ({
    checked: item === level,
    hint: levelGist(item).hint,
    icon: "layers",
    id: item,
    label: levelLabel(item),
    meta: levelGist(item).cost,
    pick: () => onLevel(item),
    tip: levelHint(item),
  })),
  icon: "layers",
  id: "level",
  label: "Level",
  value: levelLabel(level),
});

const modelGroup = (
  model: string,
  level: RunLevel | null,
  onModel: (model: string) => void
): SlashGroup => {
  let shown: string = model;

  if (level) {
    shown = effectiveModel(model, level);
  }

  const locked = shown !== model;

  let reason: string | null = null;

  if (locked && level) {
    reason = `${levelLabel(level)} runs always use ${shortModel(shown)}`;
  }

  return {
    choices: MODEL_OPTIONS.map((option) => ({
      checked: option.id === shown,
      disabledReason: reason,
      hint: toModelHint(option.id),
      icon: "sparkle",
      id: option.id,
      label: shortModel(option.id),
      pick: () => onModel(option.id),
    })),
    icon: "sparkle",
    id: "model",
    label: "Model",
    value: shortModel(shown),
  };
};

const toEffortChoice = (item: RunEffort | "auto"): RunEffort | null => {
  if (item === "auto") {
    return null;
  }

  return item;
};

const effortGroup = (
  effort: RunEffort | null,
  onEffort: (effort: RunEffort | null) => void
): SlashGroup => {
  const choices = ["auto" as const, ...RUN_EFFORTS];
  const now = effort ?? "auto";

  return {
    choices: choices.map((item) => ({
      checked: item === now,
      hint: EFFORT_SHORT[item],
      icon: "sliders",
      id: item,
      label: EFFORT_NAME[item],
      pick: () => onEffort(toEffortChoice(item)),
    })),
    icon: "sliders",
    id: "effort",
    label: "Effort",
    value: EFFORT_NAME[now],
  };
};

export { effectiveModel, effortGroup, levelGroup, modelGroup, shortModel };
