import { parseExpression } from '@babel/parser';
import type * as t from '@babel/types';
import { parseFragment } from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';
import { indentUnit, refuse } from './structure-ops.js';

type HtmlNode = DefaultTreeAdapterMap['childNode'];
type HtmlElement = DefaultTreeAdapterMap['element'];

export interface Snippet {
  pieces: string[];
  tags: string[];
  components: string[];
  references: string[];
}

const PREFIX = '<>\n';
const LITERALS = new Set(['StringLiteral', 'NumericLiteral', 'BooleanLiteral', 'NullLiteral', 'BigIntLiteral']);
const CODE_HINT = 'insert_jsx takes markup only; add logic with write_file or the agent';

interface Found {
  components: Set<string>;
  references: Set<string>;
}

function rootName(name: t.JSXOpeningElement['name']): string | null {
  if (name.type === 'JSXIdentifier') return /^[A-Z]/.test(name.name) ? name.name : null;
  if (name.type === 'JSXNamespacedName') throw refuse(`<${name.namespace.name}:${name.name.name}> is not a tag the studio can insert`);
  let object: t.JSXMemberExpression['object'] = name.object;
  while (object.type === 'JSXMemberExpression') object = object.object;
  return object.name;
}

function tagText(name: t.JSXOpeningElement['name']): string {
  if (name.type === 'JSXIdentifier') return name.name;
  if (name.type === 'JSXNamespacedName') return `${name.namespace.name}:${name.name.name}`;
  return `${tagText(name.object)}.${name.property.name}`;
}

function referenceRoot(node: t.Node): string | null {
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression' && !node.computed && node.property.type === 'Identifier') return referenceRoot(node.object);
  return null;
}

function calleeName(node: t.CallExpression | t.OptionalCallExpression): string {
  const callee = node.callee;
  if (callee.type === 'Identifier') return callee.name;
  if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') return `….${callee.property.name}`;
  return 'a function';
}

function callReason(node: t.CallExpression | t.OptionalCallExpression, where: string): string {
  const name = calleeName(node);
  if (/^use[A-Z]/.test(name)) return `${where} calls the hook ${name}(). Hooks are code, not markup; ${CODE_HINT}`;
  if (name.endsWith('.map')) return `${where} has a .map() loop. Write each row out in the snippet; ${CODE_HINT}`;
  return `${where} calls ${name}(). Pass plain values (className="a b", not cn(...)); ${CODE_HINT}`;
}

function codeReason(node: t.Node, where: string): string {
  if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') return `${where} has a function. Pass a reference to a handler the file has, such as onClick={handleSave}, or leave the prop out; ${CODE_HINT}`;
  if (node.type === 'CallExpression' || node.type === 'OptionalCallExpression') return callReason(node, where);
  if (node.type === 'ConditionalExpression' || node.type === 'LogicalExpression') return `${where} has a condition (? : or &&). Insert the markup for one state; ${CODE_HINT}`;
  return `${where} has code (${node.type}). Use text, string props, numbers, a style object or a reference; ${CODE_HINT}`;
}

function checkObject(node: t.ObjectExpression, where: string, found: Found): void {
  for (const prop of node.properties) {
    if (prop.type !== 'ObjectProperty' || prop.computed) throw refuse(`${where} has an object with code in it; use plain keys and values`);
    checkValue(prop.value as t.Expression, where, found);
  }
}

function isPlainTemplate(node: t.Node): boolean {
  return node.type === 'TemplateLiteral' && node.expressions.length === 0;
}

function isNegativeNumber(node: t.Node): boolean {
  return node.type === 'UnaryExpression' && node.operator === '-' && node.argument.type === 'NumericLiteral';
}

function checkValue(node: t.Expression | t.JSXEmptyExpression, where: string, found: Found): void {
  if (node.type === 'JSXEmptyExpression' || LITERALS.has(node.type) || isPlainTemplate(node) || isNegativeNumber(node)) return;
  if (node.type === 'JSXElement' || node.type === 'JSXFragment') return walk(node, found);
  if (node.type === 'ObjectExpression') return checkObject(node, where, found);
  if (node.type === 'ArrayExpression') {
    for (const item of node.elements) if (item) checkValue(item as t.Expression, where, found);
    return;
  }
  const ref = referenceRoot(node);
  if (ref === null) throw refuse(codeReason(node, where));
  if (ref !== 'undefined') found.references.add(ref);
}

function checkAttribute(attr: t.JSXAttribute | t.JSXSpreadAttribute, tag: string, found: Found): void {
  if (attr.type === 'JSXSpreadAttribute') throw refuse(`<${tag}> spreads props ({...}). Pass each prop by name`);
  const name = attr.name.type === 'JSXIdentifier' ? attr.name.name : `${attr.name.namespace.name}:${attr.name.name.name}`;
  const value = attr.value;
  if (!value || value.type === 'StringLiteral') return;
  if (value.type === 'JSXElement' || value.type === 'JSXFragment') return walk(value, found);
  checkValue(value.expression, `${name} on <${tag}>`, found);
}

function walkChild(node: t.JSXElement['children'][number], found: Found): void {
  if (node.type === 'JSXText') return;
  if (node.type === 'JSXSpreadChild') throw refuse('The snippet spreads children ({...}); write them out');
  if (node.type === 'JSXExpressionContainer') return checkValue(node.expression, 'A { } block in the snippet', found);
  walk(node, found);
}

