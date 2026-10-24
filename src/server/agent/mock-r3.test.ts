import { readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { RunRequest, RunSummary, SelectionContext, StudioEvent } from '../../shared/contracts.js';
import type { AgentRunContext, ServerConfig } from '../types.js';
import { createAgentRunner } from './index.js';
import { MOCK_BASH_OUTPUT } from './mock.js';
import { PLAN_MODE_DENY } from './permissions.js';
import { createFakeBus, createFakePreview, createFakeProjects, createFakeVersions, createTempProject } from './test-fakes.js';

const roots: string[] = [];

afterEach(async () => {
  while (roots.length) await rm(roots.pop() as string, { recursive: true, force: true });
});

async function setup(kind: 'html' | 'react' = 'html') {
  const temp = await createTempProject(kind);
  roots.push(temp.root);
  const bus = createFakeBus();
  const projects = createFakeProjects(temp.project, temp.root);
  const versions = createFakeVersions();
  const config: ServerConfig = {
    dataDir: temp.root,
    projectsDir: `${temp.root} projects`,
    studioPort: 0,
    previewPort: 0,
    vitePortBase: 0,
    studioToken: 't',
    agentMode: 'mock',
    studioOrigin: '',
    previewOrigin: '',
  };
  const runner = createAgentRunner({ config, bus, projects, versions, preview: createFakePreview() });
  function context(request: RunRequest): AgentRunContext {
    const project = structuredClone(projects.current);
    const direction = project.directions[0];
    if (!direction) throw new Error('missing direction');
    return { project, direction, request, attachments: [], designMd: null, previewUrl: null };
  }
  return { ...temp, bus, projects, versions, runner, context };
}

function types(events: StudioEvent[]): string[] {
  return events.map((event) => event.type);
}

async function readRunFiles(projectDir: string, runId: string) {
  const lines = (await readFile(path.join(projectDir, 'runs', `${runId}.jsonl`), 'utf8')).trim().split('\n');
  const summary = JSON.parse(await readFile(path.join(projectDir, 'runs', `${runId}.json`), 'utf8')) as RunSummary;
  const parsed = lines.map((line) => JSON.parse(line) as StudioEvent | { type: 'run.sent' });
  return { events: parsed.filter((line): line is StudioEvent => line.type !== 'run.sent'), summary };
}

describe('mock agent run, Round 3', () => {
  it('stores thinking, tools and text in event order, with both thinking blocks', async () => {
    const env = await setup();
    const handle = env.runner.start(env.context({ prompt: 'Order probe [think]', mode: 'edit', level: 'wireframe' }));
    const summary = await handle.done;
    const kinds = (summary.parts ?? []).map((part) => (part.kind === 'tool' ? `tool:${summary.toolCalls.find((t) => t.toolUseId === part.toolUseId)?.name}` : part.kind));
    expect(kinds.slice(0, 4)).toEqual(['thinking', 'tool:Read', 'thinking', 'text']);
    const thinking = (summary.parts ?? []).filter((part) => part.kind === 'thinking');
    expect(thinking.map((part) => (part.kind === 'thinking' ? part.text : ''))).toEqual(['Thinking A: the page needs a clear heading first.', 'Thinking B: keep the cards, then write the change.']);
    const saved = await readRunFiles(env.projects.projectDir('p1'), handle.runId);
    expect(saved.summary.parts).toEqual(summary.parts);
  });

  it('gives a one-line edit a +1 -1 diff with the exact old and new line', async () => {
    const env = await setup();
    await env.runner.start(env.context({ prompt: 'Old Title', mode: 'edit', level: 'wireframe' })).done;
    const summary = await env.runner.start(env.context({ prompt: 'New Title [edit1]', mode: 'edit', level: 'wireframe' })).done;
    const edit = summary.toolCalls.find((tool) => tool.name === 'Edit');
    expect(edit?.diff).toMatchObject({ path: 'index.html', added: 1, removed: 1, created: false });
    const changed = edit?.diff?.hunks.flatMap((hunk) => hunk.lines.filter((line) => line.kind !== 'same'));
    expect(changed).toEqual([
      { kind: 'del', text: '    <h1>Old Title</h1>' },
      { kind: 'add', text: '    <h1>New Title</h1>' },
    ]);
    const finished = env.bus.events.find((event) => event.type === 'run.tool.finished' && event.runId === summary.id && event.toolUseId === edit?.toolUseId);
    expect(finished?.type === 'run.tool.finished' ? finished.diff?.added : null).toBe(1);
  });

  it('delivers a queued message at the next tool boundary, before tool 3', async () => {
    const env = await setup();
    await env.runner.start(env.context({ prompt: 'Base page', mode: 'edit', level: 'wireframe' })).done;
    const handle = env.runner.start(env.context({ prompt: 'Look around [steps]', mode: 'edit', level: 'wireframe' }));
    await waitUntil(() => env.bus.events.some((event) => event.type === 'run.tool.started' && event.runId === handle.runId));
    expect(handle.setQueue?.([{ id: 'q1', text: 'Use a serif heading' }])).toBe(true);
    const summary = await handle.done;
    const runEvents = env.bus.events.filter((event) => 'runId' in event && event.runId === handle.runId);
    const delivered = runEvents.findIndex((event) => event.type === 'run.user');
    const thirdTool = runEvents.filter((event) => event.type === 'run.tool.started')[2];
    expect(delivered).toBeGreaterThan(-1);
    expect(delivered).toBeLessThan(runEvents.indexOf(thirdTool!));
    const lines = (await readFile(path.join(env.projects.projectDir('p1'), 'runs', `${handle.runId}.jsonl`), 'utf8')).trim().split('\n').map((line) => JSON.parse(line) as { type: string; text?: string });
    expect(lines.some((line) => line.type === 'run.sent' && line.text?.includes('Use a serif heading'))).toBe(true);
    expect(summary.parts?.some((part) => part.kind === 'user' && part.text === 'Use a serif heading')).toBe(true);
    expect(handle.next?.()).toBeNull();
  });

  it('keeps a message queued after the last tool for the next run, and steer stops the run', async () => {
    const env = await setup();
    const handle = env.runner.start(env.context({ prompt: 'Steer me [steps]', mode: 'edit', level: 'wireframe' }));
    await waitUntil(() => env.bus.events.some((event) => event.type === 'run.tool.started' && event.runId === handle.runId));
    const stopAsked = Date.now();
    expect(handle.steer?.('Make it blue instead')).toBe(true);
    const summary = await handle.done;
    expect(Date.now() - stopAsked).toBeLessThan(500);
    expect(summary.status).toBe('canceled');
    expect(handle.next?.()).toEqual({ text: 'Make it blue instead', reason: 'steer' });
  });

  it('asks before Bash; a deny with a note reaches the agent and no command runs', async () => {
    const env = await setup();
    const handle = env.runner.start(env.context({ prompt: 'Test it [bash]', mode: 'edit', level: 'wireframe' }));
    await waitUntil(() => env.bus.events.some((event) => event.type === 'run.permission'));
    const asked = env.bus.events.find((event) => event.type === 'run.permission');
    if (asked?.type !== 'run.permission') throw new Error('no permission event');
    expect(asked.request).toMatchObject({ toolName: 'Bash', detail: 'npm test' });
    expect(handle.answer?.(asked.request.id, { allow: false, note: 'use npm' })).toBe(true);
    const summary = await handle.done;
    const bash = summary.toolCalls.find((tool) => tool.name === 'Bash');
    expect(bash?.isError).toBe(true);
    expect(bash?.summary).toContain('use npm');
    const lines = (await readFile(path.join(env.projects.projectDir('p1'), 'runs', `${handle.runId}.jsonl`), 'utf8')).trim().split('\n').map((line) => JSON.parse(line) as { type: string; text?: string });
    expect(lines.some((line) => line.type === 'run.sent' && line.text?.includes('use npm'))).toBe(true);
    await expect(readFile(path.join(env.workTree, MOCK_BASH_OUTPUT), 'utf8')).rejects.toThrow();
  });

  it('a stop while a prompt is open answers it as a deny', async () => {
    const env = await setup();
    const ctx = env.context({ prompt: 'Test it [bash]', mode: 'edit', level: 'wireframe' });
    const handle = env.runner.start(ctx);
    await waitUntil(() => env.bus.events.some((event) => event.type === 'run.permission'));
    handle.cancel();
    expect(env.bus.events.some((event) => event.type === 'run.stopping' && event.runId === handle.runId)).toBe(true);
    expect(env.runner.stopping?.(ctx.project.id, ctx.direction.id)).toBe(handle.done);
    const summary = await handle.done;
    expect(summary.status).toBe('canceled');
    expect(env.runner.stopping?.(ctx.project.id, ctx.direction.id)).toBeNull();
    expect(env.bus.events.some((event) => event.type === 'run.permission.resolved' && !event.allow)).toBe(true);
    await expect(readFile(path.join(env.workTree, MOCK_BASH_OUTPUT), 'utf8')).rejects.toThrow();
  });

  it('plan mode refuses a write and leaves the files as they are', async () => {
    const env = await setup();
    await env.runner.start(env.context({ prompt: 'Base page', mode: 'edit', level: 'wireframe' })).done;
    const before = await readFile(path.join(env.workTree, 'index.html'), 'utf8');
    const summary = await env.runner.start(env.context({ prompt: 'New hero', mode: 'edit', plan: true })).done;
    const write = summary.toolCalls.find((tool) => tool.name === 'Write');
    expect(write?.isError).toBe(true);
    expect(write?.summary).toBe(PLAN_MODE_DENY);
    expect(await readFile(path.join(env.workTree, 'index.html'), 'utf8')).toBe(before);
    expect(summary.finalText).toMatch(/^Plan:/);
  });
});

async function waitUntil(check: () => boolean, ms = 5000): Promise<void> {
  const deadline = Date.now() + ms;
  while (!check()) {
    if (Date.now() > deadline) throw new Error('timed out');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
