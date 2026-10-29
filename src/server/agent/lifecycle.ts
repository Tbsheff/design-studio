import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { nanoid } from 'nanoid';
import type { DesignSystemRunCheck, Direction, FinalCheck, LoopSummary, Project, PermissionDecision, PermissionRequest, QueuedMessage, RunPart, RunSentRecord, TodoItem, ToolDiff, RunStatus, RunSummary, RunUsage, StudioEventBody, TelemetrySample, ToolCallRecord } from '../../shared/contracts.js';
import { levelOf, resolveRunConfig, withRunTask } from '../../shared/run-levels.js';
import { runTitle } from '../../shared/version-title.js';
import { applyPartEvent, closeParts, isPartEvent, withFinalText } from '../../shared/run-parts.js';
import { createBashEditTracker, fileDiff, readFileText, type BashEditResult, type BashWriteCheck, type FileText } from './bash-edits.js';
import { anyRuleMatches, ruleForCommand } from '../../shared/permissionRules.js';
import { createCommandRuleStore } from '../store/command-rules.js';
import { BadRequestError } from '../store/errors.js';
import { scopeProblem } from '../variations/scope-check.js';
import { createTodoTracker, evidenceOf, type TodoEvidence } from './todo-tracker.js';
import { EDIT_TOOL_NAMES } from './permissions.js';
import type { AgentRunContext, AgentRunner, EventBus, ProjectStore, RunHandle, VersionStore } from '../types.js';

