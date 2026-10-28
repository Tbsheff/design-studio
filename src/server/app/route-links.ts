import { existsSync } from 'node:fs';
import { realpath } from 'node:fs/promises';
import path from 'node:path';
import type * as t from '@babel/types';
import type { AppRoute } from '../../shared/contracts.js';
import type { RouteLink, RouteLinkElement, RouteLinkKind, RouteLinksResult } from '../../shared/route-flow.js';
import { walkNodes } from '../direct-edit/text-source-files.js';
import { createSourceProject, lineOf, RouteEvaluator, UNKNOWN, type SourceModule, type SourceProject } from './route-eval.js';
import { appRouterDir, listAppRoutes } from './routes.js';

const MAX_FILES = 120;
const MAX_IMPORT_DEPTH = 4;
const MAX_LINKS = 80;
const SOURCE_FILE = /\.(tsx|jsx|ts)$/;
const SKIP_FILE = /\.(test|spec|stories)\.[jt]sx?$|\.d\.ts$/;
const SHARED_UI = /(^|\/)(ui|global-shell|nav|navigation|sidebar|icons)\//;
const NAV_CALLEE = new Set(['redirect', 'permanentRedirect', 'navigate', 'push']);
const COMPONENT_TAGS: [RegExp, string][] = [[/Link$/, 'a'], [/Button/, 'button'], [/TableRow$|^Row$/, 'tr'], [/TableCell$/, 'td'], [/ListItem$/, 'li']];
const HANDLER_ATTRS = new Set(['onClick', 'onSelect', 'onPress']);
const FORM_ATTRS = ['action', 'onSubmit', 'formAction'];

interface Redirect {
  source: string;
  destination: string;
}

interface NavCall {
  arg: t.Node;
  mod: SourceModule;
  node: t.Node;
}

interface Found {
  kind: RouteLinkKind;
  href: string;
  file: string;
  line: number;
  element: RouteLinkElement | null;
}

function jsxName(node: t.JSXOpeningElement['name']): string {
  if (node.type === 'JSXIdentifier') return node.name;
  if (node.type === 'JSXMemberExpression') return node.property.name;
  return node.name.name;
}

function attrsOf(node: t.JSXOpeningElement): Map<string, t.Node | null> {
  const out = new Map<string, t.Node | null>();
  for (const attr of node.attributes) {
    if (attr.type !== 'JSXAttribute' || attr.name.type !== 'JSXIdentifier') continue;
    const value = attr.value;
    out.set(attr.name.name, value === null || value === undefined ? null : value.type === 'JSXExpressionContainer' ? (value.expression.type === 'JSXEmptyExpression' ? null : value.expression) : value);
  }
  return out;
}

export function staticText(node: t.Node): string {
  const parts: string[] = [];
  const visit = (item: t.Node): void => {
    if (item.type === 'JSXText') parts.push(item.value);
    else if (item.type === 'JSXExpressionContainer' && item.expression.type === 'StringLiteral') parts.push(item.expression.value);
    else if (item.type === 'JSXElement' || item.type === 'JSXFragment') item.children.forEach(visit);
  };
  if (node.type === 'JSXElement' || node.type === 'JSXFragment') node.children.forEach(visit);
  return parts.join(' ').replace(/\s+/g, ' ').trim().slice(0, 80);
}

function tagFor(name: string, kind: RouteLinkKind): string {
  if (/^[a-z]/.test(name)) return name;
  if (kind === 'link') return 'a';
  return COMPONENT_TAGS.find(([pattern]) => pattern.test(name))?.[1] ?? 'button';
}

function classSelector(tag: string, node: t.Node): string | null {
  if (node.type !== 'JSXElement') return null;
  const value = attrsOf(node.openingElement).get('className');
  const raw = value?.type === 'StringLiteral' ? value.value : value?.type === 'TemplateLiteral' ? (value.quasis[0]?.value.cooked ?? '') : '';
  const classes = raw.split(/\s+/).filter((name) => /^[A-Za-z_-][\w-]*$/.test(name)).slice(0, 2);
  return classes.length > 0 ? `${tag}.${classes.join('.')}` : null;
}

export function originless(raw: string): string {
  let s = raw.trim().replace(/^https?:\/\/[^/]*/i, '');
  while (s.startsWith(UNKNOWN)) s = s.slice(UNKNOWN.length);
  return s;
}

