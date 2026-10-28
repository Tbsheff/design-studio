import type * as t from '@babel/types';
import { refuse } from '../direct-edit/structure-ops.js';

export type SlotKind = 'text' | 'attr' | 'node' | 'class';

export interface Slot {
  kind: SlotKind;
  tag: string;
  attr: string | null;
  values: (string | null)[];
  edit0: { start: number; end: number; prefix: string };
  typed: 'string' | 'attr' | 'node';
  root: boolean;
  only: boolean;
  hint: string;
  name: string;
}

export interface ShapeUse {
  code: string;
  element: t.JSXElement;
  imports: Map<string, t.ImportDeclaration>;
}

export interface Shape {
  slots: Slot[];
  imports: Set<string>;
}

type AttrValue = { kind: 'string' | 'expr' | 'flag' | 'missing'; text: string; raw: string; node: t.Node | null };
type Child = t.JSXElement['children'][number];

const GLOBALS = new Set(['undefined', 'Infinity', 'NaN', 'Math', 'Number', 'String', 'Boolean', 'Array', 'Object', 'Date', 'JSON', 'window', 'document', 'console', 'Intl', 'encodeURIComponent', 'parseInt', 'parseFloat']);
const SINGLE_ATTRS = new Set(['href', 'src', 'alt', 'to', 'title', 'placeholder']);
const SKIP_KEYS = new Set(['loc', 'start', 'end', 'extra', 'leadingComments', 'trailingComments', 'innerComments', 'typeAnnotation', 'typeParameters', 'returnType']);
const FUNCTIONS = new Set(['ArrowFunctionExpression', 'FunctionExpression']);

function isNode(value: unknown): value is t.Node {
  return typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string';
}

function tagText(name: t.JSXOpeningElement['name']): string {
  if (name.type === 'JSXIdentifier') return name.name;
  if (name.type === 'JSXNamespacedName') return `${name.namespace.name}:${name.name.name}`;
  return `${tagText(name.object)}.${name.property.name}`;
}

function tagRoot(name: t.JSXOpeningElement['name']): string | null {
  if (name.type === 'JSXIdentifier') return /^[A-Z]/.test(name.name) ? name.name : null;
  if (name.type === 'JSXMemberExpression') {
    let object: t.JSXMemberExpression['object'] = name.object;
    while (object.type === 'JSXMemberExpression') object = object.object;
    return object.name;
  }
  return null;
}

function paramNames(node: t.Node, out: Set<string>): void {
  switch (node.type) {
    case 'Identifier':
      out.add(node.name);
      return;
    case 'ObjectPattern':
      for (const prop of node.properties) paramNames(prop.type === 'RestElement' ? prop.argument : prop.value, out);
      return;
    case 'ArrayPattern':
      for (const item of node.elements) if (item) paramNames(item, out);
      return;
    case 'AssignmentPattern':
      paramNames(node.left, out);
      return;
    case 'RestElement':
      paramNames(node.argument, out);
      return;
    default:
  }
}

function skipped(parent: t.Node, key: string, child: t.Node): boolean {
  if (SKIP_KEYS.has(key) || child.type.startsWith('TS')) return true;
  if ((parent.type === 'MemberExpression' || parent.type === 'OptionalMemberExpression') && key === 'property' && !parent.computed) return true;
  if ((parent.type === 'ObjectProperty' || parent.type === 'ObjectMethod') && key === 'key' && !parent.computed) return true;
  return parent.type === 'JSXAttribute' && key === 'name';
}

function nodeChildren(node: t.Node): t.Node[] {
  const out: t.Node[] = [];
  for (const [key, value] of Object.entries(node)) {
    const children = Array.isArray(value) ? value.filter(isNode) : isNode(value) ? [value] : [];
    for (const child of children) if (!skipped(node, key, child)) out.push(child);
  }
  return out;
}

function scopeFor(node: t.Node, bound: Set<string>): Set<string> {
  if (!FUNCTIONS.has(node.type)) return bound;
  const inner = new Set(bound);
  for (const param of (node as t.ArrowFunctionExpression).params) paramNames(param, inner);
  return inner;
}

function collectRefs(node: t.Node, bound: Set<string>, out: Set<string>): void {
  if (node.type === 'Identifier') {
    if (!bound.has(node.name)) out.add(node.name);
    return;
  }
  const root = node.type === 'JSXOpeningElement' ? tagRoot(node.name) : null;
  if (root && !bound.has(root)) out.add(root);
  const inner = scopeFor(node, bound);
  for (const child of nodeChildren(node)) collectRefs(child, inner, out);
}

export function freeRefs(node: t.Node): string[] {
  const out = new Set<string>();
  collectRefs(node, new Set(), out);
  return [...out].filter((name) => !GLOBALS.has(name));
}

function importBound(refs: string[], use: ShapeUse): boolean {
  return refs.every((name) => use.imports.has(name));
}

