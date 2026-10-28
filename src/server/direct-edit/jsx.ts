import { parse } from '@babel/parser';
import type { ParserPlugin } from '@babel/parser';
import type * as t from '@babel/types';
import MagicString from 'magic-string';
import { DirectEditError, TEXT_NOT_EDITABLE_MESSAGE, assertSameTag } from './errors.js';
import type { PatchResult, SourceEdit, SourcePosition } from './errors.js';
import { leadingWhitespaceStart } from './splice.js';
import { NAME_ATTR, jsxAncestors, jsxElementAt, jsxNameAttribute, jsxNameLiteral, planJsxMove } from './structure.js';
import { decideClassEdit, describeSite, type TailwindTheme } from './tailwind/index.js';
import { jsxClassSite } from './tailwind/jsx-site.js';
import type { TailwindOutcome } from '../../shared/contracts.js';

interface JsxPatchOptions {
  typescript?: boolean;
  tailwind?: TailwindTheme | null;
}

interface StyleEntry {
  node: t.ObjectExpression['properties'][number];
  key: string | null;
}

interface StylePlan {
  removed: Set<number>;
  additions: string[];
}

const SKIPPED_KEYS = new Set(['loc', 'leadingComments', 'trailingComments', 'innerComments', 'extra']);

function isNode(value: unknown): value is t.Node {
  return typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string';
}

function pushChildren(stack: t.Node[], node: t.Node): void {
  for (const [key, value] of Object.entries(node)) {
    if (SKIPPED_KEYS.has(key)) continue;
    if (Array.isArray(value)) {
      for (const item of value) if (isNode(item)) stack.push(item);
    } else if (isNode(value)) {
      stack.push(value);
    }
  }
}

function openingStartsAt(node: t.Node, position: SourcePosition): node is t.JSXElement {
  if (node.type !== 'JSXElement') return false;
  const start = node.openingElement.loc?.start;
  return start !== undefined && start.line === position.line && start.column + 1 === position.col;
}

export function findJsxElement(root: t.Node, position: SourcePosition): t.JSXElement | null {
  const stack: t.Node[] = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === undefined) break;
    if (openingStartsAt(node, position)) return node;
    pushChildren(stack, node);
  }
  return null;
}

