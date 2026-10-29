import path from 'node:path';
import { parse as parseHtml } from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';
import type * as t from '@babel/types';
import { DirectEditError, assertSameTag } from './errors.js';
import type { SourcePosition } from './errors.js';
import { findElementAt } from './html.js';
import { findJsxElement, parseSource } from './jsx.js';
import { leadingWhitespaceStart } from './splice.js';
import { assertNotMapped, jsxAncestors, jsxElementsOnLine } from './structure.js';
import { refuse, type Frame, type StructNode } from './structure-ops.js';

type HtmlElement = DefaultTreeAdapterMap['element'];
type HtmlParent = DefaultTreeAdapterMap['parentNode'];

export type NodeRole = 'target' | 'into' | 'ref' | 'insert';

export interface DocNode extends StructNode {
  branch: boolean;
}

export interface StructureDoc {
  node(loc: SourcePosition, role: NodeRole, tag?: string): DocNode;
  frame(gap: string): Frame;
  closeTag(node: StructNode): string;
  verify(code: string, at: SourcePosition[]): void;
}

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const NO_CHILD_TAGS = new Set(['script', 'style', 'template', 'iframe', 'noscript', 'textarea', 'title', 'html', 'head']);
const FIXED_TAGS = new Set(['html', 'head', 'body']);
const CONDITION_TYPES = new Set(['ConditionalExpression', 'LogicalExpression']);
const FUNCTION_TYPES = new Set(['ArrowFunctionExpression', 'FunctionExpression', 'FunctionDeclaration', 'ObjectMethod', 'ClassMethod']);

function notFound(loc: SourcePosition): DirectEditError {
  return new DirectEditError('element_not_found', `No element starts at line ${loc.line}, column ${loc.col}`);
}

function htmlChildren(element: HtmlElement): HtmlElement[] {
  const nodes = element.tagName === 'template' ? (element as DefaultTreeAdapterMap['template']).content.childNodes : element.childNodes;
  return nodes.filter((node): node is HtmlElement => 'tagName' in node);
}

function htmlInner(element: HtmlElement): StructNode['inner'] {
  const location = element.sourceCodeLocation;
  if (VOID_TAGS.has(element.tagName) || NO_CHILD_TAGS.has(element.tagName) || !location?.startTag || !location.endTag) return null;
  return { start: location.startTag.endOffset, end: location.endTag.startOffset };
}

function htmlNode(element: HtmlElement): StructNode {
  const location = element.sourceCodeLocation;
  if (!location || (!VOID_TAGS.has(element.tagName) && !location.endTag)) throw refuse(`<${element.tagName}> has no closing tag in the source`);
  const parent = element.parentNode as HtmlParent | null;
  const parentStart = parent && 'sourceCodeLocation' in parent ? (parent.sourceCodeLocation?.startOffset ?? -1) : -1;
  const children = htmlChildren(element).flatMap((child) => {
    const range = child.sourceCodeLocation;
    return range ? [{ start: range.startOffset, end: range.endOffset }] : [];
  });
  return { start: location.startOffset, end: location.endOffset, tag: element.tagName, parent: parentStart, root: false, fixed: FIXED_TAGS.has(element.tagName), inner: htmlInner(element), selfClose: null, children };
}

function htmlDoc(source: string): StructureDoc {
  const document = parseHtml(source, { sourceCodeLocationInfo: true });
  return {
    node(loc, role, tag) {
      const element = findElementAt(document, loc);
      if (!element) throw notFound(loc);
      assertSameTag(tag, element.tagName);
      const node = { ...htmlNode(element), branch: false };
      return role === 'into' ? { ...node, fixed: element.tagName !== 'body' && node.fixed } : node;
    },
    frame: (gap) => ({ open: `<div data-name="Frame" style="display: flex; flex-direction: column; gap: ${gap};">`, close: '</div>' }),
    closeTag: (node) => `</${node.tag}>`,
    verify(code, at) {
      const next = parseHtml(code, { sourceCodeLocationInfo: true });
      if (at.some((loc) => !findElementAt(next, loc))) throw refuse('The changed element could not be found again');
    },
  };
}

function jsxTag(source: string, element: t.JSXElement): string {
  const name = element.openingElement.name;
  return name.start != null && name.end != null ? source.slice(name.start, name.end) : 'element';
}

function isJsxParent(node: t.Node | undefined): node is t.JSXElement | t.JSXFragment {
  return node?.type === 'JSXElement' || node?.type === 'JSXFragment';
}

