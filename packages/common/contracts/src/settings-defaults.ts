import type { ProjectSettings } from "@design-studio/contracts";

const DEFAULT_SETTINGS: ProjectSettings = {
  allowBash: true,
  allowInstall: true,
  autoApprove: true,
  defaultLevel: "prototype",
  disabledSkills: [],
  maxTurns: 40,
  model: "claude-sonnet-5-5",
};

export { DEFAULT_SETTINGS };
