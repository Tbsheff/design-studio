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
} from "../../../shared/contracts.js";
import {
  partsText,
  applyPartEvent,
  closeParts,
  isPartEvent,
  withFinalText,
} from "../../../shared/run-parts.js";

const PENDING_CLOCK_SLACK_MS = 1000;

export interface ToolRow {
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

export interface RetryState {
  attempt: number;
  max: number;
  until: number;
  error: string;
}

export interface RunView {
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

export const shownPending = (
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

  return started ? null : pending;
};

export const runText = (run: RunView): string => partsText(run.parts);

export type RunMap = Record<string, RunView>;

const toolRows = (summary: RunSummary): ToolRow[] =>
  summary.toolCalls.map((t) => ({
    durationMs: t.finishedAt === null ? null : t.finishedAt - t.startedAt,
    input: t.input,
    isError: t.isError,
    name: t.name,
    startedAt: t.startedAt,
    summary: t.summary ?? "",
    toolUseId: t.toolUseId,
    ...(t.diff ? { diff: t.diff } : {}),
    ...(t.diffs ? { diffs: t.diffs } : {}),
    ...(t.denied ? { denied: true } : {}),
  }));

const legacyParts = (summary: RunSummary): RunPart[] => {
  const tools: RunPart[] = summary.toolCalls.map((t) => ({
    kind: "tool",
    toolUseId: t.toolUseId,
  }));

  return summary.finalText
    ? [...tools, { kind: "text", text: summary.finalText }]
    : tools;
};

export const emptyRun = (
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

export const runFromSummary = (summary: RunSummary): RunView => ({
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
  const byId = new Map(final.map((t) => [t.toolUseId, t]));

  return live.map((t) => {
    const f = byId.get(t.toolUseId);

    if (!f) {
      return t;
    }

    const diff = f.diff ?? t.diff;
    const diffs = f.diffs ?? t.diffs;

    return {
      ...t,
      durationMs: f.durationMs ?? t.durationMs,
      isError: f.isError,
      summary: f.summary || t.summary,
      ...(diff ? { diff } : {}),
      ...(diffs ? { diffs } : {}),
      ...(f.denied || t.denied ? { denied: true } : {}),
    };
  });
};

const finishedView = (
  prev: RunView | undefined,
  event: RunSummary
): RunView => {
  const title = event.title ?? prev?.summary?.title;
  const summary = title ? { ...event, title } : event;
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
      ...run.tools.filter((t) => t.toolUseId !== event.toolUseId),
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
    run.tools = run.tools.map((t) =>
      t.toolUseId === event.toolUseId
        ? {
            ...t,
            durationMs: event.durationMs,
            isError: event.isError,
            summary: event.summary,
            ...(event.diff ? { diff: event.diff } : {}),
            ...(event.diffs ? { diffs: event.diffs } : {}),
            ...(event.denied ? { denied: true } : {}),
          }
        : t
    );
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
        ...run.permissions.filter((p) => p.id !== event.request.id),
        event.request,
      ];
      break;
    }

    case "run.permission.resolved": {
      run.permissions = run.permissions.filter((p) => p.id !== event.requestId);
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

export const applyRunEvent = (runs: RunMap, event: StudioEvent): RunMap => {
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

export const shortInput = (input: unknown): string => {
  if (input === null || input === undefined) {
    return "";
  }

  if (typeof input === "string") {
    return input.slice(0, 80);
  }

  if (typeof input !== "object") {
    return String(input);
  }

  const o = input as Record<string, unknown>;

  for (const key of [
    "file_path",
    "path",
    "filePath",
    "pattern",
    "command",
    "url",
    "query",
  ]) {
    const v = o[key];

    if (typeof v === "string") {
      return v.slice(0, 80);
    }
  }

  return JSON.stringify(input).slice(0, 80);
};
