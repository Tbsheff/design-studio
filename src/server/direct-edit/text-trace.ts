import path from 'node:path';
import type * as t from '@babel/types';
import { loadTypeScript, resolveImport } from '../components/props-schema.js';
import { filesMentioning, jsxFiles, messageFiles, walkNodes, type ModuleLoader, type TextModule } from './text-source-files.js';

export const ANY = Symbol('any');
export type Step = string | number | typeof ANY;

export interface Candidate {
  mod: TextModule;
  node: t.StringLiteral | t.TemplateLiteral;
  value: string;
  via: string[];
}

export interface TraceContext {
  root: string;
  load: ModuleLoader;
  budget: number;
  hops: number;
  stuck: { file: string; line: number; text: string } | null;
  files?: Promise<string[]>;
}

type Tracer = (ctx: TraceContext, mod: TextModule, node: t.Node, steps: Step[]) => Promise<Candidate[]>;

interface Binding {
  kind: 'declarator' | 'param' | 'import';
  owner: t.Node;
  steps: Step[];
  fallback: t.Node | null;
  index: number;
}

const MAX_HOPS = 8;
const MAP_METHODS = new Set(['map', 'flatMap']);
const SAME_ITEMS = new Set(['filter', 'slice', 'sort', 'toSorted', 'reverse', 'toReversed', 'concat', 'find', 'findLast', 'at']);
const STATE_HOOKS = new Set(['useState', 'useRef']);
const I18N_CALLS = new Set(['t', 'formatMessage', 'translate', '$t']);
const NAMESPACE_HOOKS = new Set(['useTranslations', 'getTranslations', 'useTranslation']);
const WRAPPERS = new Set(['TSAsExpression', 'TSSatisfiesExpression', 'TSNonNullExpression', 'ParenthesizedExpression', 'TSTypeAssertion', 'JSXExpressionContainer']);

export function unwrap(node: t.Node): t.Node {
  let current = node;
  while (WRAPPERS.has(current.type)) current = (current as t.TSAsExpression).expression;
  return current;
}

function lineOf(node: t.Node): number {
  return node.loc?.start.line ?? 1;
}

function noteStuck(ctx: TraceContext, mod: TextModule, node: t.Node): void {
  if (ctx.stuck) return;
  const text = mod.code.slice(node.start ?? 0, node.end ?? 0).replace(/\s+/g, ' ');
  ctx.stuck = { file: mod.relative, line: lineOf(node), text: text.length > 60 ? `${text.slice(0, 59)}…` : text };
}

function keyOf(node: t.Node, computed: boolean): Step | null {
  if (!computed && node.type === 'Identifier') return node.name;
  if (node.type === 'StringLiteral') return node.value;
  if (node.type === 'NumericLiteral') return node.value;
  return computed ? ANY : null;
}

function nameOf(node: t.Node | null | undefined): string | null {
  if (!node) return null;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression' && !node.computed && node.property.type === 'Identifier') return node.property.name;
  return null;
}

function literal(mod: TextModule, node: t.StringLiteral | t.TemplateLiteral, value: string): Candidate[] {
  return [{ mod, node, value, via: [] }];
}

export async function trace(ctx: TraceContext, mod: TextModule, raw: t.Node, steps: Step[]): Promise<Candidate[]> {
  ctx.budget -= 1;
  if (ctx.budget <= 0) return [];
  const node = unwrap(raw);
  const tracer = TRACERS[node.type];
  if (tracer) return tracer(ctx, mod, node, steps);
  noteStuck(ctx, mod, node);
  return [];
}

async function all(lists: Promise<Candidate[]>[]): Promise<Candidate[]> {
  return (await Promise.all(lists)).flat();
}

const traceString: Tracer = async (_ctx, mod, node, steps) => (steps.length === 0 ? literal(mod, node as t.StringLiteral, (node as t.StringLiteral).value) : []);

const traceTemplate: Tracer = async (ctx, mod, node, steps) => {
  const template = node as t.TemplateLiteral;
  if (steps.length > 0) return [];
  if (template.expressions.length > 0) {
    noteStuck(ctx, mod, template);
    return [];
  }
  return literal(mod, template, template.quasis[0]?.value.cooked ?? '');
};

