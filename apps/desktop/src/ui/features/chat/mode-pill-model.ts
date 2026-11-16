import type { RunEffort } from "@design-studio/contracts";

import { MODE_LABEL } from "./composer-mode-model.js";
import type { ComposerMode } from "./composer-mode-model.js";
import { copy } from "./copy.js";
import { EFFORT_LABEL } from "./run-settings-model.js";

const toModeAriaLabel = (
  mode: ComposerMode,
  effort: RunEffort | null
): string =>
  `${copy.mode}: ${MODE_LABEL[mode]}. ${copy.effort}: ${EFFORT_LABEL[effort ?? "auto"]}`;

export { toModeAriaLabel };
