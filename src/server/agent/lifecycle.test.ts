import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { StudioEvent, TelemetrySample } from '../../shared/contracts.js';
import type { AgentRunContext } from '../types.js';
import { createRunLifecycle, DELTA_FLUSH_CHARS, DELTA_FLUSH_MS, type DriverSink, type RunDriver } from './lifecycle.js';
import { createFakeBus, createFakeProjects, createFakeVersions, createTempProject } from './test-fakes.js';

const roots: string[] = [];

afterEach(async () => {
  while (roots.length) await rm(roots.pop() as string, { recursive: true, force: true });
});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runWith(script: (sink: DriverSink) => Promise<void>) {
  const temp = await createTempProject('html');
  roots.push(temp.root);
  const projects = createFakeProjects(temp.project, temp.root);
  const bus = createFakeBus();
  const driver: RunDriver = async ({ sink }) => {
    await script(sink);
    return { status: 'completed', usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }, costUsd: 0, durationMs: 1, modelMs: 0, finalText: 'done', error: null };
  };
  const runner = createRunLifecycle({ bus, projects, versions: createFakeVersions() }, driver);
  const project = structuredClone(projects.current);
  const direction = project.directions[0];
  if (!direction) throw new Error('missing direction');
  const ctx: AgentRunContext = { project, direction, request: { prompt: 'x', mode: 'critique' }, attachments: [], designMd: null, previewUrl: null };
  const summary = await runner.start(ctx).done;
  const lines = (await readFile(path.join(projects.projectDir('p1'), 'runs', `${summary.id}.jsonl`), 'utf8')).trim().split('\n');
  const logged = lines.map((line) => JSON.parse(line) as { type: string; text?: string; seq?: number });
  const telemetryFile = path.join(projects.projectDir('p1'), 'telemetry.jsonl');
  const telemetry = (await readFile(telemetryFile, 'utf8').catch(() => ''))
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as TelemetrySample);
  return { events: bus.events, logged, telemetry, runId: summary.id };
}

function deltas(events: StudioEvent[]): string[] {
  return events.flatMap((event) => (event.type === 'run.text.delta' ? [event.text] : []));
}

describe('run text delta coalescing', () => {
  it('sends the first delta at once, merges the burst after it, and flushes before any other event', async () => {
    const words = Array.from({ length: 200 }, (_, index) => `w${index} `);
    const { events, logged } = await runWith(async (sink) => {
      for (const word of words) sink.textDelta(word);
      sink.toolStarted('t1', 'Read', { file_path: 'index.html' });
      sink.textDelta('after ');
      sink.textDelta('tool');
      sink.text(`${words.join('')}after tool`);
    });
    expect(deltas(events)).toEqual(['w0 ', words.slice(1).join(''), 'after ', 'tool']);
    const types = events.map((event) => event.type);
    expect(types).toEqual(['run.started', 'run.text.delta', 'run.text.delta', 'run.tool.started', 'run.text.delta', 'run.text.delta', 'run.text', 'status.changed', 'run.finished']);
    expect(logged.filter((line) => line.type !== 'run.sent').map((line) => line.type)).toEqual(types);
  });

  it('flushes a pending delta every window and when the buffer reaches the size cap', async () => {
    const big = 'x'.repeat(DELTA_FLUSH_CHARS);
    const { events } = await runWith(async (sink) => {
      sink.textDelta('a');
      sink.textDelta('b');
      await wait(DELTA_FLUSH_MS * 3);
      sink.textDelta('c');
      sink.textDelta(big);
      sink.textDelta('d');
      await wait(DELTA_FLUSH_MS * 3);
    });
    expect(deltas(events)).toEqual(['a', 'b', 'c', big, 'd']);
  });

  it('writes pending text before the sent record and before the run ends, and joins to the full text', async () => {
    const { events, logged } = await runWith(async (sink) => {
      sink.textDelta('one ');
      sink.textDelta('two ');
      sink.sent({ text: 'continue', imageCount: 0, updatedInstructions: false, recommendedSkills: [], promptHash: 'h', resume: null });
      sink.textDelta('three ');
      sink.textDelta('four');
    });
    expect(deltas(events).join('')).toBe('one two three four');
    const order = logged.map((line) => (line.type === 'run.text.delta' ? `delta:${line.text}` : line.type));
    expect(order).toEqual(['run.started', 'delta:one ', 'delta:two ', 'run.sent', 'delta:three ', 'delta:four', 'status.changed', 'run.finished']);
    await wait(DELTA_FLUSH_MS * 2);
    expect(events.at(-1)?.type).toBe('run.finished');
  });
});

describe('run first token telemetry', () => {
  it('records one run.first_token sample at the first text or thinking delta', async () => {
    const { telemetry, runId } = await runWith(async (sink) => {
      await wait(30);
      sink.thinkingDelta('plan ');
      sink.textDelta('hello ');
      sink.textDelta('world');
      sink.text('hello world');
    });
    const samples = telemetry.filter((sample) => sample.kind === 'run.first_token');
    expect(samples).toHaveLength(1);
    expect(samples[0]?.detail).toEqual({ runId, stage: 'server' });
    expect(samples[0]?.ms).toBeGreaterThanOrEqual(25);
  });

  it('records nothing when the run sends no delta', async () => {
    const { telemetry } = await runWith(async (sink) => sink.text('done'));
    expect(telemetry.filter((sample) => sample.kind === 'run.first_token')).toEqual([]);
  });
});
