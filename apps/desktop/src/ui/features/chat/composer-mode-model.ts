import type { RunMode } from "@design-studio/contracts";

type ComposerMode = RunMode | "plan";

const MODE_LABEL: Record<ComposerMode, string> = {
  critique: "Critique",
  edit: "Edit",
  plan: "Plan",
};

export { MODE_LABEL };

export type { ComposerMode };
