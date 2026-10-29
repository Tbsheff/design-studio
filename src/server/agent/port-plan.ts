import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse, type DefaultTreeAdapterMap } from 'parse5';
import { cleanFramePath } from '../../shared/canvas-file.js';
import type { CompiledTokenEntry, Direction, Project } from '../../shared/contracts.js';
import {
  cleanPortRoute,
  PORT_FLOW_MAX_PAGES,
  portPageSlug,
  suggestPortRoute,
  type PortFlowLink,
  type PortFlowLinkKind,
  type PortFlowPage,
  type PortFlowPlan,
  type PortImage,
  type PortKitRole,
  type PortLink,
  type PortPlan,
  type PortRepeat,
  type PortSection,
  type PortTarget,
  type PortToken,
} from '../../shared/port.js';
import { matchColor } from '../../shared/token-match.js';
import { appRouterDir, listAppRoutes } from '../app/routes.js';
import { searchComponents } from '../components/component-search.js';
import { loadDesignSystemPromptContext } from '../design-system/state.js';
import { BadRequestError, NotFoundError } from '../store/errors.js';

type Node = DefaultTreeAdapterMap['node'];
type Element = DefaultTreeAdapterMap['element'];

export interface PageFacts {
  title: string | null;
  sections: PortSection[];
  steps: string[];
  currentStep: string | null;
  repeats: PortRepeat[];
  headings: string[];
  actions: string[];
  images: PortImage[];
  links: PortLink[];
  tokens: PortToken[];
  rawColors: number;
  inlineStyles: number;
  skipped: string[];
  roles: Map<PortKitRole, string>;
}

const SKIP_TAGS = new Set(['script', 'style', 'template', 'noscript', 'head']);
const HEADING = /^h[1-6]$/;
const BLOCK_TAGS = new Set(['header', 'nav', 'section', 'article', 'aside', 'footer', 'form', 'ul', 'ol', 'table', 'div', 'h1', 'h2', 'h3', 'p', 'figure']);
const STEP_TEXT_MAX = 28;
const META_TEXT_MAX = 16;
const LIST_MAX = 24;
const TEXTS_PER_SECTION = 6;
const CURRENT_CLASS = /(^|\s)(on|active|current|is-active|selected)(\s|$)/;
const COLOR_LITERAL = /#[0-9a-f]{3,8}\b|\b(?:oklch|oklab|rgba?|hsla?|lab|lch)\([^)]*\)/gi;

function isElement(node: Node): node is Element {
  return 'tagName' in node;
}

function attr(el: Element, name: string): string | null {
  return el.attrs.find((item) => item.name === name)?.value ?? null;
}

function kids(node: Node): Node[] {
  return 'childNodes' in node ? node.childNodes : [];
}

function childElements(node: Node): Element[] {
  return kids(node).filter(isElement);
}

