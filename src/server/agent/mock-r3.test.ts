import { readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { RunRequest, RunSummary, SelectionContext, StudioEvent } from '../../shared/contracts.js';
import type { AgentRunContext, ServerConfig } from '../types.js';
import { createAgentRunner } from './index.js';
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
});
