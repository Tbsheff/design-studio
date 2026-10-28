import { randomBytes } from 'node:crypto';
import type { DefaultTreeAdapterMap } from 'parse5';
import { DEFAULT_BREAKPOINTS, parseVariant, type ParsedVariant } from '../../shared/variants.js';
import { applyDeclarationChanges, parseDeclarations, serializeDeclarations } from './css.js';
import { DirectEditError } from './errors.js';
import type { Splice } from './splice.js';

type Document = DefaultTreeAdapterMap['document'];
type ParentNode = DefaultTreeAdapterMap['parentNode'];
type Element = DefaultTreeAdapterMap['element'];

export const VARIANT_STYLE_ATTR = 'data-studio-variants';
const KEY_CLASS = /^sv-[a-z0-9]{6}$/;
const RULE_LINE = /^(?:@media (.+?) \{ )?(\.sv-[a-z0-9]{6}(?::[a-z-]+)*) \{ (.*?) \}(?: \})?$/;

interface Rule {
  media: string | null;
  selector: string;
  body: string;
}

function isElement(node: unknown): node is Element {
  return typeof node === 'object' && node !== null && 'tagName' in node;
}

function findTag(root: ParentNode, test: (element: Element) => boolean): Element | null {
  for (const child of root.childNodes) {
    if (!isElement(child)) continue;
    if (test(child)) return child;
    const nested = findTag(child, test);
    if (nested) return nested;
  }
  return null;
}

function breakpointPx(name: string): number {
  const hit = DEFAULT_BREAKPOINTS.find((entry) => entry.name === name);
  if (!hit) throw new DirectEditError('variant_not_supported', `${name} is not a breakpoint. Use one of ${DEFAULT_BREAKPOINTS.map((entry) => entry.name).join(', ')}`);
  return hit.px;
}

function mediaOf(variant: ParsedVariant): string | null {
  const parts = [...(variant.breakpoint ? [`(min-width: ${breakpointPx(variant.breakpoint)}px)`] : []), ...(variant.dark ? ['(prefers-color-scheme: dark)'] : [])];
  return parts.length > 0 ? parts.join(' and ') : null;
}

function selectorOf(key: string, variant: ParsedVariant): string {
  return `.${key}${variant.states.map((state) => `:${state}`).join('')}`;
}

function keyOf(element: Element): string | null {
  const value = element.attrs.find((attr) => attr.name === 'class')?.value ?? '';
  return value.split(/\s+/).find((token) => KEY_CLASS.test(token)) ?? null;
}

function keySplice(element: Element, key: string): Splice {
  const attr = element.attrs.find((entry) => entry.name === 'class');
  const location = element.sourceCodeLocation;
  const startTag = location?.startTag;
  if (!startTag) throw new DirectEditError('element_not_found', 'The element has no source location');
  const attrLocation = location.attrs?.class;
  if (attr && attrLocation) {
    const text = attr.value.trim() === '' ? key : `${attr.value.trim()} ${key}`;
    return { start: attrLocation.startOffset, end: attrLocation.endOffset, text: `class="${text.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"` };
  }
  const at = startTag.startOffset + 1 + element.tagName.length;
  return { start: at, end: at, text: ` class="${key}"` };
}

function readRules(text: string): Rule[] {
  return text
    .split('\n')
    .map((line) => RULE_LINE.exec(line.trim()))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => ({ media: match[1] ?? null, selector: match[2] ?? '', body: match[3] ?? '' }));
}

function rank(rule: Rule): [number, number, number] {
  const width = /min-width: (\d+)px/.exec(rule.media ?? '')?.[1];
  return [width ? Number(width) : 0, rule.media?.includes('prefers-color-scheme') ? 1 : 0, rule.selector.split(':').length];
}

function compareRules(a: Rule, b: Rule): number {
  const ra = rank(a);
  const rb = rank(b);
  return ra[0] - rb[0] || ra[1] - rb[1] || ra[2] - rb[2];
}

function writeRules(rules: Rule[]): string {
  const lines = [...rules].sort(compareRules).map((rule) => (rule.media ? `@media ${rule.media} { ${rule.selector} { ${rule.body} } }` : `${rule.selector} { ${rule.body} }`));
  return `\n${lines.join('\n')}\n`;
}

function styleBlockSplice(source: string, document: Document, rules: Rule[]): Splice {
  const block = findTag(document, (element) => element.tagName === 'style' && element.attrs.some((attr) => attr.name === VARIANT_STYLE_ATTR));
  const content = writeRules(rules);
  const location = block?.sourceCodeLocation;
  if (block && location?.startTag && location.endTag) return { start: location.startTag.endOffset, end: location.endTag.startOffset, text: content };
  const tag = `<style ${VARIANT_STYLE_ATTR}>${content}</style>`;
  const body = findTag(document, (element) => element.tagName === 'body')?.sourceCodeLocation?.endTag;
  if (body) return { start: body.startOffset, end: body.startOffset, text: `${tag}\n` };
  if (source.trim() === '') throw new DirectEditError('variant_not_supported', 'This file is empty, so it has no place for a style rule');
  return { start: source.length, end: source.length, text: `\n${tag}\n` };
}

function currentRules(document: Document): Rule[] {
  const block = findTag(document, (element) => element.tagName === 'style' && element.attrs.some((attr) => attr.name === VARIANT_STYLE_ATTR));
  const text = block?.childNodes.map((node) => ('value' in node ? String(node.value) : '')).join('') ?? '';
  return readRules(text);
}

export function variantCssSplices(source: string, document: Document, element: Element, style: Record<string, string | null>, raw: string): Splice[] {
  const variant = parseVariant(raw);
  if (!variant) throw new DirectEditError('invalid_request', `Unknown variant ${raw}`);
  const existing = keyOf(element);
  const key = existing ?? `sv-${randomBytes(4).toString('hex').slice(0, 6)}`;
  const media = mediaOf(variant);
  const selector = selectorOf(key, variant);
  const rules = currentRules(document);
  const index = rules.findIndex((rule) => rule.selector === selector && rule.media === media);
  const before = index === -1 ? [] : parseDeclarations(rules[index]?.body ?? '');
  const body = serializeDeclarations(applyDeclarationChanges(before, style));
  const next = rules.filter((_, at) => at !== index);
  if (body !== '') next.push({ media, selector, body });
  const splices = [styleBlockSplice(source, document, next)];
  if (!existing) splices.push(keySplice(element, key));
  return splices;
}

export function variantCssProps(document: Document, element: Element, raw: string): { prop: string; value: string }[] {
  const variant = parseVariant(raw);
  const key = keyOf(element);
  if (!variant || !key) return [];
  let media: string | null;
  try {
    media = mediaOf(variant);
  } catch {
    return [];
  }
  const selector = selectorOf(key, variant);
  const rule = currentRules(document).find((entry) => entry.selector === selector && entry.media === media);
  return rule ? parseDeclarations(rule.body).filter((entry) => entry.prop !== '').map((entry) => ({ prop: entry.prop, value: entry.value })) : [];
}
