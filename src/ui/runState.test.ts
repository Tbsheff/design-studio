import { describe, expect, it } from 'vitest';
import type { RunSummary, StudioEvent } from '../shared/contracts';
import { applyRunEvent, runText, type RunMap } from './runState';

let seq = 0;
const ev = (body: Record<string, unknown>): StudioEvent => ({ seq: ++seq, ts: 1000 + seq, projectId: 'p', directionId: 'd', runId: 'r1', ...body }) as unknown as StudioEvent;

describe('run state', () => {
  it('keeps live thinking and order when the run finishes with an old summary', () => {
    const events = [
      ev({ type: 'run.started', request: { prompt: 'x', mode: 'edit' } }),
      ev({ type: 'run.thinking', text: 'A' }),
      ev({ type: 'run.tool.started', toolUseId: 't1', name: 'Read', input: {} }),
      ev({ type: 'run.tool.finished', toolUseId: 't1', isError: false, summary: 'Read', durationMs: 5 }),
      ev({ type: 'run.thinking', text: 'B' }),
      ev({ type: 'run.text.delta', text: 'Partial' }),
    ];
    const live = events.reduce(applyRunEvent, {} as RunMap);
    const summary = { id: 'r1', directionId: 'd', request: { prompt: 'x', mode: 'edit' }, startedAt: 1, status: 'canceled', toolCalls: [{ toolUseId: 't1', name: 'Read', input: {}, startedAt: 1, finishedAt: 6, isError: false }], finalText: '' } as unknown as RunSummary;
    const done = applyRunEvent(live, ev({ type: 'run.finished', summary }));
    expect(done.r1?.parts).toEqual([
      { kind: 'thinking', text: 'A' },
      { kind: 'tool', toolUseId: 't1' },
      { kind: 'thinking', text: 'B' },
      { kind: 'text', text: 'Partial' },
    ]);
    expect(runText(done.r1!)).toBe('Partial');
  });

  it('shows Stopped as soon as the stop is asked, and drops late stream events', () => {
    const live = [
      ev({ type: 'run.started', request: { prompt: 'x', mode: 'edit' } }),
      ev({ type: 'run.text.delta', text: 'Kept' }),
      ev({ type: 'run.queue', items: [{ id: 'q', text: 'later' }] }),
      ev({ type: 'run.stopping' }),
      ev({ type: 'run.text.delta', text: ' late' }),
      ev({ type: 'run.tool.started', toolUseId: 't9', name: 'Read', input: {} }),
    ].reduce(applyRunEvent, {} as RunMap);
    expect(live.r1?.status).toBe('canceled');
    expect(live.r1?.queue).toEqual([]);
    expect(runText(live.r1!)).toBe('Kept');
    expect(live.r1?.tools).toEqual([]);
  });
});
