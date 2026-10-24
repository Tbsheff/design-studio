import type { PackManifest } from '../../../shared/contracts.js';
import type { LoadedPack } from '../packs.js';
import { requiredPaths } from './names.js';
import type { Candidate, Coverage, CoverageEntry, CoverageGrade, ExtraToken, Harvest, SourceKind, SourceReport } from './types.js';
import { contrast, googleFontsUrlFor, lightnessOf, primaryFamily, readableOn, shiftLightness } from './values.js';

export const SOURCE_ORDER: SourceKind[] = ['tokens-file', 'folder', 'url', 'design-md', 'brief'];

const GROUP_WEIGHTS: Record<string, number> = { color: 0.5, font: 0.2, radius: 0.1, shadow: 0.08, text: 0.06, space: 0.06 };
const TOKEN_WEIGHTS: Record<string, number> = { 'color.bg': 2, 'color.fg': 2, 'color.primary': 2, 'color.success': 0.5, 'color.warning': 0.5, 'color.danger': 0.5 };
const CONFIDENCE_SCORE = { high: 1, medium: 0.75, derived: 0.6, fallback: 0 };
const BRAND_COLORS = new Set(['color.primary', 'color.ring', 'color.success', 'color.warning', 'color.danger']);
export const SYSTEM_FAMILIES = new Set(['arial', 'helvetica', 'helvetica neue', 'segoe ui', 'blinkmacsystemfont', 'menlo', 'monaco', 'consolas', 'courier', 'courier new', 'georgia', 'times', 'times new roman', 'verdana', 'tahoma', 'trebuchet ms', 'sf pro', 'sf pro text', 'sf pro display', 'sf mono', 'apple color emoji', 'segoe ui emoji', 'ui-monospace', 'sfmono-regular', 'liberation mono']);

export interface Pick {
  value: string;
  dark?: string;
  entry: CoverageEntry;
}

export interface MappedDraft {
  tokens: Record<string, unknown>;
  fonts: PackManifest['fonts'];
  coverage: Coverage;
}

interface TokenNode {
  $value?: unknown;
  $extensions?: Record<string, unknown>;
  [key: string]: unknown;
}

function rank(candidate: Candidate): number {
  return SOURCE_ORDER.indexOf(candidate.source) * 2 + (candidate.confidence === 'high' ? 0 : 1);
}

function choose(candidates: Candidate[], token: string, mode: 'light' | 'dark'): Candidate | null {
  const usable = candidates
    .map((candidate, order) => ({ candidate, order }))
    .filter(({ candidate }) => candidate.token === token && (mode === 'dark' ? (candidate.dark ?? candidate.value) : candidate.value) !== undefined);
  usable.sort((a, b) => rank(a.candidate) - rank(b.candidate) || a.order - b.order);
  return usable[0]?.candidate ?? null;
}

function nodeAt(tokens: Record<string, unknown>, token: string): TokenNode | null {
  const [group, name] = token.split('.');
  const groupNode = tokens[group ?? ''];
  if (typeof groupNode !== 'object' || groupNode === null) return null;
  const node = (groupNode as Record<string, unknown>)[name ?? ''];
  return typeof node === 'object' && node !== null ? (node as TokenNode) : null;
}

function baseDark(node: TokenNode | null): string | undefined {
  const modes = node?.$extensions?.['studio.modes'];
  if (typeof modes !== 'object' || modes === null) return undefined;
  const dark = (modes as Record<string, unknown>).dark;
  return typeof dark === 'string' ? dark : undefined;
}

function deriveDark(token: string, value: string): string {
  if (token === 'color.accent') return (lightnessOf(value) ?? 0) > 0.75 ? shiftLightness(value, () => 0.3, 0.7) : shiftLightness(value, (l) => Math.min(0.86, Math.max(0.68, l + 0.18)));
  return shiftLightness(value, (l) => Math.min(0.86, Math.max(0.68, l + 0.18)));
}

