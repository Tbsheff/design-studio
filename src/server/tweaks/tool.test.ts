import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TWEAKS_FILE, TWEAKS_TOOL, parseTweakCss, tweakCss, tweaksPreviewCss, type TweakControl } from '../../shared/tweaks.js';
import { withRunTask, resolveRunConfig } from '../../shared/run-levels.js';
import { DEFAULT_SETTINGS } from '../../shared/contracts.js';
import { evaluateToolUse, permittedToolNames } from '../agent/permissions.js';
import { buildRunLevelBlock } from '../agent/run-level.js';
import { runDefineTweaks } from '../agent/tools.js';
import type { AgentRunContext } from '../types.js';
import { MOCK_TWEAK_CONTROLS, withMockTweakStyles } from './mock-tweaks.js';
import { parseControls, parseTweaksText } from './schema.js';
import { readTweaksState } from './store.js';

const GAP: TweakControl = { id: 'gap', label: 'Gap', type: 'range', cssVar: '--gap', min: 0, max: 48, step: 2, unit: 'px', default: 16 };
const PAGE = '<html><head><style>:root { --gap: 16px; }\n.a { gap: var(--gap); }</style></head><body></body></html>';

let workTree = '';

function failed(result: object): boolean {
  return 'isError' in result && result.isError === true;
}

function ctx(mode: 'edit' | 'critique'): AgentRunContext {
  return { request: { prompt: 'x', mode }, direction: { workTree } } as unknown as AgentRunContext;
}

beforeEach(async () => {
  workTree = await mkdtemp(path.join(tmpdir(), 'studio-tweaks-'));
});

afterEach(async () => {
  await rm(workTree, { recursive: true, force: true });
});

describe('control validation', () => {
  it('accepts the four control types', () => {
    const parsed = parseControls([
      GAP,
      { id: 'accent', label: 'Accent', type: 'color', cssVar: '--accent', default: 'oklch(60% 0.15 250)' },
      { id: 'dense', label: 'Dense', type: 'toggle', cssVar: '--density', on: '0.75', off: '1', default: false },
      { id: 'font', label: 'Font', type: 'select', cssVar: '--font', options: [{ label: 'Sans', value: 'system-ui' }, { label: 'Serif', value: 'Georgia, serif' }], default: 'system-ui' },
    ]);
    expect(parsed.error).toBeNull();
    expect(parsed.controls).toHaveLength(4);
  });

  it.each([
    ['default out of range', [{ ...GAP, default: 99 }], 'default must be between'],
    ['min not below max', [{ ...GAP, min: 10, max: 10, default: 10 }], 'min must be less'],
    ['bad css var', [{ ...GAP, cssVar: 'gap' }], 'custom property'],
    ['duplicate ids', [GAP, { ...GAP, cssVar: '--gap2' }], 'ids must be unique'],
    ['duplicate vars', [GAP, { ...GAP, id: 'gap2' }], 'one control'],
    ['unsafe color', [{ id: 'c', label: 'C', type: 'color', cssVar: '--c', default: 'red; } body {' }], 'plain CSS value'],
    ['select default', [{ id: 's', label: 'S', type: 'select', cssVar: '--s', options: [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }], default: 'c' }], 'one of the option'],
    ['unknown field', [{ ...GAP, extra: 1 }], 'Unrecognized key'],
  ])('rejects %s', (_name, controls, message) => {
    const parsed = parseControls(controls);
    expect(parsed.controls).toBeNull();
    expect(parsed.error).toContain(message);
  });

  it('reports invalid JSON in tweaks.json', () => {
    expect(parseTweaksText('{').error).toContain('not valid JSON');
    expect(parseTweaksText('{"controls": [{"id": 1}]}').error).toContain('tweaks.json is invalid');
  });

  it('formats and parses values per type', () => {
    expect(tweakCss(GAP, 12.000001)).toBe('12px');
    expect(tweakCss(GAP, 50)).toBeNull();
    expect(parseTweakCss(GAP, '18px')).toBe(18);
    expect(parseTweakCss(GAP, '1rem')).toBeNull();
    const toggle: TweakControl = { id: 't', label: 'T', type: 'toggle', cssVar: '--t', on: 'row', off: 'column', default: false };
    expect(tweakCss(toggle, true)).toBe('row');
    expect(parseTweakCss(toggle, 'column')).toBe(false);
    expect(tweaksPreviewCss([GAP, toggle], { gap: 20, t: true })).toBe(':root {\n  --gap: 20px;\n  --t: row;\n}\n');
    expect(tweaksPreviewCss([GAP], {})).toBe('');
  });
});

