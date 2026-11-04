import type { ProjectSettings, RunLevel } from "@design-studio/contracts";

export const MODEL_OPTIONS = [
  { id: "claude-haiku-5-5", label: "Claude Haiku 5.5" },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5" },
  { id: "claude-opus-5-5", label: "Claude Opus 5.5" },
];

export interface SettingsDraft {
  model: string;
  maxBudgetUsd: string;
  maxTurns: string;
  allowBash: boolean;
  allowInstall: boolean;
  autoApprove: boolean;
  disabledSkills: string[];
  defaultLevel: RunLevel;
}

export const toDraft = (settings: ProjectSettings): SettingsDraft => ({
  allowBash: settings.allowBash,
  allowInstall: settings.allowInstall,
  autoApprove: settings.autoApprove ?? true,
  defaultLevel: settings.defaultLevel ?? "prototype",
  disabledSkills: [...(settings.disabledSkills ?? [])],
  maxBudgetUsd:
    settings.maxBudgetUsd === null ? "" : String(settings.maxBudgetUsd),
  maxTurns: String(settings.maxTurns),
  model: settings.model,
});

export const parseDraft = (
  draft: SettingsDraft
): { settings: ProjectSettings } | { error: string } => {
  const rawBudget = draft.maxBudgetUsd.trim();
  const budget = rawBudget === "" ? null : Number(rawBudget);

  if (
    budget !== null &&
    (!Number.isFinite(budget) || budget < 0.01 || budget > 50)
  ) {
    return {
      error:
        "Enter a spending limit per run from $0.01 to $50, or leave it empty for no limit.",
    };
  }

  const turns = Number(draft.maxTurns);

  if (!Number.isInteger(turns) || turns < 1 || turns > 200) {
    return { error: "Enter a whole number of max turns from 1 to 200." };
  }

  return {
    settings: {
      allowBash: draft.allowBash,
      allowInstall: draft.allowBash && draft.allowInstall,
      autoApprove: draft.autoApprove,
      defaultLevel: draft.defaultLevel,
      disabledSkills: [...draft.disabledSkills],
      maxBudgetUsd: budget,
      maxTurns: turns,
      model: draft.model,
    },
  };
};

export const modelLabel = (id: string): string =>
  MODEL_OPTIONS.find((m) => m.id === id)?.label ?? id;
