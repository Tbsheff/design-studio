import { describe, expect, it } from 'vitest';
import { NEW_SHADOW, blurOf, formatShadows, parseShadows, splitTopLevel, withBlur } from './shadows';

describe('parseShadows', () => {
  it('reads none and empty as no shadows', () => {
    expect(parseShadows('none')).toEqual([]);
    expect(parseShadows('')).toEqual([]);
  });

  it('reads the authored order with commas inside rgb() and var()', () => {
    expect(parseShadows('0 4px 12px 0 rgb(0 0 0 / 0.12), inset 0 1px 2px var(--shadow, rgba(0, 0, 0, 0.2))')).toEqual([
      { x: '0', y: '4px', blur: '12px', spread: '0', color: 'rgb(0 0 0 / 0.12)', inset: false },
      { x: '0', y: '1px', blur: '2px', spread: '0', color: 'var(--shadow, rgba(0, 0, 0, 0.2))', inset: true },
    ]);
  });

  it('reads the computed order with the color first', () => {
    expect(parseShadows('rgba(0, 0, 0, 0.12) 0px 4px 12px 0px')).toEqual([
      { x: '0', y: '4px', blur: '12px', spread: '0', color: 'rgba(0, 0, 0, 0.12)', inset: false },
    ]);
  });

  it('fills missing blur and spread with 0', () => {
    expect(parseShadows('2px 3px red')).toEqual([{ x: '2px', y: '3px', blur: '0', spread: '0', color: 'red', inset: false }]);
  });

  it('refuses values it cannot map to fields', () => {
    expect(parseShadows('4px red blue')).toBeNull();
    expect(parseShadows('red')).toBeNull();
  });
});

describe('formatShadows', () => {
  it('writes the default new shadow', () => {
    expect(formatShadows([NEW_SHADOW])).toBe('0 4px 12px 0 rgb(0 0 0 / 0.12)');
  });

  it('round-trips a list', () => {
    const value = '0 4px 12px 0 var(--color-ink), inset 1px 1px 0 0 rgb(255 255 255 / 0.5)';
    const parsed = parseShadows(value);
    expect(parsed).not.toBeNull();
    expect(formatShadows(parsed ?? [])).toBe(value);
    expect(parseShadows(formatShadows(parsed ?? []))).toEqual(parsed);
  });

  it('writes an empty list as an empty value', () => {
    expect(formatShadows([])).toBe('');
  });
});

describe('layer blur', () => {
  it('reads blur from a filter list', () => {
    expect(blurOf('none')).toBe('');
    expect(blurOf('blur(4px)')).toBe('4px');
    expect(blurOf('brightness(1.2) blur(2px)')).toBe('2px');
  });

  it('sets, replaces and removes blur and keeps other filters', () => {
    expect(withBlur('none', '4px')).toBe('blur(4px)');
    expect(withBlur('brightness(1.2) blur(2px)', '8px')).toBe('brightness(1.2) blur(8px)');
    expect(withBlur('brightness(1.2) blur(2px)', '0')).toBe('brightness(1.2)');
    expect(withBlur('blur(2px)', '')).toBe('');
  });
});

describe('splitTopLevel', () => {
  it('ignores separators inside parentheses', () => {
    expect(splitTopLevel('a(1, 2), b', ',')).toEqual(['a(1, 2)', 'b']);
    expect(splitTopLevel('rgb(0 0 0) 1px', ' ')).toEqual(['rgb(0 0 0)', '1px']);
  });
});
