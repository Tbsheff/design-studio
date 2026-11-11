import type { ProjectSettings, RunLevel } from "@design-studio/contracts";

const MAX_TURNS_LIMIT = 200;

const MODEL_OPTIONS = [
  { id: "claude-haiku-5-5", label: "Claude Haiku 5.5" },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5" },
  { id: "claude-opus-5-5", label: "Claude Opus 5.5" },
];

interface SettingsDraft {
  model: string;
  maxTurns: string;
  allowBash: boolean;
  allowInstall: boolean;
  autoApprove: boolean;
  disabledSkills: string[];
  defaultLevel: RunLevel;
}

const toDraft = (settings: ProjectSettings): SettingsDraft => ({
  allowBash: settings.allowBash,
  allowInstall: settings.allowInstall,
  autoApprove: settings.autoApprove ?? true,
  defaultLevel: settings.defaultLevel ?? "prototype",
  disabledSkills: [...(settings.disabledSkills ?? [])],
  maxTurns: String(settings.maxTurns),
  model: settings.model,
});

const parseDraft = (
  draft: SettingsDraft
): { settings: ProjectSettings } | { error: string } => {
  const turns = Number(draft.maxTurns);

  if (!Number.isInteger(turns) || turns < 1 || turns > MAX_TURNS_LIMIT) {
    return { error: "Enter a whole number of max turns from 1 to 200." };
  }

  return {
    settings: {
      allowBash: draft.allowBash,
      allowInstall: draft.allowBash && draft.allowInstall,
      autoApprove: draft.autoApprove,
      defaultLevel: draft.defaultLevel,
      disabledSkills: [...draft.disabledSkills],
      maxTurns: turns,
      model: draft.model,
    },
  };
};

const modelLabel = (id: string): string =>
  MODEL_OPTIONS.find((options) => options.id === id)?.label ?? id;

export { MODEL_OPTIONS, modelLabel, parseDraft, toDraft };

export type { SettingsDraft };