const traceObject: Tracer = async (ctx, mod, node, steps) => {
  const [step, ...rest] = steps;
  if (step === undefined || step === ANY) return [];
  const found: Promise<Candidate[]>[] = [];
  for (const property of (node as t.ObjectExpression).properties) {
    if (property.type === 'SpreadElement') found.push(trace(ctx, mod, property.argument, steps));
    else if (property.type === 'ObjectProperty' && keyOf(property.key, property.computed) === step) found.push(trace(ctx, mod, property.value, rest));
  }
  return all(found);
};

const traceArray: Tracer = async (ctx, mod, node, steps) => {
  const [step, ...rest] = steps;
  const elements = (node as t.ArrayExpression).elements;
  if (step === ANY) return all(elements.flatMap((element) => (element && element.type !== 'SpreadElement' ? [trace(ctx, mod, element, rest)] : [])));
  const element = typeof step === 'number' ? elements[step] : undefined;
  return element && element.type !== 'SpreadElement' ? trace(ctx, mod, element, rest) : [];
};

const traceMember: Tracer = async (ctx, mod, node, steps) => {
  const member = node as t.MemberExpression;
  const key = keyOf(member.property, member.computed);
  if (key === null) return [];
  return trace(ctx, mod, member.object, [key, ...steps]);
};

const traceBranches: Tracer = async (ctx, mod, node, steps) => {
  const branch = node as t.ConditionalExpression | t.LogicalExpression;
  const sides = branch.type === 'ConditionalExpression' ? [branch.consequent, branch.alternate] : [branch.left, branch.right];
  return all(sides.map((side) => trace(ctx, mod, side, steps)));
};

function returnedOf(fn: t.Node | undefined): t.Node | null {
  if (!fn || (fn.type !== 'ArrowFunctionExpression' && fn.type !== 'FunctionExpression')) return null;
  if (fn.body.type !== 'BlockStatement') return fn.body;
  const last = fn.body.body.find((statement) => statement.type === 'ReturnStatement');
  return last?.type === 'ReturnStatement' ? (last.argument ?? null) : null;
}

const traceCall: Tracer = async (ctx, mod, node, steps) => {
  const call = node as t.CallExpression;
  const method = call.callee.type === 'MemberExpression' ? nameOf(call.callee) : null;
  const target = call.callee.type === 'MemberExpression' ? call.callee.object : null;
  if (target && method && SAME_ITEMS.has(method)) return trace(ctx, mod, target, method === 'find' || method === 'findLast' || method === 'at' ? [ANY, ...steps] : steps);
  if (target && method && MAP_METHODS.has(method) && steps[0] === ANY) {
    const returned = returnedOf(call.arguments[0] as t.Node | undefined);
    if (returned) return trace(ctx, mod, returned, steps.slice(1));
  }
  const callee = nameOf(call.callee);
  if (callee && I18N_CALLS.has(callee) && steps.length === 0) return i18nCandidates(ctx, mod, call);
  noteStuck(ctx, mod, call);
  return [];
};

const traceIdentifier: Tracer = async (ctx, mod, node, steps) => {
  const binding = findBinding(mod, node as t.Identifier);
  if (!binding) {
    noteStuck(ctx, mod, node);
    return [];
  }
  if (binding.kind === 'import') return traceImport(ctx, mod, binding, steps);
  if (binding.kind === 'param') return traceParam(ctx, mod, binding, steps);
  return traceDeclarator(ctx, mod, binding, steps);
};

const TRACERS: Partial<Record<t.Node['type'], Tracer>> = {
  StringLiteral: traceString,
  TemplateLiteral: traceTemplate,
  ObjectExpression: traceObject,
  ArrayExpression: traceArray,
  MemberExpression: traceMember,
  OptionalMemberExpression: traceMember,
  ConditionalExpression: traceBranches,
  LogicalExpression: traceBranches,
  CallExpression: traceCall,
  Identifier: traceIdentifier,
};

