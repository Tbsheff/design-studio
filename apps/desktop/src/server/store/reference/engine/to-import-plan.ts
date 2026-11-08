import { MAX_FILES, MAX_TOTAL_BYTES } from "./reference-limits.js";
import { isWithinKindLimit, toEntryKind } from "./to-entry-kind.js";
import type { EntryKind } from "./to-entry-kind.js";

interface PlanInput {
  readonly bytes: number | null;
  readonly relativePath: string;
}

interface PlanItem {
  readonly index: number;
  readonly kind: Exclude<EntryKind, "skip">;
}

interface ImportPlan {
  readonly kept: readonly PlanItem[];
  readonly skippedCount: number;
}

const toImportPlan = (inputs: readonly PlanInput[]): ImportPlan => {
  const kept: PlanItem[] = [];
  let knownBytes = 0;

  for (const [index, input] of inputs.entries()) {
    const kind = toEntryKind(input.relativePath);
    const size = input.bytes ?? 0;

    const isUsable =
      kind !== "skip" &&
      isWithinKindLimit(kind, size) &&
      kept.length < MAX_FILES &&
      knownBytes + size <= MAX_TOTAL_BYTES;

    if (kind !== "skip" && isUsable) {
      kept.push({ index, kind });
      knownBytes += size;
    }
  }

  return { kept, skippedCount: inputs.length - kept.length };
};

export { toImportPlan };

export type { ImportPlan, PlanInput, PlanItem };
