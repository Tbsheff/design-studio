import os from 'node:os';
import path from 'node:path';
import type { Options, PermissionResult, SDKMessage, SDKResultMessage, query } from '@anthropic-ai/claude-agent-sdk';
import type { RunUsage } from '../../shared/contracts.js';
import type { PreviewService } from '../types.js';
import { EMPTY_USAGE, type DriverInput, type DriverOutcome, type DriverSink, type PriorSession, type RunDriver } from './lifecycle.js';
import { builtinToolNames, createCanUseTool, createPreToolUseGuard, type ToolPolicy } from './permissions.js';
import { createHash } from 'node:crypto';
import { levelOf, resolveRunConfig, withRunTask, type ResolvedRunConfig } from '../../shared/run-levels.js';
import { captureBaseline, type RunToolState } from './check-tool.js';
import { runFinalCheck } from './final-check.js';
import { continuationPrompt, decideLoop, loopReport, loopsDone, checkSteps, newLoopLog, wantsLoop, type LoopDecision, type StopReason } from './polish-loop.js';
import { buildSystemPrompt } from './prompt.js';
import { withRunLevel } from './run-level.js';
import { loadTasteRules, type TasteRule } from './taste.js';
import { recommendedSkillsBlock, recommendSkills } from './skill-match.js';
import { prepareSkills, type PreparedSkills } from './skills.js';
import { createStudioMcpServer } from './tools.js';
import { buildUserMessageParts, toSdkPrompt, type UserMessageParts } from './user-message.js';

type QueryFn = typeof query;
type StreamEventMessage = Extract<SDKMessage, { type: 'stream_event' }>;
type AssistantMessage = Extract<SDKMessage, { type: 'assistant' }>;
type UserMessage = Extract<SDKMessage, { type: 'user' }>;

interface SdkDriverOptions {
  preview: PreviewService;
  queryFn?: QueryFn;
  onMessage?: (message: SDKMessage) => void;
  onPermission?: (toolName: string, result: PermissionResult) => void;
  onHookDecision?: (toolName: string, result: PermissionResult) => void;
  onStderr?: (data: string) => void;
  onSkills?: (skills: PreparedSkills) => void;
  skillsRoot?: string;
  claudeHome?: string;
  tasteHome?: string;
  claudeExecutable?: string;
}

interface AttemptResult {
  outcome: DriverOutcome;
  sawInit: boolean;
}

const AGENT_ENV_KEYS = ['HOME', 'USER', 'LOGNAME', 'PATH', 'SHELL', 'TMPDIR', 'LANG', 'ANTHROPIC_API_KEY', 'HTTPS_PROXY', 'HTTP_PROXY', 'NO_PROXY', 'NODE_EXTRA_CA_CERTS'];
export const LOGIN_SHELL_PATH_ENV = 'STUDIO_LOGIN_SHELL_PATH';

function joinPath(base: string | undefined, extra: string | undefined): string | undefined {
  if (!extra) return base;
  const parts = [...(base ?? '').split(':'), ...extra.split(':')].filter((part) => part !== '');
  return [...new Set(parts)].join(':');
}

export function buildEnv(source: NodeJS.ProcessEnv, needsShellPath: boolean): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = {};
  for (const key of AGENT_ENV_KEYS) {
    const value = source[key];
    if (value !== undefined && value !== '') env[key] = value;
  }
  if (needsShellPath) env['PATH'] = joinPath(env['PATH'], source[LOGIN_SHELL_PATH_ENV]);
  return env;
}

function linkAbort(signal: AbortSignal): AbortController {
  const controller = new AbortController();
  if (signal.aborted) controller.abort();
  else signal.addEventListener('abort', () => controller.abort(), { once: true });
  return controller;
}

function shortText(value: string, max = 160): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

function toolResultText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((part: unknown) => {
      if (part && typeof part === 'object' && 'type' in part) {
        const typed = part as { type: string; text?: unknown };
        if (typed.type === 'text' && typeof typed.text === 'string') return typed.text;
        if (typed.type === 'image') return '[image]';
      }
      return '';
    })
    .filter(Boolean)
    .join(' ');
}

