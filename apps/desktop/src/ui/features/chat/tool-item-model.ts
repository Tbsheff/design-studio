import type { ToolDiff } from "@design-studio/contracts";

import type { ToolRow } from "./run-state-model.js";
import type { ToolState } from "./tool-chips-model.js";
import { shortName } from "./tool-chips-model.js";
import { toolTally } from "./tool-labels-model.js";
import { shellEdits } from "./tool-rows-model.js";

const WAITING_NAME = "Waiting";

const RUNNING_NAME = "Running";

const toRowClass = (state: ToolState, isSkill: boolean): string => {
  if (isSkill) {
    return `tool-row ${state} skill-tool`;
  }

  return `tool-row ${state} `;
};

const toVerbClass = (state: ToolState, isSkill: boolean): string => {
  if (state === "error") {
    return "tool-verb font-medium text-destructive";
  }

  if (isSkill) {
    return "tool-verb font-medium text-primary";
  }

  return "tool-verb font-medium ";
};

const toEditCount = (edits: ToolDiff[]): number | null => {
  if (edits.length > 0) {
    return edits.length;
  }

  return null;
};

const toIconTool = (tool: ToolRow, edits: ToolDiff[]): ToolRow => {
  if (edits.length > 0) {
    return { ...tool, name: "Edit" };
  }

  return tool;
};

const toTargetText = (target: string, isFull: boolean): string => {
  if (isFull) {
    return target;
  }

  return shortName(target);
};

const toTallyName = (
  tool: ToolRow,
  waitingIds: ReadonlySet<string>
): string => {
  if (tool.durationMs === null && waitingIds.has(tool.toolUseId)) {
    return WAITING_NAME;
  }

  if (tool.durationMs === null) {
    return RUNNING_NAME;
  }

  if (shellEdits(tool).length > 0) {
    return "Edit";
  }

  return tool.name;
};

const toSummaryLabel = (
  tools: ToolRow[],
  waitingIds: ReadonlySet<string>
): string => {
  const names = tools.map((tool) => toTallyName(tool, waitingIds));

  return toolTally(names)
    .map((item) => {
      if (item.count > 1) {
        return `${item.label} ×${item.count}`;
      }

      return item.label;
    })
    .join(", ");
};

export {
  toEditCount,
  toIconTool,
  toRowClass,
  toSummaryLabel,
  toTargetText,
  toVerbClass,
};
