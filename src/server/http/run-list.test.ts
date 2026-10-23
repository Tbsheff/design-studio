import { describe, expect, it } from 'vitest';
import { isRunSummary } from './app.js';

describe('run list filter', () => {
  it('keeps run summaries', () => {
    expect(isRunSummary({ id: 'r1', status: 'completed', request: { prompt: 'x' } })).toBe(true);
  });

  it('drops render_check result files and other JSON in the runs folder', () => {
    expect(isRunSummary([{ viewport: 'desktop', findings: [] }])).toBe(false);
    expect(isRunSummary({ ranBy: 'studio', errors: 0 })).toBe(false);
    expect(isRunSummary(null)).toBe(false);
  });
});