interface PatternHit {
  steps: Step[];
  fallback: t.Node | null;
}

function objectPatternPath(pattern: t.ObjectPattern, name: string): PatternHit | null {
  for (const property of pattern.properties) {
    if (property.type !== 'ObjectProperty') continue;
    const key = keyOf(property.key, property.computed);
    const inner = key === null ? null : patternPath(property.value, name);
    if (inner && key !== null) return { steps: [key, ...inner.steps], fallback: inner.fallback };
  }
  return null;
}

function arrayPatternPath(pattern: t.ArrayPattern, name: string): PatternHit | null {
  for (const [index, element] of pattern.elements.entries()) {
    const inner = element ? patternPath(element, name) : null;
    if (inner) return { steps: [index, ...inner.steps], fallback: inner.fallback };
  }
  return null;
}

function patternPath(pattern: t.Node, name: string): PatternHit | null {
  if (pattern.type === 'Identifier') return pattern.name === name ? { steps: [], fallback: null } : null;
  if (pattern.type === 'ObjectPattern') return objectPatternPath(pattern, name);
  if (pattern.type === 'ArrayPattern') return arrayPatternPath(pattern, name);
  if (pattern.type !== 'AssignmentPattern') return null;
  const inner = patternPath(pattern.left, name);
  return inner ? { steps: inner.steps, fallback: inner.steps.length === 0 ? pattern.right : inner.fallback } : null;
}

function isFunction(node: t.Node): node is t.Function {
  return node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression';
}

function paramBinding(fn: t.Function, name: string): Binding | null {
  for (const [index, param] of fn.params.entries()) {
    const hit = patternPath(param, name);
    if (hit) return { kind: 'param', owner: fn, steps: hit.steps, fallback: hit.fallback, index };
  }
  return null;
}

function statementDeclarators(statement: t.Node): t.VariableDeclarator[] {
  const target = statement.type === 'ExportNamedDeclaration' && statement.declaration ? statement.declaration : statement;
  return target.type === 'VariableDeclaration' ? target.declarations : [];
}

function blockBinding(block: t.Node, name: string): Binding | null {
  const body = block.type === 'Program' || block.type === 'BlockStatement' ? block.body : [];
  for (const statement of body) {
    if (statement.type === 'ImportDeclaration') {
      const specifier = statement.specifiers.find((item) => item.local.name === name);
      if (specifier) return { kind: 'import', owner: specifier, steps: [], fallback: null, index: 0 };
    }
    for (const declarator of statementDeclarators(statement)) {
      const hit = patternPath(declarator.id, name);
      if (hit) return { kind: 'declarator', owner: declarator, steps: hit.steps, fallback: hit.fallback, index: 0 };
    }
  }
  return null;
}

export function findBinding(mod: TextModule, id: t.Identifier): Binding | null {
  for (let node = mod.parents.get(id); node; node = mod.parents.get(node)) {
    const found = isFunction(node) ? paramBinding(node, id.name) : blockBinding(node, id.name);
    if (found) return found;
  }
  return null;
}

async function traceDeclarator(ctx: TraceContext, mod: TextModule, binding: Binding, steps: Step[]): Promise<Candidate[]> {
  const declarator = binding.owner as t.VariableDeclarator;
  const fromDefault = binding.fallback ? trace(ctx, mod, binding.fallback, steps) : Promise.resolve([]);
  const init = declarator.init ? unwrap(declarator.init) : null;
  if (!init) return fromDefault;
  const hook = init.type === 'CallExpression' ? nameOf(init.callee) : null;
  if (init.type === 'CallExpression' && hook && STATE_HOOKS.has(hook) && binding.steps[0] === 0) {
    const first = init.arguments[0];
    return all([fromDefault, first ? trace(ctx, mod, first, [...binding.steps.slice(1), ...steps]) : Promise.resolve([])]);
  }
  return all([fromDefault, trace(ctx, mod, init, [...binding.steps, ...steps])]);
}

