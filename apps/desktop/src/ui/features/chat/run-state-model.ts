import type {
  PermissionRequest,
  QueuedMessage,
  RunPart,
  RunRequest,
  RunStatus,
  RunSummary,
  StudioEvent,
  TodoItem,
  ToolDiff,
} from "@design-studio/contracts";

import {
  partsText,
  applyPartEvent,
  closeParts,
  isPartEvent,
  withFinalText,
} from "../../../shared/run-parts.js";
import type { ToolInput } from "./tool-input-model.js";

const PENDING_CLOCK_SLACK_MS = 1000;
const RECENT_START_MS = 3_600_000;

const isRecentStart = (startedAt: number): boolean =>
  Date.now() - startedAt < RECENT_START_MS;

const START_GRACE_MS = 20_000;

interface ToolRow {
  toolUseId: string;
  name: string;
  input: ToolInput;
  startedAt: number;
  durationMs: number | null;
  isError: boolean;
  summary: string;
  diff?: ToolDiff;
  diffs?: ToolDiff[];
  denied?: boolean;
}

interface RetryState {
  attempt: number;
  max: number;
  until: number;
  error: string;
}

interface RunView {
  runId: string;
  directionId: string | null;
  hasStarted: boolean;
  request: RunRequest | null;
  startedAt: number;
  status: RunStatus;
  parts: RunPart[];
  tools: ToolRow[];
  queue: QueuedMessage[];
  permissions: PermissionRequest[];
  todos: TodoItem[] | null;
  contextTokens: number | null;
  contextWindow: number | null;
  retry: RetryState | null;
  summary: RunSummary | null;
}

const shownPending = (
  pending: RunView | null,
  runs: RunView[],
  directionId: string | null
): RunView | null => {
  if (!pending || pending.directionId !== directionId) {
    return null;
  }

  const started = runs.some(
    (run) =>
      run.startedAt >= pending.startedAt - PENDING_CLOCK_SLACK_MS &&
      run.request?.prompt === pending.request?.prompt
  );

  if (started) {
    return null;
  }

  return pending;
};

const runText = (run: RunView): string => partsText(run.parts);

const hasRunOutput = (run: RunView): boolean =>
  run.hasStarted || run.parts.length > 0 || run.tools.length > 0;

const isLiveRun = (run: RunView, now: number): boolean =>
  run.status === "running" &&
  run.runId !== "" &&
  (hasRunOutput(run) || now - run.startedAt < START_GRACE_MS);

type RunMap = Record<string, RunView>;

type ToolExtras = Pick<ToolRow, "denied" | "diff" | "diffs">;

const toToolExtras = (source: {
  denied?: boolean | null;
  diff?: ToolDiff | null;
  diffs?: ToolDiff[] | null;
}): ToolExtras => {
  const extras: ToolExtras = {};

  if (source.diff) {
    extras.diff = source.diff;
  }

  if (source.diffs) {
    extras.diffs = source.diffs;
  }

  if (source.denied) {
    extras.denied = true;
  }

  return extras;
};

const toDuration = (
  finishedAt: number | null,
  startedAt: number
): number | null => {
  if (finishedAt === null) {
    return null;
  }

  return finishedAt - startedAt;
};

const toolRows = (summary: RunSummary): ToolRow[] =>
  summary.toolCalls.map((tool) => ({
    durationMs: toDuration(tool.finishedAt, tool.startedAt),
    input: tool.input as ToolInput,
    isError: tool.isError,
    name: tool.name,
    startedAt: tool.startedAt,
    summary: tool.summary ?? "",
    toolUseId: tool.toolUseId,
    ...toToolExtras(tool),
  }));

const legacyParts = (summary: RunSummary): RunPart[] => {
  const tools: RunPart[] = summary.toolCalls.map((tool) => ({
    kind: "tool",
    toolUseId: tool.toolUseId,
  }));

  if (summary.finalText) {
    return [...tools, { kind: "text", text: summary.finalText }];
  }

  return tools;
};

const emptyRun = (
  newRunId: string,
  owner: string | null,
  startMs: number,
  initial: RunRequest | null = null
): RunView => ({
  contextTokens: null,
  contextWindow: null,
  directionId: owner,
  hasStarted: false,
  parts: [],
  permissions: [],
  queue: [],
  request: initial,
  retry: null,
  runId: newRunId,
  startedAt: startMs,
  status: "running",
  summary: null,
  todos: null,
  tools: [],
});

const runFromSummary = (summary: RunSummary): RunView => ({
  ...emptyRun(
    summary.id,
    summary.directionId,
    summary.startedAt,
    summary.request
  ),
  contextTokens: summary.contextTokens ?? null,
  hasStarted: isRecentStart(summary.startedAt),
  parts: summary.parts ?? legacyParts(summary),
  status: summary.status,
  summary,
  todos: summary.todos ?? null,
  tools: toolRows(summary),
});

