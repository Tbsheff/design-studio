import { REQUIRED_TOKENS } from '../../../shared/contracts.js';
import type { CandidateConfidence } from './types.js';

export type TokenGroup = keyof typeof REQUIRED_TOKENS;

export interface NameMatch {
  token: string;
  confidence: CandidateConfidence;
}

const COLOR_NAMES: Record<string, { high: string[]; medium: string[] }> = {
  bg: { high: ['bg', 'background', 'bg-default', 'background-default', 'page', 'page-bg', 'body-bg', 'canvas', 'bg-page', 'background-primary', 'surface-page'], medium: ['base-100', 'base', 'white', 'paper'] },
  surface: { high: ['surface', 'card', 'panel', 'bg-subtle', 'bg-surface', 'background-secondary', 'bg-secondary', 'surface-1', 'elevated', 'bg-elevated', 'card-bg'], medium: ['popover', 'muted', 'base-200', 'bg-muted', 'surface-raised'] },
  fg: { high: ['fg', 'foreground', 'text', 'text-primary', 'text-default', 'fg-default', 'body-color', 'on-background', 'on-surface', 'ink', 'base-content', 'body-text', 'text-color'], medium: ['content', 'body', 'black', 'dark'] },
  'fg-muted': { high: ['fg-muted', 'muted-foreground', 'text-muted', 'text-secondary', 'muted-text', 'text-subtle', 'fg-subtle', 'secondary-text', 'fg-secondary', 'text-tertiary'], medium: ['subtle', 'gray', 'grey', 'neutral', 'muted-color'] },
  border: { high: ['border', 'border-color', 'border-default', 'divider', 'line', 'stroke', 'outline', 'border-subtle'], medium: ['input', 'separator', 'hairline'] },
  primary: { high: ['primary', 'brand', 'brand-primary', 'action', 'cta', 'interactive', 'primary-500', 'brand-500', 'accent-primary', 'button-bg', 'primary-default'], medium: ['link', 'main', 'theme', 'blue', 'key'] },
  'primary-fg': { high: ['primary-fg', 'primary-foreground', 'on-primary', 'primary-contrast', 'primary-content', 'primary-text', 'on-brand', 'button-text', 'brand-foreground'], medium: [] },
  accent: { high: ['accent', 'highlight', 'accent-default', 'accent-500'], medium: ['secondary', 'tertiary', 'accent-secondary'] },
  'accent-fg': { high: ['accent-fg', 'accent-foreground', 'on-accent', 'accent-contrast', 'accent-content', 'accent-text'], medium: ['secondary-foreground', 'on-secondary', 'secondary-content'] },
  success: { high: ['success', 'positive', 'ok', 'valid', 'success-500'], medium: ['green'] },
  warning: { high: ['warning', 'caution', 'warn', 'warning-500'], medium: ['yellow', 'amber', 'orange'] },
  danger: { high: ['danger', 'destructive', 'error', 'negative', 'critical', 'danger-500', 'error-500'], medium: ['red'] },
  ring: { high: ['ring', 'focus', 'focus-ring', 'ring-color', 'outline-focus', 'focus-color'], medium: [] },
};

const FONT_NAMES: Record<string, { high: string[]; medium: string[] }> = {
  display: { high: ['display', 'heading', 'headings', 'header', 'title', 'headline', 'font-display', 'font-heading', 'font-headings', 'font-title'], medium: ['serif', 'brand'] },
  body: { high: ['body', 'sans', 'base', 'text', 'font-body', 'font-sans', 'font-base', 'font-text', 'primary', 'default', 'family', 'font-family', 'font-primary'], medium: ['ui', 'main', 'copy'] },
  mono: { high: ['mono', 'code', 'monospace', 'font-mono', 'font-code'], medium: ['pre'] },
};

const RADIUS_SUFFIX: Record<string, NameMatch> = {
  sm: { token: 'sm', confidence: 'high' },
  small: { token: 'sm', confidence: 'high' },
  s: { token: 'sm', confidence: 'high' },
  xs: { token: 'sm', confidence: 'medium' },
  md: { token: 'md', confidence: 'high' },
  medium: { token: 'md', confidence: 'high' },
  m: { token: 'md', confidence: 'high' },
  base: { token: 'md', confidence: 'high' },
  default: { token: 'md', confidence: 'high' },
  '': { token: 'md', confidence: 'medium' },
  lg: { token: 'lg', confidence: 'high' },
  large: { token: 'lg', confidence: 'high' },
  l: { token: 'lg', confidence: 'high' },
  xl: { token: 'lg', confidence: 'medium' },
  pill: { token: 'pill', confidence: 'high' },
  full: { token: 'pill', confidence: 'high' },
  round: { token: 'pill', confidence: 'high' },
  rounded: { token: 'pill', confidence: 'medium' },
  circle: { token: 'pill', confidence: 'medium' },
};