function staticReason(node: t.Node): string | null {
  if (CONDITION_TYPES.has(node.type)) return 'This element is shown by a condition in the code (? : or &&); ask the agent to change it';
  if (node.type === 'JSXExpressionContainer') return 'This element sits inside a { } code block; ask the agent to change it';
  if (node.type === 'JSXAttribute') return 'This element is passed as a prop; ask the agent to change it';
  if (node.type === 'CallExpression' || node.type === 'OptionalCallExpression') return 'This element is made by a function call in the code; ask the agent to change it';
  return null;
}

function assertNotRepeated(element: t.JSXElement, ancestors: t.Node[]): void {
  try {
    assertNotMapped(element, ancestors);
  } catch {
    throw refuse('This element is repeated by a .map() in the source; ask the agent to change it');
  }
}

function assertStatic(element: t.JSXElement, ancestors: t.Node[]): void {
  assertNotRepeated(element, ancestors);
  for (const node of ancestors) {
    if (FUNCTION_TYPES.has(node.type)) return;
    const reason = staticReason(node);
    if (reason) throw refuse(reason);
  }
}

function isBranch(element: t.JSXElement, parent: t.Node | undefined): boolean {
  if (parent?.type === 'ConditionalExpression') return parent.consequent === element || parent.alternate === element;
  return parent?.type === 'LogicalExpression' && parent.right === element;
}

function assertInsertable(element: t.JSXElement, ancestors: t.Node[]): boolean {
  assertNotRepeated(element, ancestors);
  if (isJsxParent(ancestors[0])) return false;
  if (isBranch(element, ancestors[0])) return true;
  assertStatic(element, ancestors);
  return false;
}

function checkRole(element: t.JSXElement, ancestors: t.Node[], role: NodeRole): boolean {
  if (role === 'insert') return assertInsertable(element, ancestors);
  if (role === 'into') assertNotRepeated(element, ancestors);
  else assertStatic(element, ancestors);
  return false;
}

function jsxSelfClose(source: string, element: t.JSXElement): StructNode['selfClose'] {
  if (!element.openingElement.selfClosing || typeof element.openingElement.end !== 'number') return null;
  const end = element.openingElement.end;
  return { start: leadingWhitespaceStart(source, end - 2), end };
}

function jsxNode(source: string, element: t.JSXElement, ancestors: t.Node[]): StructNode {
  const start = element.start ?? 0;
  const end = element.end ?? 0;
  const parent = ancestors[0];
  const closing = element.closingElement;
  const inner = closing && typeof element.openingElement.end === 'number' && typeof closing.start === 'number' ? { start: element.openingElement.end, end: closing.start } : null;
  const children = element.children.flatMap((child) => (child.type === 'JSXElement' && child.start != null && child.end != null ? [{ start: child.start, end: child.end }] : []));
  return { start, end, tag: jsxTag(source, element), parent: parent?.start ?? -1, root: !isJsxParent(parent), fixed: false, inner, selfClose: jsxSelfClose(source, element), children };
}

function onlyOnLine(source: string, root: t.Node, loc: SourcePosition, tag: string | undefined): t.JSXElement | null {
  if (tag === undefined) return null;
  const matches = jsxElementsOnLine(root, loc.line).filter((element) => jsxTag(source, element) === tag);
  return matches.length === 1 ? (matches[0] ?? null) : null;
}

function jsxDoc(source: string, typescript: boolean): StructureDoc {
  const ast = parseSource(source, typescript);
  return {
    node(loc, role, tag) {
      const element = findJsxElement(ast.program, loc) ?? onlyOnLine(source, ast.program, loc, tag);
      if (!element) throw notFound(loc);
      assertSameTag(tag, jsxTag(source, element));
      const ancestors = jsxAncestors(ast.program, element);
      const branch = checkRole(element, ancestors, role);
      return { ...jsxNode(source, element, ancestors), branch };
    },
    frame: (gap) => ({ open: `<div data-name="Frame" style={{ display: 'flex', flexDirection: 'column', gap: '${gap}' }}>`, close: '</div>' }),
    closeTag: (node) => `</${node.tag}>`,
    verify(code, at) {
      const next = parseSource(code, typescript);
      if (at.some((loc) => !findJsxElement(next.program, loc))) throw refuse('The changed element could not be found again');
    },
  };
}

export function structureDoc(relative: string, source: string): StructureDoc {
  const extension = path.extname(relative).toLowerCase();
  if (extension === '.html' || extension === '.htm') return htmlDoc(source);
  return jsxDoc(source, extension === '.tsx');
}
