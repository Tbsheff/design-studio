import { parse } from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';
import { applyDeclarationChanges, parseDeclarations, serializeDeclarations } from './css.js';
import { DirectEditError, TEXT_NOT_EDITABLE_MESSAGE, assertSameTag } from './errors.js';
import type { PatchResult, SourceEdit, SourcePosition } from './errors.js';
import { hasClassChange } from './classes.js';
import { applySplices, leadingWhitespaceStart, type Splice } from './splice.js';
import { htmlNameSplice, htmlPositionAt, planHtmlMove } from './structure.js';
import { decideClassEdit, describeSite, type TailwindTheme } from './tailwind/index.js';
import { htmlClassSite } from './tailwind/html-site.js';
import { variantCssProps, variantCssSplices } from './variant-css.js';
import type { TailwindOutcome } from '../../shared/contracts.js';

type ParentNode = DefaultTreeAdapterMap['parentNode'];
type ChildNode = DefaultTreeAdapterMap['childNode'];
type Element = DefaultTreeAdapterMap['element'];
type Template = DefaultTreeAdapterMap['template'];
type TextNode = DefaultTreeAdapterMap['textNode'];

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
]);
const NON_TEXT_ELEMENTS = new Set(['script', 'style', 'template', 'iframe', 'noscript', 'xmp', 'noembed', 'noframes', 'plaintext']);

function isElement(node: ChildNode | ParentNode): node is Element {
  return 'tagName' in node;
}

function isTextNode(node: ChildNode): node is TextNode {
  return node.nodeName === '#text';
}

function childrenOf(node: ParentNode): ChildNode[] {
  if (isElement(node) && node.tagName === 'template') return (node as Template).content.childNodes;
  return node.childNodes;
}

function startsAt(element: Element, position: SourcePosition): boolean {
  const startTag = element.sourceCodeLocation?.startTag;
  return startTag !== undefined && startTag.startLine === position.line && startTag.startCol === position.col;
}

