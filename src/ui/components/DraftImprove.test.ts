import { describe, expect, it } from 'vitest';
import type { RunSummary } from '../../shared/contracts';
import type { RunView } from '../runState';
import { improvePassed, improveRequest, lastImproveRun } from './DraftImprove';

const view = (task: 'design-system' | undefined, summary: Partial<RunSummary> | null = null, startedAt = 1): RunView => ({
  runId: `r${startedAt}`,
  directionId: 'main',
  request: { prompt: 'x', mode: 'edit', ...(task ? { task } : {}) },
  startedAt,
  status: summary?.status ?? 'running',
  textBlocks: [],
  pendingText: '',
  thinking: '',
  tools: [],
  summary: summary as RunSummary | null,
});

describe('Improve with AI', () => {
  it('builds a design-system run with the optional focus and never a wireframe level', () => {
    expect(improveRequest('  ', 'prototype')).toEqual({ prompt: 'Improve this design system.', mode: 'edit', task: 'design-system', level: 'prototype' });
    expect(improveRequest('Warmer neutrals', 'wireframe')).toEqual({ prompt: 'Improve this design system.\n\nFocus: Warmer neutrals', mode: 'edit', task: 'design-system', level: 'prototype' });
    expect(improveRequest('', 'polish').level).toBe('polish');
  });

  it('finds the latest improve run and says whether it passed', () => {
    const passed = view('design-system', { status: 'completed', designSystemCheck: { passed: true, problems: [], rounds: 0 } }, 1);
    const later = view(undefined, { status: 'completed' }, 2);
    expect(lastImproveRun([passed, later])).toBe(passed);
    expect(improvePassed(passed)).toBe(true);
    const failed = view('design-system', { status: 'failed', designSystemCheck: { passed: false, problems: [{ rule: 'fonts', message: 'x' }], rounds: 3 } }, 3);
    expect(lastImproveRun([passed, later, failed])).toBe(failed);
    expect(improvePassed(failed)).toBe(false);
    expect(improvePassed(null)).toBe(false);
  });
});
