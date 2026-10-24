import type { PermissionRequest, QueuedMessage, RunPart, RunRequest, RunStatus, RunSummary, StudioEvent, TodoItem, ToolDiff } from '../shared/contracts';
import { applyPartEvent, closeParts, isPartEvent, partsText, withFinalText } from '../shared/run-parts';

export interface ToolRow {
  toolUseId: string;
  name: string;
  input: unknown;
  startedAt: number;
  durationMs: number | null;
  isError: boolean;
  summary: string;
  diff?: ToolDiff;
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

export type RunMap = Record<string, RunView>;

function toolRows(summary: RunSummary): ToolRow[] {
  return summary.toolCalls.map((t) => ({
    toolUseId: t.toolUseId,
    name: t.name,
    input: t.input,
    startedAt: t.startedAt,
    durationMs: t.finishedAt === null ? null : t.finishedAt - t.startedAt,
    isError: t.isError,
    summary: t.summary ?? '',
    ...(t.diff ? { diff: t.diff } : {}),
    ...(t.denied ? { denied: true } : {}),
  }));
}

function legacyParts(summary: RunSummary): RunPart[] {
  const tools: RunPart[] = summary.toolCalls.map((t) => ({ kind: 'tool', toolUseId: t.toolUseId }));
  return summary.finalText ? [...tools, { kind: 'text', text: summary.finalText }] : tools;
}

export function emptyRun(runId: string, directionId: string | null, startedAt: number, request: RunRequest | null = null): RunView {
  return {
    runId,
    directionId,
    request,
    startedAt,
    status: 'running',
    parts: [],
    tools: [],
    queue: [],
    permissions: [],
    todos: null,
    contextTokens: null,
    retry: null,
    summary: null,
  };
}

export function runFromSummary(summary: RunSummary): RunView {
  return {
    ...emptyRun(summary.id, summary.directionId, summary.startedAt, summary.request),
    status: summary.status,
    parts: summary.parts ?? legacyParts(summary),
    tools: toolRows(summary),
    todos: summary.todos ?? null,
    contextTokens: summary.contextTokens ?? null,
    summary,
  };
}

function finishedView(prev: RunView | undefined, summary: RunSummary): RunView {
  const finished = runFromSummary(summary);
  if (!prev) return finished;
  const parts = summary.parts ?? withFinalText(closeParts(prev.parts), summary.finalText);
  const tools = prev.tools.length >= finished.tools.length ? mergeTools(prev.tools, finished.tools) : finished.tools;
  return { ...finished, parts, tools, todos: finished.todos ?? prev.todos, contextTokens: finished.contextTokens ?? prev.contextTokens };
}

function applyToolEvent(run: RunView, event: StudioEvent): void {
  if (event.type === 'run.tool.started') {
    run.retry = null;
    run.tools = [
      ...run.tools.filter((t) => t.toolUseId !== event.toolUseId),
      { toolUseId: event.toolUseId, name: event.name, input: event.input, startedAt: event.ts, durationMs: null, isError: false, summary: '' },
    ];
  } else if (event.type === 'run.tool.finished') {
    run.tools = run.tools.map((t) =>
      t.toolUseId === event.toolUseId ? { ...t, durationMs: event.durationMs, isError: event.isError, summary: event.summary, ...(event.diff ? { diff: event.diff } : {}), ...(event.denied ? { denied: true } : {}) } : t,
    );
  }
}

function applyControlEvent(run: RunView, event: StudioEvent): void {
  switch (event.type) {
    case 'run.queue':
      run.queue = event.items;
      break;
    case 'run.user':
      run.queue = run.queue.filter((item) => item.id !== event.id);
      break;
    case 'run.permission':
      run.permissions = [...run.permissions.filter((p) => p.id !== event.request.id), event.request];
      break;
    case 'run.permission.resolved':
      run.permissions = run.permissions.filter((p) => p.id !== event.requestId);
      break;
    case 'run.todos':
      run.todos = event.todos;
      break;
    case 'run.usage':
      run.contextTokens = event.contextTokens;
      break;
    case 'run.retry':
      run.retry = { attempt: event.attempt, max: event.max, until: event.ts + event.delayMs, error: event.error };
      break;
  }
}

export function applyRunEvent(runs: RunMap, event: StudioEvent): RunMap {
  if (!event.type.startsWith('run.') || !('runId' in event)) return runs;
  const runId = event.runId;
  const prev = runs[runId];
  if (event.type === 'run.finished') return { ...runs, [runId]: finishedView(prev, event.summary) };
  if (prev?.summary) return runs;
  const run: RunView = prev ? { ...prev, directionId: prev.directionId ?? event.directionId ?? null } : emptyRun(runId, event.directionId ?? null, event.ts);
  if (event.type === 'run.stopping') return { ...runs, [runId]: { ...run, status: 'canceled', queue: [], permissions: [], retry: null } };
  if (run.status === 'canceled' && isPartEvent(event)) return runs;
  if (isPartEvent(event)) {
    run.parts = applyPartEvent(run.parts, event);
    if (event.type === 'run.text.delta' || event.type === 'run.thinking.delta') run.retry = null;
  }
  if (event.type === 'run.started') {
    run.request = event.request;
    run.startedAt = event.ts;
    run.status = 'running';
  }
  applyToolEvent(run, event);
  applyControlEvent(run, event);
  return { ...runs, [runId]: run };
}

function mergeTools(live: ToolRow[], final: ToolRow[]): ToolRow[] {
  const byId = new Map(final.map((t) => [t.toolUseId, t]));
  return live.map((t) => {
    const f = byId.get(t.toolUseId);
    if (!f) return t;
    const diff = f.diff ?? t.diff;
    return { ...t, durationMs: f.durationMs ?? t.durationMs, isError: f.isError, summary: f.summary || t.summary, ...(diff ? { diff } : {}), ...(f.denied || t.denied ? { denied: true } : {}) };
  });
}

export function shortInput(input: unknown): string {
  if (input === null || input === undefined) return '';
  if (typeof input === 'string') return input.slice(0, 80);
  if (typeof input !== 'object') return String(input);
  const o = input as Record<string, unknown>;
  for (const key of ['file_path', 'path', 'filePath', 'pattern', 'command', 'url', 'query']) {
    const v = o[key];
    if (typeof v === 'string') return v.slice(0, 80);
  }
  return JSON.stringify(input).slice(0, 80);
}

export function runText(run: RunView): string {
  return partsText(run.parts);
}
