import { DIRECT_STYLE_PROPERTIES, type DirectStyleProperty, type SelectionContext } from '../shared/contracts';

export type StyleValues = Record<DirectStyleProperty, string>;

export const SIDES = ['top', 'right', 'bottom', 'left'] as const;
export type Side = (typeof SIDES)[number];

const NUMBER_RE = /^(-?\d*\.?\d+)\s*(px|rem|em|%)?$/i;
const RGB_RE = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i;
const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const MAX_TEXT = 300;

interface ParsedNumber {
  value: number;
  unit: string;
}

export function parseNumber(raw: string): ParsedNumber | null {
  const match = NUMBER_RE.exec(raw.trim());
  if (!match) return null;
  return { value: Number(match[1]), unit: (match[2] ?? '').toLowerCase() };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatNumber(value: number, unit: string): string {
  return `${round(value)}${unit}`;
}

export function stepValue(raw: string, delta: number, fallbackUnit: string): string {
  const parsed = parseNumber(raw) ?? { value: 0, unit: fallbackUnit };
  return formatNumber(parsed.value + delta, parsed.unit);
}

export interface Shift {
  delta: number;
  min?: number;
  max?: number;
}

export function shiftedValue(raw: string, shift: Shift): string | null {
  const parsed = parseNumber(raw);
  if (!parsed) return null;
  const next = Math.min(shift.max ?? Infinity, Math.max(shift.min ?? -Infinity, parsed.value + shift.delta));
  return formatNumber(next, parsed.unit);
}

export function normalizeLength(raw: string, defaultUnit: string): string {
  const trimmed = raw.trim();
  const parsed = parseNumber(trimmed);
  if (!parsed || parsed.unit !== '' || defaultUnit === '') return trimmed;
  return formatNumber(parsed.value, defaultUnit);
}

function hexByte(value: number): string {
  return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0');
}

function alphaOf(raw: string | undefined): number {
  if (raw === undefined) return 1;
  return raw.endsWith('%') ? Number(raw.slice(0, -1)) / 100 : Number(raw);
}

export function colorToHex(raw: string): string | null {
  const value = raw.trim();
  if (HEX_RE.test(value)) {
    const body = value.slice(1);
    return body.length === 3 ? `#${[...body].map((c) => c + c).join('')}`.toLowerCase() : value.toLowerCase();
  }
  const match = RGB_RE.exec(value);
  if (!match || alphaOf(match[4]) < 1) return null;
  return `#${hexByte(Number(match[1]))}${hexByte(Number(match[2]))}${hexByte(Number(match[3]))}`;
}

const TRANSPARENT_RE = /^rgba\(\s*0[\s,]+0[\s,]+0\s*[,/]\s*0\s*\)$/i;

export function displayColor(raw: string): string {
  if (TRANSPARENT_RE.test(raw.trim())) return 'transparent';
  return colorToHex(raw) ?? raw.trim();
}

export function isValidColor(raw: string): boolean {
  const value = raw.trim();
  if (value === '') return false;
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return true;
  return CSS.supports('color', value);
}

export function expandBox(raw: string | undefined): Record<Side, string> {
  const parts = (raw ?? '').trim().split(/\s+/).filter(Boolean);
  const [top = '', right = top, bottom = top, left = right] = parts;
  return { top, right, bottom, left };
}

function boxValue(styles: Record<string, string>, box: 'padding' | 'margin', side: Side): string {
  const longhand = styles[`${box}-${side}`];
  if (longhand !== undefined && longhand !== '') return tidy(longhand);
  return tidy(expandBox(styles[box])[side]);
}

function tidy(raw: string | undefined): string {
  const value = (raw ?? '').trim();
  const parsed = parseNumber(value);
  return parsed ? formatNumber(parsed.value, parsed.unit) : value;
}

export function valuesFromStyles(styles: Record<string, string>): StyleValues {
  const values = {} as StyleValues;
  for (const prop of DIRECT_STYLE_PROPERTIES) values[prop] = tidy(styles[prop]);
  for (const side of SIDES) {
    values[`padding-${side}`] = boxValue(styles, 'padding', side);
    values[`margin-${side}`] = boxValue(styles, 'margin', side);
  }
  return values;
}

export function hasChildElements(outerHTML: string): boolean {
  const close = outerHTML.indexOf('>');
  if (close < 0) return false;
  return /<[a-zA-Z]/.test(outerHTML.slice(close + 1));
}

type TextEditability = 'ok' | 'children' | 'long';

export function textEditability(selection: SelectionContext): TextEditability {
  if (hasChildElements(selection.outerHTML)) return 'children';
  if (selection.text.length >= MAX_TEXT) return 'long';
  return 'ok';
}

export function changedProps(values: Partial<StyleValues>, base: StyleValues): Partial<StyleValues> {
  const out: Partial<StyleValues> = {};
  for (const [prop, value] of Object.entries(values) as [DirectStyleProperty, string][]) {
    if (value !== base[prop]) out[prop] = value;
  }
  return out;
}
