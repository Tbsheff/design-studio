import type { ClassChange } from "@design-studio/contracts";

import { DirectEditError } from "../../events/index.js";
import type { PatchResult, SourcePosition } from "../../events/index.js";

export { DirectEditError };

export type { PatchResult, SourcePosition };

export interface SourceEdit {
  tag?: string;
  style?: Record<string, string | null>;
  text?: string;
  name?: string | null;
  move?: "up" | "down";
  insert?: "text" | "frame" | "rect" | "ellipse";
  classes?: ClassChange;
  component?: string;
  variant?: string;
}

const STALE_SELECTION_MESSAGE =
  "The page changed since you selected this element. Select it again.";

export function assertSameTag(
  expected: string | undefined,
  actual: string | null
): void {
  if (expected !== undefined && actual?.toLowerCase() !== expected) {
    throw new DirectEditError("stale_selection", STALE_SELECTION_MESSAGE);
  }
}

export const TEXT_NOT_EDITABLE_MESSAGE =
  "This element has child elements; edit a leaf element or ask the agent";