function describeToolInput(name: string, input: unknown): string {
  if (!input || typeof input !== 'object') return name;
  const record = input as Record<string, unknown>;
  const target = record['file_path'] ?? record['path'] ?? record['pattern'] ?? record['command'] ?? record['viewport'];
  return typeof target === 'string' ? `${name} ${shortText(target, 100)}` : name;
}

function mapUsage(result: SDKResultMessage): RunUsage {
  const usage = result.usage;
  return {
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
  };
}

interface TokenPrice {
  input: number;
  output: number;
}

const PRICE_PER_MTOK: { match: string; price: TokenPrice }[] = [
  { match: 'haiku', price: { input: 0.1, output: 0.5 } },
  { match: 'opus', price: { input: 4, output: 20 } },
  { match: 'sonnet', price: { input: 2, output: 10 } },
];

const CACHE_READ_FACTOR = 0.1;
const CACHE_WRITE_FACTOR = 1.25;

function priceFor(model: string): TokenPrice {
  const lower = model.toLowerCase();
  return PRICE_PER_MTOK.find((row) => lower.includes(row.match))?.price ?? { input: 2, output: 10 };
}

export function estimateCostUsd(model: string, usage: RunUsage): number {
  const price = priceFor(model);
  const inputUnits = usage.inputTokens + usage.cacheReadTokens * CACHE_READ_FACTOR + usage.cacheWriteTokens * CACHE_WRITE_FACTOR;
  return (inputUnits * price.input + usage.outputTokens * price.output) / 1_000_000;
}

export function hashPrompt(systemPrompt: string): string {
  return createHash('sha256').update(systemPrompt).digest('hex');
}

export function withUpdatedInstructions(parts: UserMessageParts, systemPrompt: string, promptHash: string, prior: PriorSession | null): UserMessageParts {
  if (prior?.promptHash === promptHash) return parts;
  const block = `<updated-instructions>
A resumed session keeps the system prompt it started with, so the studio sends its current instructions here. They replace every earlier system instruction in this conversation.

${systemPrompt}
</updated-instructions>`;
  return { ...parts, text: `${block}\n\n${parts.text}` };
}

export function withRecommendedSkills(parts: UserMessageParts, skillIds: readonly string[]): UserMessageParts {
  const block = recommendedSkillsBlock(skillIds);
  return block ? { ...parts, text: `${block}\n\n${parts.text}` } : parts;
}

interface PreparedMessage {
  sent: UserMessageParts;
  updatedInstructions: boolean;
  recommendedSkills: string[];
}

function prepareMessage(parts: UserMessageParts, skills: PreparedSkills, input: DriverInput, prompt: { text: string; hash: string }, resume: string | null, config: ResolvedRunConfig): PreparedMessage {
  const recommendedSkills = config.preset.skills ? recommendSkills(skills.catalog.skills, skills.enabled, input.ctx.request) : [];
  const withSkills = withRunLevel(withRecommendedSkills(parts, recommendedSkills), config, input.ctx.request.mode);
  const sent = resume ? withUpdatedInstructions(withSkills, prompt.text, prompt.hash, priorFor(input, resume)) : withSkills;
  return { sent, updatedInstructions: sent !== withSkills, recommendedSkills };
}

function priorFor(input: DriverInput, resume: string | null): PriorSession | null {
  const prior = input.prior ?? null;
  if (!resume || !prior || prior.sessionId !== resume) return null;
  return prior;
}

function runModelMs(cumulativeApiMs: number, durationMs: number | null, prior: PriorSession | null): number {
  if (!prior) return cumulativeApiMs;
  if (prior.apiMs !== null) return Math.max(0, cumulativeApiMs - prior.apiMs);
  return durationMs === null ? cumulativeApiMs : Math.min(cumulativeApiMs, durationMs);
}

