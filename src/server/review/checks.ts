import { differenceEuclidean, formatHex, parse, wcagContrast, type Color } from 'culori';
import type { CompiledTokenEntry, DirectStyleProperty, LayoutFinding, SourceLoc } from '../../shared/contracts.js';
import { DIRECT_STYLE_PROPERTIES } from '../../shared/contracts.js';
import type { ReviewFix, ReviewKind, ReviewSeverity } from '../../shared/review.js';
import { modeValue, resolveTokenValue, tokenFieldState } from '../../shared/token-match.js';
import type { ProbeElement, TokenHit } from './probe.js';

export interface FixGuard {
  literal?: string;
  noArbitrary?: boolean;
  classes?: string[];
}

export interface Draft {
  kind: ReviewKind;
  key: string;
  severity: ReviewSeverity;
  selector: string | null;
  source: string | null;
  element: string;
  message: string;
  fix: ReviewFix | null;
  guard?: FixGuard;
  hint: string;
}

export interface AxeCheck {
  id: string;
  data?: Record<string, unknown> | null;
}

export interface AxeNode {
  target: unknown[];
  html: string;
  failureSummary?: string;
  any?: AxeCheck[];
}

export interface AxeViolation {
  id: string;
  impact?: string | null;
  help: string;
  nodes: AxeNode[];
}

export const REVIEW_AXE_RULES = ['color-contrast', 'target-size', 'image-alt', 'input-image-alt', 'svg-img-alt', 'role-img-alt', 'area-alt', 'object-alt', 'button-name', 'link-name', 'label', 'select-name', 'aria-allowed-attr', 'aria-required-attr', 'html-has-lang'];
export const AXE_NODES_PER_RULE = 20;
const ALT_RULES = new Set(['image-alt', 'input-image-alt', 'svg-img-alt', 'role-img-alt', 'area-alt', 'object-alt']);
const LOC = /^(.+):(\d+):(\d+)$/;
const TAP_MIN = 24;
const STYLE_PROPS = new Set<string>(DIRECT_STYLE_PROPERTIES);

export function parseLoc(raw: string | null): SourceLoc | null {
  const match = raw ? LOC.exec(raw) : null;
  return match ? { file: match[1] as string, line: Number(match[2]), col: Number(match[3]) } : null;
}

export function axeSelector(node: AxeNode): string | null {
  const first = node.target[0];
  return typeof first === 'string' && node.target.length === 1 ? first : null;
}

function label(el: ProbeElement | null, fallback: string): string {
  if (!el) return fallback;
  return el.text ? `${el.tag} "${el.text}"` : el.tag;
}

function firstLine(text: string | undefined): string {
  return (text ?? '').split('\n').map((line) => line.trim()).filter((line) => line && !/^fix (any|all) of the following:?$/i.test(line))[0] ?? '';
}

function impactSeverity(impact: string | null | undefined): ReviewSeverity {
  if (impact === 'critical' || impact === 'serious') return 'high';
  return impact === 'moderate' ? 'medium' : 'low';
}

function editFor(el: ProbeElement, style: Partial<Record<DirectStyleProperty, string>>): ReviewFix['edit'] | null {
  const source = parseLoc(el.loc);
  return source ? { source, selector: el.selector, tag: el.tag, style } : null;
}

function base(kind: ReviewKind, el: ProbeElement | null, selector: string | null, html: string): Pick<Draft, 'kind' | 'selector' | 'source' | 'element'> {
  return { kind, selector: el?.selector ?? selector, source: el?.loc ?? el?.nearLoc ?? null, element: label(el, html.slice(0, 60)) };
}

function resolvedColor(entry: CompiledTokenEntry, entries: CompiledTokenEntry[]): Color | null {
  let value = modeValue(entry, 'light');
  for (let step = 0; step < 4 && value.includes('var('); step += 1) value = resolveTokenValue(value, entries);
  const color = parse(value);
  return color && (color.alpha ?? 1) >= 0.999 ? color : null;
}

interface PassingToken {
  cssVar: string;
  hex: string;
  ratio: number;
}

const OKLAB_DISTANCE = differenceEuclidean('oklab');

