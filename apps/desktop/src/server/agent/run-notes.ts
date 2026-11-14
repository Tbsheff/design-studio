import type { DriverOutcome } from "./lifecycle.js";
import { EDIT_TOOL_NAMES } from "./permissions.js";
import type { RunToolState } from "./types.js";

const toEditCount = (run: RunToolState): number =>
  (run.log?.toolOrder ?? []).filter((name) => EDIT_TOOL_NAMES.has(name)).length;

const toNotedOutcome = (
  outcome: DriverOutcome,
  notes: readonly string[]
): DriverOutcome => {
  if (notes.length === 0) {
    return outcome;
  }

  return {
    ...outcome,
    finalText: [outcome.finalText, ...notes].filter(Boolean).join("\n\n"),
  };
};

export { toEditCount, toNotedOutcome };