function mapResult(result: SDKResultMessage, lastText: string, prior: PriorSession | null): DriverOutcome {
  const sessionCostUsd = result.total_cost_usd ?? 0;
  const cumulativeApiMs = result.duration_api_ms ?? 0;
  const durationMs = result.duration_ms ?? null;
  const base = {
    usage: mapUsage(result),
    costUsd: Math.max(0, sessionCostUsd - (prior?.costUsd ?? 0)),
    sessionTotals: { costUsd: sessionCostUsd, apiMs: cumulativeApiMs },
    durationMs,
    modelMs: runModelMs(cumulativeApiMs, durationMs, prior),
  };
  if (result.subtype === 'success') {
    const failed = result.is_error;
    return {
      ...base,
      status: failed ? 'failed' : 'completed',
      finalText: result.result || lastText,
      error: failed ? shortText(result.result || 'The model returned an error.', 500) : null,
    };
  }
  const errorText = result.errors.length ? result.errors.join('; ') : result.subtype;
  return {
    ...base,
    status: result.subtype === 'error_max_budget_usd' ? 'budget_exceeded' : 'failed',
    finalText: lastText,
    error: shortText(errorText, 500),
  };
}

export function addCriticCost(outcome: DriverOutcome, criticCostUsd: number): void {
  if (criticCostUsd <= 0) return;
  outcome.costUsd += criticCostUsd;
  outcome.criticCostUsd = criticCostUsd;
}

async function attachFinalCheck(outcome: DriverOutcome, input: Parameters<typeof runFinalCheck>[0]): Promise<void> {
  if (outcome.status === 'failed') return;
  const finalCheck = await runFinalCheck(input);
  if (finalCheck) outcome.finalCheck = finalCheck;
}

let sdkQueryPromise: Promise<QueryFn> | null = null;

function loadSdkQuery(): Promise<QueryFn> {
  sdkQueryPromise ??= import('@anthropic-ai/claude-agent-sdk').then((sdk) => sdk.query);
  return sdkQueryPromise;
}

interface PendingTool {
  name: string;
  input: unknown;
}

interface CallUsage {
  model: string;
  usage: RunUsage;
}

interface StreamState {
  pendingTools: Map<string, PendingTool>;
  sawInit: boolean;
  lastText: string;
  result: SDKResultMessage | null;
  calls: Map<string, CallUsage>;
  toolOrder: string[];
  sessionId: string | null;
  currentCallId: string | null;
  callStartedAt: number | null;
  apiMs: number;
}

function newStreamState(toolOrder: string[] = []): StreamState {
  return {
    pendingTools: new Map(),
    sawInit: false,
    lastText: '',
    result: null,
    calls: new Map(),
    toolOrder,
    sessionId: null,
    currentCallId: null,
    callStartedAt: null,
    apiMs: 0,
  };
}

