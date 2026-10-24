import { formatNumber, parseNumber } from './cssValues';

export interface Shadow {
  x: string;
  y: string;
  blur: string;
  spread: string;
  color: string;
  inset: boolean;
}

export const NEW_SHADOW: Shadow = { x: '0', y: '4px', blur: '12px', spread: '0', color: 'rgb(0 0 0 / 0.12)', inset: false };

const LENGTH_RE = /^-?\d*\.?\d+(px|rem|em)?$/i;
const BLUR_RE = /^blur\(\s*([^()]*)\s*\)$/i;

export function splitTopLevel(value: string, separator: ',' | ' '): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of value) {
    if (char === '(') depth += 1;
    else if (char === ')') depth = Math.max(0, depth - 1);
    const splits = depth === 0 && (separator === ' ' ? /\s/.test(char) : char === separator);
    if (splits) {
      if (current.trim()) parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function tidyLength(raw: string): string {
  const parsed = parseNumber(raw);
  if (!parsed) return raw;
  return parsed.value === 0 ? '0' : formatNumber(parsed.value, parsed.unit || 'px');
}

function parseOne(raw: string): Shadow | null {
  const lengths: string[] = [];
  const colors: string[] = [];
  let inset = false;
  for (const token of splitTopLevel(raw, ' ')) {
    if (token.toLowerCase() === 'inset') inset = true;
    else if (LENGTH_RE.test(token)) lengths.push(tidyLength(token));
    else colors.push(token);
  }
  if (lengths.length < 2 || lengths.length > 4 || colors.length > 1) return null;
  const [x = '0', y = '0', blur = '0', spread = '0'] = lengths;
  return { x, y, blur, spread, color: colors[0] ?? '', inset };
}

export function parseShadows(value: string): Shadow[] | null {
  const text = value.trim();
  if (text === '' || text.toLowerCase() === 'none') return [];
  const list: Shadow[] = [];
  for (const part of splitTopLevel(text, ',')) {
    const shadow = parseOne(part);
    if (!shadow) return null;
    list.push(shadow);
  }
  return list;
}

function formatOne(shadow: Shadow): string {
  const parts = [shadow.inset ? 'inset' : '', shadow.x || '0', shadow.y || '0', shadow.blur || '0', shadow.spread || '0', shadow.color.trim()];
  return parts.filter(Boolean).join(' ');
}

export function formatShadows(list: Shadow[]): string {
  return list.map(formatOne).join(', ');
}

export function blurOf(filter: string): string {
  for (const part of splitTopLevel(filter, ' ')) {
    const match = BLUR_RE.exec(part);
    if (match) return tidyLength(match[1] ?? '');
  }
  return '';
}

export function withBlur(filter: string, blur: string): string {
  const others = splitTopLevel(filter.trim().toLowerCase() === 'none' ? '' : filter, ' ').filter((part) => !BLUR_RE.test(part));
  const amount = parseNumber(blur);
  const keep = blur.trim() !== '' && !(amount && amount.value === 0);
  return [...others, ...(keep ? [`blur(${blur.trim()})`] : [])].join(' ');
}