export function nearestPassingToken(fg: string, bg: string, need: number, entries: CompiledTokenEntry[]): PassingToken | null {
  const text = parse(fg);
  const back = parse(bg);
  if (!text || !back) return null;
  let best: (PassingToken & { distance: number }) | null = null;
  for (const entry of entries) {
    if (entry.type !== 'color') continue;
    const color = resolvedColor(entry, entries);
    if (!color) continue;
    const ratio = wcagContrast(color, back);
    if (ratio < need) continue;
    const distance = OKLAB_DISTANCE(text, color);
    if (!best || distance < best.distance) best = { cssVar: entry.cssVar, hex: formatHex(color) ?? '', ratio: Math.round(ratio * 100) / 100, distance };
  }
  return best ? { cssVar: best.cssVar, hex: best.hex, ratio: best.ratio } : null;
}

function contrastData(node: AxeNode): { fg: string; bg: string; ratio: number; need: number } | null {
  const data = (node.any ?? []).find((check) => check.id === 'color-contrast')?.data ?? node.any?.[0]?.data;
  if (!data || typeof data.fgColor !== 'string' || typeof data.bgColor !== 'string') return null;
  return { fg: data.fgColor, bg: data.bgColor, ratio: Number(data.contrastRatio) || 0, need: parseFloat(String(data.expectedContrastRatio ?? '4.5')) || 4.5 };
}

function contrastDraft(node: AxeNode, el: ProbeElement | null, entries: CompiledTokenEntry[]): Draft {
  const selector = axeSelector(node);
  const data = contrastData(node);
  const head = base('contrast', el, selector, node.html);
  if (!data) return { ...head, key: `${selector}`, severity: 'medium', message: firstLine(node.failureSummary) || 'Text contrast is too low.', fix: null, hint: 'Make the text color and the background meet WCAG AA contrast with the project tokens.' };
  const token = nearestPassingToken(data.fg, data.bg, data.need, entries);
  const edit = token && el ? editFor(el, { color: `var(${token.cssVar})` }) : null;
  const tail = token ? ` The nearest token that passes is ${token.cssVar} (${token.hex}, ${token.ratio}:1).` : ' No color token of the project passes on this background.';
  return {
    ...head,
    key: `${selector}|${data.fg}|${data.bg}`,
    severity: data.ratio < 3 ? 'high' : 'medium',
    message: `Text contrast is ${data.ratio}:1 (${data.fg} on ${data.bg}); it needs ${data.need}:1.${tail}`,
    fix: edit && token ? { label: `Use ${token.cssVar}`, edit } : null,
    hint: token ? `Use ${token.cssVar} for the text, or another token that passes.` : 'Pick a text color or a background from the tokens that meets WCAG AA.',
  };
}

function grow(size: number): number {
  if (size >= TAP_MIN) return 0;
  const half = Math.ceil((TAP_MIN - size) / 2);
  return half + (half % 2);
}

function tapEdit(el: ProbeElement): ReviewFix['edit'] | null {
  if (el.display === 'inline' || el.display === 'contents' || el.display === 'none') return null;
  const v = grow(el.height);
  const h = grow(el.width);
  const [top, right, bottom, left] = el.padding;
  const style: Partial<Record<DirectStyleProperty, string>> = {};
  if (v > 0) Object.assign(style, { 'padding-top': `${top + v}px`, 'padding-bottom': `${bottom + v}px` });
  if (h > 0) Object.assign(style, { 'padding-left': `${left + h}px`, 'padding-right': `${right + h}px` });
  return Object.keys(style).length > 0 ? editFor(el, style) : null;
}

function tapDraft(node: AxeNode, el: ProbeElement | null): Draft {
  const selector = axeSelector(node);
  const head = base('tap-target', el, selector, node.html);
  const size = el ? `${el.width}x${el.height} px` : 'too small';
  const edit = el ? tapEdit(el) : null;
  return {
    ...head,
    key: `${selector}`,
    severity: el && Math.min(el.width, el.height) < 16 ? 'high' : 'medium',
    message: `This target is ${size}; tap targets need at least ${TAP_MIN}x${TAP_MIN} px or more space around them.`,
    fix: edit ? { label: 'Add padding', edit } : null,
    hint: `Make the target at least ${TAP_MIN}x${TAP_MIN} px, for example with padding, without changing how it looks more than needed.`,
  };
}

