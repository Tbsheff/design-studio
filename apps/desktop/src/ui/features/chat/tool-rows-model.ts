import type { ToolDiff } from "@design-studio/contracts";

import type { ToolRow } from "./run-state-model.js";
import {
  CHECK_GROUP,
  canceled,
  checkParts,
  planHeld,
} from "./tool-chips-model.js";
import type { FileChange, RowGroup, ToolState } from "./tool-chips-model.js";
import { toolGroupLabel, toolSubject, toolVerb } from "./tool-labels-model.js";

interface DiffTotals {
  readonly added: number;
  readonly removed: number;
}

interface RowView {
  readonly edits: ToolDiff[];
  readonly target: string;
  readonly totals: DiffTotals | null;
  readonly verb: string;
}

const toolDiffs = (tool: Pick<ToolRow, "diff" | "diffs">): ToolDiff[] => {
  if (tool.diffs) {
    return tool.diffs;
  }

  if (tool.diff) {
    return [tool.diff];
  }

  return [];
};

const toolState = (tool: ToolRow, running = true): ToolState => {
  if (tool.durationMs === null) {
    if (running) {
      return "pending";
    }

    return "stopped";
  }

  if (tool.denied || planHeld(tool)) {
    return "denied";
  }

  if (canceled(tool)) {
    return "stopped";
  }

  if (tool.isError) {
    return "error";
  }

  return "done";
};

const isQuiet = (tool: ToolRow): boolean =>
  toolDiffs(tool).length === 0 && toolState(tool) === "done";

const isSameRow = (
  left: ToolRow,
  right: ToolRow,
  workTree: string | null
): boolean => {
  if (!isQuiet(left) || !isQuiet(right)) {
    return false;
  }

  if (
    toolGroupLabel(left.name) === CHECK_GROUP &&
    toolGroupLabel(right.name) === CHECK_GROUP
  ) {
    return true;
  }

  return (
    left.name === right.name &&
    toolSubject(left.name, left.input, workTree) ===
      toolSubject(right.name, right.input, workTree)
  );
};

const groupRepeats = (
  tools: ToolRow[],
  workTree: string | null
): RowGroup[] => {
  const groups: RowGroup[] = [];

  for (const tool of tools) {
    const last = groups.at(-1);

    if (last && isSameRow(last.tool, tool, workTree)) {
      last.count += 1;
      last.durationMs = (last.durationMs ?? 0) + (tool.durationMs ?? 0);
      last.members.push(tool);
    } else {
      groups.push({
        count: 1,
        durationMs: tool.durationMs,
        members: [tool],
        tool,
      });
    }
  }

  return groups;
};

const shellEdits = (tool: ToolRow): ToolDiff[] => {
  if (tool.diff) {
    return [];
  }

  return tool.diffs ?? [];
};

const diffTotals = (diffs: ToolDiff[]): DiffTotals => {
  let added = 0;
  let removed = 0;

  for (const diff of diffs) {
    added += diff.added;
    removed += diff.removed;
  }

  return { added, removed };
};

const isMixedGroup = (members: ToolRow[], workTree: string | null): boolean => {
  const subjects = new Set(
    members.map(
      (member) =>
        `${member.name}|${toolSubject(member.name, member.input, workTree)}`
    )
  );

  return subjects.size > 1;
};

const toEditsTarget = (edits: ToolDiff[]): string => {
  if (edits.length === 1) {
    return edits[0]?.path ?? "";
  }

  return `${edits.length} files`;
};

const rowView = (group: RowGroup, workTree: string | null): RowView => {
  const { members, tool } = group;
  const edits = shellEdits(tool);

  if (isMixedGroup(members, workTree)) {
    return {
      edits,
      target: checkParts(members, workTree),
      totals: null,
      verb: CHECK_GROUP,
    };
  }

  if (edits.length === 0) {
    return {
      edits,
      target: toolSubject(tool.name, tool.input, workTree),
      totals: tool.diff ?? null,
      verb: toolVerb(tool.name),
    };
  }

  return {
    edits,
    target: toEditsTarget(edits),
    totals: diffTotals(edits),
    verb: "Edited",
  };
};

const toChangeDiffs = (tool: ToolRow): ToolDiff[] => {
  if (!tool.diff) {
    return tool.diffs ?? [];
  }

  if (tool.isError) {
    return [];
  }

  return [tool.diff];
};

const fileChanges = (tools: ToolRow[]): FileChange[] => {
  const byPath = new Map<string, FileChange>();

  for (const tool of tools) {
    for (const diff of toChangeDiffs(tool)) {
      const entry = byPath.get(diff.path) ?? {
        added: 0,
        created: false,
        path: diff.path,
        removed: 0,
      };

      entry.added += diff.added;
      entry.removed += diff.removed;
      entry.created ||= diff.created;
      byPath.set(diff.path, entry);
    }
  }

  return [...byPath.values()];
};

export { fileChanges, groupRepeats, rowView, shellEdits, toolDiffs, toolState };

export type { DiffTotals, RowView };
