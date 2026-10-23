import { readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { RunRequest, RunSummary, SelectionContext, StudioEvent } from '../../shared/contracts.js';
import type { AgentRunContext, ServerConfig } from '../types.js';
import { createAgentRunner } from './index.js';
import { createFakeBus, createFakePreview, createFakeProjects, createFakeVersions, createTempProject } from './test-fakes.js';
import { cleanPrompt, mockSkillRequests } from './mock.js';

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

describe('mock agent run', () => {
  it('creates index.html, commits, and persists events', async () => {
    const env = await setup();
    const handle = env.runner.start(env.context({ prompt: 'Coffee <subscription> service', mode: 'edit' }));
    const summary = await handle.done;

    expect(summary.status).toBe('completed');
    const html = await readFile(path.join(env.workTree, 'index.html'), 'utf8');
    expect(html).toContain('<h1>Coffee &lt;subscription&gt; service</h1>');
    expect(html).toContain('class="cta"');
    expect(html.match(/class="card"/g)?.length).toBe(3);

    expect(env.versions.commits).toEqual([
      { title: 'Coffee <subscription> service', meta: { kind: 'run', runId: handle.runId, prompt: 'Coffee <subscription> service', level: 'prototype' }, directionId: 'd1' },
    ]);
    expect(summary.versionId).toBe('v1');
    expect(env.projects.current.directions[0]?.headVersionId).toBe('v1');

    const eventTypes = types(env.bus.events);
    expect(eventTypes[0]).toBe('run.started');
    const firstTextAt = eventTypes.indexOf('run.text');
    const firstText = env.bus.events[firstTextAt];
    const streamed = env.bus.events.slice(0, firstTextAt).flatMap((event) => (event.type === 'run.text.delta' ? [event.text] : []));
    expect(streamed.length).toBeGreaterThanOrEqual(1);
    expect(firstText?.type === 'run.text' ? firstText.text : null).toBe(streamed.join(''));
    expect(eventTypes).toContain('run.tool.started');
    expect(eventTypes).toContain('run.tool.finished');
    expect(eventTypes.slice(-4)).toEqual(['version.created', 'direction.updated', 'status.changed', 'run.finished']);
    expect(env.bus.events.every((event) => event.projectId === 'p1' && event.directionId === 'd1')).toBe(true);

    const tool = summary.toolCalls[0];
    expect(tool?.name).toBe('Write');
    expect(tool?.finishedAt).not.toBeNull();
    expect(summary.costUsd).toBe(0);
    expect(summary.usage.inputTokens).toBeGreaterThan(0);

    const persisted = await readRunFiles(env.projects.projectDir('p1'), handle.runId);
    expect(persisted.events.map((event) => event.seq)).toEqual(env.bus.events.map((event) => event.seq));
    expect(persisted.summary.status).toBe('completed');
    expect(persisted.summary.versionId).toBe('v1');
  });

  it('rejects a second run on the same direction', async () => {
    const env = await setup();
    const first = env.context({ prompt: 'First', mode: 'edit' });
    expect(env.runner.isRunning(first.project.id, first.direction.id)).toBe(false);
    const handle = env.runner.start(first);
    expect(env.runner.isRunning(first.project.id, first.direction.id)).toBe(true);
    expect(env.runner.isRunning('otherProject', first.direction.id)).toBe(false);
    expect(() => env.runner.start(env.context({ prompt: 'Second', mode: 'edit' }))).toThrow('run_in_progress');
    await handle.done;
    expect(env.runner.isRunning(first.project.id, first.direction.id)).toBe(false);
    const next = env.runner.start(env.context({ prompt: 'Third', mode: 'edit' }));
    expect(env.runner.get(next.runId)).toBe(next);
    await next.done;
  });

  it('runs main directions of two projects at the same time', async () => {
    const env = await setup();
    const first = env.context({ prompt: 'First', mode: 'edit' });
    const other = env.context({ prompt: 'Other', mode: 'edit' });
    other.project.id = 'otherProject';
    expect(first.direction.id).toBe(other.direction.id);
    const handles = [env.runner.start(first), env.runner.start(other)];
    expect(env.runner.isRunning(first.project.id, first.direction.id)).toBe(true);
    expect(env.runner.isRunning('otherProject', other.direction.id)).toBe(true);
    expect(() => env.runner.start(env.context({ prompt: 'Again', mode: 'edit' }))).toThrow('run_in_progress');
    await Promise.all(handles.map((handle) => handle.done));
    expect(env.runner.isRunning('otherProject', other.direction.id)).toBe(false);
  });

  it('cancels a [slow] run without committing', async () => {
    const env = await setup();
    const handle = env.runner.start(env.context({ prompt: 'Slow page [slow]', mode: 'edit' }));
    await new Promise((resolve) => setTimeout(resolve, 600));
    handle.cancel();
    const summary = await handle.done;

    expect(summary.status).toBe('canceled');
    expect(summary.versionId).toBeNull();
    expect(env.versions.commits).toHaveLength(0);
    expect(env.versions.statusCalls).toBe(1);
    expect(types(env.bus.events)).toContain('status.changed');
    expect(types(env.bus.events)).not.toContain('version.created');
    const partial = await readFile(path.join(env.workTree, 'index.html'), 'utf8');
    expect(partial.length).toBeGreaterThan(0);
    expect(partial).not.toContain('</html>');
    const persisted = await readRunFiles(env.projects.projectDir('p1'), handle.runId);
    expect(persisted.summary.status).toBe('canceled');
  }, 10000);

  it('marks a [fail] run as failed without committing', async () => {
    const env = await setup();
    const summary = await env.runner.start(env.context({ prompt: 'Broken [fail]', mode: 'edit' })).done;

    expect(summary.status).toBe('failed');
    expect(summary.error).toContain('Mock failure');
    expect(env.versions.commits).toHaveLength(0);
    expect(types(env.bus.events)).toContain('status.changed');
    expect(env.projects.current.directions[0]?.headVersionId).toBeNull();
  });

  it('edits only the selected element', async () => {
    const env = await setup();
    const original = [
      '<!doctype html>',
      '<html>',
      '<body>',
      '  <p class="a">First paragraph</p>',
      '  <p class="b">Second paragraph</p>',
      '  <p class="c">Third paragraph</p>',
      '</body>',
      '</html>',
      '',
    ].join('\n');
    await writeFile(path.join(env.workTree, 'index.html'), original);

    const selection: SelectionContext = {
      selector: 'p.b',
      tag: 'p',
      text: 'Second paragraph',
      outerHTML: '<p class="b">Second paragraph</p>',
      styles: {},
      rect: { x: 0, y: 0, width: 10, height: 10 },
      source: { file: 'index.html', line: 5, col: 3 },
      ancestors: ['body', 'html'],
    };

    const textRun = await env.runner.start(env.context({ prompt: 'Better copy', mode: 'edit', selection: [selection] })).done;
    expect(textRun.status).toBe('completed');
    const afterText = await readFile(path.join(env.workTree, 'index.html'), 'utf8');
    expect(afterText).toBe(original.replace('<p class="b">Second paragraph</p>', '<p class="b">Better copy</p>'));
    expect(textRun.toolCalls.map((call) => call.name)).toEqual(['Edit']);

    const colorRun = await env.runner.start(env.context({ prompt: 'make the color #c0392b', mode: 'edit', selection: [selection] })).done;
    expect(colorRun.status).toBe('completed');
    const afterColor = await readFile(path.join(env.workTree, 'index.html'), 'utf8');
    expect(afterColor).toBe(afterText.replace('<p class="b">', '<p class="b" style="color: #c0392b">'));
    expect(env.versions.commits).toHaveLength(2);
  });

  it('appends a mock-edit paragraph on a follow-up without selection', async () => {
    const env = await setup();
    await env.runner.start(env.context({ prompt: 'Landing', mode: 'edit' })).done;
    await env.runner.start(env.context({ prompt: 'Add a note', mode: 'edit' })).done;
    const html = await readFile(path.join(env.workTree, 'index.html'), 'utf8');
    expect(html).toMatch(/<p class="mock-edit">Add a note<\/p>\n<\/body>/);
  });

  it('critique emits text only and never commits', async () => {
    const env = await setup();
    const summary = await env.runner.start(env.context({ prompt: 'Review this', mode: 'critique' })).done;
    expect(summary.status).toBe('completed');
    expect(summary.toolCalls).toHaveLength(0);
    expect(summary.finalText).toContain('Critique');
    expect(env.versions.commits).toHaveLength(0);
  });

  it('react creation renders an h1 in src/App.tsx', async () => {
    const env = await setup('react');
    await env.runner.start(env.context({ prompt: 'Team dashboard', mode: 'edit' })).done;
    const app = await readFile(path.join(env.workTree, 'src', 'App.tsx'), 'utf8');
    expect(app).toContain('<h1>Team dashboard</h1>');
    await env.runner.start(env.context({ prompt: 'Ops board', mode: 'edit' })).done;
    expect(await readFile(path.join(env.workTree, 'src', 'App.tsx'), 'utf8')).toContain('<h1>Ops board</h1>');
  });
});

describe('mock skill requests', () => {
  it('reads [skill:id] tags and composer skill lines, and strips them from the page text', () => {
    const prompt = 'Bakery page [skill:personal:design-kit]\n\nUse the ctx:ctx-stats skill.\nUse the personal:design-kit skill.';
    expect(mockSkillRequests(prompt)).toEqual(['personal:design-kit', 'ctx:ctx-stats']);
    expect(cleanPrompt(prompt)).toBe('Bakery page');
  });
});

describe('mock agent levels', () => {
  it('emits the checks of each level after the edit, and records the level on the run and the version', async () => {
    const env = await setup();
    const names = async (level: 'wireframe' | 'prototype' | 'polish') => {
      const summary = await env.runner.start(env.context({ prompt: `Page ${level}`, mode: 'edit', level })).done;
      return { summary, names: summary.toolCalls.map((call) => call.name) };
    };
    const wire = await names('wireframe');
    expect(wire.names).toEqual(['Write', 'mcp__studio__render_check']);
    expect(wire.summary.level).toBe('wireframe');
    const proto = await names('prototype');
    expect(proto.names.filter((name) => name === 'mcp__studio__screenshot')).toHaveLength(2);
    const polish = await names('polish');
    expect(polish.names).toContain('mcp__studio__design_review');
    expect(polish.names.at(-1)).toBe('mcp__studio__render_check');
    expect(env.versions.commits.map((commit) => commit.meta.level)).toEqual(['wireframe', 'prototype', 'polish']);
  });
});