export function cleanHref(raw: string): string | null {
  const s = originless(raw).split(/[?#]/)[0] ?? '';
  if (!s.startsWith('/') || s.startsWith('//') || /^\/api(\/|$)/.test(s) || /^\/_next\//.test(s)) return null;
  const trimmed = s.replace(/\/{2,}/g, '/');
  return trimmed.length > 1 ? trimmed.replace(/\/$/, '') : trimmed;
}

function linkSelector(href: string): string | null {
  const bare = originless(href).split(/[?#]/)[0] ?? '';
  const pieces = bare.split(/\[[^\]]*\]/).filter((piece) => piece.length > 1);
  const exact = !/\[[^\]]*\]/.test(bare);
  const safe = pieces.map((piece) => piece.replace(/["\\]/g, '')).slice(0, 3);
  if (safe.length === 0) return null;
  return exact ? `a[href$="${safe[0]}"]` : `a${safe.map((piece) => `[href*="${piece}"]`).join('')}`;
}

function elementOf(kind: RouteLinkKind, name: string, href: string, textNode: t.Node, repeated: boolean): RouteLinkElement | null {
  const tag = tagFor(name, kind);
  const text = repeated ? '' : staticText(textNode);
  const selector = kind === 'link' && tag === 'a' ? linkSelector(href) : text ? tag : classSelector(tag, textNode);
  if (!selector) return null;
  return { tag, selector, ...(text ? { text } : {}) };
}

function mappedElements(root: t.Node): Set<t.Node> {
  const out = new Set<t.Node>();
  walkNodes(root, (node) => {
    if (node.type !== 'CallExpression' || node.callee.type !== 'MemberExpression' || node.callee.property.type !== 'Identifier' || node.callee.property.name !== 'map') return;
    for (const arg of node.arguments) walkNodes(arg, (inner) => {
      if (inner.type === 'JSXElement') out.add(inner);
    });
  });
  return out;
}

function isPlaceholder(segment: string): boolean {
  return /^\[.*\]$/.test(segment);
}

function segmentScore(routeSeg: string, seg: string | undefined): number | null {
  if (seg === undefined) return null;
  if (/^\[[^.[\]][^\]]*\]$/.test(routeSeg)) return isPlaceholder(seg) ? 2 : 1;
  if (seg === routeSeg) return 3;
  return isPlaceholder(seg) ? 0 : null;
}

function routeScore(route: string, href: string): number | null {
  const want = route.split('/').filter(Boolean);
  const have = href.split('/').filter(Boolean);
  let score = 0;
  for (let i = 0; i < want.length; i += 1) {
    const routeSeg = want[i] as string;
    if (/^\[\[?\.\.\./.test(routeSeg)) return routeSeg.startsWith('[[') || have.length > i ? score + 1 : null;
    const one = segmentScore(routeSeg, have[i]);
    if (one === null) return null;
    score += one;
  }
  return have.length === want.length ? score + 1 : null;
}

function bestRoute(routes: readonly AppRoute[], href: string): { route: string; score: number } | null {
  let best: { route: string; score: number } | null = null;
  for (const item of routes) {
    const score = routeScore(item.route, href);
    if (score !== null && (!best || score > best.score)) best = { route: item.route, score };
  }
  return best;
}

function redirected(redirects: readonly Redirect[], href: string): string | null {
  for (const rule of redirects) {
    const pattern = rule.source.split('/').map((seg) => (seg.startsWith(':') ? '[^/]+' : seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('/');
    if (new RegExp(`^${pattern}$`).test(href) && rule.destination.startsWith('/')) return rule.destination.replace(/:\w+\*?/g, UNKNOWN);
  }
  return null;
}

export function matchRoute(routes: readonly AppRoute[], redirects: readonly Redirect[], href: string): string | null {
  if (href !== '/' && href.split('/').filter(Boolean).every(isPlaceholder)) return null;
  const direct = bestRoute(routes, href);
  if (direct) return direct.route;
  const moved = redirected(redirects, href);
  const viaRedirect = moved ? bestRoute(routes, cleanHref(moved) ?? moved) : null;
  if (viaRedirect) return viaRedirect.route;
  const segments = href.split('/').filter(Boolean);
  for (let drop = 1; drop <= 2 && drop < segments.length; drop += 1) {
    const found = bestRoute(routes, `/${segments.slice(drop).join('/')}`);
    if (found && found.score >= 4) return found.route;
  }
  return null;
}

async function readRedirects(project: SourceProject): Promise<Redirect[]> {
  const file = ['next.config.ts', 'next.config.mjs', 'next.config.js'].map((name) => path.join(project.root, name)).find((candidate) => existsSync(candidate));
  const mod = file ? await project.load(file) : null;
  if (!mod) return [];
  const out: Redirect[] = [];
  walkNodes(mod.ast, (node) => {
    if (node.type !== 'ObjectExpression') return;
    const props = new Map<string, string>();
    for (const prop of node.properties) if (prop.type === 'ObjectProperty' && prop.key.type === 'Identifier' && prop.value.type === 'StringLiteral') props.set(prop.key.name, prop.value.value);
    const source = props.get('source');
    const destination = props.get('destination');
    if (source && destination) out.push({ source, destination });
  });
  return out;
}

function ownerName(node: t.Node): string {
  if (node.type === 'Identifier') return node.name;
  return node.type === 'MemberExpression' && node.property.type === 'Identifier' ? node.property.name : '';
}

function callNavArg(node: t.CallExpression): t.Node | null {
  const callee = node.callee;
  const arg = node.arguments[0];
  if (!arg || arg.type === 'SpreadElement' || arg.type === 'ArgumentPlaceholder') return null;
  if (callee.type === 'Identifier') return NAV_CALLEE.has(callee.name) ? arg : null;
  if (callee.type !== 'MemberExpression' || callee.property.type !== 'Identifier') return null;
  const method = callee.property.name;
  const owner = ownerName(callee.object);
  if ((method === 'push' || method === 'replace') && /router/i.test(owner)) return arg;
  return method === 'assign' && owner === 'location' ? arg : null;
}

function navArg(node: t.Node): t.Node | null {
  if (node.type === 'CallExpression') return callNavArg(node);
  if (node.type !== 'AssignmentExpression' || node.left.type !== 'MemberExpression' || node.left.property.type !== 'Identifier') return null;
  return node.left.property.name === 'href' && ownerName(node.left.object) === 'location' ? node.right : null;
}

function navCallsIn(body: t.Node, mod: SourceModule): NavCall[] {
  const out: NavCall[] = [];
  walkNodes(body, (node) => {
    const arg = navArg(node);
    if (arg) out.push({ arg, mod, node });
  });
  return out;
}

class RouteScanner {
  private readonly cache = new Map<string, Promise<RouteLinksResult>>();

  constructor(
    readonly workTree: string,
    readonly routes: AppRoute[],
    private readonly project: SourceProject,
    private readonly evaluator: RouteEvaluator,
    private readonly redirects: Redirect[],
  ) {}

  match(href: string): string | null {
    const clean = cleanHref(href);
    return clean ? matchRoute(this.routes, this.redirects, clean) : null;
  }

  scan(route: string): Promise<RouteLinksResult> {
    let found = this.cache.get(route);
    if (!found) {
      found = this.scanRoute(route);
      this.cache.set(route, found);
    }
    return found;
  }

  private relative(file: string): string {
    return path.relative(this.workTree, file).split(path.sep).join('/');
  }

  private async files(pageFile: string): Promise<SourceModule[]> {
    const seen = new Set<string>([pageFile]);
    const out: SourceModule[] = [];
    let level = [pageFile];
    for (let depth = 0; depth <= MAX_IMPORT_DEPTH && level.length > 0 && out.length < MAX_FILES; depth += 1) {
      const next: string[] = [];
      for (const file of level) {
        const mod = await this.project.load(file);
        if (!mod || out.length >= MAX_FILES) continue;
        out.push(mod);
        for (const { source } of mod.imports.values()) {
          const target = await this.project.resolve(source, file);
          if (!target || seen.has(target) || !this.followable(target)) continue;
          seen.add(target);
          next.push(target);
        }
      }
      level = next;
    }
    return out;
  }

  private followable(file: string): boolean {
    if (!file.startsWith(this.project.root + path.sep) || !SOURCE_FILE.test(file) || SKIP_FILE.test(file)) return false;
    const relative = path.relative(this.project.root, file).split(path.sep).join('/');
    return !relative.includes('node_modules/') && !SHARED_UI.test(relative) && !/(^|\/)layout\.[jt]sx?$/.test(relative);
  }

  private async handlerCalls(expr: t.Node, mod: SourceModule, hops = 0): Promise<NavCall[]> {
    if (hops > 2) return [];
    if (expr.type === 'CallExpression') {
      const nested = await Promise.all(expr.arguments.map((arg) => this.handlerCalls(arg, mod, hops + 1)));
      return [...navCallsIn(expr, mod), ...nested.flat()];
    }
    const fn = await this.evaluator.value(expr, { mod, params: new Map(), depth: 0 });
    if (fn?.kind !== 'fn') return [];
    const direct = navCallsIn(fn.node.body, fn.mod);
    if (direct.length > 0) return direct;
    const calls: NavCall[] = [];
    walkNodes(fn.node.body, (node) => {
      if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && fn.mod.locals.has(node.callee.name)) calls.push({ arg: node.callee, mod: fn.mod, node });
    });
    const deeper = await Promise.all(calls.slice(0, 4).map((call) => this.handlerCalls(call.arg, call.mod, hops + 1)));
    return deeper.flat();
  }

  private async found(kind: RouteLinkKind, call: { arg: t.Node; mod: SourceModule }, element: (href: string) => RouteLinkElement | null): Promise<Found | null> {
    const href = await this.evaluator.evaluate(call.arg, call.mod);
    if (!href || !cleanHref(href)) return null;
    return { kind, href, file: this.relative(call.mod.file), line: lineOf(call.arg), element: element(href) };
  }

  private submitButton(form: t.JSXElement): t.JSXElement | null {
    let found: t.JSXElement | null = null;
    walkNodes(form, (node) => {
      if (node.type !== 'JSXElement' || node === form) return;
      const name = jsxName(node.openingElement.name);
      if (!/^button$|Button$/.test(name)) return;
      const type = attrsOf(node.openingElement).get('type');
      if (!found || (type?.type === 'StringLiteral' && type.value === 'submit')) found = node;
    });
    return found;
  }

  private async fromElement(node: t.JSXElement, mod: SourceModule, used: Set<t.Node>, mapped: Set<t.Node>): Promise<Found[]> {
    const opening = node.openingElement;
    const repeated = mapped.has(node);
    const name = jsxName(opening.name);
    const attrs = attrsOf(opening);
    const out: (Found | null)[] = [];
    const href = attrs.get('href');
    if (href) out.push(await this.found('link', { arg: href, mod }, (value) => elementOf('link', name, value, node, repeated)));
    for (const [attr, value] of attrs) {
      if (!value || !HANDLER_ATTRS.has(attr)) continue;
      for (const call of await this.handlerCalls(value, mod)) {
        used.add(call.node);
        out.push(await this.found('push', call, () => elementOf('push', name, '', node, repeated)));
      }
    }
    if (name === 'form' || /Form$/.test(name)) {
      const button = this.submitButton(node);
      for (const attr of FORM_ATTRS) {
        const value = attrs.get(attr);
        if (!value) continue;
        for (const call of await this.handlerCalls(value, mod)) {
          used.add(call.node);
          out.push(await this.found('form', call, () => (button ? elementOf('form', jsxName(button.openingElement.name), '', button, mapped.has(button)) : null)));
        }
      }
    }
    return out.filter((item): item is Found => item !== null);
  }

  private async scanModule(mod: SourceModule): Promise<Found[]> {
    const elements: t.JSXElement[] = [];
    walkNodes(mod.ast, (node) => {
      if (node.type === 'JSXElement') elements.push(node);
    });
    const used = new Set<t.Node>();
    const mapped = mappedElements(mod.ast);
    const out: Found[] = [];
    for (const node of elements) out.push(...(await this.fromElement(node, mod, used, mapped)));
    for (const call of navCallsIn(mod.ast, mod)) {
      if (used.has(call.node)) continue;
      const done = await this.found('redirect', call, () => null);
      if (done) out.push(done);
    }
    return out;
  }

  private async scanRoute(route: string): Promise<RouteLinksResult> {
    const item = this.routes.find((entry) => entry.route === route);
    if (!item) return { route, file: null, links: [], scanned: 0 };
    const modules = await this.files(path.join(this.workTree, item.file));
    const links: RouteLink[] = [];
    const seen = new Set<string>();
    for (const mod of modules) {
      for (const found of await this.scanModule(mod)) {
        const key = `${found.kind}|${found.href}|${found.element?.selector ?? ''}|${found.element?.text ?? ''}`;
        if (seen.has(key) || links.length >= MAX_LINKS) continue;
        seen.add(key);
        links.push({ ...found, href: cleanHref(found.href) ?? found.href, to: this.match(found.href) });
      }
    }
    return { route, file: item.file, links, scanned: modules.length };
  }
}

export type { RouteScanner };

export async function createRouteScanner(workTree: string, appDir: string): Promise<RouteScanner | null> {
  const realTree = await realpath(workTree).catch(() => workTree);
  const appRoot = path.join(realTree, appDir);
  if (!appRouterDir(appRoot)) return null;
  const routes = await listAppRoutes(realTree, appDir);
  const project = await createSourceProject(appRoot);
  return new RouteScanner(realTree, routes, project, new RouteEvaluator(project), await readRedirects(project));
}
