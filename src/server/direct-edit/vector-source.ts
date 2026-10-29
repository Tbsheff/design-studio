import path from 'node:path';
import type * as t from '@babel/types';
import { parse, type DefaultTreeAdapterMap } from 'parse5';
import { DirectEditError, type SourcePosition } from './errors.js';
import { findElementAt } from './html.js';
import { findJsxElement, parseSource } from './jsx.js';

type HtmlElement = DefaultTreeAdapterMap['element'];

export interface VNode {
  tag: string;
  attrs: Record<string, string>;
  style: Record<string, string>;
  dynamic: string[];
  start: number;
  end: number;
  openEnd: number;
  inner: { start: number; end: number } | null;
  children: VNode[];
  line: number;
  col: number;
}

export interface VectorDoc {
  html: boolean;
  typescript: boolean;
  node(at: SourcePosition): VNode;
  svgOf(node: VNode): VNode | null;
}

export function isHtmlFile(relative: string): boolean {
  return /\.html?$/i.test(relative);
}

export function isTypeScriptFile(relative: string): boolean {
  const extension = path.extname(relative).toLowerCase();
  return extension !== '.js' && extension !== '.jsx';
}

function stale(at: SourcePosition): DirectEditError {
  return new DirectEditError('stale_selection', `No element starts at line ${at.line}, column ${at.col}. Select it again.`);
}

function cssText(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of text.split(';')) {
    const colon = part.indexOf(':');
    if (colon > 0) out[part.slice(0, colon).trim().toLowerCase()] = part.slice(colon + 1).trim();
  }
  return out;
}

function htmlNode(element: HtmlElement): VNode {
  const location = element.sourceCodeLocation;
  if (!location?.startTag) throw new DirectEditError('element_not_found', 'The element has no source location');
  const attrs: Record<string, string> = {};
  for (const attr of element.attrs) attrs[attr.name] = attr.value;
  const children = element.childNodes.filter((child): child is HtmlElement => 'tagName' in child && Boolean(child.sourceCodeLocation)).map(htmlNode);
  const endTag = location.endTag;
  return {
    tag: element.tagName,
    attrs,
    style: cssText(attrs.style ?? ''),
    dynamic: [],
    start: location.startOffset,
    end: location.endOffset,
    openEnd: location.startTag.endOffset,
    inner: endTag ? { start: location.startTag.endOffset, end: endTag.startOffset } : null,
    children,
    line: location.startTag.startLine,
    col: location.startTag.startCol,
  };
}

function htmlDoc(code: string): VectorDoc {
  const root = parse(code, { sourceCodeLocationInfo: true });
  const found = new Map<VNode, HtmlElement>();
  return {
    html: true,
    typescript: false,
    node(at) {
      const element = findElementAt(root, at);
      if (!element) throw stale(at);
      const node = htmlNode(element);
      found.set(node, element);
      return node;
    },
    svgOf(node) {
      let parent = found.get(node)?.parentNode;
      while (parent && 'tagName' in parent) {
        if (parent.tagName === 'svg') return htmlNode(parent);
        parent = parent.parentNode;
      }
      return null;
    },
  };
}

function jsxName(element: t.JSXElement): string {
  const name = element.openingElement.name;
  return name.type === 'JSXIdentifier' ? name.name : name.type === 'JSXNamespacedName' ? `${name.namespace.name}:${name.name.name}` : '';
}

function literalOf(node: t.Node | null | undefined): string | null {
  if (!node) return null;
  if (node.type === 'StringLiteral') return node.value;
  if (node.type === 'NumericLiteral') return String(node.value);
  if (node.type === 'UnaryExpression' && node.operator === '-' && node.argument.type === 'NumericLiteral') return String(-node.argument.value);
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) return node.quasis.map((quasi) => quasi.value.cooked ?? '').join('');
  if (node.type === 'JSXExpressionContainer') return literalOf(node.expression as t.Node);
  return null;
}

const SVG_ATTRS: Record<string, string> = { strokeWidth: 'stroke-width', strokeLinecap: 'stroke-linecap', strokeLinejoin: 'stroke-linejoin', fillRule: 'fill-rule', clipRule: 'clip-rule', className: 'class' };

