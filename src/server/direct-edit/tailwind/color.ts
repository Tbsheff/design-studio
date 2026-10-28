import { converter, differenceEuclidean, parse } from 'culori';
import type { Oklch } from 'culori';

const toOklch = converter('oklch');
const distance = differenceEuclidean('oklab');
const HSL_TRIPLE = /^(-?\d+(?:\.\d+)?)(?:deg)?\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%(?:\s*\/\s*([\d.]+%?))?$/;
const KEYWORDS = /^(transparent|currentcolor|inherit|initial|unset|none)$/i;

export interface ParsedColor {
  color: Oklch;
  alpha: number;
}

export function parseColor(raw: string): ParsedColor | null {
  const text = raw.trim();
  if (text === '' || KEYWORDS.test(text) || text.includes('var(')) return null;
  const candidate = HSL_TRIPLE.test(text) ? `hsl(${text})` : text;
  let parsed: ReturnType<typeof parse> | undefined;
  try {
    parsed = parse(candidate);
  } catch {
    return null;
  }
  if (!parsed) return null;
  const color = toOklch(parsed);
  if (!color) return null;
  return { color: { ...color, alpha: undefined }, alpha: parsed.alpha ?? 1 };
}

export function colorDistance(a: Oklch, b: Oklch): number {
  return distance(a, b);
}