function slice(use: ShapeUse, node: t.Node): string {
  return use.code.slice(node.start ?? 0, node.end ?? 0);
}

function attrName(attr: t.JSXAttribute): string {
  return attr.name.type === 'JSXIdentifier' ? attr.name.name : `${attr.name.namespace.name}:${attr.name.name.name}`;
}

function attrValue(use: ShapeUse, attr: t.JSXAttribute | undefined): AttrValue {
  if (!attr) return { kind: 'missing', text: '', raw: '', node: null };
  const value = attr.value;
  if (!value) return { kind: 'flag', text: 'true', raw: '{true}', node: null };
  if (value.type === 'StringLiteral') return { kind: 'string', text: value.value, raw: slice(use, value), node: value };
  if (value.type === 'JSXExpressionContainer') {
    const expression = value.expression;
    if (expression.type === 'StringLiteral') return { kind: 'string', text: expression.value, raw: slice(use, value), node: expression };
    if (expression.type === 'TemplateLiteral' && expression.expressions.length === 0) return { kind: 'string', text: expression.quasis.map((quasi) => quasi.value.cooked ?? '').join(''), raw: slice(use, value), node: expression };
    return { kind: 'expr', text: slice(use, expression), raw: slice(use, value), node: expression };
  }
  return { kind: 'expr', text: slice(use, value), raw: `{${slice(use, value)}}`, node: value };
}

function meaningful(child: Child): boolean {
  if (child.type === 'JSXText') return !(child.value.includes('\n') && child.value.trim() === '');
  return !(child.type === 'JSXExpressionContainer' && child.expression.type === 'JSXEmptyExpression');
}

function normalText(value: string): string {
  return value.replace(/\s*\n\s*/g, ' ').trim();
}

function trimmedRange(child: t.JSXText): { start: number; end: number } {
  const start = (child.start ?? 0) + (child.value.length - child.value.trimStart().length);
  return { start, end: (child.end ?? 0) - (child.value.length - child.value.trimEnd().length) };
}

class Walker {
  readonly slots: Slot[] = [];
  readonly imports = new Set<string>();

  constructor(private readonly uses: ShapeUse[]) {}

  private get single(): boolean {
    return this.uses.length === 1;
  }

  private where(path: string[]): string {
    return path.map((tag) => `<${tag}>`).join(' > ');
  }

  private mismatch(path: string[], index: number, what: string): never {
    throw refuse(`The selected elements do not have the same structure, so one component cannot draw them all: at ${this.where(path)}, use ${index + 1} ${what} that use 1 does not. Select look-alike elements, or one element`);
  }

  private keepStatic(nodes: t.Node[]): boolean {
    const refs = nodes.map((node) => freeRefs(node));
    if (!refs.every((list, index) => importBound(list, this.uses[index] as ShapeUse))) return false;
    for (const name of refs[0] ?? []) this.imports.add(name);
    return true;
  }

  private push(slot: Omit<Slot, 'name' | 'hint'> & { hint?: string }): void {
    this.slots.push({ ...slot, hint: slot.hint ?? '', name: '' });
  }

  element(elements: t.JSXElement[], path: string[], root: boolean): void {
    const first = elements[0] as t.JSXElement;
    const tag = tagText(first.openingElement.name);
    const here = [...path, tag];
    elements.forEach((element, index) => {
      if (tagText(element.openingElement.name) !== tag) this.mismatch(here, index, `has <${tagText(element.openingElement.name)}> in place of <${tag}>`);
    });
    const tagRef = tagRoot(first.openingElement.name);
    if (tagRef) this.tagImport(tagRef, here);
    this.attributes(elements, here, tag, root);
    this.children(elements, here, tag, root);
  }

  private tagImport(name: string, path: string[]): void {
    if (!this.uses.every((use) => use.imports.has(name))) throw refuse(`<${name}> at ${this.where(path)} is defined in the page file, not imported, so the new component file cannot use it. Move ${name} to its own file first, or select the elements inside it`);
    this.imports.add(name);
  }

  private attributes(elements: t.JSXElement[], path: string[], tag: string, root: boolean): void {
    const names: string[] = [];
    const byUse = elements.map((element) => {
      const map = new Map<string, t.JSXAttribute>();
      for (const attr of element.openingElement.attributes) {
        if (attr.type === 'JSXSpreadAttribute') throw refuse(`<${tag}> at ${this.where(path)} spreads props ({...}), so the studio cannot tell which props the component needs. Ask the agent to make this component`);
        const name = attrName(attr);
        if (name === 'key') continue;
        map.set(name, attr);
        if (!names.includes(name)) names.push(name);
      }
      return map;
    });
    const insert0 = this.insertPoint(elements[0] as t.JSXElement);
    for (const name of names) {
      const own = byUse[0]?.get(name);
      const edit0 = !own ? { start: insert0, end: insert0, prefix: ` ${name}=` } : own.value ? { start: own.value.start ?? 0, end: own.value.end ?? 0, prefix: '' } : { start: own.end ?? 0, end: own.end ?? 0, prefix: '=' };
      this.attribute(name, byUse.map((map, index) => attrValue(this.uses[index] as ShapeUse, map.get(name))), tag, root, edit0);
    }
  }

