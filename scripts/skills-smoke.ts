import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { query, type Options, type SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { DEFAULT_PREVIEW_PORT, type RunRequest, type RunSummary } from '../src/shared/contracts.js';
import type { AgentRunContext } from '../src/server/types.js';
import { createRunLifecycle } from '../src/server/agent/lifecycle.js';
import { createSdkDriver } from '../src/server/agent/sdk-driver.js';
import type { PreparedSkills } from '../src/server/agent/skills.js';
import { createFakeBus, createFakePreview, createFakeProjects, createFakeVersions, createTempProject } from '../src/server/agent/test-fakes.js';

const MODEL = process.env['SMOKE_MODEL'] ?? 'claude-haiku-5-5';
const SKILL = process.env['SMOKE_SKILL'] ?? 'personal:example-skill';
const OUT = path.resolve('verification', 'skills-smoke.json');
const MANUAL_SKILL = process.env['SMOKE_MANUAL_SKILL'] ?? 'personal:example-manual-skill';
const CLI_BUILTIN_SKILLS = ['design', 'doctor'];
const userSkillCount = async () => {
  const { discoverSkills } = await import('../src/server/agent/skills.js');
  return (await discoverSkills()).skills.length;
};

type InitMessage = Extract<SDKMessage, { type: 'system'; subtype: 'init' }>;

interface Capture {
  init: InitMessage | null;
  memoryFiles: unknown;
  hookEvents: string[];
  skillCalls: unknown[];
  skillIds: Set<string>;
  skillResults: { isError: boolean; text: string }[];
  hookDecisions: string[];
  canUseToolDecisions: string[];
  prepared: PreparedSkills | null;
  options: Partial<Options>;
}

function recordSkillCalls(message: SDKMessage, capture: Capture): void {
  if (message.type !== 'assistant') return;
  for (const block of message.message.content) {
    if (block.type !== 'tool_use' || block.name !== 'Skill') continue;
    capture.skillCalls.push(block.input);
    capture.skillIds.add(block.id);
  }
}

function recordSkillResults(message: SDKMessage, capture: Capture): void {
  if (message.type !== 'user' || typeof message.message.content === 'string') return;
  for (const block of message.message.content) {
    if (block.type !== 'tool_result' || !capture.skillIds.has(block.tool_use_id)) continue;
    capture.skillResults.push({ isError: block.is_error === true, text: JSON.stringify(block.content).slice(0, 300) });
  }
}

async function recordMessage(message: SDKMessage, capture: Capture, handle: ReturnType<typeof query>): Promise<void> {
  if (message.type === 'system' && message.subtype === 'init') {
    capture.init = message;
    capture.memoryFiles = await handle.getContextUsage({ detail: 'summary' }).then((usage) => usage.memoryFiles, (error: unknown) => `unavailable: ${String(error)}`);
  }
  if (message.type === 'system' && String(message.subtype).startsWith('hook_')) capture.hookEvents.push(JSON.stringify(message).slice(0, 300));
  recordSkillCalls(message, capture);
  recordSkillResults(message, capture);
}

function captureQuery(capture: Capture): typeof query {
  return (params) => {
    const options = { ...params.options, includeHookEvents: true };
    capture.options = { plugins: options.plugins, skills: options.skills, settingSources: options.settingSources, settings: options.settings, tools: options.tools };
    const handle = query({ ...params, options });
    const wrapped = (async function* () {
      for await (const message of handle) {
        await recordMessage(message, capture, handle);
        yield message;
      }
    })();
    return Object.assign(wrapped, { close: () => handle.close() }) as unknown as ReturnType<typeof query>;
  };
}

async function runOnce(label: string, disabledAll: boolean, prompt: string, mode: RunRequest['mode'], budget: number) {
  const temp = await createTempProject('html', { model: MODEL, maxBudgetUsd: budget, maxTurns: 12 });
  const capture: Capture = { init: null, memoryFiles: null, hookEvents: [], skillCalls: [], skillIds: new Set(), skillResults: [], hookDecisions: [], canUseToolDecisions: [], prepared: null, options: {} };
  const skillsRoot = path.join(temp.root, 'skills-plugins');
  if (disabledAll) {
    const { discoverSkills } = await import('../src/server/agent/skills.js');
    temp.project.settings.disabledSkills = (await discoverSkills()).skills.map((skill) => skill.id);
  }
  const projects = createFakeProjects(temp.project, temp.root);
  const bus = createFakeBus();
  const driver = createSdkDriver({
    preview: createFakePreview(),
    queryFn: captureQuery(capture),
    skillsRoot,
    onSkills: (prepared) => {
      capture.prepared = prepared;
    },
    onHookDecision: (tool, result) => {
      capture.hookDecisions.push(`${tool} -> ${result.behavior}${result.behavior === 'deny' ? ` (${result.message})` : ''}`);
    },
    onPermission: (tool, result) => {
      capture.canUseToolDecisions.push(`${tool} -> ${result.behavior}`);
    },
  });
  const runner = createRunLifecycle({ bus, projects, versions: createFakeVersions() }, driver);
  const project = structuredClone(projects.current);
  const direction = project.directions[0];
  if (!direction) throw new Error('missing direction');
  const ctx: AgentRunContext = { project, direction, request: { prompt, mode }, attachments: [], designMd: null, previewUrl: `http://127.0.0.1:${DEFAULT_PREVIEW_PORT}/fake/` };
  const summary: RunSummary = await runner.start(ctx).done;
  return report(label, capture, summary);
}

function report(label: string, capture: Capture, summary: RunSummary) {
  const init = capture.init;
  const expected = capture.prepared?.enabled ?? [];
  const listed = init?.skills ?? [];
  return {
    label,
    status: summary.status,
    error: summary.error,
    costUsd: summary.costUsd,
    toolCalls: summary.toolCalls.map((call) => call.name),
    skillToolCalls: capture.skillCalls,
    skillToolResults: capture.skillResults,
    hookDecisions: capture.hookDecisions,
    canUseToolDecisions: capture.canUseToolDecisions,
    prompt: summary.request.prompt,
    usedSkillTool: capture.skillCalls.length > 0,
    options: capture.options,
    discovered: capture.prepared ? { skills: capture.prepared.catalog.skills.length, problems: capture.prepared.catalog.problems } : null,
    expectedSkills: expected,
    init: init && {
      skills: listed,
      skillCount: listed.length,
      plugins: init.plugins,
      plugin_errors: init.plugin_errors ?? [],
      mcp_servers: init.mcp_servers,
      tools: init.tools,
      agents: init.agents ?? [],
      slash_commands: init.slash_commands,
      apiKeySource: init.apiKeySource,
    },
    memoryFiles: capture.memoryFiles,
    hookEvents: capture.hookEvents,
    checks: init && {
      onlyExpectedSkills: listed.every((name) => expected.includes(name) || CLI_BUILTIN_SKILLS.includes(name)),
      missingSkills: expected.filter((name) => !listed.includes(name)),
      extraSkills: listed.filter((name) => !expected.includes(name) && !CLI_BUILTIN_SKILLS.includes(name)),
      cliBuiltinSkills: listed.filter((name) => CLI_BUILTIN_SKILLS.includes(name)),
      userSkillsListed: listed.filter((name) => expected.includes(name)).length,
      mcpServersOnlyStudio: init.mcp_servers.every((server) => server.name === 'studio'),
      noPluginErrors: (init.plugin_errors ?? []).length === 0,
      onlyCliBuiltinAgents: (init.agents ?? []).every((agent) => ['claude', 'claude-code-guide', 'general-purpose', 'statusline-setup', 'Explore', 'Plan'].includes(agent)),
      agentToolOffered: init.tools.includes('Agent'),
      noHookEvents: capture.hookEvents.length === 0,
      onlyStudioPlugins: init.plugins.every((plugin) => plugin.path.includes('skills-plugins') || plugin.path === 'builtin'),
      noMemoryFiles: Array.isArray(capture.memoryFiles) && capture.memoryFiles.length === 0,
      skillToolOffered: init.tools.includes('Skill'),
    },
  };
}

async function main(): Promise<void> {
  const offOnly = process.argv.includes('--off-only');
  const on = offOnly ? null : await runOnce(
    'skills-on',
    false,
    `Create a one-section landing page for a neighborhood bakery. First load the ${SKILL} skill with the Skill tool and follow it for the type scale.`,
    'edit',
    0.3,
  );
  const manual = offOnly
    ? null
    : await runOnce('manual-only-skill', false, `Load the ${MANUAL_SKILL} skill with the Skill tool, then reply with one sentence. Do not use other tools.`, 'critique', 0.1);
  const off = await runOnce('skills-off', true, 'In one sentence, say what this empty project is. Do not use tools.', 'critique', 0.1);
  if (!on) {
    console.log(JSON.stringify({ off: { ...off.checks, skills: off.init?.skills, plugins: off.init?.plugins.map((p) => p.name), cost: off.costUsd } }, null, 2));
    return;
  }
  const result = { model: MODEL, ranAt: new Date().toISOString(), discoveredOnDisk: await userSkillCount(), totalCostUsd: on.costUsd + (manual?.costUsd ?? 0) + off.costUsd, runs: [on, manual, off] };
  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ manual: manual && { calls: manual.skillToolCalls, results: manual.skillToolResults, hooks: manual.hookDecisions, cost: manual.costUsd }, onHooks: on.hookDecisions, onCanUse: on.canUseToolDecisions, total: result.totalCostUsd, on: { ...on.checks, count: on.init?.skillCount, used: on.usedSkillTool, status: on.status }, off: { ...off.checks, count: off.init?.skillCount, status: off.status } }, null, 2));
}

main().catch((error: unknown) => {
  console.error('[skills-smoke] crashed', error);
  process.exitCode = 1;
});
