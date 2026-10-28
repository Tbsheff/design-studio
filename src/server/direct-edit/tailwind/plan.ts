import type { Splice } from '../splice.js';
import { classify, compactSides, emitSided, parseClass, type Classified, type ParsedClass, type Side, type SidedGroup, type SideValue, type SingleGroup } from './classes.js';
import type { CssEdit } from './map.js';
import type { TailwindTheme } from './theme.js';

export interface Segment {
  start: number;
  end: number;
  text: string;
  editable: boolean;
  direct: boolean;
  glueStart: boolean;
  glueEnd: boolean;
  quote: string;
  escape: 'jsx' | 'js' | 'html';
}

export interface ClassSite {
  segments: Segment[];
  dynamic: boolean;
  unsafe: string | null;
  create: ((classes: string) => Splice) | null;
}

export type ClassEdit = (CssEdit & { variants: string }) | { kind: 'add'; token: string } | { kind: 'remove'; token: string };

export interface ClassPlan {
  splices: Splice[];
  classes: string[];
  notes: string[];
}

interface SiteToken {
  id: number;
  raw: string;
  sep: string;
  parsed: ParsedClass;
  cls: Classified | null;
  segment: number;
  editable: boolean;
  partial: boolean;
}

interface SegmentTokens {
  lead: string;
  trail: string;
  tokens: SiteToken[];
}

type Keyed =
  | { kind: 'sided'; variants: string; group: SidedGroup; values: Partial<Record<Side, SideValue | null>>; size: boolean }
  | { kind: 'single'; variants: string; group: SingleGroup; token: string | null };

export class ClassEditError extends Error {}

function tokenize(segment: Segment, index: number, theme: TailwindTheme | null, next: { id: number }): SegmentTokens {
  const lead = /^\s*/.exec(segment.text)?.[0] ?? '';
  const trail = segment.text.length > lead.length ? (/\s*$/.exec(segment.text)?.[0] ?? '') : '';
  const body = segment.text.slice(lead.length, segment.text.length - trail.length);
  const tokens: SiteToken[] = [];
  const pattern = /(\s*)(\S+)/g;
  let match: RegExpExecArray | null;
  const all = [...body.matchAll(pattern)];
  for (const [position, entry] of all.entries()) {
    match = entry;
    const raw = match[2] ?? '';
    const partial = (position === 0 && segment.glueStart && lead === '') || (position === all.length - 1 && segment.glueEnd && trail === '');
    const parsed = parseClass(raw);
    tokens.push({ id: next.id++, raw, sep: position === 0 ? '' : (match[1] ?? ' '), parsed, cls: classify(parsed, theme), segment: index, editable: segment.editable && !partial, partial });
  }
  return { lead, trail, tokens };
}

function partialGroup(token: SiteToken, theme: TailwindTheme | null): Classified | null | 'unknown' {
  const probe = token.raw.endsWith('-') ? `${token.raw}0` : token.raw;
  const parsed = parseClass(probe);
  const cls = classify(parsed, theme);
  return cls ?? 'unknown';
}

function keyOf(variants: string, group: string): string {
  return `${variants}|${group}`;
}

function collect(edits: ClassEdit[], theme: TailwindTheme | null): { keyed: Map<string, Keyed>; adds: string[]; removes: string[] } {
  const keyed = new Map<string, Keyed>();
  const adds: string[] = [];
  const removes: string[] = [];
  const merge = (entry: Keyed) => {
    const key = keyOf(entry.variants, entry.group);
    const prev = keyed.get(key);
    if (prev?.kind === 'sided' && entry.kind === 'sided') prev.values = { ...prev.values, ...entry.values };
    else keyed.set(key, entry);
  };
  for (const edit of edits) {
    if (edit.kind === 'remove') {
      removes.push(edit.token);
      continue;
    }
    if (edit.kind === 'add') {
      const parsed = parseClass(edit.token);
      const cls = classify(parsed, theme);
      if (!cls) adds.push(edit.token);
      else if (cls.kind === 'single') merge({ kind: 'single', variants: parsed.variants, group: cls.group, token: edit.token.slice(parsed.variants.length) });
      else merge({ kind: 'sided', variants: parsed.variants, group: cls.group, values: Object.fromEntries(cls.sides.map((side) => [side, cls.value])), size: cls.size === true });
      continue;
    }
    if (edit.kind === 'sided') merge({ kind: 'sided', variants: edit.variants, group: edit.group, values: edit.values, size: false });
    else merge({ kind: 'single', variants: edit.variants, group: edit.group, token: edit.token });
  }
  return { keyed, adds, removes };
}