const SHADOW_SUFFIX: Record<string, string> = { sm: 'sm', small: 'sm', '1': 'sm', xs: 'sm', md: 'md', medium: 'md', '2': 'md', '': 'md', default: 'md', lg: 'lg', large: 'lg', '3': 'lg', xl: 'lg' };

const PREFIXES = ['wp--preset--color--', 'wp--preset--font-family--', 'wp--preset--', 'md-sys-color-', 'md-sys-', 'sys-color-', 'colors-', 'color-', 'clr-', 'col-', 'c-', 'theme-', 'semantic-', 'sys-', 'ref-', 'global-', 'ds-', 'tw-', 'bs-', 'chakra-colors-', 'mantine-color-'];

export function normalizeName(raw: string): string {
  let name = raw.trim().toLowerCase().replace(/^-+/, '').replace(/[._/\s]+/g, '-').replace(/-+/g, '-');
  for (let changed = true; changed; ) {
    changed = false;
    for (const prefix of PREFIXES) {
      if (name.startsWith(prefix) && name.length > prefix.length) {
        name = name.slice(prefix.length);
        changed = true;
      }
    }
  }
  return name.replace(/-(default|base|value)$/, '');
}

function lookup(table: Record<string, { high: string[]; medium: string[] }>, name: string): NameMatch | null {
  for (const [token, names] of Object.entries(table)) if (names.high.includes(name)) return { token, confidence: 'high' };
  for (const [token, names] of Object.entries(table)) if (names.medium.includes(name)) return { token, confidence: 'medium' };
  return null;
}

function stripGroup(name: string, words: string[]): string | null {
  for (const word of words) {
    if (name === word) return '';
    if (name.startsWith(`${word}-`)) return name.slice(word.length + 1);
  }
  return null;
}

export function matchColorName(raw: string): NameMatch | null {
  const name = normalizeName(raw);
  const found = lookup(COLOR_NAMES, name);
  return found ? { token: `color.${found.token}`, confidence: found.confidence } : null;
}

export function matchFontName(raw: string): NameMatch | null {
  const name = normalizeName(raw);
  const bare = stripGroup(name, ['font-family', 'fontfamily', 'font-families', 'fontfamilies', 'fonts', 'font', 'ff', 'family', 'typeface']);
  const found = (bare !== null && bare !== '' ? lookup(FONT_NAMES, bare) : null) ?? lookup(FONT_NAMES, name);
  return found ? { token: `font.${found.token}`, confidence: found.confidence } : null;
}

export function matchRadiusName(raw: string): NameMatch | null {
  const name = normalizeName(raw);
  const suffix = stripGroup(name, ['border-radius', 'borderradius', 'radius', 'radii', 'rounded', 'corner', 'corners']);
  if (suffix === null) return null;
  const found = RADIUS_SUFFIX[suffix];
  return found ? { token: `radius.${found.token}`, confidence: found.confidence } : null;
}

export function matchShadowName(raw: string): NameMatch | null {
  const name = normalizeName(raw);
  const suffix = stripGroup(name, ['box-shadow', 'boxshadow', 'shadows', 'shadow', 'elevation']);
  if (suffix === null) return null;
  const found = SHADOW_SUFFIX[suffix];
  return found ? { token: `shadow.${found}`, confidence: suffix === '' ? 'medium' : 'high' } : null;
}

export function matchScaleName(raw: string, group: 'text' | 'space'): NameMatch | null {
  const name = normalizeName(raw);
  const words = group === 'text' ? ['font-size', 'fontsize', 'font-sizes', 'fontsizes', 'text', 'fs', 'size'] : ['spacing', 'space', 'spacer', 'gap', 'sp'];
  const suffix = stripGroup(name, words);
  if (suffix === null || suffix === '') return null;
  const required: readonly string[] = REQUIRED_TOKENS[group];
  return required.includes(suffix) ? { token: `${group}.${suffix}`, confidence: 'high' } : null;
}

export type ValueKind = 'color' | 'font' | 'dimension' | 'shadow' | 'unknown';

export function matchName(raw: string, kind: ValueKind): NameMatch | null {
  if (kind === 'color') return matchColorName(raw);
  if (kind === 'font') return matchFontName(raw);
  if (kind === 'shadow') return matchShadowName(raw);
  if (kind === 'dimension') return matchRadiusName(raw) ?? matchScaleName(raw, 'text') ?? matchScaleName(raw, 'space');
  return null;
}

export function requiredPaths(): string[] {
  return Object.entries(REQUIRED_TOKENS).flatMap(([group, names]) => names.map((name) => `${group}.${name}`));
}
