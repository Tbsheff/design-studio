import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from './contracts';
import { LEVEL_PRESETS, levelOf, resolveRunConfig, WIREFRAME_MODEL } from './run-levels';

describe('run level presets', () => {
  it('runs wireframe on Haiku with no spending limit by default, no skills, structure-only taste and errors-only checks', () => {
    const config = resolveRunConfig(DEFAULT_SETTINGS, 'wireframe');
    expect(config).toMatchObject({ level: 'wireframe', model: WIREFRAME_MODEL, maxBudgetUsd: null, agentBudgetUsd: null, maxTurns: 12, criticModel: null });
    expect(config.preset.skills).toBe(false);
    expect(config.preset.tasteAreas).toEqual(['layout', 'behavior']);
    expect(config.preset.checks).toMatchObject({ quality: false, screenshots: false, critic: false, placeholder: 'off' });
  });

  it('keeps prototype on the project model with tool checks and one loop', () => {
    const config = resolveRunConfig(DEFAULT_SETTINGS, 'prototype');
    expect(config).toMatchObject({ model: 'claude-sonnet-5-5', maxBudgetUsd: null, agentBudgetUsd: null, maxTurns: 30, criticModel: null });
    expect(config.preset.checks).toMatchObject({ viewports: ['desktop', 'mobile'], quality: true, screenshots: true, placeholder: 'medium', fixLoops: 1 });
  });

  it('gives polish three sizes, a critic, three loops, and keeps the critic reserve out of the agent budget when a limit is set', () => {
    const config = resolveRunConfig(DEFAULT_SETTINGS, 'polish');
    expect(config).toMatchObject({ model: 'claude-sonnet-5-5', maxBudgetUsd: null, agentBudgetUsd: null, maxTurns: 40, criticModel: 'claude-sonnet-5-5' });
    expect(resolveRunConfig({ ...DEFAULT_SETTINGS, maxBudgetUsd: 1.5 }, 'polish')).toMatchObject({ maxBudgetUsd: 1.5, agentBudgetUsd: 1.2 });
    expect(config.preset.checks).toMatchObject({ viewports: ['desktop', 'tablet', 'mobile'], critic: true, fixLoops: 3, placeholder: 'high' });
  });

  it('uses an Opus project model for polish and its critic, never for wireframe', () => {
    const settings = { ...DEFAULT_SETTINGS, model: 'claude-opus-5-5' };
    expect(resolveRunConfig(settings, 'polish')).toMatchObject({ model: 'claude-opus-5-5', criticModel: 'claude-opus-5-5' });
    expect(resolveRunConfig(settings, 'wireframe').model).toBe(WIREFRAME_MODEL);
  });

  it('uses the project spending limit as the run limit at every level, and the turn setting as a ceiling', () => {
    const settings = { ...DEFAULT_SETTINGS, maxBudgetUsd: 0.5, maxTurns: 10 };
    expect(resolveRunConfig(settings, 'polish')).toMatchObject({ maxBudgetUsd: 0.5, agentBudgetUsd: 0.2, maxTurns: 10 });
    expect(resolveRunConfig(settings, 'wireframe')).toMatchObject({ maxBudgetUsd: 0.5, agentBudgetUsd: 0.5, maxTurns: 10 });
  });

  it('has no spending limit by default and keeps the preset turn limits as runaway guards', () => {
    expect(DEFAULT_SETTINGS.maxBudgetUsd).toBeNull();
    expect(Object.fromEntries(Object.entries(LEVEL_PRESETS).map(([level, preset]) => [level, preset.maxTurns]))).toEqual({ wireframe: 12, prototype: 30, polish: 40 });
    for (const preset of Object.values(LEVEL_PRESETS)) {
      expect(preset).not.toHaveProperty('maxBudgetUsd');
      expect(preset.hint).toMatch(/usually ~\$/);
      expect(preset.hint).not.toMatch(/\bcap\b|up to \$/i);
    }
  });

  it('takes the request level first, then the project default, then prototype', () => {
    expect(levelOf({ level: 'polish' }, { defaultLevel: 'wireframe' })).toBe('polish');
    expect(levelOf({}, { defaultLevel: 'wireframe' })).toBe('wireframe');
    expect(levelOf({})).toBe('prototype');
  });

  it('has a label and a cost hint for every level', () => {
    for (const preset of Object.values(LEVEL_PRESETS)) {
      expect(preset.label).toBeTruthy();
      expect(preset.hint).toMatch(/\$/);
    }
  });
});