function expand(matches: SiteToken[]): Partial<Record<Side, SideValue>> {
  const map: Partial<Record<Side, SideValue>> = {};
  const ordered = [...matches].sort((a, b) => sideCount(b) - sideCount(a));
  for (const token of ordered) {
    if (token.cls?.kind !== 'sided') continue;
    for (const side of token.cls.sides) map[side] = { suffix: token.cls.value.suffix, negative: token.parsed.negative };
  }
  return map;
}

function sideCount(token: SiteToken): number {
  return token.cls?.kind === 'sided' ? token.cls.sides.length : 0;
}

function emitted(entry: Keyed, matches: SiteToken[]): string[] {
  if (entry.kind === 'single') return entry.token === null ? [] : [`${entry.variants}${entry.token}`];
  const map = expand(matches);
  for (const [side, value] of Object.entries(entry.values) as Array<[Side, SideValue | null]>) {
    if (value === null) delete map[side];
    else map[side] = value;
  }
  const useSize = entry.size || matches.some((token) => token.cls?.kind === 'sided' && token.cls.size === true);
  return compactSides(entry.group, map, useSize).map(([part, value]) => emitSided(entry.group, part, value, entry.variants));
}

function homeSegment(site: ClassSite): number {
  const direct = site.segments.findIndex((segment) => segment.editable && segment.direct);
  if (direct !== -1) return direct;
  return site.segments.findIndex((segment) => segment.editable);
}