function axeDraft(violation: AxeViolation, node: AxeNode, el: ProbeElement | null): Draft {
  const selector = axeSelector(node);
  const alt = ALT_RULES.has(violation.id);
  const detail = firstLine(node.failureSummary);
  return {
    ...base(alt ? 'alt-text' : 'a11y', el, selector, node.html),
    key: `${violation.id}|${selector}`,
    severity: alt ? 'high' : impactSeverity(violation.impact),
    message: `${violation.help}.${detail ? ` ${detail}.` : ''}`.replace(/\.\./g, '.'),
    fix: null,
    hint: alt ? 'Write alt text that says what the image shows, or alt="" when it is only decoration.' : `Fix the ${violation.id} rule from axe-core.`,
  };
}

export function axeDrafts(violations: AxeViolation[], elements: Record<string, ProbeElement | null>, entries: CompiledTokenEntry[]): Draft[] {
  return violations.flatMap((violation) =>
    violation.nodes.slice(0, AXE_NODES_PER_RULE).map((node) => {
      const selector = axeSelector(node);
      const el = selector ? (elements[selector] ?? null) : null;
      if (violation.id === 'color-contrast') return contrastDraft(node, el, entries);
      if (violation.id === 'target-size') return tapDraft(node, el);
      return axeDraft(violation, node, el);
    }),
  );
}

const LAYOUT_TEXT: Record<LayoutFinding['kind'], string> = {
  clipped: 'Content is cut off',
  'past-viewport': 'This element runs past the frame edge',
  'scrolls-sideways': 'Content scrolls sideways',
};

export function layoutDrafts(findings: LayoutFinding[]): Draft[] {
  return findings.map((finding) => ({
    kind: 'clipped',
    key: `${finding.kind}|${finding.selector}`,
    severity: finding.severity === 'error' ? 'high' : 'low',
    selector: finding.selector,
    source: finding.source,
    element: finding.text ? `"${finding.text}"` : finding.selector,
    message: `${LAYOUT_TEXT[finding.kind]}: ${finding.detail}.`,
    fix: null,
    hint: 'Let the content fit: wrap or shorten the text, let the box grow, or make the layout responsive. Keep all content visible.',
  }));
}

const CLASS_PROPS: Record<string, DirectStyleProperty[]> = {
  p: ['padding-top', 'padding-right', 'padding-bottom', 'padding-left'],
  px: ['padding-left', 'padding-right'],
  py: ['padding-top', 'padding-bottom'],
  pt: ['padding-top'],
  pr: ['padding-right'],
  pb: ['padding-bottom'],
  pl: ['padding-left'],
  m: ['margin-top', 'margin-right', 'margin-bottom', 'margin-left'],
  mx: ['margin-left', 'margin-right'],
  my: ['margin-top', 'margin-bottom'],
  mt: ['margin-top'],
  mr: ['margin-right'],
  mb: ['margin-bottom'],
  ml: ['margin-left'],
  gap: ['gap'],
  rounded: ['border-radius'],
  w: ['width'],
  h: ['height'],
  bg: ['background-color'],
};