describe('define_tweaks tool', () => {
  it('writes studio/tweaks.json and confirms declared and used vars', async () => {
    await writeFile(path.join(workTree, 'index.html'), PAGE);
    const result = await runDefineTweaks({ ctx: ctx('edit') }, [GAP]);
    expect(failed(result)).toBe(false);
    expect(result.content[0]?.text).toContain('Every cssVar is declared');
    const saved = JSON.parse(await readFile(path.join(workTree, TWEAKS_FILE), 'utf8')) as { controls: TweakControl[] };
    expect(saved.controls).toEqual([GAP]);
    expect((await readTweaksState(workTree)).current).toEqual({ gap: 16 });
  });

  it('saves but lists vars that are not declared or not used', async () => {
    await writeFile(path.join(workTree, 'index.html'), '<html><head><style>.a { color: var(--accent); }</style></head></html>');
    const result = await runDefineTweaks({ ctx: ctx('edit') }, [GAP, { id: 'accent', label: 'Accent', type: 'color', cssVar: '--accent', default: '#000' }]);
    const text = result.content[0]?.text ?? '';
    expect(text).toContain('--gap (Gap) is not declared');
    expect(text).toContain('--gap (Gap) is never used');
    expect(text).toContain('--accent (Accent) is not declared');
    expect(text).not.toContain('--accent (Accent) is never used');
    expect((await readTweaksState(workTree)).problems).toHaveLength(3);
  });

  it('rejects invalid controls without writing and is off in critique runs', async () => {
    const bad = await runDefineTweaks({ ctx: ctx('edit') }, [{ ...GAP, default: -1 }]);
    expect(failed(bad)).toBe(true);
    const critique = await runDefineTweaks({ ctx: ctx('critique') }, [GAP]);
    expect(failed(critique)).toBe(true);
    await expect(readFile(path.join(workTree, TWEAKS_FILE), 'utf8')).rejects.toThrow();
  });
});

describe('permissions', () => {
  const policy = (mode: 'edit' | 'critique') => ({ workTree, mode, allowBash: false, allowInstall: false });

  it('lets define_tweaks run in edit mode only', () => {
    expect(permittedToolNames(policy('edit'))).toContain(TWEAKS_TOOL);
    expect(evaluateToolUse(policy('edit'), TWEAKS_TOOL, { controls: [] }).behavior).toBe('allow');
    expect(evaluateToolUse(policy('critique'), TWEAKS_TOOL, { controls: [] }).behavior).toBe('deny');
  });

  it('denies Write and Edit on the tweaks file in any spelling', () => {
    for (const file of [TWEAKS_FILE, path.join(workTree, 'studio', 'tweaks.json'), 'Studio/Tweaks.JSON', './studio/../studio/tweaks.json']) {
      const result = evaluateToolUse(policy('edit'), 'Write', { file_path: file, content: '{}' });
      expect(result.behavior).toBe('deny');
      if (result.behavior === 'deny') expect(result.message).toContain('define_tweaks');
    }
    expect(evaluateToolUse(policy('edit'), 'Read', { file_path: TWEAKS_FILE }).behavior).toBe('allow');
    expect(evaluateToolUse(policy('edit'), 'Write', { file_path: 'studio/notes.md', content: '' }).behavior).toBe('allow');
  });
});

describe('tweaks run task', () => {
  it('uses Haiku, a small budget, no skills and a tweaks-only run-level block', () => {
    const config = withRunTask(resolveRunConfig({ ...DEFAULT_SETTINGS, maxBudgetUsd: 2 }, 'polish'), 'tweaks');
    expect(config.model).toBe('claude-haiku-5-5');
    expect(config.maxBudgetUsd).toBe(0.25);
    expect(config.preset.skills).toBe(false);
    expect(config.preset.checks.critic).toBe(false);
    expect(buildRunLevelBlock(config, 'edit')).toContain('TWEAKS ONLY');
  });

  it('asks prototype and polish edit runs for tweaks in the run-level block', () => {
    for (const level of ['prototype', 'polish'] as const) {
      expect(buildRunLevelBlock(resolveRunConfig(DEFAULT_SETTINGS, level), 'edit')).toContain('mcp__studio__define_tweaks');
    }
    expect(buildRunLevelBlock(resolveRunConfig(DEFAULT_SETTINGS, 'wireframe'), 'edit')).not.toContain('define_tweaks');
  });
});

describe('mock tweaks', () => {
  it('adds vars that every mock control declares and uses', async () => {
    await writeFile(path.join(workTree, 'index.html'), withMockTweakStyles('<html><head></head><body></body></html>'));
    await runDefineTweaks({ ctx: ctx('edit') }, MOCK_TWEAK_CONTROLS);
    const state = await readTweaksState(workTree);
    expect(state.problems).toEqual([]);
    expect(state.current).toEqual({ accent: '#0f6b5c', radius: 12, gap: 24 });
  });
});