interface RawUsage {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

function fromRawUsage(raw: RawUsage | null | undefined): RunUsage {
  return {
    inputTokens: raw?.input_tokens ?? 0,
    outputTokens: raw?.output_tokens ?? 0,
    cacheReadTokens: raw?.cache_read_input_tokens ?? 0,
    cacheWriteTokens: raw?.cache_creation_input_tokens ?? 0,
  };
}

function maxUsage(a: RunUsage, b: RunUsage): RunUsage {
  return {
    inputTokens: Math.max(a.inputTokens, b.inputTokens),
    outputTokens: Math.max(a.outputTokens, b.outputTokens),
    cacheReadTokens: Math.max(a.cacheReadTokens, b.cacheReadTokens),
    cacheWriteTokens: Math.max(a.cacheWriteTokens, b.cacheWriteTokens),
  };
}

function mergeCall(state: StreamState, id: string, model: string, usage: RunUsage): void {
  const known = state.calls.get(id);
  state.calls.set(id, { model: known?.model || model, usage: known ? maxUsage(known.usage, usage) : usage });
}

function closeOpenCall(state: StreamState, now: number): void {
  if (state.callStartedAt !== null) state.apiMs += Math.max(0, now - state.callStartedAt);
  state.callStartedAt = null;
}

function trackStreamUsage(message: StreamEventMessage, state: StreamState): void {
  if (message.parent_tool_use_id) return;
  const event = message.event as { type: string; message?: { id?: string; model?: string; usage?: RawUsage }; usage?: RawUsage };
  if (event.type === 'message_start' && event.message?.id) {
    closeOpenCall(state, Date.now());
    state.currentCallId = event.message.id;
    state.callStartedAt = Date.now();
    mergeCall(state, event.message.id, event.message.model ?? '', fromRawUsage(event.message.usage));
  } else if (event.type === 'message_delta' && state.currentCallId) {
    mergeCall(state, state.currentCallId, '', { ...EMPTY_USAGE, outputTokens: event.usage?.output_tokens ?? 0 });
  } else if (event.type === 'message_stop') {
    closeOpenCall(state, Date.now());
  }
}

function trackAssistantUsage(message: AssistantMessage, state: StreamState): void {
  const inner = message.message as { id?: string; model?: string; usage?: RawUsage };
  if (!inner.id || message.parent_tool_use_id) return;
  mergeCall(state, inner.id, inner.model ?? '', fromRawUsage(inner.usage));
}

function sumUsage(state: StreamState): RunUsage {
  const total = { ...EMPTY_USAGE };
  for (const call of state.calls.values()) {
    total.inputTokens += call.usage.inputTokens;
    total.outputTokens += call.usage.outputTokens;
    total.cacheReadTokens += call.usage.cacheReadTokens;
    total.cacheWriteTokens += call.usage.cacheWriteTokens;
  }
  return total;
}

function estimateStateCost(state: StreamState, fallbackModel: string): number {
  let cost = 0;
  for (const call of state.calls.values()) cost += estimateCostUsd(call.model || fallbackModel, call.usage);
  return cost;
}

const SKILLS_OFF_MESSAGE = 'Skills are off in wireframe runs. Build the wireframe without them.';

function buildPolicy(input: DriverInput, skills: PreparedSkills, config: ResolvedRunConfig): ToolPolicy {
  const { ctx } = input;
  const settings = ctx.project.settings;
  return {
    ...(config.preset.skills ? {} : { skillsOff: SKILLS_OFF_MESSAGE }),
    workTree: ctx.direction.workTree,
    mode: ctx.request.mode,
    allowBash: settings.allowBash,
    allowInstall: settings.allowInstall,
    skills: skills.enabled,
    skillDirs: skills.readableDirs,
  };
}

const BUILTIN_PLUGINS_OFF = ['cc-plugin-agents-md@builtin', 'cc-plugin-plugin-authoring@builtin'];

const ISOLATION_SETTINGS = {
  disableBundledSkills: true,
  syncClaudeAiSkills: false,
  syncClaudeAiPlugins: false,
  enabledPlugins: Object.fromEntries(BUILTIN_PLUGINS_OFF.map((id) => [id, false])),
};

function skillOptions(skills: PreparedSkills): Pick<Options, 'plugins' | 'skills'> {
  if (skills.enabled.length === 0) return { skills: [] };
  return { plugins: skills.pluginDirs.map((dir) => ({ type: 'local', path: dir, skipMcpDiscovery: true })), skills: skills.enabled };
}

async function loadSkills(options: SdkDriverOptions, input: DriverInput): Promise<PreparedSkills> {
  const root = options.skillsRoot ?? path.join(os.tmpdir(), 'design-studio-skills');
  const skills = await prepareSkills({ root, disabled: input.ctx.project.settings.disabledSkills ?? [], ...(options.claudeHome ? { home: options.claudeHome } : {}) });
  for (const problem of skills.catalog.problems) console.warn(`[agent] skill not loaded: ${problem.source}: ${problem.reason}`);
  options.onSkills?.(skills);
  return skills;
}

interface AttemptSegment {
  setup: AttemptSetup;
  sdkOptions: Options;
  promptHash: string;
  spentUsd: number;
  maxBudgetUsd: number | null;
}

function sumRunUsage(a: RunUsage, b: RunUsage): RunUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
    cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
  };
}

function addNullable(a: number | null, b: number | null): number | null {
  return a === null && b === null ? null : (a ?? 0) + (b ?? 0);
}

function mergeOutcomes(total: DriverOutcome, next: DriverOutcome): DriverOutcome {
  return {
    ...next,
    usage: sumRunUsage(total.usage, next.usage),
    costUsd: total.costUsd + next.costUsd,
    durationMs: addNullable(total.durationMs, next.durationMs),
    modelMs: total.modelMs + next.modelMs,
    finalText: next.finalText || total.finalText,
    ...(total.costEstimated || next.costEstimated ? { costEstimated: true } : {}),
  };
}

function withLoopReport(outcome: DriverOutcome, run: RunToolState, reason: StopReason | null, continuations: number): DriverOutcome {
  if (!run.log) return outcome;
  const steps = checkSteps(run.log).map((step) => ({ loop: step.loop, ...step.counts }));
  const report = loopReport(run.log, reason, continuations);
  return { ...outcome, finalText: `${outcome.finalText}\n\n${report}`, loop: { loops: loopsDone(run.log), continuations, stopReason: reason ?? 'not-completed', steps } };
}