function mapSource(mod: TextModule, fn: t.Node): t.Node | null {
  const call = mod.parents.get(fn);
  if (call?.type !== 'CallExpression' || call.arguments[0] !== fn || call.callee.type !== 'MemberExpression') return null;
  const method = nameOf(call.callee);
  return method && (MAP_METHODS.has(method) || SAME_ITEMS.has(method) || method === 'forEach') ? call.callee.object : null;
}

export function componentName(mod: TextModule, fn: t.Node): string | null {
  if (fn.type === 'FunctionDeclaration' && fn.id) return fn.id.name;
  for (let node = mod.parents.get(fn); node; node = mod.parents.get(node)) {
    if (node.type === 'VariableDeclarator') return node.id.type === 'Identifier' ? node.id.name : null;
    if (node.type !== 'CallExpression' && !WRAPPERS.has(node.type)) return null;
  }
  return null;
}

async function traceParam(ctx: TraceContext, mod: TextModule, binding: Binding, steps: Step[]): Promise<Candidate[]> {
  const fn = binding.owner;
  const items = mapSource(mod, fn);
  if (items) return binding.index === 0 ? trace(ctx, mod, items, [ANY, ...binding.steps, ...steps]) : [];
  const name = componentName(mod, fn);
  const full = [...binding.steps, ...steps];
  const [prop, ...rest] = full;
  if (binding.index !== 0 || !name || !/^[A-Z]/.test(name) || typeof prop !== 'string') {
    noteStuck(ctx, mod, fn);
    return [];
  }
  const fallback = binding.steps.length === 1 ? binding.fallback : null;
  return traceProp(ctx, { mod, name, prop, rest, fallback });
}

interface PropQuery {
  mod: TextModule;
  name: string;
  prop: string;
  rest: Step[];
  fallback: t.Node | null;
}

function tagName(name: t.JSXOpeningElement['name']): string {
  if (name.type === 'JSXIdentifier') return name.name;
  if (name.type === 'JSXMemberExpression') return name.property.name;
  return name.name.name;
}

function usesIn(mod: TextModule, name: string): t.JSXOpeningElement[] {
  const found: t.JSXOpeningElement[] = [];
  walkNodes(mod.ast, (node) => {
    if (node.type === 'JSXOpeningElement' && tagName(node.name) === name) found.push(node);
  });
  return found;
}

function useKey(mod: TextModule, node: t.Node): string {
  return `${mod.relative}:${lineOf(node)}`;
}

async function traceUse(ctx: TraceContext, mod: TextModule, use: t.JSXOpeningElement, query: PropQuery): Promise<{ found: Candidate[]; missing: boolean }> {
  const attribute = use.attributes.find((item): item is t.JSXAttribute => item.type === 'JSXAttribute' && item.name.type === 'JSXIdentifier' && item.name.name === query.prop);
  if (!attribute) return { found: [], missing: !use.attributes.some((item) => item.type === 'JSXSpreadAttribute') };
  const value = attribute.value;
  if (!value) return { found: [], missing: false };
  const found = await trace(ctx, mod, value, query.rest);
  const key = useKey(mod, use);
  return { found: found.map((candidate) => ({ ...candidate, via: [...candidate.via, key] })), missing: false };
}

async function traceProp(ctx: TraceContext, query: PropQuery): Promise<Candidate[]> {
  if (ctx.hops >= MAX_HOPS) return [];
  ctx.hops += 1;
  ctx.files ??= jsxFiles(ctx.root);
  const escaped = query.name.replace(/[$]/g, '\\$');
  const hits = await filesMentioning(await ctx.files, new RegExp(`<(?:[\\w$]+\\.)?${escaped}[\\s/>]`));
  const found: Candidate[] = [];
  let missing = false;
  for (const file of hits) {
    const mod = await ctx.load(file);
    if (!mod) continue;
    for (const use of usesIn(mod, query.name)) {
      const result = await traceUse(ctx, mod, use, query);
      found.push(...result.found);
      missing ||= result.missing;
    }
  }
  if (missing && query.fallback) found.push(...(await trace(ctx, query.mod, query.fallback, query.rest)));
  return found;
}

