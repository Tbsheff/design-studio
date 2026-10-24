import { clampChroma, converter, formatHex, parse, wcagContrast } from 'culori';
import type { Oklch } from 'culori';

const toOklch = converter('oklch');

const HSL_TRIPLE = /^(-?\d+(?:\.\d+)?)(?:deg)?\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%(?:\s*\/\s*([\d.]+%?))?$/;
const RGB_TRIPLE = /^(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})$/;
const OKLCH_BARE = /^(\d+(?:\.\d+)?%?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)$/;
export const COLOR_IN_TEXT = /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3,4}\b|\b(?:oklch|oklab|rgba?|hsla?|lab|lch)\([^()]{3,80}\)/g;

const SAFE_FAMILY = /^[A-Za-z0-9][A-Za-z0-9 .\-_]{0,31}$/;
const MAX_FAMILY_WORDS = 4;
const MAX_STACK = 4;
const GENERIC_FAMILIES = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace', 'ui-rounded', 'math', 'emoji']);

function round(value: number, places: number): string {
  return String(Number(value.toFixed(places)));
}

function parseLoose(raw: string): Oklch | null {
  const text = raw.trim();
  const hsl = HSL_TRIPLE.exec(text);
  const rgb = RGB_TRIPLE.exec(text);
  const bare = OKLCH_BARE.exec(text);
  const candidate = hsl ? `hsl(${text})` : rgb ? `rgb(${rgb[1]} ${rgb[2]} ${rgb[3]})` : bare && text.includes('%') ? `oklch(${text})` : text;
  if (!/^(#|[a-z]+\()/i.test(candidate) && !/^[a-z]+$/i.test(candidate)) return null;
  if (/^(transparent|currentcolor|inherit|initial|unset|none)$/i.test(candidate)) return null;
  const parsed = parse(candidate);
  if (!parsed) return null;
  const color = toOklch(parsed);
  return color ?? null;
}

export function toOklchColor(raw: string): Oklch | null {
  const color = parseLoose(raw);
  if (!color || (color.alpha ?? 1) < 0.99) return null;
  return color;
}

export function formatColor(color: Oklch): string {
  const hue = Number.isFinite(color.h) && color.c > 0.0005 ? (color.h ?? 0) : 0;
  return `oklch(${round(color.l * 100, 2)}% ${round(color.c, 4)} ${round(hue, 2)})`;
}

export function normalizeColor(raw: string): string | null {
  const color = toOklchColor(raw);
  return color ? formatColor(color) : null;
}

export function colorsInText(text: string): string[] {
  return [...text.matchAll(COLOR_IN_TEXT)].map((match) => match[0]);
}

export function hexOf(value: string): string | null {
  const parsed = parse(value);
  return parsed ? (formatHex(clampChroma(parsed, 'oklch')) ?? null) : null;
}

export function contrast(a: string, b: string): number {
  const first = parse(a);
  const second = parse(b);
  return first && second ? wcagContrast(first, second) : 0;
}

export function readableOn(fill: string): string {
  const color = toOklchColor(fill);
  const hue = color?.h ?? 0;
  const light = `oklch(99% 0.004 ${round(hue, 2)})`;
  const dark = `oklch(18% 0.01 ${round(hue, 2)})`;
  return contrast(fill, light) >= contrast(fill, dark) ? light : dark;
}

export function shiftLightness(value: string, lightness: (l: number) => number, chromaScale = 1): string {
  const color = toOklchColor(value);
  if (!color) return value;
  return formatColor({ ...color, l: Math.min(0.98, Math.max(0.05, lightness(color.l))), c: color.c * chromaScale });
}

export function lightnessOf(value: string): number | null {
  return toOklchColor(value)?.l ?? null;
}

export function chromaOf(value: string): number {
  return toOklchColor(value)?.c ?? 0;
}

export function familiesOf(stack: string): string[] {
  return stack
    .split(',')
    .map((part) => part.trim().replace(/^["']|["']$/g, '').trim())
    .filter((name) => name !== '' && SAFE_FAMILY.test(name) && name.split(/\s+/).length <= MAX_FAMILY_WORDS);
}

export function primaryFamily(stack: string): string | null {
  return familiesOf(stack).find((name) => !GENERIC_FAMILIES.has(name.toLowerCase()) && !name.startsWith('-')) ?? null;
}

const FALLBACK_FAMILIES = new Set(['blinkmacsystemfont', 'segoe ui', 'roboto', 'helvetica neue', 'helvetica', 'arial', 'noto sans', 'georgia', 'times new roman', 'times', 'menlo', 'monaco', 'consolas', 'courier new', 'sfmono-regular', 'liberation mono', 'sf mono']);

export function fontStack(stack: string, generic: 'sans-serif' | 'serif' | 'monospace'): string | null {
  const families = familiesOf(stack).filter((name) => !name.startsWith('-') && !/^(var|inherit|initial)$/i.test(name));
  const primary = families.find((name) => !GENERIC_FAMILIES.has(name.toLowerCase()));
  if (!primary) return null;
  const rest = families.filter((name) => name !== primary && (GENERIC_FAMILIES.has(name.toLowerCase()) || FALLBACK_FAMILIES.has(name.toLowerCase())));
  const kept = [primary, ...rest].slice(0, MAX_STACK);
  const quoted = kept.map((name) => (GENERIC_FAMILIES.has(name.toLowerCase()) ? name : `'${name}'`));
  if (!kept.some((name) => GENERIC_FAMILIES.has(name.toLowerCase()))) quoted.push(generic);
  return quoted.join(', ');
}

export function genericFor(stack: string): 'sans-serif' | 'serif' | 'monospace' {
  const lower = stack.toLowerCase();
  if (/monospace|mono\b|code|courier|menlo|consolas/.test(lower)) return 'monospace';
  if (/(^|[\s,'"])serif|georgia|times|garamond|playfair|merriweather|lora|baskerville/.test(lower) && !lower.includes('sans-serif')) return 'serif';
  return 'sans-serif';
}

const LENGTH = /^-?(\d+(?:\.\d+)?|\.\d+)(px|rem|em)$/;

export function normalizeLength(raw: string): string | null {
  const text = raw.trim();
  if (text === '0') return '0px';
  const match = LENGTH.exec(text);
  if (!match) return null;
  return `${round(Number(match[1]), 4)}${match[2]}`;
}

export function lengthPx(value: string): number {
  const match = LENGTH.exec(value.trim());
  if (!match) return Number.NaN;
  const size = Number(match[1]);
  return match[2] === 'px' ? size : size * 16;
}

function splitOutsideParens(text: string, separator: RegExp): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of text) {
    if (char === '(') depth += 1;
    if (char === ')') depth = Math.max(0, depth - 1);
    if (depth === 0 && separator.test(char)) {
      if (current.trim() !== '') parts.push(current.trim());
      current = '';
    } else current += char;
  }
  if (current.trim() !== '') parts.push(current.trim());
  return parts;
}

const SHADOW_LENGTH = /^-?(\d+(\.\d+)?|\.\d+)(px|rem|em)?$/;

function shadowLayer(layer: string): string | null {
  const parts = splitOutsideParens(layer, /\s/);
  const inset = parts.filter((part) => part.toLowerCase() === 'inset').length;
  const rest = parts.filter((part) => part.toLowerCase() !== 'inset');
  const lengths = rest.filter((part) => SHADOW_LENGTH.test(part));
  const colors = rest.filter((part) => !SHADOW_LENGTH.test(part));
  if (inset > 1 || lengths.length < 2 || lengths.length > 4 || colors.length !== 1 || !parse(colors[0]!)) return null;
  return parts.join(' ');
}

export function normalizeShadow(raw: string): string | null {
  const text = raw.trim();
  if (text === '' || text.length > 300 || /[;{}<>\\]|var\(|url\(/i.test(text)) return null;
  const layers = splitOutsideParens(text, /,/).map(shadowLayer);
  if (layers.length === 0 || layers.length > 4 || layers.some((layer) => layer === null)) return null;
  return layers.join(', ');
}

export function safeGoogleFontsUrl(raw: string): string | null {
  const url = raw.replace(/&amp;/g, '&').trim();
  if (!url.startsWith('https://fonts.googleapis.com/') || /["'<>\s]/.test(url) || url.length > 2000) return null;
  return url;
}

export function googleFontsUrlFor(families: string[]): string | null {
  const unique = [...new Set(families.filter((name) => SAFE_FAMILY.test(name)))];
  if (unique.length === 0) return null;
  const params = unique.map((name) => `family=${name.replace(/ /g, '+')}:wght@400;500;600;700`).join('&');
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}