interface AttemptSetup {
  skills: PreparedSkills;
  config: ResolvedRunConfig;
  run: RunToolState;
  tasteRules: TasteRule[];
}

const BASELINE_GATE_TIMEOUT_S = 300;

function whenAborted(signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve();
  return new Promise((resolve) => signal.addEventListener('abort', () => resolve(), { once: true }));
}

function baselineGate(run: RunToolState, signal: AbortSignal): (() => Promise<void>) | undefined {
  const baseline = run.baseline;
  if (!baseline) return undefined;
  const ready = baseline.then(
    () => undefined,
    () => undefined,
  );
  const gate = Promise.race([ready, whenAborted(signal)]);
  return () => gate;
}

async function buildSdkOptions(options: SdkDriverOptions, input: DriverInput, resume: string | null, setup: AttemptSetup): Promise<Options> {
  const { ctx, signal } = input;
  const { skills, config } = setup;
  const policy = buildPolicy(input, skills, config);
  const builtins = builtinToolNames(policy);
  const controller = linkAbort(signal);
  const env = buildEnv(process.env, policy.allowBash || policy.allowInstall);
  const studio = await createStudioMcpServer({
    preview: options.preview,
    ctx,
    runsDir: input.runsDir,
    runId: input.runId,
    run: setup.run,
    tasteRules: setup.tasteRules,
    env,
    ...(options.queryFn ? { queryFn: options.queryFn } : {}),
  });
  return {
    cwd: ctx.direction.workTree,
    settingSources: [],
    strictMcpConfig: true,
    mcpServers: { studio },
    tools: builtins,
    settings: ISOLATION_SETTINGS,
    ...skillOptions(skills),
    canUseTool: createCanUseTool(policy, options.onPermission),
    hooks: { PreToolUse: [{ hooks: [createPreToolUseGuard(policy, options.onHookDecision, baselineGate(setup.run, signal))], timeout: BASELINE_GATE_TIMEOUT_S }] },
    permissionMode: 'default',
    ...(config.agentBudgetUsd !== null ? { maxBudgetUsd: config.agentBudgetUsd + (priorFor(input, resume)?.costUsd ?? 0) } : {}),
    maxTurns: config.maxTurns,
    model: config.model,
    includePartialMessages: true,
    abortController: controller,
    env,
    systemPrompt: buildSystemPrompt(ctx.project, ctx.request.mode, ctx.designSystem ?? null, skills.invocableCount, setup.tasteRules),
    ...(resume ? { resume } : {}),
    ...(options.onStderr ? { stderr: options.onStderr } : {}),
    ...(options.claudeExecutable ? { pathToClaudeCodeExecutable: options.claudeExecutable } : {}),
  };
}

function handleStreamEvent(message: StreamEventMessage, state: StreamState, sink: DriverSink): void {
  trackStreamUsage(message, state);
  if (message.parent_tool_use_id) return;
  const event = message.event;
  if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') sink.textDelta(event.delta.text);
}

function handleAssistant(message: AssistantMessage, state: StreamState, sink: DriverSink): void {
  trackAssistantUsage(message, state);
  if (message.parent_tool_use_id) return;
  for (const block of message.message.content) {
    if (block.type === 'text') {
      state.lastText = block.text;
      sink.text(block.text);
    } else if (block.type === 'thinking') {
      sink.thinking(block.thinking);
    } else if (block.type === 'tool_use') {
      state.pendingTools.set(block.id, { name: block.name, input: block.input });
      state.toolOrder.push(block.name);
      sink.toolStarted(block.id, block.name, block.input);
    }
  }
}

function summarizeToolResult(pending: PendingTool, isError: boolean, content: unknown): string {
  const label = describeToolInput(pending.name, pending.input);
  return isError ? `${label}: ${shortText(toolResultText(content), 120)}` : label;
}