function basePick(base: LoadedPack, token: string, mode: 'light' | 'dark'): Pick | null {
  const node = nodeAt(base.tokens as unknown as Record<string, unknown>, token);
  if (!node || typeof node.$value !== 'string') return null;
  const dark = baseDark(node);
  const value = mode === 'dark' && base.manifest.mode === 'light' ? (dark ?? node.$value) : node.$value;
  return { value, ...(mode === 'light' && dark ? { dark } : {}), entry: { token, source: 'base', confidence: 'fallback', evidence: `${base.manifest.name} (base)` } };
}

function derived(token: string, value: string, dark: string | undefined, from: string): Pick {
  return { value, ...(dark ? { dark } : {}), entry: { token, source: 'derived', confidence: 'medium', evidence: `derived from ${from}` } };
}

function darkFor(base: LoadedPack, candidate: Candidate, value: string): string | undefined {
  if (!candidate.token.startsWith('color.')) return undefined;
  if (candidate.dark) return candidate.dark;
  if (BRAND_COLORS.has(candidate.token) || candidate.token === 'color.accent') return deriveDark(candidate.token, value);
  return baseDark(nodeAt(base.tokens as unknown as Record<string, unknown>, candidate.token));
}

function extracted(base: LoadedPack, candidate: Candidate, mode: 'light' | 'dark'): Pick {
  const value = mode === 'dark' ? (candidate.dark ?? candidate.value)! : candidate.value!;
  const dark = mode === 'light' ? darkFor(base, candidate, value) : undefined;
  return { value, ...(dark ? { dark } : {}), entry: { token: candidate.token, source: candidate.source, confidence: candidate.confidence, evidence: candidate.evidence } };
}

type Picks = Map<string, Pick>;

function isReal(picks: Picks, token: string): boolean {
  const pick = picks.get(token);
  return pick !== undefined && pick.entry.source !== 'base';
}

function deriveMissing(picks: Picks, mode: 'light' | 'dark'): void {
  const real = (token: string) => (isReal(picks, token) ? picks.get(token)! : null);
  const set = (token: string, make: () => Pick) => {
    if (!isReal(picks, token)) picks.set(token, make());
  };
  const darkOf = (pick: Pick, fn: (value: string) => string) => (mode === 'light' && pick.dark ? fn(pick.dark) : undefined);
  const primary = real('color.primary');
  const bg = real('color.bg');
  const fg = real('color.fg');
  if (primary) {
    set('color.primary-fg', () => derived('color.primary-fg', readableOn(primary.value), darkOf(primary, readableOn), 'color.primary'));
    set('color.ring', () => derived('color.ring', primary.value, primary.dark, 'color.primary'));
    set('color.accent', () =>
      derived('color.accent', shiftLightness(primary.value, () => (mode === 'dark' ? 0.3 : 0.95), 0.3), darkOf(primary, (value) => shiftLightness(value, () => 0.3, 0.4)), 'color.primary'),
    );
  }
  const accent = real('color.accent');
  if (accent) set('color.accent-fg', () => derived('color.accent-fg', readableOn(accent.value), darkOf(accent, readableOn), 'color.accent'));
  if (bg) {
    const towardsFg = (value: string, step: number) => shiftLightness(value, (l) => (l > 0.5 ? l - step : l + step));
    set('color.surface', () => derived('color.surface', towardsFg(bg.value, 0.025), bg.dark ? towardsFg(bg.dark, 0.035) : undefined, 'color.bg'));
    set('color.border', () => derived('color.border', towardsFg(bg.value, 0.09), bg.dark ? towardsFg(bg.dark, 0.12) : undefined, 'color.bg'));
    if (!fg) set('color.fg', () => derived('color.fg', readableOn(bg.value), darkOf(bg, readableOn), 'color.bg'));
  }
  const text = real('color.fg');
  if (text && (bg || isReal(picks, 'color.bg'))) {
    const muted = (value: string) => shiftLightness(value, (l) => (l < 0.5 ? l + 0.3 : l - 0.25), 0.8);
    set('color.fg-muted', () => derived('color.fg-muted', muted(text.value), text.dark ? muted(text.dark) : undefined, 'color.fg'));
  }
  const body = real('font.body');
  if (body) set('font.display', () => derived('font.display', body.value, undefined, 'font.body'));
}