function clean(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function isHidden(el: Element): boolean {
  const style = (attr(el, 'style') ?? '').replace(/\s+/g, '');
  return attr(el, 'hidden') !== null || attr(el, 'aria-hidden') === 'true' || /display:none/i.test(style);
}

function isDecor(el: Element): boolean {
  const style = (attr(el, 'style') ?? '').replace(/\s+/g, '');
  return el.tagName === 'svg' && /position:absolute/i.test(style);
}

function textOf(node: Node): string {
  if (node.nodeName === '#text' && 'value' in node) return node.value;
  if (!isElement(node) || SKIP_TAGS.has(node.tagName) || isHidden(node) || isDecor(node) || node.tagName === 'svg') return ' ';
  return kids(node).map(textOf).join(' ');
}

const INLINE = new Set(['a', 'span', 'b', 'strong', 'em', 'i', 'small', 'u', 's', 'code', 'abbr', 'mark', 'sup', 'sub', 'label', 'time', 'kbd', 'q', 'cite']);

function lines(node: Node): string {
  if (node.nodeName === '#text' && 'value' in node) return node.value.replace(/\s+/g, ' ');
  if (!isElement(node) || SKIP_TAGS.has(node.tagName) || isHidden(node) || node.tagName === 'svg') return '';
  const inner = kids(node).map(lines).join('');
  return INLINE.has(node.tagName) ? ` ${inner} ` : `\n${inner}\n`;
}

function ownTexts(el: Element): string[] {
  return lines(el).split('\n').map(clean).filter(Boolean);
}

const NO_SKIP = new Set<string>();

function descendants(el: Node, keep: (el: Element) => boolean, skip: Set<string> = SKIP_TAGS): Element[] {
  const out: Element[] = [];
  const walk = (node: Node): void => {
    for (const child of childElements(node)) {
      if (skip.has(child.tagName)) continue;
      if (keep(child)) out.push(child);
      walk(child);
    }
  };
  walk(el);
  return out;
}

function find(el: Node, keep: (el: Element) => boolean): Element | null {
  return descendants(el, keep)[0] ?? null;
}

function className(el: Element): string | null {
  return clean(attr(el, 'class') ?? '') || null;
}

function labelOf(el: Element): string {
  const name = attr(el, 'data-name');
  const cls = className(el)?.split(' ')[0];
  return `${el.tagName}${cls ? `.${cls}` : ''}${name ? ` "${name}"` : ''}`;
}

function uniq(values: string[], max = LIST_MAX): string[] {
  return [...new Set(values.filter(Boolean))].slice(0, max);
}

function contentRoot(doc: Node): Element | null {
  const body = find(doc, (el) => el.tagName === 'body');
  if (!body) return null;
  const blocks = childElements(body).filter((el) => !isHidden(el) && !SKIP_TAGS.has(el.tagName));
  const only = blocks.length === 1 ? blocks[0] : undefined;
  return only && (only.tagName === 'main' || only.tagName === 'div') ? only : body;
}

function sectionsOf(root: Element): PortSection[] {
  return childElements(root)
    .filter((el) => BLOCK_TAGS.has(el.tagName) && !isHidden(el) && !isDecor(el))
    .map((el) => {
      const heading = HEADING.test(el.tagName) ? el : find(el, (child) => HEADING.test(child.tagName) && !isHidden(child));
      return { tag: el.tagName, label: labelOf(el), heading: heading ? clean(textOf(heading)) : null, texts: uniq(ownTexts(el), TEXTS_PER_SECTION) };
    });
}

function stepsOf(root: Element): { steps: string[]; current: string | null } {
  const list = find(root, (el) => (el.tagName === 'ol' || /step/i.test(attr(el, 'class') ?? '')) && childElements(el).length >= 2);
  if (!list) return { steps: [], current: null };
  const items = childElements(list).filter((el) => el.tagName === 'li' || el.tagName === 'a');
  const texts = items.map((el) => clean(textOf(el)));
  if (texts.some((text) => !text || text.length > STEP_TEXT_MAX)) return { steps: [], current: null };
  const current = items.find((el) => CURRENT_CLASS.test(attr(el, 'class') ?? '') || attr(el, 'aria-current') !== null);
  return { steps: texts, current: current ? clean(textOf(current)) : null };
}

function signature(el: Element): string {
  return `${el.tagName}.${className(el) ?? ''}`;
}

function repeatOf(items: Element[]): PortRepeat | null {
  const headings = items.map((item) => find(item, (el) => HEADING.test(el.tagName) && !isHidden(el))).map((el) => (el ? clean(textOf(el)) : ''));
  const withHeading = headings.filter(Boolean).length;
  if (withHeading < items.length) return null;
  const first = items[0] as Element;
  const inner = childElements(first).length === 1 ? (childElements(first)[0] as Element) : first;
  const link = first.tagName === 'a' ? first : find(first, (el) => el.tagName === 'a');
  return { role: 'card', count: items.length, tag: inner.tagName, className: className(inner), headings, sample: uniq(ownTexts(first), TEXTS_PER_SECTION), link: link ? attr(link, 'href') : null };
}

function repeatsOf(root: Element): PortRepeat[] {
  const out: PortRepeat[] = [];
  const walk = (el: Element): void => {
    const groups = new Map<string, Element[]>();
    for (const child of childElements(el).filter((item) => !isHidden(item))) groups.set(signature(child), [...(groups.get(signature(child)) ?? []), child]);
    const found = [...groups.values()].filter((items) => items.length >= 2).map(repeatOf).filter((item): item is PortRepeat => item !== null);
    out.push(...found);
    if (found.length === 0) childElements(el).forEach(walk);
  };
  walk(root);
  return out;
}

function isAction(el: Element): boolean {
  if (el.tagName === 'button' || attr(el, 'role') === 'button') return true;
  if (el.tagName === 'input') return ['submit', 'button'].includes(attr(el, 'type') ?? '');
  return el.tagName === 'a' && /\b(btn|button|cta)\b/i.test(attr(el, 'class') ?? '');
}

function imagesOf(root: Element, skipped: string[]): PortImage[] {
  const out: PortImage[] = [];
  for (const el of descendants(root, (item) => item.tagName === 'img' || item.tagName === 'svg')) {
    if (isHidden(el)) skipped.push(`hidden ${el.tagName}${attr(el, 'src') ? ` ${attr(el, 'src')}` : ''}`);
    else if (isDecor(el)) skipped.push(`absolute decorative ${labelOf(el)}`);
    else out.push(el.tagName === 'img' ? { src: attr(el, 'src') ?? '', alt: attr(el, 'alt') ?? '' } : { src: `inline svg ${attr(el, 'width') ?? '?'}x${attr(el, 'height') ?? '?'}`, alt: clean(textOf(el)) });
  }
  return out;
}

function linksOf(root: Element): PortLink[] {
  const seen = new Set<string>();
  const out: PortLink[] = [];
  for (const el of descendants(root, (item) => item.tagName === 'a' && Boolean(attr(item, 'href')))) {
    const href = attr(el, 'href') as string;
    if (seen.has(href)) continue;
    seen.add(href);
    out.push({ href, text: clean(textOf(el)).slice(0, 80) });
  }
  return out.slice(0, LIST_MAX);
}

function styleText(doc: Node): string {
  return descendants(doc, (el) => el.tagName === 'style', NO_SKIP)
    .map((el) => kids(el).map((child) => ('value' in child ? child.value : '')).join(''))
    .join('\n');
}

function tokenDefs(css: string): Map<string, string> {
  const defs = new Map<string, string>();
  for (const match of css.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) if (!defs.has(match[1] as string)) defs.set(match[1] as string, clean(match[2] as string));
  return defs;
}

function tokenUses(css: string): Map<string, number> {
  const uses = new Map<string, number>();
  for (const match of css.matchAll(/var\(\s*(--[\w-]+)/g)) uses.set(match[1] as string, (uses.get(match[1] as string) ?? 0) + 1);
  return uses;
}

function rawColorCount(css: string): number {
  const withoutDefs = css.replace(/--[\w-]+\s*:\s*[^;}]+/g, '');
  return withoutDefs.match(COLOR_LITERAL)?.length ?? 0;
}

function roleHints(root: Element, css: string, repeats: PortRepeat[]): Map<PortKitRole, string> {
  const roles = new Map<PortKitRole, string>();
  const cards = repeats.filter((item) => item.role === 'card');
  if (cards[0]) roles.set('card', `${cards[0].count} repeated ${cards[0].tag}${cards[0].className ? `.${cards[0].className.split(' ')[0]}` : ''} blocks with a heading (${cards[0].headings.slice(0, 4).join(', ')})`);
  const badge = badgeHint(root, cards[0] ?? null);
  if (badge) roles.set('badge', badge);
  const button = buttonHint(root, css);
  if (button) roles.set('button', button);
  for (const [role, hint] of domHints(root)) if (!roles.has(role)) roles.set(role, hint);
  return roles;
}

function badgeHint(root: Element, card: PortRepeat | null): string | null {
  const named = find(root, (el) => /\b(badge|tag|pill|chip|status)\b/i.test(attr(el, 'class') ?? '') && !isHidden(el));
  if (named) return `${labelOf(named)} "${clean(textOf(named)).slice(0, 40)}"`;
  if (!card) return null;
  const cardEl = find(root, (el) => signature(el) === `${card.tag}.${card.className ?? ''}`);
  const meta = cardEl ? find(cardEl, (el) => !HEADING.test(el.tagName) && el.tagName !== 'p' && isShortMeta(el)) : null;
  return meta ? `short meta text in each card (${labelOf(meta)}: ${ownTexts(meta).join(' · ')})` : null;
}

function isShortMeta(el: Element): boolean {
  const texts = ownTexts(el);
  return texts.length >= 1 && texts.length <= 3 && texts.every((text) => text.length <= META_TEXT_MAX) && find(el, (child) => HEADING.test(child.tagName)) === null;
}

function buttonHint(root: Element, css: string): string | null {
  const actions = descendants(root, isAction).filter((el) => !isHidden(el));
  if (actions[0]) return `${actions.length} action${actions.length === 1 ? '' : 's'} (${uniq(actions.map((el) => clean(textOf(el))), 4).join(', ')})`;
  const rule = /(^|[}\s,])(\.(?:btn|button|cta)[\w-]*)\s*[{,:]/m.exec(css);
  return rule ? `the page CSS defines ${rule[2]} for actions (the flow pages use it), no button on this page` : null;
}

const DOM_ROLES: { role: PortKitRole; test: (el: Element) => boolean; what: string }[] = [
  { role: 'input', test: (el) => (el.tagName === 'input' && !['submit', 'button', 'hidden'].includes(attr(el, 'type') ?? '')) || el.tagName === 'select' || el.tagName === 'textarea', what: 'form fields' },
  { role: 'table', test: (el) => el.tagName === 'table', what: 'a table' },
  { role: 'tabs', test: (el) => attr(el, 'role') === 'tablist', what: 'a tab list' },
  { role: 'avatar', test: (el) => /\bavatar\b/i.test(attr(el, 'class') ?? ''), what: 'avatars' },
  { role: 'separator', test: (el) => el.tagName === 'hr', what: 'dividers' },
];

function domHints(root: Element): [PortKitRole, string][] {
  return DOM_ROLES.flatMap(({ role, test, what }) => {
    const count = descendants(root, (el) => test(el) && !isHidden(el)).length;
    return count > 0 ? [[role, `${count} ${what}`] as [PortKitRole, string]] : [];
  });
}

export function readPageFacts(html: string): PageFacts {
  const doc = parse(html);
  const root = contentRoot(doc);
  const css = styleText(doc);
  const titleEl = descendants(doc, (el) => el.tagName === 'title', NO_SKIP)[0];
  const title = titleEl ? clean(kids(titleEl).map((child) => ('value' in child ? child.value : '')).join('')) || null : null;
  if (!root) return { title, sections: [], steps: [], currentStep: null, repeats: [], headings: [], actions: [], images: [], links: [], tokens: [], rawColors: 0, inlineStyles: 0, skipped: [], roles: new Map() };
  const skipped: string[] = [];
  const { steps, current } = stepsOf(root);
  const repeats = repeatsOf(root);
  const defs = tokenDefs(css);
  const tokens = [...tokenUses(css)].map(([name, uses]) => ({ name, value: defs.get(name) ?? null, uses, target: null }));
  return {
    title,
    sections: sectionsOf(root),
    steps,
    currentStep: current,
    repeats,
    headings: uniq(descendants(root, (el) => HEADING.test(el.tagName) && !isHidden(el)).map((el) => `${el.tagName}: ${clean(textOf(el))}`)),
    actions: uniq(descendants(root, isAction).map((el) => clean(textOf(el)))),
    images: imagesOf(root, skipped),
    links: linksOf(root),
    tokens,
    rawColors: rawColorCount(css),
    inlineStyles: descendants(root, (el) => attr(el, 'style') !== null).length,
    skipped,
    roles: roleHints(root, css, repeats),
  };
}

const TOKEN_NAMES: Record<string, string[]> = {
  bg: ['--background'],
  background: ['--background'],
  ink: ['--foreground'],
  fg: ['--foreground'],
  text: ['--foreground'],
  mute: ['--muted-foreground'],
  muted: ['--muted-foreground'],
  line: ['--border'],
  border: ['--border'],
  accent: ['--primary', '--accent'],
  'accent-ink': ['--primary-foreground', '--accent-foreground'],
  primary: ['--primary'],
  surface: ['--card'],
  card: ['--card'],
  r: ['--radius'],
  radius: ['--radius'],
};

function targetToken(token: PortToken, entries: CompiledTokenEntry[]): string | null {
  const names = new Set(entries.map((entry) => entry.cssVar));
  const key = token.name.replace(/^--/, '');
  const named = [...(TOKEN_NAMES[key] ?? []), `--${key}`].find((name) => names.has(name));
  if (named) return named;
  if (!token.value) return null;
  return matchColor(token.value, entries)[0]?.cssVar ?? null;
}

export function mapTokens(tokens: PortToken[], entries: CompiledTokenEntry[]): PortToken[] {
  if (entries.length === 0) return tokens;
  return tokens.map((token) => ({ ...token, target: targetToken(token, entries) }));
}

const PLAN_TEXT_MAX = 6000;

function list(label: string, values: string[]): string {
  return values.length > 0 ? `${label}:\n${values.map((value) => `- ${value}`).join('\n')}` : '';
}

export function portPlanText(plan: PortPlan): string {
  const target = plan.target;
  const head = [
    `Source: ${plan.source.path}${plan.source.title ? ` ("${plan.source.title}")` : ''}`,
    target ? `Target: ${target.name}, route ${target.route ?? '(pick one)'}${target.routeFile ? `, file ${target.routeFile}` : ''}` : '',
    plan.steps.length > 0 ? `Steps: ${plan.steps.join(' > ')}${plan.currentStep ? ` (this page: ${plan.currentStep})` : ''}` : '',
  ];
  const parts = [
    head.filter(Boolean).join('\n'),
    list('Sections', plan.sections.map((s) => `${s.label}${s.heading ? `: ${s.heading}` : ''}${s.texts.length ? ` | ${s.texts.join(' / ')}` : ''}`)),
    list('Repeated blocks', plan.repeats.map((r) => `${r.count} x ${r.tag}${r.className ? `.${r.className}` : ''}: ${r.headings.join(', ')}${r.link ? ` (link ${r.link})` : ''}`)),
    list('Kit components to use', plan.kit.map((k) => `${k.name} for ${k.reason}. ${k.import}${k.parts.length ? ` (parts: ${k.parts.join(', ')})` : ''}`)),
    list('No kit match', plan.missing.map((m) => `${m.role}: ${m.reason}`)),
    list('Tokens', plan.tokens.map((t) => `${t.name}${t.value ? ` = ${t.value}` : ''} -> ${t.target ?? 'no app token'}`)),
    list('Images', plan.images.map((i) => `${i.src}${i.alt ? ` (${i.alt})` : ''}`)),
    list('Links', plan.links.map((l) => `${l.href}${l.text ? ` "${l.text}"` : ''}`)),
    list('Leave out', plan.skipped),
    `Inline styles in the prototype: ${plan.inlineStyles}. Raw colors in its CSS: ${plan.rawColors}. Do not copy either.`,
  ];
  const text = parts.filter(Boolean).join('\n\n');
  return text.length > PLAN_TEXT_MAX ? `${text.slice(0, PLAN_TEXT_MAX)}\n[plan cut]` : text;
}

export interface PortPlanInput {
  source: { project: Project; direction: Direction; path: string };
  target: { project: Project; direction: Direction; route: string | null } | null;
}

const KIT_NAMES: Record<PortKitRole, string[]> = {
  card: ['Card'],
  badge: ['Badge'],
  button: ['Button'],
  input: ['Input', 'Select', 'Textarea'],
  table: ['Table'],
  tabs: ['Tabs'],
  avatar: ['Avatar'],
  separator: ['Separator'],
};

const SOURCE_MAX = 400_000;

export function sourcePagePath(raw: string): string {
  const clean = cleanFramePath(raw);
  const page = clean || 'index.html';
  if (clean === null || !/\.html?$/i.test(page)) throw new BadRequestError('path must be an HTML page in the source project, like index.html');
  return page;
}

export async function readSourcePage(workTree: string, pagePath: string): Promise<string> {
  const page = sourcePagePath(pagePath);
  const html = await readFile(path.join(workTree, page), 'utf8').catch(() => {
    throw new NotFoundError(`No page ${page} in the source project`);
  });
  return html.slice(0, SOURCE_MAX);
}

async function kitFor(project: Project, workTree: string, roles: Map<PortKitRole, string>): Promise<Pick<PortPlan, 'kit' | 'missing'>> {
  const kit: PortPlan['kit'] = [];
  const missing: PortPlan['missing'] = [];
  for (const [role, reason] of roles) {
    const names = KIT_NAMES[role];
    const found = await searchComponents(project, workTree, { query: role, limit: 40 }).then(
      (result) => result.components.find((item) => names.includes(item.name)) ?? null,
      () => null,
    );
    if (found) kit.push({ role, name: found.name, import: found.import, file: found.file, parts: found.parts.slice(0, 8), reason });
    else missing.push({ role, reason: `${reason}; the app has no ${names.join(' or ')} component` });
  }
  return { kit, missing };
}

export function portRouteUrl(route: string): string {
  return `/${route.split('/').filter((part) => part && !/^\(.*\)$/.test(part)).join('/')}`;
}

async function targetOf(input: NonNullable<PortPlanInput['target']>): Promise<PortTarget> {
  const { project, direction, route } = input;
  const app = project.app ?? null;
  const base: PortTarget = { projectId: project.id, name: project.name, framework: app?.framework ?? null, route, routeFile: null, routeExists: false };
  if (!app || !route) return base;
  const routes = await listAppRoutes(direction.workTree, app.appDir).catch(() => []);
  const existing = routes.find((item) => item.route === portRouteUrl(route));
  if (existing) return { ...base, routeFile: existing.file, routeExists: true };
  if (app.framework !== 'next') return base;
  const router = appRouterDir(path.join(direction.workTree, app.appDir));
  const routerRel = router ? path.relative(direction.workTree, router).split(path.sep).join('/') : path.posix.join(app.appDir, 'app');
  return { ...base, routeFile: `${routerRel}${route}/page.tsx` };
}

export async function buildPortPlan(input: PortPlanInput): Promise<PortPlan> {
  const { source, target } = input;
  const facts = readPageFacts(await readSourcePage(source.direction.workTree, source.path));
  const [targetInfo, kitInfo, designSystem] = await Promise.all([
    target ? targetOf(target) : Promise.resolve(null),
    target ? kitFor(target.project, target.direction.workTree, facts.roles) : Promise.resolve({ kit: [], missing: [] }),
    target ? loadDesignSystemPromptContext(target.direction.workTree, target.project).catch(() => null) : Promise.resolve(null),
  ]);
  const { roles: _roles, title, ...rest } = facts;
  return {
    source: { projectId: source.project.id, directionId: source.direction.id, path: sourcePagePath(source.path), title },
    target: targetInfo,
    ...rest,
    tokens: mapTokens(facts.tokens, designSystem?.entries ?? []),
    ...kitInfo,
  };
}

interface PageRef {
  kind: PortFlowLinkKind;
  href: string;
  page: string;
  rest: string;
}

const LINK_ATTRS: Record<string, PortFlowLinkKind> = { href: 'a', action: 'form', formaction: 'form' };
const PAGE_LITERAL = /["'`]((?:\.\/)?[\w-][\w./-]*\.html?)((?:[?#][^"'`\s]*)?)/gi;
const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;

function pageRef(from: string, kind: PortFlowLinkKind, raw: string): PageRef | null {
  const href = raw.trim();
  if (!href || EXTERNAL.test(href)) return null;
  const split = /^([^?#]*)(.*)$/.exec(href);
  const file = split?.[1] ?? '';
  if (!/\.html?$/i.test(file) || file.startsWith('/')) return null;
  const page = cleanFramePath(path.posix.normalize(path.posix.join(path.posix.dirname(from), file)));
  return page ? { kind, href, page, rest: split?.[2] ?? '' } : null;
}

function literals(code: string): string[] {
  return [...code.matchAll(PAGE_LITERAL)].map((match) => `${match[1] as string}${match[2] ?? ''}`);
}

function elementRefs(from: string, el: Element): PageRef[] {
  const out: (PageRef | null)[] = [];
  for (const item of el.attrs) {
    const kind = LINK_ATTRS[item.name];
    if (kind && el.tagName !== 'link') out.push(pageRef(from, kind, item.value));
    else if (item.name.startsWith('on')) out.push(...literals(item.value).map((href) => pageRef(from, 'script', href)));
  }
  if (el.tagName === 'script') {
    const code = kids(el).map((child) => ('value' in child ? child.value : '')).join('');
    out.push(...literals(code).map((href) => pageRef(from, 'script', href)));
  }
  return out.filter((ref): ref is PageRef => ref !== null);
}

function pageRefs(from: string, html: string): PageRef[] {
  const seen = new Set<string>();
  return descendants(parse(html), () => true, NO_SKIP)
    .flatMap((el) => elementRefs(from, el))
    .filter((ref) => {
      const key = `${ref.kind} ${ref.href}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

interface FlowPage {
  path: string;
  refs: PageRef[];
}

async function crawlFlow(workTree: string, entry: string): Promise<FlowPage[]> {
  const pages: FlowPage[] = [{ path: entry, refs: pageRefs(entry, await readSourcePage(workTree, entry)) }];
  const seen = new Set([entry]);
  for (let index = 0; index < pages.length && pages.length < PORT_FLOW_MAX_PAGES; index += 1) {
    for (const ref of (pages[index] as FlowPage).refs) {
      if (seen.has(ref.page) || pages.length >= PORT_FLOW_MAX_PAGES) continue;
      seen.add(ref.page);
      const html = await readSourcePage(workTree, ref.page).catch(() => null);
      if (html !== null) pages.push({ path: ref.page, refs: pageRefs(ref.page, html) });
    }
  }
  return pages;
}

async function rootPages(workTree: string): Promise<string[]> {
  const names = await readdir(workTree).catch(() => [] as string[]);
  return names.filter((name) => /\.html?$/i.test(name)).sort();
}

function flowRoutes(entry: string, order: string[], base: string): Map<string, string> {
  const routes = new Map<string, string>([[entry, base]]);
  const used = new Set<string>();
  for (const page of order.filter((item) => item !== entry)) {
    const slug = portPageSlug(page);
    let name = slug;
    for (let n = 2; used.has(name); n += 1) name = `${slug}-${n}`;
    used.add(name);
    const route = cleanPortRoute(`${base}/${name}`);
    if (!route) throw new BadRequestError(`The route for ${page} under ${base} is too deep. Use a shorter route path.`);
    routes.set(page, route);
  }
  return routes;
}

function pickPages(order: string[], paths: string[] | null): string[] {
  if (!paths) return order;
  const wanted = new Set(paths.map(sourcePagePath));
  return [...order.filter((page) => wanted.has(page)), ...[...wanted].filter((page) => !order.includes(page))].slice(0, PORT_FLOW_MAX_PAGES);
}

function flowLinks(crawled: FlowPage[], picked: string[], routes: Map<string, string>): PortFlowLink[] {
  const chosen = new Set(picked);
  return crawled
    .filter((page) => chosen.has(page.path))
    .flatMap((page) =>
      page.refs.flatMap((ref) => {
        const route = routes.get(ref.page);
        return route ? [{ from: page.path, kind: ref.kind, href: ref.href, page: ref.page, to: `${portRouteUrl(route)}${ref.rest}`, ported: chosen.has(ref.page) }] : [];
      }),
    );
}

export interface PortFlowInput extends PortPlanInput {
  paths: string[] | null;
}

async function flowPage(input: PortFlowInput, page: string, route: string): Promise<PortFlowPage> {
  const target = input.target ? { ...input.target, route } : null;
  const plan = await buildPortPlan({ source: { ...input.source, path: page }, target });
  return { path: page, title: plan.source.title, route, url: portRouteUrl(route), routeFile: plan.target?.routeFile ?? null, routeExists: plan.target?.routeExists ?? false, plan };
}

async function addPicked(workTree: string, crawled: FlowPage[], picked: string[]): Promise<void> {
  for (const page of picked) {
    if (!crawled.some((item) => item.path === page)) crawled.push({ path: page, refs: pageRefs(page, await readSourcePage(workTree, page)) });
  }
}

export async function buildFlowPlan(input: PortFlowInput): Promise<PortFlowPlan> {
  const { source, target } = input;
  const entry = sourcePagePath(source.path);
  const workTree = source.direction.workTree;
  const crawled = await crawlFlow(workTree, entry);
  const picked = pickPages(
    crawled.map((page) => page.path),
    input.paths,
  );
  await addPicked(workTree, crawled, picked);
  const order = crawled.map((page) => page.path);
  const base = target?.route ?? suggestPortRoute(entry, readPageFacts(await readSourcePage(workTree, entry)).title);
  const routes = flowRoutes(entry, order, base);
  const pages = await Promise.all(picked.map((page) => flowPage(input, page, routes.get(page) as string)));
  return {
    source: { projectId: source.project.id, directionId: source.direction.id, entry },
    target: target ? { projectId: target.project.id, name: target.project.name, framework: target.project.app?.framework ?? null } : null,
    base,
    pages,
    links: flowLinks(crawled, picked, routes),
    unselected: order.filter((page) => !picked.includes(page)),
    unreached: (await rootPages(workTree)).filter((page) => !order.includes(page)),
  };
}

export function portFlowText(flow: PortFlowPlan): string {
  const pages = flow.pages.map((page) => `- ${page.path} -> ${page.route}${page.routeFile ? ` (file ${page.routeFile})` : ''}`);
  const links = flow.links.map((link) => `- ${link.from} [${link.kind}] ${link.href} -> ${link.to}${link.ported ? '' : ' (page not ported in this run: keep this app path)'}`);
  return [
    `Base route: ${flow.base}`,
    `Pages in flow order (${flow.pages.length} route files):\n${pages.join('\n')}`,
    links.length > 0 ? `Link map (prototype href -> app path; keep the query part):\n${links.join('\n')}` : 'Link map: no links between the pages.',
  ].join('\n\n');
}