export function parseSource(source: string, typescript: boolean): t.File {
  const plugins: ParserPlugin[] = typescript ? ['jsx', 'typescript'] : ['jsx'];
  try {
    return parse(source, { sourceType: 'module', plugins, errorRecovery: false });
  } catch (error) {
    throw new DirectEditError('parse_failed', `The file could not be parsed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function hostTagName(element: t.JSXElement): string {
  const name = element.openingElement.name;
  if (name.type !== 'JSXIdentifier' || !/^[a-z]/.test(name.name)) {
    throw new DirectEditError('not_host_element', 'Only host elements such as <div> can be edited directly');
  }
  return name.name;
}

function startOf(node: t.Node): number {
  if (typeof node.start !== 'number') throw new DirectEditError('parse_failed', 'Missing source position');
  return node.start;
}

function endOf(node: t.Node): number {
  if (typeof node.end !== 'number') throw new DirectEditError('parse_failed', 'Missing source position');
  return node.end;
}

function camelCaseProp(prop: string): string {
  return prop.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());
}

function escapeJsString(value: string, quote: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(new RegExp(quote, 'g'), `\\${quote}`)
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function stringLiteral(value: string, quote: string): string {
  return `${quote}${escapeJsString(value, quote)}${quote}`;
}

function escapeJsxText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\{/g, '&#123;')
    .replace(/\}/g, '&#125;');
}

function keyOf(property: StyleEntry['node']): string | null {
  if (property.type !== 'ObjectProperty' || property.computed) return null;
  if (property.key.type === 'Identifier') return property.key.name;
  if (property.key.type === 'StringLiteral') return camelCaseProp(property.key.value);
  return null;
}

function quoteOf(source: string, objectNode: t.ObjectExpression): string {
  for (const property of objectNode.properties) {
    if (property.type !== 'ObjectProperty' || property.value.type !== 'StringLiteral') continue;
    const char = source[startOf(property.value)];
    if (char === '"' || char === "'") return char;
  }
  return "'";
}

function styleAttribute(element: t.JSXElement): t.JSXAttribute | null {
  for (const attribute of element.openingElement.attributes) {
    if (attribute.type === 'JSXAttribute' && attribute.name.type === 'JSXIdentifier' && attribute.name.name === 'style') {
      return attribute;
    }
  }
  return null;
}

function styleObject(attribute: t.JSXAttribute): t.ObjectExpression {
  const value = attribute.value;
  if (value?.type === 'JSXExpressionContainer' && value.expression.type === 'ObjectExpression') return value.expression;
  throw new DirectEditError('style_not_literal', 'The style prop is not an object literal; ask the agent to change it');
}

function overwriteValue(magic: MagicString, source: string, property: StyleEntry['node'], literal: string): void {
  if (property.type !== 'ObjectProperty') return;
  if (property.shorthand) {
    magic.overwrite(startOf(property), endOf(property), `${source.slice(startOf(property.key), endOf(property.key))}: ${literal}`);
    return;
  }
  magic.overwrite(startOf(property.value), endOf(property.value), literal);
}

function planStyle(
  magic: MagicString,
  source: string,
  entries: StyleEntry[],
  changes: Record<string, string | null>,
  quote: string,
): StylePlan {
  const plan: StylePlan = { removed: new Set(), additions: [] };
  for (const [prop, value] of Object.entries(changes)) {
    const key = camelCaseProp(prop);
    const indices = entries.flatMap((entry, index) => (entry.key === key ? [index] : []));
    const [first, ...rest] = indices;
    if (value === null || first === undefined) {
      if (value === null) for (const index of indices) plan.removed.add(index);
      else plan.additions.push(`${key}: ${stringLiteral(value, quote)}`);
      continue;
    }
    for (const index of rest) plan.removed.add(index);
    const entry = entries[first];
    if (entry) overwriteValue(magic, source, entry.node, stringLiteral(value, quote));
  }
  return plan;
}

function removeEntries(magic: MagicString, entries: StyleEntry[], removed: Set<number>): void {
  const lastKept = entries.reduce((last, _entry, index) => (removed.has(index) ? last : index), -1);
  for (const index of removed) {
    const node = entries[index]?.node;
    const next = entries[index + 1]?.node;
    const previous = entries[index - 1]?.node;
    if (!node) continue;
    if (index < lastKept && next) magic.remove(startOf(node), startOf(next));
    else if (previous) magic.remove(endOf(previous), endOf(node));
    else magic.remove(startOf(node), endOf(node));
  }
}

function editStyleObject(
  magic: MagicString,
  source: string,
  attribute: t.JSXAttribute,
  objectNode: t.ObjectExpression,
  changes: Record<string, string | null>,
): void {
  const entries: StyleEntry[] = objectNode.properties.map((node) => ({ node, key: keyOf(node) }));
  const plan = planStyle(magic, source, entries, changes, quoteOf(source, objectNode));
  const kept = entries.filter((_entry, index) => !plan.removed.has(index));
  const lastKept = kept[kept.length - 1];
  if (lastKept) {
    removeEntries(magic, entries, plan.removed);
    if (plan.additions.length > 0) magic.appendLeft(endOf(lastKept.node), `, ${plan.additions.join(', ')}`);
    return;
  }
  if (plan.additions.length === 0) {
    magic.remove(leadingWhitespaceStart(source, startOf(attribute)), endOf(attribute));
    return;
  }
  const inner = ` ${plan.additions.join(', ')} `;
  const innerStart = startOf(objectNode) + 1;
  const innerEnd = endOf(objectNode) - 1;
  if (innerEnd > innerStart) magic.overwrite(innerStart, innerEnd, inner);
  else magic.appendLeft(innerStart, inner);
}

function patchStyle(magic: MagicString, source: string, element: t.JSXElement, changes: Record<string, string | null>): void {
  const attribute = styleAttribute(element);
  if (attribute) {
    editStyleObject(magic, source, attribute, styleObject(attribute), changes);
    return;
  }
  const additions = Object.entries(changes).flatMap(([prop, value]) =>
    value === null ? [] : [`${camelCaseProp(prop)}: ${stringLiteral(value, "'")}`],
  );
  if (additions.length === 0) return;
  magic.appendLeft(endOf(element.openingElement.name), ` style={{ ${additions.join(', ')} }}`);
}

function isIgnorableText(child: t.JSXElement['children'][number]): boolean {
  return child.type === 'JSXText' && child.value.trim() === '' && child.value.includes('\n');
}

function isStringExpression(child: t.JSXElement['children'][number]): child is t.JSXExpressionContainer & { expression: t.StringLiteral } {
  return child.type === 'JSXExpressionContainer' && child.expression.type === 'StringLiteral';
}

function replaceRange(magic: MagicString, start: number, end: number, text: string): void {
  if (end > start) magic.overwrite(start, end, text);
  else magic.appendLeft(start, text);
}

function patchText(magic: MagicString, source: string, element: t.JSXElement, text: string): void {
  if (element.openingElement.selfClosing || !element.closingElement) {
    throw new DirectEditError('text_not_editable', 'This element has no children to edit; ask the agent');
  }
  const meaningful = element.children.filter((child) => !isIgnorableText(child));
  const [child] = meaningful;
  if (meaningful.length > 1) throw new DirectEditError('text_not_editable', TEXT_NOT_EDITABLE_MESSAGE);
  if (child === undefined) {
    replaceRange(magic, endOf(element.openingElement), startOf(element.closingElement), escapeJsxText(text));
    return;
  }
  if (child.type === 'JSXText') {
    const raw = source.slice(startOf(child), endOf(child));
    const lead = /^\s*/.exec(raw)?.[0] ?? '';
    const trail = raw.trim() === '' ? '' : (/\s*$/.exec(raw)?.[0] ?? '');
    magic.overwrite(startOf(child), endOf(child), `${lead}${escapeJsxText(text)}${trail}`);
    return;
  }
  if (isStringExpression(child)) {
    const literal = child.expression;
    const quote = source[startOf(literal)] === '"' ? '"' : "'";
    magic.overwrite(startOf(literal), endOf(literal), stringLiteral(text, quote));
    return;
  }
  throw new DirectEditError('text_not_editable', TEXT_NOT_EDITABLE_MESSAGE);
}

function patchName(magic: MagicString, source: string, element: t.JSXElement, name: string | null): void {
  const attribute = jsxNameAttribute(element);
  if (!attribute) {
    if (name !== null) magic.appendLeft(endOf(element.openingElement.name), ` ${NAME_ATTR}="${name}"`);
    return;
  }
  if (name === null) {
    magic.remove(leadingWhitespaceStart(source, startOf(attribute)), endOf(attribute));
    return;
  }
  const literal = jsxNameLiteral(attribute);
  const quote = source[startOf(literal)] === "'" ? "'" : '"';
  magic.overwrite(startOf(literal), endOf(literal), `${quote}${name}${quote}`);
}

function movedPosition(code: string, offset: number, typescript: boolean): SourcePosition {
  const moved = jsxElementAt(parseSource(code, typescript).program, offset);
  const start = moved?.openingElement.loc?.start;
  if (!start) throw new DirectEditError('cannot_move', 'The moved element could not be found again');
  return { line: start.line, col: start.column + 1 };
}

export function jsxElementSpan(source: string, loc: SourcePosition, typescript: boolean): { start: number; end: number } | null {
  const element = findJsxElement(parseSource(source, typescript).program, loc);
  return element && element.start != null && element.end != null ? { start: element.start, end: element.end } : null;
}

export function patchJsx(source: string, loc: SourcePosition, edit: SourceEdit, options: JsxPatchOptions = {}): PatchResult {
  const ast = parseSource(source, options.typescript ?? true);
  const element = findJsxElement(ast.program, loc);
  if (!element) throw new DirectEditError('element_not_found', `No JSX element starts at line ${loc.line}, column ${loc.col}`);
  if (edit.insert !== undefined) throw new DirectEditError('invalid_request', 'Adding elements works in HTML files only');
  const name = element.openingElement.name;
  assertSameTag(edit.tag, name.type === 'JSXIdentifier' ? name.name : null);
  const tag = hostTagName(element);
  const typescript = options.typescript ?? true;
  if (edit.move !== undefined) {
    const plan = planJsxMove(source, element, jsxAncestors(ast.program, element), edit.move);
    return { code: plan.code, tag, applied: { style: [], text: false }, moved: movedPosition(plan.code, plan.movedStart, typescript) };
  }
  const magic = new MagicString(source);
  if (edit.name !== undefined) patchName(magic, source, element, edit.name);
  const style = edit.style ?? {};
  const styleKeys = Object.keys(style);
  const tailwind = patchClassesOrStyle(magic, source, element, style, edit, options.tailwind ?? null);
  if (edit.text !== undefined) patchText(magic, source, element, edit.text);
  return { code: magic.toString(), tag, applied: { style: styleKeys, text: edit.text !== undefined }, ...(tailwind ? { tailwind } : {}) };
}

function inlineKeys(element: t.JSXElement): Set<string> | null {
  const attribute = styleAttribute(element);
  if (!attribute) return new Set();
  const value = attribute.value;
  if (value?.type !== 'JSXExpressionContainer' || value.expression.type !== 'ObjectExpression') return null;
  return new Set(value.expression.properties.map(keyOf).filter((key): key is string => key !== null));
}

function patchClassesOrStyle(magic: MagicString, source: string, element: t.JSXElement, style: Record<string, string | null>, edit: SourceEdit, theme: TailwindTheme | null): TailwindOutcome | undefined {
  const decision = decideClassEdit(() => jsxClassSite(source, element), style, edit.classes, theme);
  if (decision.kind !== 'classes') {
    if (Object.keys(style).length > 0) patchStyle(magic, source, element, style);
    return decision.kind === 'inline' ? decision.fallback.outcome : undefined;
  }
  for (const splice of decision.patch.plan.splices) replaceRange(magic, splice.start, splice.end, splice.text);
  const mapped = new Set(decision.patch.inlineProps);
  const present = inlineKeys(element);
  const inline: Record<string, string | null> = {};
  for (const [prop, value] of Object.entries(style)) {
    if (!mapped.has(prop)) inline[prop] = value;
    else if (present?.has(camelCaseProp(prop))) inline[prop] = null;
  }
  if (Object.keys(inline).length > 0) patchStyle(magic, source, element, inline);
  return decision.patch.outcome;
}

export function jsxClassInfo(source: string, loc: SourcePosition, typescript: boolean, theme: TailwindTheme | null): TailwindOutcome | null {
  const element = findJsxElement(parseSource(source, typescript).program, loc);
  return element ? describeSite(jsxClassSite(source, element), theme) : null;
}