function guardContrast(picks: Picks): void {
  const fix = (fill: string, ink: string, minimum: number, lightnessGap: number) => {
    const fillPick = picks.get(fill);
    const inkPick = picks.get(ink);
    if (!fillPick || !inkPick) return;
    const weak = (a: string, b: string) => contrast(a, b) < minimum || Math.abs((lightnessOf(a) ?? 0) - (lightnessOf(b) ?? 0)) < lightnessGap;
    const value = weak(fillPick.value, inkPick.value) ? readableOn(fillPick.value) : inkPick.value;
    const fillDark = fillPick.dark;
    const inkDark = inkPick.dark;
    const dark = fillDark && inkDark && weak(fillDark, inkDark) ? readableOn(fillDark) : inkDark;
    if (value === inkPick.value && dark === inkDark) return;
    picks.set(ink, { value, ...(dark ? { dark } : {}), entry: { token: ink, source: 'derived', confidence: 'medium', evidence: `adjusted for contrast on ${fill}` } });
  };
  fix('color.bg', 'color.fg', 7, 0.4);
  fix('color.primary', 'color.primary-fg', 4.5, 0);
  fix('color.accent', 'color.accent-fg', 4.5, 0);
}

export function scoreOf(entries: CoverageEntry[]): number {
  let total = 0;
  for (const [group, weight] of Object.entries(GROUP_WEIGHTS)) {
    const inGroup = entries.filter((entry) => entry.token.startsWith(`${group}.`));
    let sum = 0;
    let weights = 0;
    for (const entry of inGroup) {
      const tokenWeight = TOKEN_WEIGHTS[entry.token] ?? 1;
      const value = entry.source === 'derived' ? CONFIDENCE_SCORE.derived : CONFIDENCE_SCORE[entry.confidence];
      sum += tokenWeight * value;
      weights += tokenWeight;
    }
    total += weights === 0 ? 0 : (weight * sum) / weights;
  }
  return Math.round(total * 100);
}

export function gradeOf(score: number): CoverageGrade {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'usable';
  if (score >= 40) return 'needs-review';
  return 'rebuild';
}

function writeToken(tokens: Record<string, unknown>, token: string, pick: Pick): void {
  const node = nodeAt(tokens, token);
  if (!node) return;
  node.$value = pick.value;
  const extensions = { ...(node.$extensions ?? {}) };
  if (pick.dark) extensions['studio.modes'] = { dark: pick.dark };
  else delete extensions['studio.modes'];
  if (Object.keys(extensions).length > 0) node.$extensions = extensions;
  else delete node.$extensions;
}

function flattenToDark(tokens: Record<string, unknown>): void {
  const visit = (node: unknown) => {
    if (typeof node !== 'object' || node === null) return;
    const record = node as TokenNode;
    if ('$value' in record) {
      const dark = baseDark(record);
      if (dark) record.$value = dark;
      if (record.$extensions) {
        const rest = { ...record.$extensions };
        delete rest['studio.modes'];
        if (Object.keys(rest).length > 0) record.$extensions = rest;
        else delete record.$extensions;
      }
      return;
    }
    for (const [key, child] of Object.entries(record)) if (!key.startsWith('$')) visit(child);
  };
  visit(tokens);
}

function manifestFonts(base: LoadedPack, picks: Picks, harvests: Harvest[]): PackManifest['fonts'] {
  const family = (token: string, fallback: string) => primaryFamily(picks.get(token)?.value ?? '') ?? fallback;
  const display = family('font.display', base.manifest.fonts.display);
  const body = family('font.body', base.manifest.fonts.body);
  const mono = family('font.mono', base.manifest.fonts.mono);
  const changed = ['font.display', 'font.body', 'font.mono'].some((token) => isReal(picks, token));
  if (!changed) return base.manifest.fonts;
  const webFamilies = [display, body, mono].filter((name) => !SYSTEM_FAMILIES.has(name.toLowerCase()));
  const harvested = harvests.map((harvest) => harvest.googleFontsUrl).find((url): url is string => url !== undefined);
  const covers = (url: string) => webFamilies.every((name) => url.includes(`family=${name.replace(/ /g, '+')}`));
  const googleFontsUrl = harvested && covers(harvested) ? harvested : (googleFontsUrlFor(webFamilies) ?? undefined);
  return { display, body, mono, ...(googleFontsUrl ? { googleFontsUrl } : {}) };
}