function kebab(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function styleObject(node: t.Node | null | undefined): Record<string, string> | null {
  const expression = node?.type === 'JSXExpressionContainer' ? node.expression : null;
  if (!expression || expression.type !== 'ObjectExpression') return null;
  const out: Record<string, string> = {};
  for (const prop of expression.properties) {
    if (prop.type !== 'ObjectProperty') return null;
    const key = prop.key.type === 'Identifier' ? prop.key.name : prop.key.type === 'StringLiteral' ? prop.key.value : null;
    const value = literalOf(prop.value);
    if (key === null || value === null) return null;
    out[kebab(key)] = prop.value.type === 'NumericLiteral' ? `${value}px` : value;
  }
  return out;
}

function jsxAttrs(element: t.JSXElement): Pick<VNode, 'attrs' | 'style' | 'dynamic'> {
  const attrs: Record<string, string> = {};
  const dynamic: string[] = [];
  let style: Record<string, string> = {};
  for (const attribute of element.openingElement.attributes) {
    if (attribute.type !== 'JSXAttribute') {
      dynamic.push('...spread');
      continue;
    }
    const name = attribute.name.type === 'JSXIdentifier' ? attribute.name.name : `${attribute.name.namespace.name}:${attribute.name.name.name}`;
    if (name === 'style') {
      const parsed = styleObject(attribute.value);
      if (parsed) style = parsed;
      else dynamic.push('style');
      continue;
    }
    const value = attribute.value === null ? 'true' : literalOf(attribute.value);
    if (value === null) dynamic.push(name);
    else attrs[SVG_ATTRS[name] ?? name] = value;
  }
  return { attrs, style, dynamic };
}

function jsxNode(element: t.JSXElement): VNode {
  const children = element.children.filter((child): child is t.JSXElement => child.type === 'JSXElement').map(jsxNode);
  const opening = element.openingElement;
  const closing = element.closingElement;
  return {
    tag: jsxName(element),
    ...jsxAttrs(element),
    start: element.start ?? 0,
    end: element.end ?? 0,
    openEnd: opening.end ?? 0,
    inner: closing ? { start: opening.end ?? 0, end: closing.start ?? 0 } : null,
    children,
    line: opening.loc?.start.line ?? 0,
    col: (opening.loc?.start.column ?? 0) + 1,
  };
}

function svgElements(root: t.Node): t.JSXElement[] {
  const out: t.JSXElement[] = [];
  const stack: unknown[] = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node !== 'object') continue;
    if (Array.isArray(node)) {
      stack.push(...node);
      continue;
    }
    const typed = node as t.Node;
    if (typed.type === 'JSXElement' && jsxName(typed) === 'svg') out.push(typed);
    for (const [key, value] of Object.entries(typed)) if (key !== 'loc' && key !== 'leadingComments' && key !== 'trailingComments' && value && typeof value === 'object') stack.push(value);
  }
  return out;
}

function jsxDoc(code: string, typescript: boolean): VectorDoc {
  const file = parseSource(code, typescript);
  let svgs: t.JSXElement[] | null = null;
  return {
    html: false,
    typescript,
    node(at) {
      const element = findJsxElement(file.program, at);
      if (!element) throw stale(at);
      return jsxNode(element);
    },
    svgOf(node) {
      svgs ??= svgElements(file.program);
      let best: t.JSXElement | null = null;
      for (const svg of svgs) {
        const start = svg.start ?? 0;
        const end = svg.end ?? 0;
        if (start < node.start && end >= node.end && (!best || start > (best.start ?? 0))) best = svg;
      }
      return best ? jsxNode(best) : null;
    },
  };
}

export function vectorDoc(relative: string, code: string): VectorDoc {
  if (isHtmlFile(relative)) return htmlDoc(code);
  if (!/\.(?:[jt]sx?|mjs)$/i.test(relative)) throw new DirectEditError('invalid_request', `${relative} is not an HTML or JSX file`);
  return jsxDoc(code, isTypeScriptFile(relative));
}
