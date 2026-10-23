import { describe, expect, it } from 'vitest';
import type { CompiledTokenEntry } from './contracts';
import {
  COLOR_SNAP_DELTA,
  cssVarFor,
  isSnappable,
  isUnsetValue,
  lengthToPx,
  matchColor,
  matchDimension,
  matchFontFamily,
  resolveTokenValue,
  tokenFieldState,
  tokensForProperty,
  varName,
} from './token-match';

function entry(path: string, type: CompiledTokenEntry['type'], value: string, darkValue: string | null = null): CompiledTokenEntry {
  const [group = '', ...rest] = path.split('.');
  return { path, cssVar: cssVarFor(group, rest.join('-')), type, value, darkValue };
}

const ENTRIES: CompiledTokenEntry[] = [
  entry('color.fg', 'color', 'oklch(21% 0.018 55)', 'oklch(93% 0.014 85)'),
  entry('color.primary', 'color', 'oklch(40% 0.13 22)', 'oklch(70% 0.12 22)'),
  entry('color.accent', 'color', 'oklch(92% 0.03 40)', 'oklch(29% 0.05 22)'),
  entry('color.border', 'color', '#d6d0c4'),
  entry('font.display', 'fontFamily', "'Fraunces', 'Iowan Old Style', Georgia, serif"),
  entry('font.body', 'fontFamily', "'Source Sans 3', Arial, sans-serif"),
  entry('text.base', 'dimension', '1.125rem'),
  entry('text.lg', 'dimension', '1.5rem'),
  entry('text.fluid', 'dimension', 'clamp(1rem, 2vw, 2rem)'),
  entry('space.2', 'dimension', '0.5rem'),
  entry('space.4', 'dimension', '1rem'),
  entry('space.12', 'dimension', '3rem'),
  entry('radius.md', 'dimension', '4px'),
  entry('radius.pill', 'dimension', '9999px'),
];

describe('cssVarFor and varName', () => {
  it('follows the compiler naming rule', () => {
    expect(cssVarFor('color', 'brand-2')).toBe('--brand-2');
    expect(cssVarFor('space', '4')).toBe('--space-4');
  });

  it('reads the variable name from var()', () => {
    expect(varName('var(--primary)')).toBe('--primary');
    expect(varName(' var( --space-4 , 8px) ')).toBe('--space-4');
    expect(varName('#fff')).toBeNull();
  });
});

describe('matchColor', () => {
  it('parses every colour format the inspector sees', () => {
    for (const value of ['#7a1f2b', 'rgb(122, 31, 43)', 'oklch(40% 0.13 22)', 'oklch(0.4 0.13 22)', 'hsl(350 60% 30%)', 'rebeccapurple']) {
      expect(matchColor(value, ENTRIES).length, value).toBeGreaterThan(0);
    }
  });

  it('marks the computed form of a token as exact', () => {
    const [best] = matchColor('oklch(0.4 0.13 22)', ENTRIES);
    expect(best?.cssVar).toBe('--primary');
    expect(best?.exact).toBe(true);
  });

  it('sorts by deltaE OK and keeps near colours inexact but snappable', () => {
    const matches = matchColor('oklch(0.91 0.035 42)', ENTRIES);
    expect(matches[0]?.cssVar).toBe('--accent');
    expect(matches[0]?.exact).toBe(false);
    expect(matches[0]?.distance).toBeLessThan(COLOR_SNAP_DELTA);
    expect(isSnappable('color', matches[0])).toBe(true);
    const distances = matches.map((m) => m.distance);
    expect([...distances].sort((a, b) => a - b)).toEqual(distances);
  });

  it('does not snap far colours', () => {
    const [best] = matchColor('#00a0ff', ENTRIES);
    expect(isSnappable('color', best)).toBe(false);
  });

  it('uses dark values in dark mode', () => {
    expect(matchColor('oklch(0.7 0.12 22)', ENTRIES, 'dark')[0]).toMatchObject({ cssVar: '--primary', exact: true });
    expect(matchColor('oklch(0.7 0.12 22)', ENTRIES, 'light')[0]?.exact).toBe(false);
  });

  it('resolves var() as an exact match and ignores transparent or invalid values', () => {
    expect(matchColor('var(--accent)', ENTRIES)).toEqual([expect.objectContaining({ cssVar: '--accent', exact: true, distance: 0 })]);
    expect(matchColor('var(--missing)', ENTRIES)).toEqual([]);
    expect(matchColor('rgba(0, 0, 0, 0)', ENTRIES)).toEqual([]);
    expect(matchColor('not a colour', ENTRIES)).toEqual([]);
  });
});

