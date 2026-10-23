import { describe, expect, it } from 'vitest';
import { runNotice } from './notify.js';

const run = { runId: 'r1', projectId: 'p1', directionId: 'main', prompt: 'Make the hero calmer and add a menu section with prices for every item on the board' };

describe('runNotice', () => {
  it('stays quiet while a studio window has focus, and for canceled runs', () => {
    expect(runNotice({ run, status: 'completed', costUsd: 0.1, error: null }, 'Cafe', true)).toBeNull();
    expect(runNotice({ run, status: 'canceled', costUsd: 0.1, error: null }, 'Cafe', false)).toBeNull();
  });

  it('names the project and a short prompt for a finished run', () => {
    const notice = runNotice({ run, status: 'completed', costUsd: 0.1, error: null }, 'Cafe', false);
    expect(notice?.title).toBe('Run finished');
    expect(notice?.body.startsWith('Cafe: Make the hero calmer')).toBe(true);
    expect(notice?.body.length).toBeLessThanOrEqual('Cafe: '.length + 80);
  });

  it('shows the error for a failed run and the budget for a stopped one', () => {
    expect(runNotice({ run, status: 'failed', costUsd: 0, error: 'claude exited 1' }, null, false)).toMatchObject({ title: 'Run failed', body: 'Design Studio: claude exited 1' });
    expect(runNotice({ run, status: 'budget_exceeded', costUsd: 0.5, error: null }, 'Cafe', false)?.title).toBe('Run stopped at the budget limit');
  });
});