export interface DriverSink {
  textDelta(text: string): void;
  text(text: string): void;
  thinkingDelta(text: string): void;
  thinking(text: string): void;
  toolStarted(toolUseId: string, name: string, input: unknown): void;
  toolFinished(toolUseId: string, isError: boolean, summary: string, resultText?: string): void;
  beforeWrite(toolUseId: string, name: string, input: unknown): void | Promise<void>;
  bashFinished?(toolUseId: string, check: BashWriteCheck): Promise<BashEditResult>;
  usage(contextTokens: number): void;
  retry(attempt: number, max: number, delayMs: number, error: string): void;
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

export interface RunInbox {
  take(): QueuedMessage[];
}

export type PermissionAsk = Omit<PermissionRequest, 'id'>;

export interface CommandRules {
  allows(command: string): Promise<boolean>;
  remember(rule: string): Promise<void>;
}

export interface DriverInput {
  ctx: AgentRunContext;
  runId: string;
  runsDir: string;
  signal: AbortSignal;
  sink: DriverSink;
  prior?: PriorSession | null;
  inbox?: RunInbox;
  ask?: (request: PermissionAsk) => Promise<PermissionDecision>;
  commandRules?: CommandRules;
  baseFile?: (relative: string) => Promise<Uint8Array | null>;
}

export function queuedText(items: readonly QueuedMessage[]): string {
  return items.map((item) => item.text.trim()).filter(Boolean).join('\n\n');
}

export function deliveredContext(items: readonly QueuedMessage[]): string {
  return `<user-message-during-run>\nThe user sent this while you were working. Take it into account from now on:\n${queuedText(items)}\n</user-message-during-run>`;
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
  designSystemCheck?: DesignSystemRunCheck;
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

export const DELTA_FLUSH_MS = 50;
export const DELTA_FLUSH_CHARS = 2048;

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

export const TODO_TOOL = 'TodoWrite';
const TODO_STATUSES = new Set(['pending', 'in_progress', 'completed']);

export function parseTodos(input: unknown): TodoItem[] | null {
  const raw = input && typeof input === 'object' ? (input as Record<string, unknown>)['todos'] : null;
  if (!Array.isArray(raw)) return null;
  const todos: TodoItem[] = [];
  for (const item of raw.slice(0, 50)) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const content = typeof record['content'] === 'string' ? record['content'].slice(0, 300) : '';
    const status = typeof record['status'] === 'string' && TODO_STATUSES.has(record['status']) ? (record['status'] as TodoItem['status']) : 'pending';
    const activeForm = typeof record['activeForm'] === 'string' ? record['activeForm'].slice(0, 300) : undefined;
    if (content) todos.push({ content, status, ...(activeForm ? { activeForm } : {}) });
  }
  return todos;
}

interface Before {
  relative: string;
  absolute: string;
  content: FileText;
}

function writeTarget(input: unknown, workTree: string): { relative: string; absolute: string } | null {
  const relative = toolFilePath(input, workTree);
  if (relative === null || relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return { relative, absolute: path.join(workTree, relative) };
}

function hunkText(hunk: ToolDiff['hunks'][number]): string[] {
  return hunk.lines.filter((line) => line.kind === 'add').map((line) => line.text);
}

export function toolDiff(before: Before): ToolDiff | null {
  return fileDiff(before.relative, before.content, readFileText(before.absolute));
}

function sessionNoteOf(direction: Direction): { sessionNote?: string } {
  if (direction.sessionId || !direction.sessionResetReason) return {};
  return { sessionNote: `New agent session after ${direction.sessionResetReason}` };
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function copyOutcome(summary: RunSummary, outcome: DriverOutcome): void {
  summary.usage = outcome.usage;
  summary.costUsd = outcome.costUsd;
  if (outcome.criticCostUsd) summary.criticCostUsd = outcome.criticCostUsd;
  if (outcome.finalCheck) summary.finalCheck = outcome.finalCheck;
  if (outcome.loop) summary.loop = outcome.loop;
  if (outcome.designSystemCheck) summary.designSystemCheck = outcome.designSystemCheck;
  summary.modelMs = outcome.modelMs;
}

type RunEventBody = StudioEventBody & { runId: string };
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type RunEventPayload = DistributiveOmit<RunEventBody, 'runId'>;

export function createRunLifecycle(deps: LifecycleDeps, driver: RunDriver): AgentRunner {
  const handles = new Map<string, RunHandle>();
  const activeRuns = new Map<string, string>();
  const stopping = new Map<string, Promise<unknown>>();
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

    let parts: RunPart[] = [];

    function publish(body: StudioEventBody): void {
      if (isPartEvent(body)) parts = applyPartEvent(parts, body);
      const event = deps.bus.emit({ ...body, projectId, directionId });
      const line = `${JSON.stringify(event)}\n`;
      enqueue(() => appendFile(eventsPath, line));
    }

    type DeltaType = 'run.text.delta' | 'run.thinking.delta';
    let pendingDelta = '';
    let pendingType: DeltaType = 'run.text.delta';
    let deltaTimer: ReturnType<typeof setTimeout> | null = null;

    function closeDeltaWindow(): void {
      if (deltaTimer) clearTimeout(deltaTimer);
      deltaTimer = null;
    }

    function publishPendingDelta(): boolean {
      if (!pendingDelta) return false;
      const text = pendingDelta;
      pendingDelta = '';
      publish({ type: pendingType, runId, text } as StudioEventBody);
      return true;
    }

    function flushDelta(): void {
      closeDeltaWindow();
      publishPendingDelta();
    }

    function onDeltaWindowEnd(): void {
      deltaTimer = publishPendingDelta() ? setTimeout(onDeltaWindowEnd, DELTA_FLUSH_MS) : null;
    }

    function addDelta(text: string, type: DeltaType = 'run.text.delta'): void {
      if (type !== pendingType) {
        publishPendingDelta();
        pendingType = type;
      }
      if (!deltaTimer) {
        publish({ type, runId, text } as StudioEventBody);
        deltaTimer = setTimeout(onDeltaWindowEnd, DELTA_FLUSH_MS);
        return;
      }
      pendingDelta += text;
      if (pendingDelta.length >= DELTA_FLUSH_CHARS) publishPendingDelta();
    }

    function emitBody(body: StudioEventBody): void {
      flushDelta();
      publish(body);
    }

    function emitRun(payload: RunEventPayload): void {
      emitBody({ ...payload, runId } as StudioEventBody);
    }

    function recordFileWrite(record: ToolCallRecord, durationMs: number, finishedAt: number): void {
      const paths = FILE_WRITE_TOOLS.has(record.name) ? [toolFilePath(record.input, ctx.direction.workTree)] : (record.diffs ?? []).map((diff) => diff.path);
      for (const file of paths) {
        const sample: TelemetrySample = { kind: 'file.write', projectId, directionId, ms: durationMs, ts: finishedAt, detail: { path: file, tool: record.name, runId } };
        const line = `${JSON.stringify(sample)}\n`;
        enqueue(() => appendFile(telemetryPath, line));
      }
    }

    function publishTodos(todos: TodoItem[] | null): void {
      if (!todos) return;
      summary.todos = todos;
      emitRun({ type: 'run.todos', todos });
    }

    function recordTodo(event: TodoEvidence | null): void {
      if (event) publishTodos(todoTracker.record(event));
    }

    function attachBashDiffs(toolUseId: string, diffs: ToolDiff[]): void {
      bashDiffs.set(toolUseId, diffs);
      recordTodo({ kind: 'write', paths: diffs.map((diff) => diff.path), text: diffs.flatMap((diff) => diff.hunks.flatMap((hunk) => hunkText(hunk))).join('\n') });
      const record = toolIndex.get(toolUseId);
      if (!record || record.finishedAt === null) return;
      record.diffs = diffs;
      recordFileWrite(record, record.finishedAt - record.startedAt, record.finishedAt);
      emitRun({ type: 'run.tool.finished', toolUseId, isError: record.isError, summary: record.summary ?? '', durationMs: record.finishedAt - record.startedAt, diffs, ...(record.denied ? { denied: true } : {}) });
    }

    let firstTokenSeen = false;
    function recordFirstToken(): void {
      if (firstTokenSeen) return;
      firstTokenSeen = true;
      const now = Date.now();
      const sample: TelemetrySample = { kind: 'run.first_token', projectId, directionId, ms: now - startedAt, ts: now, detail: { runId, stage: 'server' } };
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
    const befores = new Map<string, Before>();
    let toolMs = 0;
    let lastText = '';
    let sessionId: string | null = ctx.direction.sessionId;
    let direction: Direction = ctx.direction;
    const bashEdits = createBashEditTracker({
      workTree: ctx.direction.workTree,
      subscribe: (listener) =>
        deps.bus.subscribe(projectId, (event) => {
          if (event.type === 'files.changed' && event.directionId === directionId) listener(event.paths);
        }),
      headFile: async (relative) => (await deps.versions.headFile?.(ctx.project, direction, relative)) ?? null,
    });
    const bashDiffs = new Map<string, ToolDiff[]>();
    const todoTracker = createTodoTracker();
    const contextFiles = [ctx.target?.routeFile, ctx.target?.path].filter((file): file is string => typeof file === 'string' && file !== '');
    if (ctx.request.mode === 'edit') bashEdits.prepare();
    const baseVersionId = ctx.direction.headVersionId;
    const baseFile = async (relative: string): Promise<Uint8Array | null> => (baseVersionId && deps.versions.fileAt ? deps.versions.fileAt(ctx.project, baseVersionId, relative) : ((await deps.versions.headFile?.(ctx.project, ctx.direction, relative)) ?? null));

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
        if (!text) return;
        recordFirstToken();
        addDelta(text);
      },
      text(text) {
        if (!text) return;
        lastText = text;
        emitRun({ type: 'run.text', text });
      },
      thinkingDelta(text) {
        if (!text) return;
        recordFirstToken();
        addDelta(text, 'run.thinking.delta');
      },
      thinking(text) {
        if (text) emitRun({ type: 'run.thinking', text });
      },
      toolStarted(toolUseId, name, input) {
        const record: ToolCallRecord = { toolUseId, name, input, startedAt: Date.now(), finishedAt: null, isError: false };
        toolCalls.push(record);
        toolIndex.set(toolUseId, record);
        emitRun({ type: 'run.tool.started', toolUseId, name, input });
        const todos = name === TODO_TOOL ? parseTodos(input) : null;
        if (todos) publishTodos(todoTracker.setAgent(todos));
      },
      toolFinished(toolUseId, isError, resultSummary, resultText) {
        const record = toolIndex.get(toolUseId);
        const finishedAt = Date.now();
        const durationMs = record ? finishedAt - record.startedAt : 0;
        const before = befores.get(toolUseId);
        befores.delete(toolUseId);
        const diff = before && !isError ? toolDiff(before) : null;
        if (before && !isError) bashEdits.remember(before.relative);
        const diffs = bashDiffs.get(toolUseId);
        const denied = isError && deniedTools.has(toolUseId);
        if (record) {
          record.finishedAt = finishedAt;
          record.isError = isError;
          record.summary = resultSummary;
          if (diff) record.diff = diff;
          if (diffs) record.diffs = diffs;
          if (denied) record.denied = true;
          if (!isError) recordFileWrite(record, durationMs, finishedAt);
        }
        toolMs += durationMs;
        emitRun({ type: 'run.tool.finished', toolUseId, isError, summary: resultSummary, durationMs, ...(diff ? { diff } : {}), ...(diffs ? { diffs } : {}), ...(denied ? { denied: true } : {}) });
        if (record) recordTodo(evidenceOf({ name: record.name, input: record.input, isError, resultText, filePath: toolFilePath(record.input, ctx.direction.workTree), isEditTool: EDIT_TOOL_NAMES.has(record.name), contextFiles }));
      },
      usage(contextTokens) {
        if (!Number.isFinite(contextTokens) || contextTokens <= 0 || contextTokens === summary.contextTokens) return;
        summary.contextTokens = contextTokens;
        emitRun({ type: 'run.usage', contextTokens });
      },
      retry(attempt, max, delayMs, error) {
        emitRun({ type: 'run.retry', attempt, max, delayMs, error });
      },
      beforeWrite(toolUseId, name, input) {
        if (name === 'Bash') return ctx.request.mode === 'edit' ? bashEdits.start(toolUseId) : undefined;
        if (!FILE_WRITE_TOOLS.has(name) || befores.has(toolUseId)) return;
        const target = writeTarget(input, ctx.direction.workTree);
        if (target) befores.set(toolUseId, { ...target, content: readFileText(target.absolute) });
      },
      async bashFinished(toolUseId, check) {
        const result = await bashEdits.finish(toolUseId, check);
        if (result.diffs.length > 0) attachBashDiffs(toolUseId, result.diffs);
        return result;
      },
      sent(message) {
        flushDelta();
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

    let queue: QueuedMessage[] = [];
    let steerText: string | null = null;
    const pendingAsks = new Map<string, { toolUseId: string | null; command: string | null; resolve: (decision: PermissionDecision) => void }>();
    const ruleStore = createCommandRuleStore(deps.projects.projectDir);
    const commandRules: CommandRules = {
      allows: async (command) => anyRuleMatches(await ruleStore.list(projectId), command),
      remember: async (rule) => {
        await ruleStore.add(projectId, rule);
      },
    };
    const deniedTools = new Set<string>();
    let askCounter = 0;

    const inbox: RunInbox = {
      take() {
        if (queue.length === 0 || canceled) return [];
        const taken = queue;
        queue = [];
        for (const item of taken) emitRun({ type: 'run.user', id: item.id, text: item.text });
        emitRun({ type: 'run.queue', items: [] });
        sink.sent({ text: deliveredContext(taken), imageCount: 0, updatedInstructions: false, recommendedSkills: [], promptHash: 'queued', resume: sessionId });
        return taken;
      },
    };

    function resolveAsk(id: string, decision: PermissionDecision): boolean {
      const pending = pendingAsks.get(id);
      if (!pending) return false;
      if (decision.allow && decision.always !== undefined && (pending.command === null || decision.always !== ruleForCommand(pending.command))) {
        throw new BadRequestError('rule does not match the command');
      }
      pendingAsks.delete(id);
      if (!decision.allow && pending.toolUseId) deniedTools.add(pending.toolUseId);
      emitRun({ type: 'run.permission.resolved', requestId: id, allow: decision.allow });
      pending.resolve(decision);
      return true;
    }

    function ask(request: PermissionAsk): Promise<PermissionDecision> {
      if (canceled || controller.signal.aborted) return Promise.resolve({ allow: false, note: 'The run was stopped.' });
      askCounter += 1;
      const id = `${runId}-ask-${askCounter}`;
      return new Promise<PermissionDecision>((resolve) => {
        const command = request.toolName === 'Bash' && typeof (request.input as { command?: unknown } | null)?.command === 'string' ? (request.input as { command: string }).command : null;
        pendingAsks.set(id, { toolUseId: request.toolUseId, command, resolve });
        emitRun({ type: 'run.permission', request: { ...request, id } });
      });
    }

    controller.signal.addEventListener('abort', () => {
      for (const id of [...pendingAsks.keys()]) resolveAsk(id, { allow: false, note: 'The run was stopped.' });
    });

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

    async function guardScope(): Promise<string | null> {
      const scope = ctx.request.scope;
      if (!scope || ctx.request.mode !== 'edit') return null;
      const project = await deps.projects.get(projectId);
      const current = project.directions.find((candidate) => candidate.id === directionId) ?? direction;
      const { changed } = await deps.versions.status(project, current);
      const problem = await scopeProblem(current.workTree, changed, scope);
      if (!problem) return null;
      await deps.versions.discard(project, current);
      if (current.variation) {
        direction = await deps.projects.updateDirection(projectId, directionId, { variation: { ...current.variation, rejected: problem } });
        emitBody({ type: 'direction.updated', direction });
      }
      return problem;
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
        outcome = await driver({ ctx, runId, runsDir, signal: controller.signal, sink, prior, inbox, ask, commandRules, baseFile });
      } catch (error) {
        failure = describeError(error);
      }
      driverSettled = true;
      bashEdits.close();
      flushDelta();

      let status: RunStatus = canceled ? 'canceled' : outcome ? outcome.status : 'failed';
      summary.error = canceled ? null : (outcome?.error ?? failure);
      if (outcome) copyOutcome(summary, outcome);
      if (outcome?.finalCheck) recordTodo({ kind: 'review', by: 'The final check' });

      try {
        await recordSessionTotals(outcome);
        const rejected = status === 'completed' ? await guardScope() : null;
        if (rejected) {
          status = 'failed';
          summary.error = rejected;
        }
        await finalize(status);
      } catch (error) {
        status = status === 'completed' ? 'failed' : status;
        summary.error = `Finishing the run failed: ${describeError(error)}`;
      }

      publishTodos(todoTracker.close(status, ctx.request.mode === 'edit' && !ctx.request.plan));
      const finishedAt = Date.now();
      summary.status = status;
      summary.finishedAt = finishedAt;
      summary.durationMs = outcome?.durationMs ?? finishedAt - startedAt;
      summary.toolMs = toolMs;
      summary.sessionId = sessionId;
      summary.finalText = outcome?.finalText || lastText;
      summary.parts = withFinalText(closeParts(parts), summary.finalText);

      writeSummary(summary);
      emitRun({ type: 'run.finished', summary });
      await writeChain;
      if (writeError) console.error(`[agent] run ${runId} persistence error: ${describeError(writeError)}`);
      return summary;
    }

    const done = execute().finally(() => {
      if (activeRuns.get(runKey) === runId) activeRuns.delete(runKey);
      if (stopping.get(runKey) === done) stopping.delete(runKey);
    });

    const handle: RunHandle = {
      runId,
      cancel() {
        if (driverSettled || canceled) return;
        canceled = true;
        controller.abort();
        stopping.set(runKey, done);
        emitRun({ type: 'run.stopping' });
      },
      done,
      setQueue(items) {
        if (driverSettled || canceled) return false;
        queue = items.filter((item) => item.text.trim() !== '');
        emitRun({ type: 'run.queue', items: queue });
        return true;
      },
      steer(text) {
        if (driverSettled || canceled) return false;
        steerText = text;
        handle.cancel();
        return true;
      },
      answer: resolveAsk,
      next() {
        if (steerText !== null) return { text: [steerText, queuedText(queue)].filter(Boolean).join('\n\n'), reason: 'steer' };
        if (canceled || queue.length === 0) return null;
        return { text: queuedText(queue), reason: 'queue' };
      },
    };
    handles.set(runId, handle);
    return handle;
  }

  return {
    start,
    get: (runId) => handles.get(runId),
    isRunning: (projectId, directionId) => activeRuns.has(activeKey(projectId, directionId)),
    stopping: (projectId, directionId) => stopping.get(activeKey(projectId, directionId)) ?? null,
  };
}
