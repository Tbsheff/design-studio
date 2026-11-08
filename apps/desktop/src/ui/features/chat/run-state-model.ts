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

const SHORT_INPUT_CHARS = 80;

const PENDING_CLOCK_SLACK_MS = 1000;

interface ToolRow {
  toolUseId: string;
  name: string;
  input: unknown;
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
  request: RunRequest | null;
  startedAt: number;
  status: RunStatus;
  parts: RunPart[];
  tools: ToolRow[];
  queue: QueuedMessage[];
  permissions: PermissionRequest[];
  todos: TodoItem[] | null;
  contextTokens: number | null;
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

type RunMap = Record<string, RunView>;

const toolRows = (summary: RunSummary): ToolRow[] =>
  summary.toolCalls.map((tool) => ({
    durationMs:
      tool.finishedAt === null ? null : tool.finishedAt - tool.startedAt,
    input: tool.input,
    isError: tool.isError,
    name: tool.name,
    startedAt: tool.startedAt,
    summary: tool.summary ?? "",
    toolUseId: tool.toolUseId,
    ...(tool.diff ? { diff: tool.diff } : {}),
    ...(tool.diffs ? { diffs: tool.diffs } : {}),
    ...(tool.denied ? { denied: true } : {}),
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
  runId: string,
  directionId: string | null,
  startedAt: number,
  request: RunRequest | null = null
): RunView => ({
  contextTokens: null,
  directionId,
  parts: [],
  permissions: [],
  queue: [],
  request,
  retry: null,
  runId,
  startedAt,
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
      ...(diff ? { diff } : {}),
      ...(diffs ? { diffs } : {}),
      ...(found.denied || tool.denied ? { denied: true } : {}),
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

  const tools =
    prev.tools.length >= finished.tools.length
      ? mergeTools(prev.tools, finished.tools)
      : finished.tools;

  return {
    ...finished,
    contextTokens: finished.contextTokens ?? prev.contextTokens,
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
        input: event.input,
        isError: false,
        name: event.name,
        startedAt: event.ts,
        summary: "",
        toolUseId: event.toolUseId,
      },
    ];
  } else if (event.type === "run.tool.finished") {
    run.tools = run.tools.map((tool) => {
      if (tool.toolUseId === event.toolUseId) {
        return {
          ...tool,
          durationMs: event.durationMs,
          isError: event.isError,
          summary: event.summary,
          ...(event.diff ? { diff: event.diff } : {}),
          ...(event.diffs ? { diffs: event.diffs } : {}),
          ...(event.denied ? { denied: true } : {}),
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

const applyRunEvent = (runs: RunMap, event: StudioEvent): RunMap => {
  if (!event.type.startsWith("run.") || !("runId" in event)) {
    return runs;
  }

  const { runId } = event;
  const prev = runs[runId];

  if (event.type === "run.finished") {
    return { ...runs, [runId]: finishedView(prev, event.summary) };
  }

  if (prev?.summary) {
    return runs;
  }

  const run: RunView = prev
    ? { ...prev, directionId: prev.directionId ?? event.directionId ?? null }
    : emptyRun(runId, event.directionId ?? null, event.ts);

  if (event.type === "run.stopping") {
    return {
      ...runs,
      [runId]: {
        ...run,
        permissions: [],
        queue: [],
        retry: null,
        status: "canceled",
      },
    };
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

    if (run.status !== "canceled") {
      run.status = "running";
    }
  }

  applyToolEvent(run, event);
  applyControlEvent(run, event);

  return { ...runs, [runId]: run };
};

const shortInput = (input: unknown): string => {
  if (input === null || input === undefined) {
    return "";
  }

  if (typeof input === "string") {
    return input.slice(0, SHORT_INPUT_CHARS);
  }

  if (typeof input !== "object") {
    return String(input);
  }

  const record = input as Record<string, unknown>;

  for (const key of [
    "file_path",
    "path",
    "filePath",
    "pattern",
    "command",
    "url",
    "query",
  ]) {
    const value = record[key];

    if (typeof value === "string") {
      return value.slice(0, SHORT_INPUT_CHARS);
    }
  }

  return JSON.stringify(input).slice(0, SHORT_INPUT_CHARS);
};

export {
  applyRunEvent,
  emptyRun,
  runFromSummary,
  runText,
  shortInput,
  shownPending,
};

export type { RetryState, RunMap, RunView, ToolRow };
