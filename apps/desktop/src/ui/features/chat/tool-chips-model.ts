import type { ToolRow } from "./run-state-model.js";
import { toolSubject, toolVerb } from "./tool-labels-model.js";

const CANCEL_NOTE = /\bRun canceled\.?$/u;

const canceled = (tool: ToolRow): boolean =>
  tool.isError && CANCEL_NOTE.test(tool.summary);

const PLAN_NOTE = /^Plan mode is on\b/u;

const planHeld = (tool: ToolRow): boolean =>
  tool.isError && PLAN_NOTE.test(tool.summary);

type ToolState = "pending" | "done" | "error" | "stopped" | "denied";

const CHECK_GROUP = "Checked";

interface RowGroup {
  tool: ToolRow;
  count: number;
  durationMs: number | null;
  members: ToolRow[];
}

const COLLAPSE_AFTER = 5;

const failed = (tool: ToolRow): boolean =>
  tool.isError && !tool.denied && !canceled(tool) && !planHeld(tool);

const shortName = (target: string): string => {
  const parts = target.split("/");

  return parts.at(-1) || target;
};

const checkParts = (members: ToolRow[], workTree: string | null): string => {
  const parts = members.map(
    (tool) =>
      toolSubject(tool.name, tool.input, workTree) ||
      toolVerb(tool.name)
        .replace(/ check$/u, "")
        .toLowerCase()
  );

  return [...new Set(parts)].join(", ");
};

const STATE_WORD: Partial<Record<ToolState, string>> = {
  denied: "Denied",
  error: "Error",
  stopped: "Stopped",
};

const SHOW_MS_FROM = 1000;

interface FileChange {
  path: string;
  added: number;
  removed: number;
  created: boolean;
}

export {
  CHECK_GROUP,
  COLLAPSE_AFTER,
  SHOW_MS_FROM,
  STATE_WORD,
  canceled,
  checkParts,
  failed,
  planHeld,
  shortName,
};

export type { FileChange, RowGroup, ToolState };
