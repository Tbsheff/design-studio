import { formatUsd } from "../../domain/format.js";
import { copy } from "./copy.js";
import type { RunView } from "./run-state-model.js";

const MIN_SHOWN_USD = 0.01;

const SETTINGS_COMMAND = "project.settings";

const toLimitText = (run: RunView): string => {
  const cost = run.summary?.costUsd ?? 0;

  if (cost < MIN_SHOWN_USD) {
    return copy.stoppedAtSpendingLimit;
  }

  return `${copy.stoppedAtThe}${formatUsd(cost)}${copy.limitTail}`;
};

const openProjectSettings = (): void => {
  globalThis.dispatchEvent(
    new CustomEvent("studio:command", { detail: SETTINGS_COMMAND })
  );
};

export { openProjectSettings, toLimitText };