const mergeTools = (live: ToolRow[], final: ToolRow[]): ToolRow[] => {
  const byId = new Map(final.map((tool) => [tool.toolUseId, tool]));

  return live.map((tool) => {
    const found = byId.get(tool.toolUseId);

    if (!found) {
      return tool;
    }

    const diff = found.diff ?? tool.diff;
    const diffs = found.diffs ?? tool.diffs;

    return {
      ...tool,
      durationMs: found.durationMs ?? tool.durationMs,
      isError: found.isError,
      summary: found.summary || tool.summary,
      ...toToolExtras({
        denied: found.denied || tool.denied,
        diff,
        diffs,
      }),
    };
  });
};

const finishedView = (
  prev: RunView | undefined,
  event: RunSummary
): RunView => {
  const title = event.title ?? prev?.summary?.title;
  let summary: RunSummary = event;

  if (title) {
    summary = { ...event, title };
  }

  const finished = runFromSummary(summary);

  if (!prev) {
    return finished;
  }

  const parts =
    summary.parts ?? withFinalText(closeParts(prev.parts), summary.finalText);

  let { tools } = finished;

  if (prev.tools.length >= finished.tools.length) {
    tools = mergeTools(prev.tools, finished.tools);
  }

  return {
    ...finished,
    contextTokens: finished.contextTokens ?? prev.contextTokens,
    contextWindow: finished.contextWindow ?? prev.contextWindow,
    parts,
    todos: finished.todos ?? prev.todos,
    tools,
  };
};

const applyToolEvent = (run: RunView, event: StudioEvent): void => {
  if (event.type === "run.tool.started") {
    run.retry = null;
    run.tools = [
      ...run.tools.filter((tool) => tool.toolUseId !== event.toolUseId),
      {
        durationMs: null,
        input: event.input as ToolInput,
        isError: false,
        name: event.name,
        startedAt: event.ts,
        summary: "",
        toolUseId: event.toolUseId,
      },
    ];
  }

  if (event.type === "run.tool.finished") {
    run.tools = run.tools.map((tool) => {
      if (tool.toolUseId === event.toolUseId) {
        return {
          ...tool,
          durationMs: event.durationMs,
          isError: event.isError,
          summary: event.summary,
          ...toToolExtras(event),
        };
      }

      return tool;
    });
  }
};

const applyControlEvent = (run: RunView, event: StudioEvent): void => {
  switch (event.type) {
    case "run.queue": {
      run.queue = event.items;
      break;
    }

    case "run.user": {
      run.queue = run.queue.filter((item) => item.id !== event.id);
      break;
    }

    case "run.permission": {
      run.permissions = [
        ...run.permissions.filter(
          (permission) => permission.id !== event.request.id
        ),
        event.request,
      ];
      break;
    }

    case "run.permission.resolved": {
      run.permissions = run.permissions.filter(
        (permission) => permission.id !== event.requestId
      );
      break;
    }

    case "run.todos": {
      run.todos = event.todos;
      break;
    }

    case "run.usage": {
      run.contextTokens = event.contextTokens;
      run.contextWindow = event.contextWindow ?? run.contextWindow;
      break;
    }

    case "run.retry": {
      run.retry = {
        attempt: event.attempt,
        error: event.error,
        max: event.max,
        until: event.ts + event.delayMs,
      };
      break;
    }

    default: {
      break;
    }
  }
};

const toRunMapWith = (runs: RunMap, runId: string, view: RunView): RunMap =>
  Object.fromEntries([...Object.entries(runs), [runId, view]]);

const applyRunEvent = (runs: RunMap, event: StudioEvent): RunMap => {
  if (!event.type.startsWith("run.") || !("runId" in event)) {
    return runs;
  }

  const { runId } = event;
  const prev = runs[runId];

  if (event.type === "run.finished") {
    return toRunMapWith(runs, runId, finishedView(prev, event.summary));
  }

  if (prev?.summary) {
    return runs;
  }

  let run = emptyRun(runId, event.directionId ?? null, event.ts);

  if (prev) {
    run = {
      ...prev,
      directionId: prev.directionId ?? event.directionId ?? null,
    };
  }

  if (event.type === "run.stopping") {
    return toRunMapWith(runs, runId, {
      ...run,
      permissions: [],
      queue: [],
      retry: null,
      status: "canceled",
    });
  }

  if (run.status === "canceled" && isPartEvent(event)) {
    return runs;
  }

  if (isPartEvent(event)) {
    run.parts = applyPartEvent(run.parts, event);

    if (
      event.type === "run.text.delta" ||
      event.type === "run.thinking.delta"
    ) {
      run.retry = null;
    }
  }

  if (event.type === "run.started") {
    run.request = event.request;
    run.startedAt = event.ts;
    run.hasStarted = true;

    if (run.status !== "canceled") {
      run.status = "running";
    }
  }

  applyToolEvent(run, event);
  applyControlEvent(run, event);

  return toRunMapWith(runs, runId, run);
};

export {
  START_GRACE_MS,
  applyRunEvent,
  emptyRun,
  hasRunOutput,
  isLiveRun,
  runFromSummary,
  runText,
  shownPending,
};

export type { RetryState, RunMap, RunView, ToolRow };