describe('matchDimension', () => {
  it('converts rem, em and px', () => {
    expect(lengthToPx('1.5rem')).toBe(24);
    expect(lengthToPx('2em', 10)).toBe(20);
    expect(lengthToPx('12px')).toBe(12);
    expect(lengthToPx('0')).toBe(0);
    expect(lengthToPx('50%')).toBeNull();
  });

  it('finds the nearest step and the exact window', () => {
    expect(matchDimension('24px', ENTRIES, 'text')[0]).toMatchObject({ cssVar: '--text-lg', exact: true });
    expect(matchDimension('16.4px', ENTRIES, 'space')[0]).toMatchObject({ cssVar: '--space-4', exact: true });
    const near = matchDimension('17.5px', ENTRIES, 'space')[0];
    expect(near).toMatchObject({ cssVar: '--space-4', exact: false, distance: 1.5 });
    expect(isSnappable('space', near)).toBe(true);
  });

  it('uses 8% of the token size when that is larger than 2px', () => {
    const near = matchDimension('51px', ENTRIES, 'space')[0];
    expect(near?.cssVar).toBe('--space-12');
    expect(isSnappable('space', near)).toBe(true);
    expect(isSnappable('space', matchDimension('53px', ENTRIES, 'space')[0])).toBe(false);
  });

  it('skips values it cannot measure and respects the group', () => {
    const text = matchDimension('20px', ENTRIES, 'text');
    expect(text.map((m) => m.cssVar)).not.toContain('--text-fluid');
    expect(matchDimension('4px', ENTRIES, 'radius')[0]?.cssVar).toBe('--radius-md');
    expect(matchDimension('var(--radius-md)', ENTRIES, 'radius')[0]?.exact).toBe(true);
  });
});

describe('matchFontFamily', () => {
  it('matches the first family name without case or quotes', () => {
    expect(matchFontFamily('fraunces, serif', ENTRIES)[0]).toMatchObject({ cssVar: '--font-display', exact: true });
    expect(matchFontFamily('"Source Sans 3"', ENTRIES)[0]).toMatchObject({ cssVar: '--font-body', exact: true });
    expect(matchFontFamily('Inter, sans-serif', ENTRIES).some((m) => m.exact)).toBe(false);
  });
});

describe('tokensForProperty and tokenFieldState', () => {
  it('maps properties to their token group', () => {
    expect(tokensForProperty('font-size', ENTRIES).map((e) => e.path)).toEqual(['text.base', 'text.lg', 'text.fluid']);
    expect(tokensForProperty('padding-left', ENTRIES)).toHaveLength(3);
    expect(tokensForProperty('opacity', ENTRIES)).toEqual([]);
  });

  it('reports token, raw with snap, raw, unset and none', () => {
    expect(tokenFieldState('color', 'oklch(0.4 0.13 22)', ENTRIES).kind).toBe('token');
    const near = tokenFieldState('color', 'oklch(0.91 0.035 42)', ENTRIES);
    expect(near.kind === 'raw' && near.snap?.cssVar).toBe('--accent');
    const far = tokenFieldState('color', '#00a0ff', ENTRIES);
    expect(far.kind === 'raw' && far.snap).toBeNull();
    expect(tokenFieldState('background-color', 'rgba(0, 0, 0, 0)', ENTRIES).kind).toBe('unset');
    expect(tokenFieldState('margin-top', '0px', ENTRIES).kind).toBe('unset');
    expect(tokenFieldState('opacity', '0.5', ENTRIES).kind).toBe('none');
    expect(tokenFieldState('color', '#fff', []).kind).toBe('none');
  });

  it('treats keywords as unset', () => {
    expect(isUnsetValue('normal')).toBe(true);
    expect(isUnsetValue('auto')).toBe(true);
    expect(isUnsetValue('12px')).toBe(false);
  });

  it('resolves var() to the token value for swatches', () => {
    expect(resolveTokenValue('var(--primary)', ENTRIES)).toBe('oklch(40% 0.13 22)');
    expect(resolveTokenValue('var(--primary)', ENTRIES, 'dark')).toBe('oklch(70% 0.12 22)');
    expect(resolveTokenValue('#fff', ENTRIES)).toBe('#fff');
  });
});
