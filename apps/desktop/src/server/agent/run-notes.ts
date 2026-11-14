import type { ResolvedRunConfig } from "../../shared/run-levels.js";
import type { DriverInput, DriverOutcome } from "./lifecycle.js";
import { EDIT_TOOL_NAMES } from "./permissions.js";
import { toPhotoNotes } from "./photo-note.js";
import type { RunToolState } from "./types.js";

const toEditCount = (run: RunToolState): number =>
  (run.log?.toolOrder ?? []).filter((name) => EDIT_TOOL_NAMES.has(name)).length;

interface NotedSegment {
  readonly notes: readonly string[];
  readonly setup: { readonly config: ResolvedRunConfig };
}

const toNotedOutcome = async (
  outcome: DriverOutcome,
  segment: NotedSegment,
  input: DriverInput
): Promise<DriverOutcome> => {
  const notes = [
    ...segment.notes,
    ...(await toPhotoNotes(input, segment.setup.config)),
  ];

  if (notes.length === 0) {
    return outcome;
  }

  return {
    ...outcome,
    finalText: [outcome.finalText, ...notes].filter(Boolean).join("\n\n"),
  };
};

export { toEditCount, toNotedOutcome };
