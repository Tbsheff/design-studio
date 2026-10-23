import type { Version } from './contracts';

export const TWEAKS_FILE = 'studio/tweaks.json';
export const TWEAKS_PREVIEW_STYLE_ID = 'studio-tweaks-preview';
export const TWEAKS_TOOL = 'mcp__studio__define_tweaks';
export const TWEAKS_MAX_CONTROLS = 12;
const TWEAK_VALUE_MAX = 200;

export type TweakValue = number | string | boolean;

interface TweakBase {
  id: string;
  label: string;
  group?: string;
  cssVar: string;
}

export interface RangeTweak extends TweakBase {
  type: 'range';
  min: number;
  max: number;
  step?: number;
  unit?: string;
  default: number;
}

export interface ColorTweak extends TweakBase {
  type: 'color';
  default: string;
}

export interface ToggleTweak extends TweakBase {
  type: 'toggle';
  on: string;
  off: string;
  default: boolean;
}

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectTweak extends TweakBase {
  type: 'select';
  options: SelectOption[];
  default: string;
}

export type TweakControl = RangeTweak | ColorTweak | ToggleTweak | SelectTweak;

export interface TweaksFile {
  controls: TweakControl[];
}

export interface TweaksState {
  controls: TweakControl[];
  current: Record<string, TweakValue>;
  tokenPaths: Record<string, string>;
  problems: string[];
  error: string | null;
}

export interface CommitTweaksResult {
  state: TweaksState;
  version: Version;
}

const UNSAFE_CSS = /[;{}<>\\]|\/\*|\*\//;

export function isSafeCssValue(value: string): boolean {
  return value.trim() !== '' && value.length <= TWEAK_VALUE_MAX && !UNSAFE_CSS.test(value);
}

export function tweakCss(control: TweakControl, value: TweakValue): string | null {
  if (control.type === 'range') {
    const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
    if (!Number.isFinite(n) || n < control.min || n > control.max) return null;
    return `${roundTo(n, control.step)}${control.unit ?? ''}`;
  }
  if (control.type === 'toggle') return typeof value === 'boolean' ? (value ? control.on : control.off) : null;
  if (typeof value !== 'string' || !isSafeCssValue(value)) return null;
  if (control.type === 'select' && !control.options.some((option) => option.value === value)) return null;
  return value.trim();
}

function roundTo(n: number, step: number | undefined): number {
  const digits = step === undefined ? 4 : Math.min(6, Math.max(0, decimals(step)));
  return Number(n.toFixed(digits));
}

function decimals(step: number): number {
  const text = String(step);
  const dot = text.indexOf('.');
  return dot === -1 ? 0 : text.length - dot - 1;
}

export function parseTweakCss(control: TweakControl, css: string): TweakValue | null {
  const value = css.trim();
  if (control.type === 'range') {
    const unit = control.unit ?? '';
    if (unit !== '' && !value.endsWith(unit)) return null;
    const n = Number(unit === '' ? value : value.slice(0, value.length - unit.length));
    return Number.isFinite(n) ? n : null;
  }
  if (control.type === 'toggle') return value === control.on ? true : value === control.off ? false : null;
  if (control.type === 'select') return control.options.some((option) => option.value === value) ? value : null;
  return value === '' ? null : value;
}

export function tweaksPreviewCss(controls: TweakControl[], values: Record<string, TweakValue>): string {
  const lines: string[] = [];
  for (const control of controls) {
    const value = values[control.id];
    if (value === undefined) continue;
    const css = tweakCss(control, value);
    if (css !== null) lines.push(`  ${control.cssVar}: ${css};`);
  }
  return lines.length === 0 ? '' : `:root {\n${lines.join('\n')}\n}\n`;
}
