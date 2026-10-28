export const VARIANT_STATES = ['hover', 'focus', 'active'] as const;
export type VariantState = (typeof VARIANT_STATES)[number];

export const DEFAULT_BREAKPOINTS: readonly Breakpoint[] = [
  { name: 'sm', px: 640 },
  { name: 'md', px: 768 },
  { name: 'lg', px: 1024 },
  { name: 'xl', px: 1280 },
  { name: '2xl', px: 1536 },
];

export interface Breakpoint {
  name: string;
  px: number;
}

export interface ParsedVariant {
  breakpoint: string | null;
  dark: boolean;
  states: VariantState[];
}

export interface VariantSupport {
  mode: 'classes' | 'css' | 'none';
  reason: string | null;
  breakpoints: Breakpoint[];
  props: string[];
}

const PART = /^[a-z0-9][a-z0-9-]*$/;
const MAX_VARIANT = 60;

function isState(part: string): part is VariantState {
  return (VARIANT_STATES as readonly string[]).includes(part);
}

export function parseVariant(raw: string): ParsedVariant | null {
  const text = raw.trim();
  if (text === '' || text === 'base') return { breakpoint: null, dark: false, states: [] };
  if (text.length > MAX_VARIANT) return null;
  const parts = text.split(/[:+\s]+/).filter(Boolean);
  const out: ParsedVariant = { breakpoint: null, dark: false, states: [] };
  for (const part of parts) {
    if (!PART.test(part)) return null;
    if (part === 'dark') out.dark = true;
    else if (isState(part)) {
      if (!out.states.includes(part)) out.states.push(part);
    } else if (out.breakpoint === null) out.breakpoint = part;
    else return null;
  }
  out.states.sort((a, b) => VARIANT_STATES.indexOf(a) - VARIANT_STATES.indexOf(b));
  return out;
}

export function variantPrefix(variant: ParsedVariant): string {
  const parts = [...(variant.breakpoint ? [variant.breakpoint] : []), ...(variant.dark ? ['dark'] : []), ...variant.states];
  return parts.map((part) => `${part}:`).join('');
}

export function normalizeVariant(raw: string | undefined | null): string | null {
  if (raw === undefined || raw === null) return '';
  const parsed = parseVariant(raw);
  return parsed ? variantPrefix(parsed) : null;
}

export function variantLabel(prefix: string): string {
  return prefix === '' ? 'Base' : prefix.slice(0, -1).split(':').join(' + ');
}
