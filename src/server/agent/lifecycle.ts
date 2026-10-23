import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { nanoid } from 'nanoid';
import type { Direction, FinalCheck, LoopSummary, Project, RunSentRecord, RunStatus, RunSummary, RunUsage, StudioEventBody, TelemetrySample, ToolCallRecord } from '../../shared/contracts.js';
import { levelOf, resolveRunConfig, withRunTask } from '../../shared/run-levels.js';
import { runTitle } from '../../shared/version-title.js';
import type { AgentRunContext, AgentRunner, EventBus, ProjectStore, RunHandle, VersionStore } from '../types.js';

export interface DriverSink {
  textDelta(text: string): void;
  text(text: string): void;
  thinking(text: string): void;
  toolStarted(toolUseId: string, name: string, input: unknown): void;
  toolFinished(toolUseId: string, isError: boolean, summary: string): void;
  sessionStarted(sessionId: string): Promise<void>;
  sent(message: SentMessage): void;
}

export type SentMessage = Omit<RunSentRecord, 'type' | 'runId' | 'projectId' | 'directionId' | 'ts'>;

export interface SessionTotals {
  costUsd: number;
  apiMs: number | null;
  promptHash?: string | null;
}

export interface PriorSession extends SessionTotals {
  sessionId: string;
}

export interface DriverInput {
  ctx: AgentRunContext;
  runId: string;
  runsDir: string;
  signal: AbortSignal;
  sink: DriverSink;
  prior?: PriorSession | null;
}

export type DriverStatus = Extract<RunStatus, 'completed' | 'failed' | 'budget_exceeded'>;

export interface DriverOutcome {
  status: DriverStatus;
  usage: RunUsage;
  costUsd: number;
  costEstimated?: boolean;
  criticCostUsd?: number;
  finalCheck?: FinalCheck;
  loop?: LoopSummary;
  sessionTotals?: SessionTotals;
  durationMs: number | null;
  modelMs: number;
  finalText: string;
  error: string | null;
}

export type RunDriver = (input: DriverInput) => Promise<DriverOutcome>;

interface LifecycleDeps {
  bus: EventBus;
  projects: ProjectStore;
  versions: VersionStore;
  beforeCommit?: (project: Project, direction: Direction) => Promise<void>;
}

export const EMPTY_USAGE: RunUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };

const FILE_WRITE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit']);

function sessionsDirOf(runsDir: string): string {
  return path.join(path.dirname(runsDir), 'sessions');
}