function escapeToken(token: string, segment: Segment): string {
  if (/["'`\\\s{}<>]/.test(token)) throw new ClassEditError(`The class "${token}" cannot be written into this source`);
  if (segment.escape === 'html') return token.replace(/&/g, '&amp;');
  return token;
}

interface Output {
  replace: Map<number, string[]>;
  removed: Set<number>;
  append: string[];
}

function serialize(segment: Segment, parts: SegmentTokens, output: Output): string {
  const out: Array<{ sep: string; text: string; original: SiteToken | null }> = [];
  const push = (text: string, sep: string, original: SiteToken | null) => out.push({ sep: out.length === 0 ? '' : sep || ' ', text, original });
  const trailingPartial = parts.tokens.at(-1)?.partial && segment.glueEnd ? parts.tokens.at(-1) : undefined;
  const flushAppend = () => {
    for (const token of output.append) push(escapeToken(token, segment), ' ', null);
    output.append = [];
  };
  for (const token of parts.tokens) {
    if (token === trailingPartial) flushAppend();
    const replacement = output.replace.get(token.id);
    if (replacement) {
      replacement.forEach((text, index) => push(escapeToken(text, segment), index === 0 ? token.sep : ' ', null));
      continue;
    }
    if (output.removed.has(token.id)) continue;
    push(token.raw, token.sep, token);
  }
  flushAppend();
  let text = out.map((entry) => entry.sep + entry.text).join('');
  const first = out[0];
  const last = out.at(-1);
  if (segment.glueStart && parts.lead === '' && first && first.original !== parts.tokens[0]) text = ` ${text}`;
  if (segment.glueEnd && parts.trail === '' && last && last.original !== parts.tokens.at(-1)) text = `${text} `;
  return parts.lead + text + parts.trail;
}

const GROUP_LABEL: Partial<Record<string, string>> = { bg: 'the background', color: 'the text color', dims: 'the size', radius: 'the corner radius', 'font-size': 'the font size' };

function assertNoPartials(tokens: SiteToken[], keyed: Map<string, Keyed>, theme: TailwindTheme | null): void {
  for (const token of tokens.filter((entry) => entry.partial)) {
    const group = partialGroup(token, theme);
    const touches = group === 'unknown' || [...keyed.values()].some((entry) => entry.group === group?.group && entry.variants === token.parsed.variants);
    if (touches) throw new ClassEditError(`The class "${token.raw}…" is built at runtime`);
  }
}

function applyKeyed(tokens: SiteToken[], keyed: Map<string, Keyed>, output: Output, notes: string[]): string[] {
  const appendHome: string[] = [];
  for (const entry of keyed.values()) {
    const matches = tokens.filter((token) => !token.partial && token.cls?.group === entry.group && token.parsed.variants === entry.variants);
    const editable = matches.filter((token) => token.editable);
    if (matches.length > editable.length) notes.push(`A condition in this className also sets ${GROUP_LABEL[entry.group] ?? entry.group.replace('-', ' ')}; it wins when it applies.`);
    const result = emitted(entry, editable);
    for (const token of editable) output.removed.add(token.id);
    const anchor = editable.at(-1);
    if (anchor && result.length > 0) output.replace.set(anchor.id, result);
    else if (!anchor) appendHome.push(...result);
  }
  return appendHome;
}

function applyRemoves(tokens: SiteToken[], removes: string[], output: Output): void {
  for (const raw of removes) {
    const hits = tokens.filter((token) => token.raw === raw);
    const editable = hits.filter((token) => token.editable);
    if (hits.length > 0 && editable.length === 0) throw new ClassEditError(`The class "${raw}" comes from a condition or an expression; edit the source to change it`);
    for (const token of editable) output.removed.add(token.id);
  }
}

function segmentSplices(site: ClassSite, parts: SegmentTokens[], output: Output, home: number, fresh: string[]): Splice[] {
  const splices: Splice[] = [];
  site.segments.forEach((segment, index) => {
    const own = parts[index];
    if (!own) return;
    const ids = new Set(own.tokens.map((token) => token.id));
    const local: Output = {
      replace: new Map([...output.replace].filter(([id]) => ids.has(id))),
      removed: new Set([...output.removed].filter((id) => ids.has(id))),
      append: index === home ? fresh : [],
    };
    if (local.replace.size === 0 && local.removed.size === 0 && local.append.length === 0) return;
    const text = serialize(segment, own, local);
    if (text !== segment.text) splices.push({ start: segment.start, end: segment.end, text });
  });
  return splices;
}

export function planClassEdit(site: ClassSite, edits: ClassEdit[], theme: TailwindTheme | null): ClassPlan {
  if (site.unsafe) throw new ClassEditError(site.unsafe);
  const next = { id: 0 };
  const parts = site.segments.map((segment, index) => tokenize(segment, index, theme, next));
  const tokens = parts.flatMap((entry) => entry.tokens);
  const { keyed, adds, removes } = collect(edits, theme);
  assertNoPartials(tokens, keyed, theme);
  const notes: string[] = [];
  const output: Output = { replace: new Map(), removed: new Set(), append: [] };
  const appendHome = applyKeyed(tokens, keyed, output, notes);
  applyRemoves(tokens, removes, output);
  const kept = new Set(tokens.filter((token) => !output.removed.has(token.id)).map((token) => token.raw));
  const planned = new Set([...output.replace.values()].flat());
  const fresh = [...new Set([...appendHome, ...adds])].filter((raw) => !kept.has(raw) && !planned.has(raw));
  const home = homeSegment(site);
  if (home === -1) {
    if (fresh.length === 0) return { splices: [], classes: [...kept], notes };
    if (!site.create || site.segments.length > 0) throw new ClassEditError('This className has no plain string to add classes to');
    return { splices: [site.create(fresh.join(' '))], classes: fresh, notes };
  }
  const splices = segmentSplices(site, parts, output, home, fresh);
  const classes = site.segments.flatMap((segment) => {
    if (!segment.editable) return [];
    const splice = splices.find((entry) => entry.start === segment.start);
    return (splice ? splice.text : segment.text).split(/\s+/).filter(Boolean);
  });
  return { splices, classes, notes };
}

export function siteClasses(site: ClassSite): string[] {
  return site.segments.filter((segment) => segment.editable).flatMap((segment) => segment.text.split(/\s+/).filter(Boolean));
}
