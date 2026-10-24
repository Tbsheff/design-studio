import { parse as parseHtml } from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';
import type * as t from '@babel/types';
import type { ReorderMove } from '../../shared/contracts.js';
import { DirectEditError } from './errors.js';
import type { SourcePosition } from './errors.js';
import { leadingWhitespaceStart, type Splice } from './splice.js';

type HtmlNode = DefaultTreeAdapterMap['childNode'] | DefaultTreeAdapterMap['parentNode'];
type HtmlElement = DefaultTreeAdapterMap['element'];

export const NAME_ATTR = 'data-name';

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const FIXED_TAGS = new Set(['html', 'head', 'body']);
const MAP_METHODS = new Set(['map', 'flatMap']);
const SKIPPED_KEYS = new Set(['loc', 'leadingComments', 'trailingComments', 'innerComments', 'extra']);

interface Range {
  start: number;
  end: number;
}

export interface MovePlan {
  code: string;
  movedStart: number;
}

function cannotMove(message: string): DirectEditError {
  return new DirectEditError('cannot_move', message);
}

function edgeMessage(move: ReorderMove): string {
  return move === 'up' ? 'This element is already first among its siblings' : 'This element is already last among its siblings';
}

export function swapRanges(source: string, first: Range, second: Range): MovePlan & { secondStart: number } {
  const code =
    source.slice(0, first.start) +
    source.slice(second.start, second.end) +
    source.slice(first.end, second.start) +
    source.slice(first.start, first.end) +
    source.slice(second.end);
  const secondStart = first.start + (second.end - second.start) + (second.start - first.end);
  return { code, movedStart: first.start, secondStart };
}

function planSwap(source: string, target: Range, neighbor: Range, move: ReorderMove): MovePlan {
  if (move === 'up') return { code: swapRanges(source, neighbor, target).code, movedStart: neighbor.start };
  const swapped = swapRanges(source, target, neighbor);
  return { code: swapped.code, movedStart: swapped.secondStart };
}

function isHtmlElement(node: HtmlNode): node is HtmlElement {
  return 'tagName' in node;
}

function htmlRange(element: HtmlElement): Range {
  const location = element.sourceCodeLocation;
  if (!location || (!VOID_TAGS.has(element.tagName) && !location.endTag)) {
    throw cannotMove(`<${element.tagName}> has no closing tag in the source, so it cannot move`);
  }
  return { start: location.startOffset, end: location.endOffset };
}

function isBlankBetween(node: HtmlNode): boolean {
  if (node.nodeName === '#comment') return true;
  return node.nodeName === '#text' && 'value' in node && node.value.trim() === '';
}

function htmlNeighbor(element: HtmlElement, move: ReorderMove): HtmlElement {
  const parent = element.parentNode;
  if (!parent || FIXED_TAGS.has(element.tagName)) throw cannotMove(`<${element.tagName}> cannot move`);
  const siblings = parent.childNodes as HtmlNode[];
  const step = move === 'up' ? -1 : 1;
  for (let index = siblings.indexOf(element) + step; index >= 0 && index < siblings.length; index += step) {
    const node = siblings[index] as HtmlNode;
    if (isHtmlElement(node)) {
      if (FIXED_TAGS.has(node.tagName)) throw cannotMove(`<${element.tagName}> cannot move past <${node.tagName}>`);
      return node;
    }
    if (!isBlankBetween(node)) throw cannotMove('Text sits next to this element, so it cannot swap places');
  }
  throw cannotMove(edgeMessage(move));
}

export function planHtmlMove(source: string, element: HtmlElement, move: ReorderMove): MovePlan {
  const neighbor = htmlNeighbor(element, move);
  const target = htmlRange(element);
  const other = htmlRange(neighbor);
  if (move === 'up' ? other.end > target.start : other.start < target.end) throw cannotMove('These elements overlap in the source');
  return planSwap(source, target, other, move);
}

function findHtmlStart(node: HtmlNode, offset: number): HtmlElement | null {
  const children = isHtmlElement(node) && node.tagName === 'template' ? (node as DefaultTreeAdapterMap['template']).content.childNodes : 'childNodes' in node ? node.childNodes : [];
  for (const child of children as HtmlNode[]) {
    if (!isHtmlElement(child)) continue;
    if (child.sourceCodeLocation?.startOffset === offset) return child;
    const nested = findHtmlStart(child, offset);
    if (nested) return nested;
  }
  return null;
}