function sessionLedgerPath(runsDir: string, sessionId: string): string {
  return path.join(sessionsDirOf(runsDir), `${sessionId.replace(/[^A-Za-z0-9_-]/g, '_')}.json`);
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

async function loadPriorSession(runsDir: string, direction: Direction): Promise<PriorSession | null> {
  const sessionId = direction.sessionId;
  if (!sessionId) return null;
  const fallback: PriorSession = { sessionId, costUsd: direction.sessionCostUsd ?? 0, apiMs: null };
  try {
    const raw = JSON.parse(await readFile(sessionLedgerPath(runsDir, sessionId), 'utf8')) as Record<string, unknown>;
    const promptHash = typeof raw['promptHash'] === 'string' ? raw['promptHash'] : null;
    return { sessionId, costUsd: finiteOrNull(raw['costUsd']) ?? fallback.costUsd, apiMs: finiteOrNull(raw['apiMs']), promptHash };
  } catch {
    return fallback;
  }
}

function toolFilePath(input: unknown, workTree: string): string | null {
  if (!input || typeof input !== 'object') return null;
  const target = (input as Record<string, unknown>)['file_path'];
  if (typeof target !== 'string') return null;
  const relative = path.relative(workTree, path.resolve(workTree, target));
  return relative.split(path.sep).join('/');
}

function sessionNoteOf(direction: Direction): { sessionNote?: string } {
  if (direction.sessionId || !direction.sessionResetReason) return {};
  return { sessionNote: `New agent session after ${direction.sessionResetReason}` };
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

type RunEventBody = StudioEventBody & { runId: string };
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type RunEventPayload = DistributiveOmit<RunEventBody, 'runId'>;

export function createRunLifecycle(deps: LifecycleDeps, driver: RunDriver): AgentRunner {
  const handles = new Map<string, RunHandle>();
  const activeRuns = new Map<string, string>();
  const activeKey = (projectId: string, directionId: string): string => `${projectId}/${directionId}`;

  async function runBeforeCommit(project: Project, direction: Direction): Promise<void> {
    try {
      await deps.beforeCommit?.(project, direction);
    } catch (error) {
      console.error(`[agent] before-commit step failed for ${project.id}/${direction.id}: ${describeError(error)}`);
    }
  }

  function start(ctx: AgentRunContext): RunHandle {
    const projectId = ctx.project.id;
    const directionId = ctx.direction.id;
    const runKey = activeKey(projectId, directionId);
    if (activeRuns.has(runKey)) throw new Error('run_in_progress');

    const runId = nanoid();
    activeRuns.set(runKey, runId);
    const controller = new AbortController();
    let canceled = false;
    let driverSettled = false;
    const runsDir = path.join(deps.projects.projectDir(projectId), 'runs');
    const eventsPath = path.join(runsDir, `${runId}.jsonl`);
    const summaryPath = path.join(runsDir, `${runId}.json`);
    const telemetryPath = path.join(deps.projects.projectDir(projectId), 'telemetry.jsonl');
    let writeChain: Promise<void> = mkdir(runsDir, { recursive: true }).then(() => undefined);
    let writeError: unknown = null;

    function enqueue(task: () => Promise<void>): void {
      writeChain = writeChain.then(task).catch((error: unknown) => {
        writeError ??= error;
      });
    }

    function emitBody(body: StudioEventBody): void {
      const event = deps.bus.emit({ ...body, projectId, directionId });
      const line = `${JSON.stringify(event)}\n`;
      enqueue(() => appendFile(eventsPath, line));
    }

    function emitRun(payload: RunEventPayload): void {
      emitBody({ ...payload, runId } as StudioEventBody);
    }

    function recordFileWrite(record: ToolCallRecord, durationMs: number, finishedAt: number): void {
      if (!FILE_WRITE_TOOLS.has(record.name)) return;
      const sample: TelemetrySample = {
        kind: 'file.write',
        projectId,
        directionId,
        ms: durationMs,
        ts: finishedAt,
        detail: { path: toolFilePath(record.input, ctx.direction.workTree), tool: record.name, runId },
      };
      const line = `${JSON.stringify(sample)}\n`;
      enqueue(() => appendFile(telemetryPath, line));
    }

    function writeSummary(summary: RunSummary): void {
      const json = `${JSON.stringify(summary, null, 2)}\n`;
      enqueue(() => writeFile(summaryPath, json));
    }

    const level = levelOf(ctx.request, ctx.project.settings);
    const runConfig = withRunTask(resolveRunConfig(ctx.project.settings, level), ctx.request.task);
    const startedAt = Date.now();
    const toolCalls: ToolCallRecord[] = [];
    const toolIndex = new Map<string, ToolCallRecord>();
    let toolMs = 0;
    let lastText = '';
    let sessionId: string | null = ctx.direction.sessionId;
    let direction: Direction = ctx.direction;

    const summary: RunSummary = {
      id: runId,
      projectId,
      directionId,
      request: ctx.request,
      level,
      status: 'running',
      startedAt,
      finishedAt: null,
      model: runConfig.model,
      sessionId,
      usage: { ...EMPTY_USAGE },
      costUsd: 0,
      durationMs: 0,
      modelMs: 0,
      toolMs: 0,
      toolCalls,
      versionId: null,
      error: null,
      finalText: '',
      ...sessionNoteOf(ctx.direction),
    };

    const sink: DriverSink = {
      textDelta(text) {
        if (text) emitRun({ type: 'run.text.delta', text });
      },
      text(text) {
        if (!text) return;
        lastText = text;
        emitRun({ type: 'run.text', text });
      },
      thinking(text) {
        if (text) emitRun({ type: 'run.thinking', text });
      },
      toolStarted(toolUseId, name, input) {
        const record: ToolCallRecord = { toolUseId, name, input, startedAt: Date.now(), finishedAt: null, isError: false };
        toolCalls.push(record);
        toolIndex.set(toolUseId, record);
        emitRun({ type: 'run.tool.started', toolUseId, name, input });
      },
      toolFinished(toolUseId, isError, resultSummary) {
        const record = toolIndex.get(toolUseId);
        const finishedAt = Date.now();
        const durationMs = record ? finishedAt - record.startedAt : 0;
        if (record) {
          record.finishedAt = finishedAt;
          record.isError = isError;
          if (!isError) recordFileWrite(record, durationMs, finishedAt);
        }
        toolMs += durationMs;
        emitRun({ type: 'run.tool.finished', toolUseId, isError, summary: resultSummary, durationMs });
      },
      sent(message) {
        const record: RunSentRecord = { type: 'run.sent', runId, projectId, directionId, ts: Date.now(), ...message };
        const line = `${JSON.stringify(record)}\n`;
        enqueue(() => appendFile(eventsPath, line));
      },
      async sessionStarted(id) {
        sessionId = id;
        summary.sessionId = id;
        if (direction.sessionId === id) return;
        direction = await deps.projects.updateDirection(projectId, directionId, { sessionId: id, sessionResetReason: null });
        emitBody({ type: 'direction.updated', direction });
      },
    };

    emitRun({ type: 'run.started', request: ctx.request });
    writeSummary({ ...summary, toolCalls: [] });

    async function finalize(status: RunStatus): Promise<void> {
      const project = await deps.projects.get(projectId);
      direction = project.directions.find((candidate) => candidate.id === directionId) ?? direction;
      if (ctx.request.mode === 'edit') await runBeforeCommit(project, direction);
      if (status === 'completed' && ctx.request.mode === 'edit') {
        const version = await deps.versions.commit(project, direction, runTitle(ctx.request.prompt), {
          kind: 'run',
          runId,
          prompt: ctx.request.prompt,
          level,
        });
        if (version) {
          summary.versionId = version.id;
          direction = await deps.projects.updateDirection(projectId, directionId, { headVersionId: version.id });
          emitBody({ type: 'version.created', version });
          emitBody({ type: 'direction.updated', direction });
        }
      }
      const workTreeStatus = await deps.versions.status(project, direction);
      emitBody({ type: 'status.changed', status: workTreeStatus });
    }

    async function recordSessionTotals(outcome: DriverOutcome | null): Promise<void> {
      const totals = outcome?.sessionTotals;
      if (!totals || sessionId === null) return;
      await mkdir(sessionsDirOf(runsDir), { recursive: true });
      await writeFile(sessionLedgerPath(runsDir, sessionId), `${JSON.stringify({ sessionId, ...totals, updatedAt: Date.now() })}\n`);
      direction = await deps.projects.updateDirection(projectId, directionId, { sessionCostUsd: totals.costUsd });
      emitBody({ type: 'direction.updated', direction });
    }

    async function execute(): Promise<RunSummary> {
      let outcome: DriverOutcome | null = null;
      let failure: string | null = null;
      try {
        const prior = await loadPriorSession(runsDir, ctx.direction);
        outcome = await driver({ ctx, runId, runsDir, signal: controller.signal, sink, prior });
      } catch (error) {
        failure = describeError(error);
      }
      driverSettled = true;

      let status: RunStatus = canceled ? 'canceled' : outcome ? outcome.status : 'failed';
      summary.error = canceled ? null : (outcome?.error ?? failure);
      if (outcome) {
        summary.usage = outcome.usage;
        summary.costUsd = outcome.costUsd;
        if (outcome.criticCostUsd) summary.criticCostUsd = outcome.criticCostUsd;
        if (outcome.finalCheck) summary.finalCheck = outcome.finalCheck;
        if (outcome.loop) summary.loop = outcome.loop;
        summary.modelMs = outcome.modelMs;
      }

      try {
        await recordSessionTotals(outcome);
        await finalize(status);
      } catch (error) {
        status = status === 'completed' ? 'failed' : status;
        summary.error = `Finishing the run failed: ${describeError(error)}`;
      }

      const finishedAt = Date.now();
      summary.status = status;
      summary.finishedAt = finishedAt;
      summary.durationMs = outcome?.durationMs ?? finishedAt - startedAt;
      summary.toolMs = toolMs;
      summary.sessionId = sessionId;
      summary.finalText = outcome?.finalText || lastText;

      writeSummary(summary);
      emitRun({ type: 'run.finished', summary });
      await writeChain;
      if (writeError) console.error(`[agent] run ${runId} persistence error: ${describeError(writeError)}`);
      return summary;
    }

    const done = execute().finally(() => {
      if (activeRuns.get(runKey) === runId) activeRuns.delete(runKey);
    });

    const handle: RunHandle = {
      runId,
      cancel() {
        if (driverSettled || canceled) return;
        canceled = true;
        controller.abort();
      },
      done,
    };
    handles.set(runId, handle);
    return handle;
  }

  return {
    start,
    get: (runId) => handles.get(runId),
    isRunning: (projectId, directionId) => activeRuns.has(activeKey(projectId, directionId)),
  };
}