const COLOR_VALUE = /^(#|rgb|hsl|oklch|oklab|lab|lch)/i;

function classProps(utility: string, value: string): DirectStyleProperty[] {
  const color = COLOR_VALUE.test(value);
  if (utility === 'text') return [color ? 'color' : 'font-size'];
  if (utility === 'border') return [color ? 'border-color' : 'border-width'];
  return CLASS_PROPS[utility] ?? [];
}

function inlineProps(prop: string): DirectStyleProperty[] {
  if (prop === 'background') return ['background-color'];
  return STYLE_PROPS.has(prop) ? [prop as DirectStyleProperty] : [];
}

interface TokenPick {
  value: string;
  cssVar: string | null;
  note: string;
}

function tokenPick(prop: DirectStyleProperty, value: string, entries: CompiledTokenEntry[]): TokenPick | null {
  const state = tokenFieldState(prop, value, entries);
  if (state.kind === 'token') return { value: `var(${state.match.cssVar})`, cssVar: state.match.cssVar, note: ` It equals the token ${state.match.cssVar}.` };
  if (state.kind === 'raw' && state.snap) return { value: `var(${state.snap.cssVar})`, cssVar: state.snap.cssVar, note: ` The nearest token is ${state.snap.cssVar} (${state.snap.value}).` };
  if (state.kind === 'raw' && state.nearest) return { value: '', cssVar: null, note: ` The nearest token, ${state.nearest.cssVar} (${state.nearest.value}), is not close.` };
  return null;
}

function hitPick(hit: TokenHit, props: DirectStyleProperty[], entries: CompiledTokenEntry[], tailwind: boolean): TokenPick | null {
  const first = props[0];
  const pick = first ? tokenPick(first, hit.value, entries) : null;
  if (pick?.cssVar) return pick;
  const length = first !== undefined && !COLOR_VALUE.test(hit.value);
  if (hit.via === 'class' && tailwind && length) return { value: hit.value, cssVar: null, note: pick?.note ?? '' };
  return pick;
}

function hitSubject(hit: TokenHit): string {
  if (hit.via === 'class') return `The class ${hit.cls}`;
  if (hit.via === 'rule') return `The CSS rule ${hit.rule} (${hit.prop}: ${hit.value})`;
  return `The inline style ${hit.prop}: ${hit.value}`;
}

function fixable(hit: TokenHit, props: DirectStyleProperty[]): boolean {
  if (props.length === 0 || hit.via === 'rule') return false;
  return hit.via === 'inline' || !hit.variants;
}

function tokenFix(hit: TokenHit, el: ProbeElement | undefined, props: DirectStyleProperty[], pick: TokenPick | null): ReviewFix | null {
  if (!el || !pick || pick.value === '' || !fixable(hit, props)) return null;
  const edit = editFor(el, Object.fromEntries(props.map((prop) => [prop, pick.value])));
  if (!edit) return null;
  return { label: pick.cssVar ? `Use ${pick.cssVar}` : 'Use the theme scale', edit };
}

function tokenHint(hit: TokenHit, pick: TokenPick | null): string {
  if (hit.via === 'rule') return `Change the value in the CSS rule ${hit.rule} to a project token.`;
  if (hit.variants) return `Change ${hit.cls} to a token class and keep the variant ${hit.variants}.`;
  return pick?.cssVar ? `Use ${pick.cssVar}.` : 'Use the nearest design token or theme step, or add a token if the value is needed.';
}

function tokenDraft(hit: TokenHit, el: ProbeElement | undefined, entries: CompiledTokenEntry[], tailwind: boolean): Draft | null {
  const props = hit.via === 'class' ? classProps(hit.prop, hit.value) : inlineProps(hit.prop);
  const pick = props.length > 0 ? hitPick(hit, props, entries, tailwind) : null;
  if (hit.via !== 'class' && !pick) return null;
  const fix = tokenFix(hit, el, props, pick);
  const color = COLOR_VALUE.test(hit.value);
  const guard: FixGuard = { literal: hit.via === 'class' ? hit.cls : hit.value, noArbitrary: pick?.cssVar === null, classes: el?.classes ?? [] };
  return {
    kind: 'off-token',
    key: `${hit.selector}|${hit.via}|${hit.prop}|${hit.value}`,
    severity: color ? 'medium' : 'low',
    selector: hit.selector,
    source: el?.loc ?? el?.nearLoc ?? null,
    element: label(el ?? null, hit.selector),
    message: `${hitSubject(hit)} is a raw ${color ? 'color' : 'value'}, not a project token.${pick?.note ?? ''}`,
    fix,
    ...(fix ? { guard } : {}),
    hint: tokenHint(hit, pick),
  };
}

export function tokenDrafts(hits: TokenHit[], elements: Record<string, ProbeElement>, entries: CompiledTokenEntry[], tailwind: boolean): Draft[] {
  const usable = entries.length > 0 ? hits : hits.filter((hit) => hit.via === 'class');
  return usable.map((hit) => tokenDraft(hit, elements[hit.selector], entries, tailwind)).filter((draft): draft is Draft => draft !== null);
}