export function findElementAt(root: ParentNode, position: SourcePosition): Element | null {
  for (const child of childrenOf(root)) {
    if (!isElement(child)) continue;
    if (startsAt(child, position)) return child;
    const nested = findElementAt(child, position);
    if (nested) return nested;
  }
  return null;
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function startTagOf(element: Element): NonNullable<NonNullable<Element['sourceCodeLocation']>['startTag']> {
  const startTag = element.sourceCodeLocation?.startTag;
  if (!startTag) throw new DirectEditError('element_not_found', 'The element has no source location');
  return startTag;
}

const HIDDEN_PREFIX = 'display: none; ';

function visibilitySplice(source: string, location: { startOffset: number; endOffset: number }, value: string | null, hasDisplay: boolean): Splice | null {
  const raw = source.slice(location.startOffset, location.endOffset);
  const quote = /^style\s*=\s*["']/i.exec(raw);
  if (!quote) return null;
  const at = location.startOffset + quote[0].length;
  if (value === 'none' && !hasDisplay) return { start: at, end: at, text: HIDDEN_PREFIX };
  const rest = raw.slice(quote[0].length, -1);
  if (value === null && rest.startsWith(HIDDEN_PREFIX) && rest.length > HIDDEN_PREFIX.length) return { start: at, end: at + HIDDEN_PREFIX.length, text: '' };
  return null;
}

function styleSplice(source: string, element: Element, style: Record<string, string | null>): Splice | null {
  const attr = element.attrs.find((entry) => entry.name === 'style');
  const attrLocation = element.sourceCodeLocation?.attrs?.style;
  const keys = Object.keys(style);
  if (attr && attrLocation && keys.length === 1 && keys[0] === 'display') {
    const hasDisplay = parseDeclarations(attr.value).some((entry) => entry.prop === 'display');
    const quick = visibilitySplice(source, attrLocation, style.display ?? null, hasDisplay);
    if (quick) return quick;
  }
  const declarations = applyDeclarationChanges(attr ? parseDeclarations(attr.value) : [], style);
  const serialized = serializeDeclarations(declarations);
  if (attr && attrLocation) {
    if (serialized === '') {
      return { start: leadingWhitespaceStart(source, attrLocation.startOffset), end: attrLocation.endOffset, text: '' };
    }
    return { start: attrLocation.startOffset, end: attrLocation.endOffset, text: `style="${escapeAttr(serialized)}"` };
  }
  if (serialized === '') return null;
  const insertAt = startTagOf(element).startOffset + 1 + element.tagName.length;
  return { start: insertAt, end: insertAt, text: ` style="${escapeAttr(serialized)}"` };
}

function assertTextTarget(element: Element): ChildNode[] {
  if (VOID_ELEMENTS.has(element.tagName) || NON_TEXT_ELEMENTS.has(element.tagName)) {
    throw new DirectEditError('text_not_editable', `The text of <${element.tagName}> cannot be edited directly`);
  }
  const children = childrenOf(element);
  const onlyText = children.length === 0 || (children.length === 1 && children[0] !== undefined && isTextNode(children[0]));
  if (!onlyText) throw new DirectEditError('text_not_editable', TEXT_NOT_EDITABLE_MESSAGE);
  return children;
}

function textSplice(source: string, element: Element, text: string): Splice {
  const children = assertTextTarget(element);
  const escaped = escapeText(text);
  const [child] = children;
  if (child === undefined) {
    if (!element.sourceCodeLocation?.endTag) {
      throw new DirectEditError('text_not_editable', `The <${element.tagName}> element has no end tag`);
    }
    const at = startTagOf(element).endOffset;
    return { start: at, end: at, text: escaped };
  }
  const location = child.sourceCodeLocation;
  if (!location) throw new DirectEditError('text_not_editable', 'The text has no source location');
  const raw = source.slice(location.startOffset, location.endOffset);
  if (raw.trim() === '') return { start: location.startOffset, end: location.endOffset, text: escaped };
  const lead = /^\s*/.exec(raw)?.[0] ?? '';
  const trail = /\s*$/.exec(raw)?.[0] ?? '';
  return { start: location.startOffset, end: location.endOffset, text: `${lead}${escaped}${trail}` };
}

const INSERT_SNIPPET: Record<NonNullable<SourceEdit['insert']>, string> = {
  text: '<p data-name="Text">Text</p>',
  frame: '<div data-name="Frame" style="display: flex; flex-direction: column; gap: 8px; min-height: 96px; padding: 16px; border: 1px dashed #b4b4b4;"></div>',
  rect: '<div data-name="Rectangle" style="width: 120px; height: 80px; background: #d9d9d9;"></div>',
  ellipse: '<div data-name="Ellipse" style="width: 96px; height: 96px; border-radius: 50%; background: #d9d9d9;"></div>',
};

function insertSplice(source: string, element: Element, kind: NonNullable<SourceEdit['insert']>): Splice {
  const endTag = element.sourceCodeLocation?.endTag;
  if (VOID_ELEMENTS.has(element.tagName) || NON_TEXT_ELEMENTS.has(element.tagName) || !endTag) {
    throw new DirectEditError('invalid_request', `Elements cannot be added inside <${element.tagName}>`);
  }
  const lineStart = source.lastIndexOf('\n', startTagOf(element).startOffset) + 1;
  const indent = /^[ \t]*/.exec(source.slice(lineStart))?.[0] ?? '';
  const before = source.slice(0, endTag.startOffset);
  const closeOnOwnLine = /\n[ \t]*$/.test(before);
  const at = closeOnOwnLine ? before.lastIndexOf('\n') : endTag.startOffset;
  const text = `\n${indent}  ${INSERT_SNIPPET[kind]}${closeOnOwnLine ? '' : `\n${indent}`}`;
  return { start: at, end: at, text };
}

export function htmlElementSpan(source: string, loc: SourcePosition): { start: number; end: number } | null {
  const element = findElementAt(parse(source, { sourceCodeLocationInfo: true }), loc);
  const location = element?.sourceCodeLocation;
  return location ? { start: location.startOffset, end: location.endOffset } : null;
}

function classOrStyleSplices(source: string, element: Element, style: Record<string, string | null>, edit: SourceEdit, theme: TailwindTheme | null): { splices: Splice[]; tailwind?: TailwindOutcome } {
  const decision = decideClassEdit(() => htmlClassSite(source, element), style, edit.classes, theme, edit.variant ?? '');
  if (decision.kind !== 'classes') {
    const splice = Object.keys(style).length > 0 ? styleSplice(source, element, style) : null;
    return { splices: splice ? [splice] : [], ...(decision.kind === 'inline' ? { tailwind: decision.fallback.outcome } : {}) };
  }
  if (decision.patch.variant) return { splices: decision.patch.plan.splices, tailwind: decision.patch.outcome };
  const mapped = new Set(decision.patch.inlineProps);
  const attr = element.attrs.find((entry) => entry.name === 'style');
  const present = new Set(attr ? parseDeclarations(attr.value).map((entry) => entry.prop) : []);
  const inline: Record<string, string | null> = {};
  for (const [prop, value] of Object.entries(style)) {
    if (!mapped.has(prop)) inline[prop] = value;
    else if (present.has(prop)) inline[prop] = null;
  }
  const styleChange = Object.keys(inline).length > 0 ? styleSplice(source, element, inline) : null;
  return { splices: [...decision.patch.plan.splices, ...(styleChange ? [styleChange] : [])], tailwind: decision.patch.outcome };
}

export function htmlClassInfo(source: string, loc: SourcePosition, theme: TailwindTheme | null): TailwindOutcome | null {
  const element = findElementAt(parse(source, { sourceCodeLocationInfo: true }), loc);
  return element ? describeSite(htmlClassSite(source, element), theme) : null;
}

function variantCssPatch(source: string, document: DefaultTreeAdapterMap['document'], element: Element, style: Record<string, string | null>, edit: SourceEdit): PatchResult {
  if (hasClassChange(edit.classes)) throw new DirectEditError('variant_not_supported', 'This page does not use Tailwind, so classes cannot take a variant. Send style instead');
  const splices = Object.keys(style).length > 0 && edit.variant ? variantCssSplices(source, document, element, style, edit.variant) : [];
  return { code: applySplices(source, splices), tag: element.tagName, applied: { style: Object.keys(style), text: false } };
}

export function htmlVariantProps(source: string, loc: SourcePosition, variant: string): string[] {
  const document = parse(source, { sourceCodeLocationInfo: true });
  const element = findElementAt(document, loc);
  return element ? variantCssProps(document, element, variant) : [];
}

export function patchHtml(source: string, loc: SourcePosition, edit: SourceEdit, theme: TailwindTheme | null = null): PatchResult {
  const document = parse(source, { sourceCodeLocationInfo: true });
  const element = findElementAt(document, loc);
  if (!element) throw new DirectEditError('element_not_found', `No element starts at line ${loc.line}, column ${loc.col}`);
  assertSameTag(edit.tag, element.tagName);
  if (edit.move !== undefined) {
    const plan = planHtmlMove(source, element, edit.move);
    return { code: plan.code, tag: element.tagName, applied: { style: [], text: false }, moved: htmlPositionAt(plan.code, plan.movedStart) };
  }
  if (edit.insert !== undefined) {
    const code = applySplices(source, [insertSplice(source, element, edit.insert)]);
    return { code, tag: element.tagName, applied: { style: [], text: false } };
  }
  const splices: Splice[] = [];
  if (edit.name !== undefined) {
    const splice = htmlNameSplice(source, element, edit.name);
    if (splice) splices.push(splice);
  }
  const style = edit.style ?? {};
  const styleKeys = Object.keys(style);
  if (edit.variant && !theme) return variantCssPatch(source, document, element, style, edit);
  const classed = classOrStyleSplices(source, element, style, edit, theme);
  splices.push(...classed.splices);
  const classes = hasClassChange(edit.classes);
  const hasText = edit.text !== undefined;
  if (edit.text !== undefined) splices.push(textSplice(source, element, edit.text));
  return { code: applySplices(source, splices), tag: element.tagName, applied: { style: styleKeys, text: hasText, ...(classes ? { classes } : {}) }, ...(classed.tailwind ? { tailwind: classed.tailwind } : {}) };
}