function walk(node: t.JSXElement | t.JSXFragment, found: Found): void {
  if (node.type === 'JSXElement') {
    const name = node.openingElement.name;
    const root = rootName(name);
    if (root) found.components.add(root);
    for (const attr of node.openingElement.attributes) checkAttribute(attr, tagText(name), found);
  }
  for (const child of node.children) walkChild(child, found);
}

function parseJsx(jsx: string, typescript: boolean): t.JSXFragment {
  try {
    const expression = parseExpression(`${PREFIX}${jsx}\n</>`, { plugins: typescript ? ['jsx', 'typescript'] : ['jsx'], errorRecovery: false });
    if (expression.type !== 'JSXFragment') throw new Error('not JSX');
    return expression;
  } catch (error) {
    const raw = error instanceof Error ? error.message.replace(/\s*\(\d+:\d+\)$/, '') : String(error);
    const at = (error as { loc?: { line: number; column: number } }).loc;
    const where = at ? ` at line ${Math.max(1, at.line - 1)}, column ${at.column + 1}` : '';
    throw refuse(`The snippet is not valid JSX${where}: ${raw}. Pass elements only, such as <Card><CardHeader>…</CardHeader></Card>`);
  }
}

function roots(fragment: t.JSXFragment): (t.JSXElement | t.JSXFragment)[] {
  const out: (t.JSXElement | t.JSXFragment)[] = [];
  for (const child of fragment.children) {
    if (child.type === 'JSXText' && child.value.trim() === '') continue;
    if (child.type !== 'JSXElement' && child.type !== 'JSXFragment') throw refuse('The top level of the snippet must be elements; put text inside an element');
    out.push(child);
  }
  if (out.length === 0) throw refuse('The snippet has no elements');
  return out;
}

function leadOf(source: string, offset: number): string {
  const start = source.lastIndexOf('\n', offset - 1) + 1;
  const lead = source.slice(start, offset);
  return /^[ \t]*$/.test(lead) ? lead : '';
}

export function normalize(text: string, lead: string, to: string): string {
  const lines = text.split('\n').map((line, index) => (index > 0 && line.startsWith(lead) ? line.slice(lead.length) : line));
  const from = indentUnit(lines.join('\n'));
  if (from === to || /`/.test(text)) return lines.join('\n');
  return lines
    .map((line) => {
      const match = /^[ \t]+/.exec(line);
      if (!match) return line;
      const depth = Math.round(match[0].replace(/\t/g, from).length / from.length);
      return to.repeat(depth) + line.slice(match[0].length);
    })
    .join('\n');
}

export function parseJsxSnippet(jsx: string, typescript: boolean, fileIndent: string): Snippet {
  const source = `${PREFIX}${jsx}\n</>`;
  const list = roots(parseJsx(jsx, typescript));
  const found: Found = { components: new Set(), references: new Set() };
  for (const root of list) walk(root, found);
  const pieces = list.map((root) => normalize(source.slice(root.start ?? 0, root.end ?? 0), leadOf(source, root.start ?? 0), fileIndent));
  const tags = list.map((root) => (root.type === 'JSXElement' ? tagText(root.openingElement.name) : 'fragment'));
  return { pieces, tags, components: [...found.components], references: [...found.references] };
}

function checkHtmlElement(element: HtmlElement): void {
  if (element.tagName === 'script') throw refuse('The snippet has a <script>. insert_jsx takes markup only');
  for (const attr of element.attrs) {
    if (/^on/i.test(attr.name)) throw refuse(`<${element.tagName}> has an ${attr.name} handler. insert_jsx takes markup only`);
    if (/^\s*javascript:/i.test(attr.value)) throw refuse(`<${element.tagName}> has a javascript: link. Use a plain URL`);
  }
  const kids = element.tagName === 'template' ? (element as DefaultTreeAdapterMap['template']).content.childNodes : element.childNodes;
  for (const child of kids) if ('tagName' in child) checkHtmlElement(child);
}

function htmlRoots(nodes: HtmlNode[]): HtmlElement[] {
  const out: HtmlElement[] = [];
  for (const node of nodes) {
    if (node.nodeName === '#comment') continue;
    if (node.nodeName === '#text') {
      if ((node as DefaultTreeAdapterMap['textNode']).value.trim() === '') continue;
      throw refuse('The top level of the snippet must be elements; put text inside an element');
    }
    if ('tagName' in node) out.push(node);
  }
  if (out.length === 0) throw refuse('The snippet has no elements');
  return out;
}

export function parseHtmlSnippet(html: string, fileIndent: string): Snippet {
  const fragment = parseFragment(html, { sourceCodeLocationInfo: true });
  const list = htmlRoots(fragment.childNodes);
  list.forEach(checkHtmlElement);
  const pieces = list.map((root) => {
    const at = root.sourceCodeLocation;
    if (!at) throw refuse(`<${root.tagName}> could not be read from the snippet`);
    return normalize(html.slice(at.startOffset, at.endOffset), leadOf(html, at.startOffset), fileIndent);
  });
  return { pieces, tags: list.map((root) => root.tagName), components: [], references: [] };
}
