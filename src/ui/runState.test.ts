import { describe, expect, it } from 'vitest';
import type { RunSummary, StudioEvent } from '../shared/contracts';
import { applyRunEvent, emptyRun, runText, shownPending, type RunMap } from './runState';

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

  it('keeps a run seeded as stopped stopped when run.started arrives late', () => {
    const seeded: RunMap = { r1: { ...emptyRun('r1', 'd', 1), status: 'canceled' } };
    const live = applyRunEvent(seeded, ev({ type: 'run.started', request: { prompt: 'x', mode: 'edit' } }));
    expect(live.r1?.status).toBe('canceled');
    expect(live.r1?.request?.prompt).toBe('x');
  });
});

describe('shownPending', () => {
  const request = { prompt: 'Make it blue', mode: 'edit' as const };
  const pending = emptyRun('pending-1', 'main', 10_000, request);

  it('shows the pending send until a run with the same prompt starts in the direction', () => {
    expect(shownPending(pending, [], 'main')).toBe(pending);
    expect(shownPending(pending, [emptyRun('old', 'main', 2_000, request)], 'main')).toBe(pending);
    expect(shownPending(pending, [emptyRun('other', 'main', 10_050, { prompt: 'Other', mode: 'edit' })], 'main')).toBe(pending);
    expect(shownPending(pending, [emptyRun('r1', 'main', 10_050, request)], 'main')).toBeNull();
    expect(shownPending(pending, [emptyRun('r1', 'main', 9_500, request)], 'main')).toBeNull();
  });

  it('hides the pending send in another direction or when there is none', () => {
    expect(shownPending(pending, [], 'alt')).toBeNull();
    expect(shownPending(null, [], 'main')).toBeNull();
  });
});