  private insertPoint(element: t.JSXElement): number {
    const opening = element.openingElement;
    const last = opening.attributes.at(-1);
    return last?.end ?? opening.name.end ?? 0;
  }

  private attribute(name: string, values: AttrValue[], tag: string, root: boolean, edit0: Slot['edit0']): void {
    const first = values[0] as AttrValue;
    const base = { tag, attr: name, edit0, root, only: false };
    const allStringy = values.every((value) => value.kind === 'string' || value.kind === 'missing');
    if (name === 'className' && allStringy && !this.single) {
      if (values.every((value) => value.text === first.text)) return;
      this.push({ ...base, kind: 'class', values: values.map((value) => value.text), typed: 'string' });
      return;
    }
    const same = values.every((value) => value.kind === first.kind && value.text === first.text);
    if (same && first.kind !== 'expr' && !(this.single && first.kind === 'string' && SINGLE_ATTRS.has(name))) return;
    if (same && first.kind === 'expr' && this.keepStatic(values.map((value) => value.node as t.Node))) return;
    const kind = allStringy ? 'string' : 'attr';
    this.push({ ...base, kind: 'attr', values: values.map((value) => (value.kind === 'missing' ? null : value.raw)), typed: kind });
  }

  private children(elements: t.JSXElement[], path: string[], tag: string, root: boolean): void {
    const lists = elements.map((element) => element.children.filter(meaningful));
    const count = lists[0]?.length ?? 0;
    lists.forEach((list, index) => {
      if (list.length !== count) this.mismatch(path, index, `has ${list.length} children where use 1 has ${count}, so it has a part`);
    });
    for (let position = 0; position < count; position += 1) this.child(lists.map((list) => list[position] as Child), path, tag, root && count === 1);
  }

  private child(nodes: Child[], path: string[], tag: string, only: boolean): void {
    const first = nodes[0] as Child;
    nodes.forEach((node, index) => {
      if (node.type !== first.type) this.mismatch(path, index, `has ${node.type === 'JSXText' ? 'text' : 'an element or { }'} at a place`);
    });
    if (first.type === 'JSXElement') return this.element(nodes as t.JSXElement[], path, false);
    if (first.type === 'JSXFragment') return this.children(nodes.map((node) => ({ children: (node as t.JSXFragment).children }) as t.JSXElement), path, tag, false);
    if (first.type === 'JSXText') return this.text(nodes as t.JSXText[], tag, only);
    if (first.type === 'JSXSpreadChild') throw refuse(`<${tag}> has a {...spread} child; ask the agent to make this component`);
    this.expression(nodes as t.JSXExpressionContainer[], tag);
  }

  private text(nodes: t.JSXText[], tag: string, only: boolean): void {
    const values = nodes.map((node) => normalText(node.value));
    const first = values[0] ?? '';
    if (values.every((value) => value === first) && (!this.single || first === '')) return;
    this.push({ kind: 'text', tag, attr: null, values, edit0: { ...trimmedRange(nodes[0] as t.JSXText), prefix: '' }, typed: 'string', root: only, only });
  }

  private expression(nodes: t.JSXExpressionContainer[], tag: string): void {
    const texts = nodes.map((node, index) => slice(this.uses[index] as ShapeUse, node.expression));
    if (texts.every((text) => text === texts[0]) && this.keepStatic(nodes.map((node) => node.expression))) return;
    const expression = nodes[0]?.expression;
    const hint = expression?.type === 'Identifier' ? expression.name : expression?.type === 'MemberExpression' && expression.property.type === 'Identifier' ? expression.property.name : 'content';
    const first = nodes[0] as t.JSXExpressionContainer;
    this.push({ kind: 'node', tag, attr: null, values: nodes.map((node, index) => slice(this.uses[index] as ShapeUse, node)), edit0: { start: first.start ?? 0, end: first.end ?? 0, prefix: '' }, typed: 'node', root: false, only: false, hint });
  }
}

export function compareUses(uses: ShapeUse[]): Shape {
  const walker = new Walker(uses);
  walker.element(
    uses.map((use) => use.element),
    [],
    true,
  );
  return { slots: walker.slots, imports: walker.imports };
}

export function importMap(ast: t.File): Map<string, t.ImportDeclaration> {
  const out = new Map<string, t.ImportDeclaration>();
  for (const statement of ast.program.body) {
    if (statement.type !== 'ImportDeclaration') continue;
    for (const specifier of statement.specifiers) out.set(specifier.local.name, statement);
  }
  return out;
}

export { tagText };
