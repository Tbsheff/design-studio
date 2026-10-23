import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../../shared/contracts.js';
import { resolveRunConfig } from '../../shared/run-levels.js';
import { buildRunLevelBlock, withRunLevel } from './run-level.js';

const block = (level: 'wireframe' | 'prototype' | 'polish', mode: 'edit' | 'critique' = 'edit', maxBudgetUsd: number | null = null) => buildRunLevelBlock(resolveRunConfig({ ...DEFAULT_SETTINGS, maxBudgetUsd }, level), mode);

describe('run-level block', () => {
  it('tells a wireframe run to stay grayscale and structural, skip skills and screenshots, and use layout and behavior taste only', () => {
    const text = block('wireframe');
    expect(text).toMatch(/^<run-level>\nLevel: WIREFRAME/);
    for (const part of ['grayscale', 'system font stack', 'No images', 'do NOT call the Skill tool', 'layout and behavior areas', 'No screenshots']) expect(text).toContain(part);
    expect(text).toContain('No spending limit for this run; at most 12 turns.');
    expect(block('wireframe', 'edit', 0.15)).toContain('Budget for this run: $0.15, at most 12 turns.');
    expect(text).not.toContain('design_review`');
  });

  it('asks a prototype run for one loop that fixes high findings, mobile from the top first, and a mandatory final check', () => {
    const text = block('prototype');
    expect(text).toContain('screenshot` mobile from=0, then desktop from=0');
    expect(text).toContain('every HIGH finding');
    expect(text).toContain('Do 1 fix loop');
    expect(text).toContain('After your LAST edit, run render_check once more. This final check is mandatory.');
    expect(text).toContain('Stop when there are no high findings or when the fix loops above are used up.');
    expect(text).not.toMatch(/budget|20%/i);
    expect(block('prototype', 'edit', 0.6)).toContain('less than 20% is left');
    expect(text).toContain('every finding you did not fix');
    expect(text.indexOf('Call the Skill tool')).toBeLessThan(text.indexOf('Write the design'));
  });

  it('asks a polish run for three sizes, states, the critic, full fix rounds with re-shots, one layout change and the exact stop rule', () => {
    const text = block('polish');
    for (const part of ['390, 768 and 1440 px', 'hover and focus-visible', 'empty, error and loading states', 'mcp__studio__design_review', 'fix every HIGH and MEDIUM finding', 'take screenshots from=0 at mobile, tablet and desktop again', 'Do not rewrite a file', 'exactly ONE concrete layout change', 'Only one layout change per run', 'DELETE the old blocks it replaces', 'appears once per viewport, and none is dropped', 'data-studio-repeat', 'duplicate-content', 'no high and no medium findings, or after 3 fix rounds. If you stop early', 'the findings per loop']) expect(text).toContain(part);
    expect(text).not.toMatch(/budget|20%/i);
    expect(block('polish', 'edit', 1.5)).toContain('no high and no medium findings, or after 3 fix rounds, or when less than 20% of the budget is left');
  });

  it('lets a wireframe fix a high nav-mobile finding once', () => {
    expect(block('wireframe')).toContain('a high `nav-mobile` finding');
  });

  it('scopes a critique by level', () => {
    expect(block('wireframe', 'critique')).toContain('structure only');
    expect(block('polish', 'critique')).toContain('design_review');
  });

  it('puts the block before the user text', () => {
    const parts = withRunLevel({ text: 'Build it', images: [] }, resolveRunConfig(DEFAULT_SETTINGS, 'prototype'), 'edit');
    expect(parts.text).toMatch(/^<run-level>[\s\S]*<\/run-level>\n\nBuild it$/);
  });
});
