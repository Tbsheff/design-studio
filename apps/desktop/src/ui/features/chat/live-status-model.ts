import type { RunView, ToolRow } from "./run-state-model.js";
import { shortName } from "./tool-chips-model.js";
import { toolSubject, toolVerb } from "./tool-labels-model.js";

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;

const LIVE_VERB = new Map([
  ["Bash", "Running"],
  ["Edit", "Editing"],
  ["Glob", "Finding"],
  ["Grep", "Searching"],
  ["MultiEdit", "Editing"],
  ["Read", "Reading"],
  ["Skill", "Loading skill"],
  ["TodoWrite", "Updating todos"],
  ["Write", "Writing"],
]);

const toPendingLabel = (pending: ToolRow, workTree: string | null): string => {
  const target = toolSubject(pending.name, pending.input, workTree);
  const verb = LIVE_VERB.get(pending.name) ?? toolVerb(pending.name);

  if (target) {
    return `${verb} ${shortName(target)}`;
  }

  return verb;
};

const toPartsLabel = (run: RunView): string => {
  const last = run.parts.at(-1);

  if (last?.kind === "thinking" && last.open) {
    return "Thinking";
  }

  if (last?.kind === "text" && last.open) {
    return "Writing a reply";
  }

  if (run.parts.length > 0) {
    return "Working";
  }

  return "Starting";
};

const statusLabel = (
  run: RunView,
  workTree: string | null,
  now: number,
  isOffline: boolean
): string => {
  if (isOffline) {
    return "Lost the connection. Reconnecting…";
  }

  if (run.permissions.length > 0) {
    return "Waiting for your answer";
  }

  if (run.retry) {
    const seconds = Math.max(
      0,
      Math.ceil((run.retry.until - now) / MS_PER_SECOND)
    );

    return `Retrying in ${seconds}s (${run.retry.attempt}/${run.retry.max})`;
  }

  const pending = [...run.tools]
    .toReversed()
    .find((tool) => tool.durationMs === null);

  if (pending) {
    return toPendingLabel(pending, workTree);
  }

  return toPartsLabel(run);
};

const runStepText = (
  run: RunView | null,
  workTree: string | null
): string | null => {
  if (!run) {
    return null;
  }

  const todo = run.todos?.find(
    (item) => item.status === "in_progress" && !item.skipped
  );

  if (todo) {
    return todo.activeForm || todo.content;
  }

  if (run.retry) {
    return "Waiting to retry";
  }

  return statusLabel(run, workTree, Date.now(), false);
};

const elapsedText = (ms: number): string => {
  const seconds = Math.floor(ms / MS_PER_SECOND);
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);

  if (minutes > 0) {
    return `${minutes}m ${seconds % SECONDS_PER_MINUTE}s`;
  }

  return `${seconds}s`;
};

export { elapsedText, runStepText, statusLabel };