export function htmlPositionAt(code: string, offset: number): SourcePosition {
  const found = findHtmlStart(parseHtml(code, { sourceCodeLocationInfo: true }), offset);
  const startTag = found?.sourceCodeLocation?.startTag;
  if (!startTag) throw cannotMove('The moved element could not be found again');
  return { line: startTag.startLine, col: startTag.startCol };
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

export function htmlNameSplice(source: string, element: HtmlElement, name: string | null): Splice | null {
  const location = element.sourceCodeLocation?.attrs?.[NAME_ATTR];
  if (location) {
    if (name === null) return { start: leadingWhitespaceStart(source, location.startOffset), end: location.endOffset, text: '' };
    return { start: location.startOffset, end: location.endOffset, text: `${NAME_ATTR}="${escapeAttr(name)}"` };
  }
  if (name === null) return null;
  const startTag = element.sourceCodeLocation?.startTag;
  if (!startTag) throw new DirectEditError('element_not_found', 'The element has no source location');
  const at = startTag.startOffset + 1 + element.tagName.length;
  return { start: at, end: at, text: ` ${NAME_ATTR}="${escapeAttr(name)}"` };
}

function isNode(value: unknown): value is t.Node {
  return typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string';
}

function childNodes(node: t.Node): t.Node[] {
  const out: t.Node[] = [];
  for (const [key, value] of Object.entries(node)) {
    if (SKIPPED_KEYS.has(key)) continue;
    if (Array.isArray(value)) out.push(...value.filter(isNode));
    else if (isNode(value)) out.push(value);
  }
  return out;
}

export function jsxAncestors(root: t.Node, target: t.Node): t.Node[] {
  const parents = new Map<t.Node, t.Node>();
  const stack: t.Node[] = [root];
  while (stack.length > 0) {
    const node = stack.pop() as t.Node;
    if (node === target) break;
    for (const child of childNodes(node)) {
      parents.set(child, node);
      stack.push(child);
    }
  }
  const chain: t.Node[] = [];
  for (let current = parents.get(target); current; current = parents.get(current)) chain.push(current);
  return chain;
}

function isMapCall(node: t.Node, child: t.Node | undefined): boolean {
  if (node.type !== 'CallExpression' || child === undefined || !node.arguments.includes(child as t.CallExpression['arguments'][number])) return false;
  const callee = node.callee;
  if (callee.type !== 'MemberExpression' && callee.type !== 'OptionalMemberExpression') return false;
  if (callee.property.type !== 'Identifier') return false;
  if (MAP_METHODS.has(callee.property.name)) return true;
  return callee.property.name === 'from' && callee.object.type === 'Identifier' && callee.object.name === 'Array';
}

export function assertNotMapped(element: t.JSXElement, ancestors: t.Node[]): void {
  let child: t.Node = element;
  for (const node of ancestors) {
    if (isMapCall(node, child)) throw cannotMove('This element is repeated by a .map() in the source; ask the agent to reorder the data');
    child = node;
  }
}

function isBlankText(node: t.Node): boolean {
  return node.type === 'JSXText' && node.value.trim() === '';
}

function jsxRange(node: t.Node): Range {
  if (typeof node.start !== 'number' || typeof node.end !== 'number') throw new DirectEditError('parse_failed', 'Missing source position');
  return { start: node.start, end: node.end };
}

export function planJsxMove(source: string, element: t.JSXElement, ancestors: t.Node[], move: ReorderMove): MovePlan {
  assertNotMapped(element, ancestors);
  const parent = ancestors[0];
  if (!parent || (parent.type !== 'JSXElement' && parent.type !== 'JSXFragment')) {
    throw cannotMove('This element is not inside another element in the source, so it cannot move');
  }
  const siblings = parent.children.filter((child) => !isBlankText(child));
  const index = siblings.indexOf(element);
  const neighbor = siblings[index + (move === 'up' ? -1 : 1)];
  if (neighbor === undefined) throw cannotMove(edgeMessage(move));
  if (neighbor.type !== 'JSXElement') throw cannotMove('The next item is code or text, not a plain element, so this element cannot swap with it');
  return planSwap(source, jsxRange(element), jsxRange(neighbor), move);
}

export function jsxElementAt(root: t.Node, offset: number): t.JSXElement | null {
  const stack: t.Node[] = [root];
  while (stack.length > 0) {
    const node = stack.pop() as t.Node;
    if (node.type === 'JSXElement' && node.start === offset) return node;
    stack.push(...childNodes(node));
  }
  return null;
}

export function jsxNameAttribute(element: t.JSXElement): t.JSXAttribute | null {
  for (const attribute of element.openingElement.attributes) {
    if (attribute.type === 'JSXAttribute' && attribute.name.type === 'JSXIdentifier' && attribute.name.name === NAME_ATTR) return attribute;
  }
  return null;
}

export function jsxNameLiteral(attribute: t.JSXAttribute): t.StringLiteral {
  const value = attribute.value;
  if (value?.type === 'StringLiteral') return value;
  if (value?.type === 'JSXExpressionContainer' && value.expression.type === 'StringLiteral') return value.expression;
  throw new DirectEditError('attribute_not_literal', `The ${NAME_ATTR} prop is not a plain string; ask the agent to change it`);
}
