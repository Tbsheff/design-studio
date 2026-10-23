import type { RunRequest, RunStatus, RunSummary, StudioEvent } from '../shared/contracts';

export interface ToolRow {
  toolUseId: string;
  name: string;
  input: unknown;
  startedAt: number;
  durationMs: number | null;
  isError: boolean;
  summary: string;
}

export interface RunView {
  runId: string;
  directionId: string | null;
  request: RunRequest | null;
  startedAt: number;
  status: RunStatus;
  textBlocks: string[];
  pendingText: string;
  thinking: string;
  tools: ToolRow[];
  summary: RunSummary | null;
}

export type RunMap = Record<string, RunView>;

export function runFromSummary(summary: RunSummary): RunView {
  return {
    runId: summary.id,
    directionId: summary.directionId,
    request: summary.request,
    startedAt: summary.startedAt,
    status: summary.status,
    textBlocks: summary.finalText ? [summary.finalText] : [],
    pendingText: '',
    thinking: '',
    tools: summary.toolCalls.map((t) => ({
      toolUseId: t.toolUseId,
      name: t.name,
      input: t.input,
      startedAt: t.startedAt,
      durationMs: t.finishedAt === null ? null : t.finishedAt - t.startedAt,
      isError: t.isError,
      summary: '',
    })),
    summary,
  };
}

function blank(runId: string, event: StudioEvent): RunView {
  return {
    runId,
    directionId: event.directionId ?? null,
    request: null,
    startedAt: event.ts,
    status: 'running',
    textBlocks: [],
    pendingText: '',
    thinking: '',
    tools: [],
    summary: null,
  };
}

export function applyRunEvent(runs: RunMap, event: StudioEvent): RunMap {
  if (!event.type.startsWith('run.') || !('runId' in event)) return runs;
  const runId = event.runId;
  const prev = runs[runId];
  if (prev?.summary && event.type !== 'run.finished') return runs;
  const run: RunView = prev ? { ...prev, directionId: prev.directionId ?? event.directionId ?? null } : blank(runId, event);
  switch (event.type) {
    case 'run.started':
      run.request = event.request;
      run.startedAt = event.ts;
      run.status = 'running';
      break;
    case 'run.text.delta':
      run.pendingText += event.text;
      break;
    case 'run.text':
      run.textBlocks = [...run.textBlocks, event.text];
      run.pendingText = '';
      break;
    case 'run.thinking':
      run.thinking = event.text;
      break;
    case 'run.tool.started':
      run.tools = [
        ...run.tools.filter((t) => t.toolUseId !== event.toolUseId),
        {
          toolUseId: event.toolUseId,
          name: event.name,
          input: event.input,
          startedAt: event.ts,
          durationMs: null,
          isError: false,
          summary: '',
        },
      ];
      break;
    case 'run.tool.finished':
      run.tools = run.tools.map((t) =>
        t.toolUseId === event.toolUseId
          ? { ...t, durationMs: event.durationMs, isError: event.isError, summary: event.summary }
          : t,
      );
      break;
    case 'run.finished': {
      const finished = runFromSummary(event.summary);
      return { ...runs, [runId]: { ...finished, tools: prev && prev.tools.length >= finished.tools.length ? mergeTools(prev.tools, finished.tools) : finished.tools } };
    }
  }
  return { ...runs, [runId]: run };
}

function mergeTools(live: ToolRow[], final: ToolRow[]): ToolRow[] {
  const byId = new Map(final.map((t) => [t.toolUseId, t]));
  return live.map((t) => {
    const f = byId.get(t.toolUseId);
    return f ? { ...t, durationMs: f.durationMs ?? t.durationMs, isError: f.isError } : t;
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
  return [...run.textBlocks, run.pendingText].filter(Boolean).join('\n\n');
}