function handleUser(message: UserMessage, state: StreamState, sink: DriverSink): void {
  const content = message.message.content;
  if (typeof content === 'string') return;
  for (const block of content) {
    if (block.type !== 'tool_result') continue;
    const pending = state.pendingTools.get(block.tool_use_id);
    if (!pending) continue;
    state.pendingTools.delete(block.tool_use_id);
    const isError = block.is_error === true;
    sink.toolFinished(block.tool_use_id, isError, summarizeToolResult(pending, isError, block.content));
  }
}

async function handleMessage(message: SDKMessage, state: StreamState, sink: DriverSink): Promise<boolean> {
  if (message.type === 'system' && message.subtype === 'init') {
    state.sawInit = true;
    state.sessionId = message.session_id;
    await sink.sessionStarted(message.session_id);
    return false;
  }
  if (message.type === 'stream_event') handleStreamEvent(message, state, sink);
  else if (message.type === 'assistant') handleAssistant(message, state, sink);
  else if (message.type === 'user') handleUser(message, state, sink);
  else if (message.type === 'result') {
    state.result = message;
    return true;
  }
  return false;
}

function finishPendingTools(state: StreamState, sink: DriverSink): void {
  for (const [toolUseId, pending] of state.pendingTools) {
    sink.toolFinished(toolUseId, true, `${describeToolInput(pending.name, pending.input)}: not finished`);
  }
  state.pendingTools.clear();
}

function noResultOutcome(state: StreamState, signal: AbortSignal, prior: PriorSession | null, model: string): DriverOutcome {
  closeOpenCall(state, Date.now());
  const costUsd = estimateStateCost(state, model);
  const outcome: DriverOutcome = {
    status: 'failed',
    usage: sumUsage(state),
    costUsd,
    costEstimated: true,
    durationMs: null,
    modelMs: state.apiMs,
    finalText: state.lastText,
    error: signal.aborted ? 'Run canceled.' : 'The agent stopped without a result.',
  };
  if (state.sawInit || prior) {
    const priorApiMs = prior ? prior.apiMs : 0;
    outcome.sessionTotals = {
      costUsd: (prior?.costUsd ?? 0) + costUsd,
      apiMs: priorApiMs === null ? null : priorApiMs + state.apiMs,
    };
  }
  return outcome;
}

type SdkStream = ReturnType<QueryFn>;

async function consumeStream(stream: SdkStream, state: StreamState, input: DriverInput, options: SdkDriverOptions): Promise<void> {
  try {
    for await (const message of stream) {
      options.onMessage?.(message);
      if (await handleMessage(message, state, input.sink)) break;
    }
  } catch (error) {
    if (!input.signal.aborted) throw error;
  }
}