async function traceImport(ctx: TraceContext, mod: TextModule, binding: Binding, steps: Step[]): Promise<Candidate[]> {
  const specifier = binding.owner as t.ImportDeclaration['specifiers'][number];
  const declaration = mod.parents.get(specifier);
  if (declaration?.type !== 'ImportDeclaration') return [];
  const resolved = resolveModule(await loadTypeScript(), declaration.source.value, mod.file, ctx.root);
  const target = resolved ? await ctx.load(resolved) : null;
  if (!target) {
    noteStuck(ctx, mod, declaration);
    return [];
  }
  if (target.json) return specifier.type === 'ImportSpecifier' ? trace(ctx, target, target.ast, [importedName(specifier), ...steps]) : trace(ctx, target, target.ast, steps);
  const exported = exportedValue(target, specifier.type === 'ImportSpecifier' ? importedName(specifier) : 'default');
  return exported ? trace(ctx, target, exported, steps) : [];
}

function resolveModule(ts: Awaited<ReturnType<typeof loadTypeScript>>, specifier: string, from: string, root: string): string | null {
  if (specifier.endsWith('.json')) return specifier.startsWith('.') ? path.resolve(path.dirname(from), specifier) : null;
  return resolveImport(ts, specifier, from, root);
}

function importedName(specifier: t.ImportSpecifier): string {
  return specifier.imported.type === 'Identifier' ? specifier.imported.name : specifier.imported.value;
}

function exportedValue(mod: TextModule, name: string): t.Node | null {
  if (mod.ast.type !== 'File') return null;
  const body = mod.ast.program.body;
  let local = name;
  for (const statement of body) {
    if (name === 'default' && statement.type === 'ExportDefaultDeclaration') {
      if (statement.declaration.type !== 'Identifier') return statement.declaration;
      local = statement.declaration.name;
    }
    if (statement.type === 'ExportNamedDeclaration' && !statement.source) {
      const spec = statement.specifiers.find((item) => item.type === 'ExportSpecifier' && (item.exported.type === 'Identifier' ? item.exported.name : item.exported.value) === name);
      if (spec?.type === 'ExportSpecifier') local = spec.local.name;
    }
  }
  const binding = blockBinding(mod.ast.program, local);
  const declarator = binding?.kind === 'declarator' && binding.steps.length === 0 ? (binding.owner as t.VariableDeclarator) : null;
  return declarator?.init ?? null;
}

function namespaceOf(mod: TextModule, call: t.CallExpression): string | null {
  if (call.callee.type !== 'Identifier') return null;
  const binding = findBinding(mod, call.callee);
  const init = binding?.kind === 'declarator' ? (binding.owner as t.VariableDeclarator).init : null;
  const inner = init?.type === 'AwaitExpression' ? init.argument : init;
  if (inner?.type !== 'CallExpression' || !NAMESPACE_HOOKS.has(nameOf(inner.callee) ?? '')) return null;
  const first = inner.arguments[0];
  return first?.type === 'StringLiteral' ? first.value : null;
}

function messageKey(call: t.CallExpression): string | null {
  const first = call.arguments[0];
  if (first?.type === 'StringLiteral') return first.value;
  if (first?.type !== 'ObjectExpression') return null;
  const id = first.properties.find((item): item is t.ObjectProperty => item.type === 'ObjectProperty' && keyOf(item.key, item.computed) === 'id');
  return id?.value.type === 'StringLiteral' ? id.value.value : null;
}

async function i18nCandidates(ctx: TraceContext, mod: TextModule, call: t.CallExpression): Promise<Candidate[]> {
  const key = messageKey(call);
  if (!key) {
    noteStuck(ctx, mod, call);
    return [];
  }
  const namespace = namespaceOf(mod, call);
  const full = namespace ? `${namespace}.${key}` : key;
  const found: Candidate[] = [];
  for (const file of await messageFiles(ctx.root)) {
    const messages = await ctx.load(file);
    if (!messages?.json) continue;
    found.push(...(await trace(ctx, messages, messages.ast, full.split('.'))));
    if (full.includes('.')) found.push(...(await trace(ctx, messages, messages.ast, [full])));
  }
  if (found.length === 0) noteStuck(ctx, mod, call);
  return found;
}