function cssNameOf(group: string, name: string): string {
  return group === 'color' ? `--${name}` : `--${group}-${name}`;
}

function takenNames(tokens: Record<string, unknown>): Set<string> {
  const out = new Set<string>();
  for (const [group, node] of Object.entries(tokens)) {
    if (group.startsWith('$') || typeof node !== 'object' || node === null) continue;
    const visit = (value: unknown, path: string[]) => {
      if (typeof value !== 'object' || value === null) return;
      if ('$value' in value) {
        out.add(cssNameOf(group, path.join('-')));
        return;
      }
      for (const [key, child] of Object.entries(value)) if (!key.startsWith('$')) visit(child, [...path, key]);
    };
    visit(node, []);
  }
  return out;
}

function addExtras(tokens: Record<string, unknown>, extras: ExtraToken[], mode: 'light' | 'dark'): void {
  const taken = takenNames(tokens);
  for (const extra of extras) {
    const css = cssNameOf(extra.group, extra.name);
    if (taken.has(css)) continue;
    taken.add(css);
    const group = (tokens[extra.group] ??= {}) as Record<string, unknown>;
    const dark = mode === 'light' && extra.dark && extra.dark !== extra.value ? { $extensions: { 'studio.modes': { dark: extra.dark } } } : {};
    group[extra.name] = { $value: mode === 'dark' && extra.dark ? extra.dark : extra.value, $type: extra.type, $description: `From ${extra.evidence}`, ...dark };
  }
}

export function libraryCoverage(pack: LoadedPack): Coverage {
  const tokens = pack.tokens as unknown as Record<string, unknown>;
  const entries: CoverageEntry[] = requiredPaths().map((token) =>
    nodeAt(tokens, token) ? { token, source: 'library', confidence: 'high', evidence: 'set in the saved design system' } : { token, source: 'base', confidence: 'fallback', evidence: 'missing' },
  );
  const score = scoreOf(entries);
  return {
    version: 1,
    score,
    grade: gradeOf(score),
    basePackId: pack.manifest.id,
    mode: pack.manifest.mode,
    tokens: entries,
    fallbacks: entries.filter((entry) => entry.confidence === 'fallback').map((entry) => entry.token),
    sources: [],
  };
}

export function mapDraft(base: LoadedPack, harvests: Harvest[], mode: 'light' | 'dark', sources: SourceReport[]): MappedDraft {
  const candidates = harvests.flatMap((harvest) => harvest.candidates);
  const picks: Picks = new Map();
  for (const token of requiredPaths()) {
    const found = choose(candidates, token, mode);
    const pick = found ? extracted(base, found, mode) : basePick(base, token, mode);
    if (pick) picks.set(token, pick);
  }
  deriveMissing(picks, mode);
  guardContrast(picks);
  const tokens = structuredClone(base.tokens) as unknown as Record<string, unknown>;
  if (mode === 'dark' && base.manifest.mode === 'light') flattenToDark(tokens);
  for (const [token, pick] of picks) if (pick.entry.source !== 'base') writeToken(tokens, token, mode === 'dark' ? { ...pick, dark: undefined } : pick);
  addExtras(tokens, harvests.flatMap((harvest) => harvest.extras ?? []), mode);
  if (tokens.$description !== undefined) tokens.$description = 'Draft tokens made from your sources; gaps filled from the base pack.';
  const entries = requiredPaths().map((token) => picks.get(token)?.entry ?? { token, source: 'base' as const, confidence: 'fallback' as const, evidence: 'missing' });
  const score = scoreOf(entries);
  return {
    tokens,
    fonts: manifestFonts(base, picks, harvests),
    coverage: {
      version: 1,
      score,
      grade: gradeOf(score),
      basePackId: base.manifest.id,
      mode,
      tokens: entries,
      fallbacks: entries.filter((entry) => entry.confidence === 'fallback').map((entry) => entry.token),
      sources,
    },
  };
}