export function createSdkDriver(options: SdkDriverOptions): RunDriver {
  async function setupAttempt(input: DriverInput): Promise<AttemptSetup> {
    const config = withRunTask(resolveRunConfig(input.ctx.project.settings, levelOf(input.ctx.request, input.ctx.project.settings)), input.ctx.request.task);
    const run: RunToolState = {
      config,
      spentUsd: () => 0,
      criticCostUsd: 0,
      criticCalls: 0,
      lastFindings: [],
      lastChecks: [],
      log: newLoopLog(),
      baseline: config.preset.checks.quality ? captureBaseline(options.preview, input.ctx, input.runsDir, input.runId).catch(() => []) : null,
    };
    return { skills: await loadSkills(options, input), config, run, tasteRules: loadTasteRules(options.tasteHome) };
  }

  async function runSegment(input: DriverInput, setup: AttemptSegment, sent: UserMessageParts, prior: PriorSession | null): Promise<{ state: StreamState; outcome: DriverOutcome }> {
    const runQuery = options.queryFn ?? (await loadSdkQuery());
    const state = newStreamState(setup.setup.run.log?.toolOrder);
    const spentBefore = setup.spentUsd;
    setup.setup.run.spentUsd = () => spentBefore + estimateStateCost(state, setup.setup.config.model);
    const stream = runQuery({ prompt: toSdkPrompt(sent), options: setup.sdkOptions });
    try {
      await consumeStream(stream, state, input, options);
    } finally {
      finishPendingTools(state, input.sink);
      stream.close();
    }
    const outcome = state.result ? mapResult(state.result, state.lastText, prior) : noResultOutcome(state, input.signal, prior, setup.setup.config.model);
    if (outcome.sessionTotals) outcome.sessionTotals = { ...outcome.sessionTotals, promptHash: setup.promptHash };
    setup.spentUsd += outcome.costUsd;
    return { state, outcome };
  }

  async function continueLoop(input: DriverInput, segment: AttemptSegment, first: { state: StreamState; outcome: DriverOutcome }): Promise<{ outcome: DriverOutcome; reason: StopReason | null; continuations: number }> {
    let current = first;
    let total = first.outcome;
    let continuations = 0;
    const run = segment.setup.run;
    for (;;) {
      if (current.outcome.status !== 'completed' || input.signal.aborted || !current.state.sessionId || !run.log) return { outcome: total, reason: null, continuations };
      const decision: LoopDecision = decideLoop(run.log, segment.setup.config, { spentUsd: segment.spentUsd + run.criticCostUsd, capUsd: segment.setup.config.maxBudgetUsd, continuations });
      if (decision.stop) return { outcome: total, reason: decision.reason, continuations };
      continuations += 1;
      const sessionId = current.state.sessionId;
      const text = continuationPrompt(decision, run.log);
      input.sink.sent({ text, imageCount: 0, updatedInstructions: false, recommendedSkills: [], promptHash: segment.promptHash, resume: sessionId, continuation: continuations });
      segment.sdkOptions = { ...(await buildSdkOptions(options, input, sessionId, segment.setup)), resume: sessionId, ...(segment.maxBudgetUsd !== null ? { maxBudgetUsd: segment.maxBudgetUsd } : {}) };
      const prior: PriorSession = { sessionId, costUsd: total.sessionTotals?.costUsd ?? 0, apiMs: total.sessionTotals?.apiMs ?? null };
      current = await runSegment(input, segment, { text, images: [] }, prior);
      total = mergeOutcomes(total, current.outcome);
    }
  }

  async function attempt(input: DriverInput, parts: UserMessageParts, resume: string | null): Promise<AttemptResult> {
    const { sink, signal } = input;
    const setup = await setupAttempt(input);
    const sdkOptions = await buildSdkOptions(options, input, resume, setup);
    const prior = priorFor(input, resume);
    const systemPrompt = typeof sdkOptions.systemPrompt === 'string' ? sdkOptions.systemPrompt : '';
    const promptHash = hashPrompt(systemPrompt);
    const message = prepareMessage(parts, setup.skills, input, { text: systemPrompt, hash: promptHash }, resume, setup.config);
    const { sent } = message;
    sink.sent({ text: sent.text, imageCount: sent.images.length, updatedInstructions: message.updatedInstructions, recommendedSkills: message.recommendedSkills, promptHash, resume });

    const segment: AttemptSegment = { setup, sdkOptions, promptHash, spentUsd: 0, maxBudgetUsd: sdkOptions.maxBudgetUsd ?? null };
    const first = await runSegment(input, segment, sent, prior);
    const looped = wantsLoop(setup.config, input.ctx.request.mode) ? await continueLoop(input, segment, first) : null;
    const outcome = looped ? withLoopReport(looped.outcome, setup.run, looped.reason, looped.continuations) : first.outcome;
    addCriticCost(outcome, setup.run.criticCostUsd);
    if (!signal.aborted) await attachFinalCheck(outcome, { preview: options.preview, ctx: input.ctx, run: setup.run, toolOrder: setup.run.log?.toolOrder ?? first.state.toolOrder, runsDir: input.runsDir, runId: input.runId });
    return { sawInit: first.state.sawInit, outcome };
  }

  return async (input) => {
    const parts = await buildUserMessageParts(input.ctx);
    const resume = input.ctx.direction.sessionId;
    if (!resume) return (await attempt(input, parts, null)).outcome;
    try {
      const first = await attempt(input, parts, resume);
      if (first.outcome.status !== 'failed' || first.sawInit || input.signal.aborted) return first.outcome;
      console.warn(`[agent] resume of session ${resume} failed before init (${first.outcome.error ?? 'no error'}); retrying without resume`);
    } catch (error) {
      if (input.signal.aborted) throw error;
      console.warn(`[agent] resume of session ${resume} threw (${error instanceof Error ? error.message : String(error)}); retrying without resume`);
    }
    return (await attempt(input, parts, null)).outcome;
  };
}
