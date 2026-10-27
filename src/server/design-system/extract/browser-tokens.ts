import type { LivePage, LiveStyle } from './browser-collect.js';
import type { Candidate } from './types.js';
import { candidate } from './vars.js';
import { chromaOf, contrast, lengthPx, lightnessOf, normalizeColor, normalizeShadow } from './values.js';

type Push = (token: string, value: string | undefined | null, evidence: string) => void;

const REQUIRED_SPACE = new Set([1, 2, 3, 4, 5, 6, 8, 10, 12]);

function opaque(raw: string): string | null {
  if (!raw || raw === 'transparent' || /^rgba\([^)]*,\s*0\)$/.test(raw)) return null;
  return normalizeColor(raw);
}

function mostCommon(values: Array<string | null>): string | undefined {
  const counts = new Map<string, number>();
  for (const value of values) if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

function styles(live: LivePage, role: string): LiveStyle[] {
  return live.roles[role] ?? [];
}

const saturated = (value: string) => chromaOf(value) > 0.04;

type Painted = ReadonlyArray<readonly [string, number]>;

function pushBase(live: LivePage, painted: Painted, inks: string[], push: Push): { bg?: string; fg?: string } {
  const bodyBg = styles(live, 'body').map((style) => opaque(style.bg))[0];
  const bg = painted[0]?.[0] ?? bodyBg ?? undefined;
  push('color.bg', bg, 'largest painted background');
  const paragraph = mostCommon(styles(live, 'p').map((style) => opaque(style.color)));
  const fg = paragraph ?? inks[0] ?? opaque(styles(live, 'body')[0]?.color ?? '') ?? undefined;
  push('color.fg', fg, paragraph ? 'paragraph text color' : 'most used text color');
  return { ...(bg ? { bg } : {}), ...(fg ? { fg } : {}) };
}

function pushBrand(live: LivePage, painted: Painted, inks: string[], push: Push): void {
  const buttons = styles(live, 'button').filter((style) => opaque(style.bg) && saturated(opaque(style.bg)!));
  const buttonBg = mostCommon(buttons.map((style) => opaque(style.bg)));
  push('color.primary', buttonBg, 'button background');
  const matching = buttons.find((style) => opaque(style.bg) === buttonBg) ?? buttons[0];
  if (matching) push('color.primary-fg', opaque(matching.color), 'button text color');
  push('color.primary', mostCommon(styles(live, 'a').map((style) => opaque(style.color)).filter((value) => value !== null && saturated(value))), 'link color');
  const theme = live.themeColor ? normalizeColor(live.themeColor) : null;
  if (theme && saturated(theme)) push('color.primary', theme, 'meta theme-color');
  push('color.primary', painted.find(([value]) => saturated(value))?.[0], 'largest painted saturated color');
  push('color.primary', inks.find((value) => saturated(value)), 'most used saturated text color');
}

function pushSurface(live: LivePage, painted: Painted, bg: string | undefined, push: Push): void {
  const surface = mostCommon(live.cards.map((style) => opaque(style.bg)).filter((value) => value !== null && value !== bg));
  if (surface) {
    push('color.surface', surface, 'card background');
    return;
  }
  if (bg === undefined) return;
  const near = painted.map(([value]) => value).find((value) => value !== bg && !saturated(value) && Math.abs((lightnessOf(value) ?? 0) - (lightnessOf(bg) ?? 0)) < 0.12);
  push('color.surface', near, 'second painted background');
}

function pushMuted(live: LivePage, inks: string[], base: { bg?: string; fg?: string }, push: Push): void {
  const { bg, fg } = base;
  if (bg === undefined || fg === undefined) return;
  const quieter = (value: string | null): value is string => {
    if (value === null || value === fg || saturated(value)) return false;
    const own = contrast(value, bg);
    return own >= 2.5 && own < contrast(fg, bg);
  };
  const small = mostCommon(styles(live, 'small').map((style) => opaque(style.color)).filter(quieter));
  push('color.fg-muted', small ?? inks.find(quieter), small ? 'small text color' : 'second text color');
}

function pushBorder(live: LivePage, push: Push): void {
  const borders = live.borders.map(([raw]) => opaque(raw)).filter((value): value is string => value !== null && !saturated(value));
  const inputBorder = mostCommon(styles(live, 'input').filter((style) => parseFloat(style.borderWidth) > 0).map((style) => opaque(style.borderColor)));
  push('color.border', inputBorder ?? borders[0], inputBorder ? 'input border' : 'most used border color');
}

function pushColors(live: LivePage, push: Push): string | undefined {
  const painted = live.painted.map(([raw, area]) => [opaque(raw), area] as const).filter((entry): entry is readonly [string, number] => entry[0] !== null);
  const inks = live.inks.map(([raw]) => opaque(raw)).filter((value): value is string => value !== null);
  const base = pushBase(live, painted, inks, push);
  pushBrand(live, painted, inks, push);
  pushSurface(live, painted, base.bg, push);
  pushMuted(live, inks, base, push);
  pushBorder(live, push);
  return base.bg;
}

function family(style: LiveStyle | undefined): string | undefined {
  return style?.font || undefined;
}

function pushFonts(live: LivePage, push: Push): void {
  const body = family(styles(live, 'p')[0]) ?? live.families[0]?.[0] ?? family(styles(live, 'body')[0]);
  push('font.body', body, 'paragraph font-family');
  push('font.display', family(styles(live, 'h1')[0]) ?? family(styles(live, 'h2')[0]), 'heading font-family');
  push('font.mono', family(styles(live, 'code')[0]), 'code font-family');
}

function sizeOf(live: LivePage, role: string): number | undefined {
  const sizes = styles(live, role).map((style) => parseFloat(style.size)).filter((size) => Number.isFinite(size) && size > 0);
  return sizes.length > 0 ? Number(mostCommon(sizes.map(String))) : undefined;
}

function pushText(live: LivePage, push: Push): void {
  const base = sizeOf(live, 'p');
  if (base === undefined || base < 10 || base > 24) return;
  push('text.base', `${base}px`, 'paragraph font-size');
  const small = sizeOf(live, 'small');
  if (small !== undefined && small < base) push('text.sm', `${small}px`, 'small font-size');
  let floor = base;
  for (const [role, token] of [['h3', 'text.xl'], ['h2', 'text.2xl'], ['h1', 'text.4xl']] as const) {
    const size = sizeOf(live, role);
    if (size === undefined || size <= floor || size > 160) continue;
    push(token, `${size}px`, `${role} font-size`);
    floor = size;
  }
}

function pushRadii(live: LivePage, push: Push): void {
  const buttonRadius = mostCommon(styles(live, 'button').map((style) => (style.radius && style.radius !== '0px' ? style.radius.split(' ')[0]! : null)));
  if (buttonRadius && lengthPx(buttonRadius) > 0 && lengthPx(buttonRadius) <= 64) push('radius.md', buttonRadius, 'button border-radius');
  const lengths = live.radii.map(([raw]) => raw.split(' ')[0]!).filter((value) => lengthPx(value) > 0);
  const pill = live.radii.some(([raw]) => raw === '50%' || lengthPx(raw.split(' ')[0]!) >= 100);
  const sorted = [...new Set(lengths.filter((value) => lengthPx(value) <= 64).slice(0, 8))].sort((a, b) => lengthPx(a) - lengthPx(b));
  if (sorted.length >= 3) {
    push('radius.sm', sorted[0], 'smallest used border-radius');
    push('radius.md', sorted[Math.floor(sorted.length / 2)], 'middle used border-radius');
    push('radius.lg', sorted.at(-1), 'largest used border-radius');
  } else if (sorted.length > 0) push('radius.md', sorted[0], 'most used border-radius');
  if (pill) push('radius.pill', '9999px', 'pill border-radius');
}

function blurOf(shadow: string): number {
  const lengths = shadow.match(/-?\d*\.?\d+px/g) ?? [];
  return lengths.length >= 3 ? Math.abs(parseFloat(lengths[2] ?? '0')) : 0;
}

function pushShadows(live: LivePage, push: Push): void {
  const valid = live.shadows.map(([raw]) => normalizeShadow(raw)).filter((value): value is string => value !== null && blurOf(value) > 0);
  const sorted = [...new Set(valid)].slice(0, 6).sort((a, b) => blurOf(a) - blurOf(b));
  if (sorted.length === 0) return;
  if (sorted.length === 1) {
    push('shadow.md', sorted[0], 'used box-shadow');
    return;
  }
  push('shadow.sm', sorted[0], 'smallest used box-shadow');
  push('shadow.lg', sorted.at(-1), 'largest used box-shadow');
  if (sorted.length >= 3) push('shadow.md', sorted[Math.floor(sorted.length / 2)], 'middle used box-shadow');
}

function pushSpace(live: LivePage, push: Push): void {
  const frequent = live.gaps.filter(([, count]) => count >= 2);
  const total = frequent.reduce((sum, [, count]) => sum + count, 0);
  if (total < 6) return;
  const onGrid = frequent.filter(([gap]) => gap % 4 === 0);
  const share = onGrid.reduce((sum, [, count]) => sum + count, 0) / total;
  const steps = onGrid.map(([gap]) => gap / 4).filter((step) => REQUIRED_SPACE.has(step));
  if (share < 0.7 || steps.length < 3) return;
  for (const step of steps) push(`space.${step}`, `${step * 4}px`, 'measured gap between stacked blocks (4 px grid)');
}

export function computedCandidates(live: LivePage, label: string): { candidates: Candidate[]; bg?: string } {
  const out: Candidate[] = [];
  const push: Push = (token, value, evidence) => {
    if (value === undefined || value === null) return;
    const found = candidate({ token, confidence: 'medium' }, { value }, 'url', `${label}: computed ${evidence}`, 'medium');
    if (found) out.push(found);
  };
  const bg = pushColors(live, push);
  pushFonts(live, push);
  pushText(live, push);
  pushRadii(live, push);
  pushShadows(live, push);
  pushSpace(live, push);
  return { candidates: out, ...(bg ? { bg } : {}) };
}
