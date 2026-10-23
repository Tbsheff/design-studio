import { describe, expect, it } from 'vitest';
import type { RenderCheckResult } from '../../shared/contracts.js';
import { summarizeCheck, verifiedAfterLastEdit } from './final-check.js';

describe('final check', () => {
  it('counts a run as verified only when render_check ran after the last edit', () => {
    expect(verifiedAfterLastEdit(['Write', 'mcp__studio__render_check'])).toBe(true);
    expect(verifiedAfterLastEdit(['Write', 'mcp__studio__render_check', 'Edit'])).toBe(false);
    expect(verifiedAfterLastEdit(['Write', 'mcp__studio__screenshot'])).toBe(false);
    expect(verifiedAfterLastEdit(['Read', 'Skill'])).toBe(true);
  });

  it('summarizes errors and quality severities', () => {
    const result: RenderCheckResult = {
      viewport: 'mobile', width: 390, height: 844, ok: false, consoleErrors: ['boom'], pageErrors: [], horizontalOverflow: true, layoutTotal: 1, screenshotPath: '',
      layout: [{ kind: 'clipped', severity: 'error', axis: 'x', selector: 'nav', source: null, text: '', scrollSize: 500, clientSize: 390, cutItems: [], detail: '' }],
      quality: [{ check: 'a11y', severity: 'high', viewport: 'mobile', selector: null, source: null, message: 'x' }],
    };
    expect(summarizeCheck([result], 'studio')).toEqual({ ranBy: 'studio', errors: 3, high: 1, medium: 0, low: 0 });
  });
});
