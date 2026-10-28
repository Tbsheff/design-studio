import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CANVAS_GAP, CANVAS_MAX_FRAMES, cleanFrameLabel, type CanvasFile, type CanvasFileFrame } from '../../shared/canvas-file.js';
import type { CanvasWriteSource, Direction, Project } from '../../shared/contracts.js';
import { DEFAULT_FRAME_STATE } from '../../shared/frame-state.js';
import { upsertLink, type LinksFile } from '../../shared/links.js';
import { cleanParams, dynamicNames, FLOW_MAX_DEPTH, FLOW_MAX_FRAMES, type FlowFrame, type FlowInput, type FlowLinkMade, type FlowResult, type FlowSkipped, type RouteLink, type RouteLinksResult } from '../../shared/route-flow.js';
import type { CanvasService } from '../canvas/service.js';
import { applyPlacement, CANVAS_VIEWPORTS, findFrame, type PlaceSpec } from '../canvas/tools.js';
import { BadRequestError } from '../store/errors.js';
import { applyFrameState, configuredFrameStates, type FrameStateDeps } from './frame-state-service.js';
import { frameStatesView } from './frame-state.js';
import { cleanHref, createRouteScanner, type RouteScanner } from './route-links.js';

export const FLOW_NOTE =
  'Attached Next.js apps only. The studio reads the route source with Babel (the page file and the files it imports, not layouts): <Link href> and other href props, router.push/replace, redirect() and form actions, with route constants and helper functions from imports. Dynamic segments get the sample params ({slug: "acme", patientId: "123"}), kept in the studio data dir. A clickable source becomes a prototype link, so Play walks the app flow; a redirect in code makes a frame but no link. New frames from a frame keep its preview state (signed in and so on).';

const FLOW_FILE = 'flow.json';
const SCANNER_TTL_MS = 30_000;
const MAX_NEIGHBOURS = 6;
const MAX_SKIPPED = 12;

export interface FlowDeps {
  canvas: CanvasService;
  projectDir: (projectId: string) => string;
  frameStates: FrameStateDeps | null;
}

interface FlowNode {
  route: string;
  level: number;
}

interface Size {
  width: number;
  height: number;
}

export function configuredFlowDeps(canvas: CanvasService): FlowDeps | null {
  const states = configuredFrameStates();
  return states ? { canvas, projectDir: states.projectDir, frameStates: states } : null;
}

const scanners = new Map<string, { at: number; scanner: Promise<RouteScanner | null> }>();

function appOf(project: Project): { workTree: string; appDir: string } {
  const main = project.directions[0];
  if (!project.app || !main) throw new BadRequestError('Flow works only for attached app projects.');
  return { workTree: main.workTree, appDir: project.app.appDir };
}

async function scannerFor(project: Project): Promise<RouteScanner> {
  const { workTree, appDir } = appOf(project);
  const key = `${workTree}\u0000${appDir}`;
  const cached = scanners.get(key);
  const entry = cached && Date.now() - cached.at < SCANNER_TTL_MS ? cached : { at: Date.now(), scanner: createRouteScanner(workTree, appDir) };
  scanners.set(key, entry);
  const scanner = await entry.scanner;
  if (!scanner) throw new BadRequestError('This app has no app router (app/ or src/app/), so the studio cannot find its routes.');
  return scanner;
}

async function readParams(projectDir: string): Promise<Record<string, string>> {
  const text = await readFile(path.join(projectDir, FLOW_FILE), 'utf8').catch(() => null);
  if (!text) return {};
  try {
    return cleanParams((JSON.parse(text) as { params?: unknown }).params);
  } catch {
    return {};
  }
}

async function saveParams(projectDir: string, params: Record<string, string>): Promise<void> {
  await mkdir(projectDir, { recursive: true });
  await writeFile(path.join(projectDir, FLOW_FILE), `${JSON.stringify({ params }, null, 2)}\n`);
}

function paramsFrom(pattern: string, href: string): Record<string, string> {
  const want = pattern.split('/').filter(Boolean);
  const have = href.split('/').filter(Boolean);
  const out: Record<string, string> = {};
  want.forEach((segment, index) => {
    const name = /^\[([^.[\]][^\]]*)\]$/.exec(segment)?.[1];
    const value = have[index];
    if (name && value && !/^\[.*\]$/.test(value)) out[name] = value;
  });
  return cleanParams(out);
}

function resolveRoute(scanner: RouteScanner, raw: string): { route: string; params: Record<string, string> } {
  const exact = scanner.routes.find((item) => item.route === raw || item.route === `/${raw.replace(/^\/+/, '')}`);
  if (exact) return { route: exact.route, params: {} };
  const href = cleanHref(raw.startsWith('/') ? raw : `/${raw}`);
  const route = href ? scanner.match(href) : null;
  if (!route || !href) throw new BadRequestError(`No app route matches ${raw}. Call list_routes for the routes.`);
  return { route, params: paramsFrom(route, href) };
}

export function concretePath(route: string, params: Record<string, string>, missing: Set<string>): string {
  const parts: string[] = [];
  for (const segment of route.split('/').filter(Boolean)) {
    const optional = /^\[\[\.\.\.([^\]]+)\]\]$/.exec(segment);
    const named = /^\[(?:\.\.\.)?([^\]]+)\]$/.exec(segment);
    if (optional?.[1]) {
      if (params[optional[1]]) parts.push(params[optional[1]] as string);
    } else if (named?.[1]) {
      const value = params[named[1]];
      if (!value) missing.add(named[1]);
      parts.push(value ?? '1');
    } else parts.push(segment);
  }
  return parts.join('/');
}

function flowLabel(route: string): string {
  const segments = route.split('/').filter(Boolean);
  if (segments.length === 0) return 'Home';
  const last = segments[segments.length - 1] as string;
  const dynamic = last.startsWith('[');
  const word = [...segments].reverse().find((segment) => !segment.startsWith('[')) ?? 'Page';
  const title = word.replace(/[-_]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
  return (cleanFrameLabel(dynamic ? `${title} detail` : title) ?? 'Page').slice(0, 40);
}

function neighbours(result: RouteLinksResult): string[] {
  const out: string[] = [];
  for (const link of result.links) {
    const counts = link.element !== null || (link.kind === 'redirect' && link.file === result.file);
    if (counts && link.to && link.to !== result.route && !out.includes(link.to)) out.push(link.to);
  }
  return out.slice(0, MAX_NEIGHBOURS);
}

async function walkFlow(scanner: RouteScanner, starts: string[], depth: number, limit: number): Promise<{ nodes: FlowNode[]; cut: string[] }> {
  const nodes: FlowNode[] = starts.map((route) => ({ route, level: 0 }));
  const cut: string[] = [];
  let level = starts;
  for (let step = 1; step <= depth && level.length > 0; step += 1) {
    const next: string[] = [];
    for (const route of level) {
      for (const target of neighbours(await scanner.scan(route))) {
        if (nodes.some((node) => node.route === target) || cut.includes(target)) continue;
        if (nodes.length >= limit) cut.push(target);
        else {
          nodes.push({ route: target, level: step });
          next.push(target);
        }
      }
    }
    level = next;
  }
  return { nodes, cut };
}

function overlaps(a: { x: number; y: number } & Size, b: CanvasFileFrame): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

function besideAll(frames: readonly CanvasFileFrame[]): { x: number; y: number } {
  const shown = frames.filter((frame) => !frame.hidden);
  if (shown.length === 0) return { x: 0, y: 0 };
  return { x: Math.max(...shown.map((frame) => frame.x + frame.width)) + CANVAS_GAP * 2, y: Math.min(...shown.map((frame) => frame.y)) };
}

interface LayoutInput {
  file: CanvasFile;
  nodes: FlowNode[];
  paths: Map<string, string>;
  move: boolean;
  anchorPath: string | null;
  size: Size;
}

function frameAt(frames: readonly CanvasFileFrame[], pathText: string): CanvasFileFrame | undefined {
  return frames.find((frame) => (frame.path ?? '') === pathText && !frame.hidden) ?? frames.find((frame) => (frame.path ?? '') === pathText);
}

function layoutSpecs(o: LayoutInput): PlaceSpec[] {
  const frames = o.file.frames;
  const anchorFrame = o.anchorPath !== null ? frameAt(frames, o.anchorPath) : undefined;
  const size = anchorFrame ? { width: anchorFrame.width, height: anchorFrame.height } : o.size;
  const anchor = anchorFrame ? { x: anchorFrame.x, y: anchorFrame.y } : besideAll(frames);
  const placed: (CanvasFileFrame & { pathText: string })[] = [];
  const rows = new Map<number, number>();
  const specs: PlaceSpec[] = [];
  for (const node of o.nodes) {
    const pathText = o.paths.get(node.route) ?? '';
    const existing = frameAt(frames, pathText);
    if (existing && (!o.move || existing === anchorFrame)) {
      if (existing.hidden) specs.push({ frame: existing.id, hidden: false });
      continue;
    }
    const others = frames.filter((frame) => frame.id !== existing?.id && !frame.hidden && !placed.some((item) => item.id === frame.id));
    let row = rows.get(node.level) ?? 0;
    const spot = (): { x: number; y: number } & Size => ({ x: anchor.x + node.level * (size.width + CANVAS_GAP), y: anchor.y + row * (size.height + CANVAS_GAP), ...size });
    while ([...others, ...placed].some((frame) => overlaps(spot(), frame))) row += 1;
    rows.set(node.level, row + 1);
    const at = spot();
    placed.push({ ...at, id: existing?.id ?? `new-${placed.length}`, order: 0, pathText });
    specs.push({ ...(existing ? { frame: existing.id } : { label: flowLabel(node.route) }), path: pathText, x: at.x, y: at.y, width: size.width, height: size.height, hidden: false });
  }
  return specs;
}

function seeded(file: CanvasFile, size: Size): CanvasFile {
  return file.frames.length > 0 ? file : { ...file, frames: [{ id: 'f1', width: size.width, height: size.height, x: 0, y: 0, order: 0 }] };
}

interface LinkPlan {
  frameOf: Map<string, CanvasFileFrame>;
  scans: Map<string, RouteLinksResult>;
}

function sourceOf(link: RouteLink): string {
  return `${link.file}:${link.line}`;
}

function skipReason(link: RouteLink): string {
  if (link.kind === 'redirect') return 'A redirect in code, not a click, so there is no element to link. The frame is on the canvas.';
  return 'The element has no static text or class to find it on the page. Link it with the Prototype tool.';
}

interface Planned {
  file: LinksFile;
  made: FlowLinkMade[];
  skipped: FlowSkipped[];
}

function planOne(out: Planned, route: string, from: CanvasFileFrame, to: CanvasFileFrame, link: RouteLink): void {
  if (!link.element) {
    if (out.skipped.length < MAX_SKIPPED) out.skipped.push({ fromRoute: route, href: link.href, kind: link.kind, source: sourceOf(link), reason: skipReason(link) });
    return;
  }
  const { tag, selector, text } = link.element;
  const next = upsertLink(out.file, { from: { frame: from.id, path: from.path ?? '', selector, tag, ...(text ? { text } : {}) }, to: { frame: to.id }, transition: 'instant' });
  out.file = next.file;
  out.made.push({ id: next.link.id, fromFrame: from.id, toFrame: to.id, kind: link.kind, text: text ?? null, source: sourceOf(link) });
}

function planLinks(plan: LinkPlan, current: LinksFile): Planned {
  const out: Planned = { file: current, made: [], skipped: [] };
  for (const [route, scan] of plan.scans) {
    const from = plan.frameOf.get(route);
    if (!from) continue;
    for (const link of scan.links) {
      const to = link.to ? plan.frameOf.get(link.to) : undefined;
      if (to && to.id !== from.id) planOne(out, route, from, to, link);
    }
  }
  return out;
}

async function inheritState(deps: FlowDeps, project: Project, sourceFrame: string | null, added: string[]): Promise<string | null> {
  if (!deps.frameStates || !sourceFrame || added.length === 0) return null;
  const view = await frameStatesView(deps.projectDir(project.id));
  const state = view.frames[sourceFrame];
  if (!state || state === DEFAULT_FRAME_STATE) return null;
  for (const id of added) await applyFrameState(deps.frameStates, project, { frame: id, state });
  return state;
}

async function startRoutes(scanner: RouteScanner, input: FlowInput, frames: readonly CanvasFileFrame[]): Promise<{ routes: string[]; params: Record<string, string>; sourceFrame: string | null }> {
  if (input.from) {
    const frame = /^(f\d{1,4}|@.+)$/.test(input.from) ? findFrame(frames, input.from) : null;
    const resolved = resolveRoute(scanner, frame ? `/${frame.path ?? ''}` : input.from);
    return { routes: [resolved.route], params: resolved.params, sourceFrame: frame?.id ?? null };
  }
  const list = (input.routes ?? []).map((raw) => resolveRoute(scanner, raw));
  if (list.length === 0) throw new BadRequestError('Pass routes (two or more) or from (a route or a frame).');
  return { routes: [...new Set(list.map((item) => item.route))], params: Object.assign({}, ...list.map((item) => item.params)) as Record<string, string>, sourceFrame: null };
}

export async function listRouteLinks(project: Project, route: string): Promise<RouteLinksResult> {
  const scanner = await scannerFor(project);
  return scanner.scan(resolveRoute(scanner, route).route);
}

export async function readFlowParams(deps: Pick<FlowDeps, 'projectDir'>, project: Project): Promise<Record<string, string>> {
  appOf(project);
  return readParams(deps.projectDir(project.id));
}

interface FlowPlan {
  nodes: FlowNode[];
  cut: string[];
  paths: Map<string, string>;
  params: Record<string, string>;
  missing: Set<string>;
  sourceFrame: string | null;
  anchorPath: string | null;
}

async function planFlow(deps: FlowDeps, project: Project, scanner: RouteScanner, input: FlowInput, before: CanvasFile): Promise<FlowPlan> {
  const start = await startRoutes(scanner, input, before.frames);
  const params = { ...(await readParams(deps.projectDir(project.id))), ...start.params, ...cleanParams(input.params) };
  await saveParams(deps.projectDir(project.id), params);
  const depth = Math.max(0, Math.min(FLOW_MAX_DEPTH, input.depth ?? (input.from ? 1 : 0)));
  const room = Math.min(FLOW_MAX_FRAMES, CANVAS_MAX_FRAMES - Math.max(1, before.frames.length) + start.routes.length);
  const walked = await walkFlow(scanner, start.routes, depth, Math.max(start.routes.length, room));
  const nodes = input.from ? walked.nodes : walked.nodes.map((node, index) => ({ ...node, level: index }));
  const missing = new Set<string>();
  const paths = new Map(nodes.map((node) => [node.route, concretePath(node.route, params, missing)]));
  const anchorPath = paths.get(start.routes[0] as string) ?? null;
  return { nodes, cut: walked.cut, paths, params, missing, sourceFrame: start.sourceFrame, anchorPath };
}

function framesByRoute(plan: FlowPlan, frames: readonly CanvasFileFrame[]): Map<string, CanvasFileFrame> {
  const out = new Map<string, CanvasFileFrame>();
  for (const node of plan.nodes) {
    const frame = frameAt(frames, plan.paths.get(node.route) ?? '');
    if (frame) out.set(node.route, frame);
  }
  return out;
}

async function writeLinks(deps: FlowDeps, project: Project, plan: FlowPlan, frameOf: Map<string, CanvasFileFrame>, scans: Map<string, RouteLinksResult>, source: CanvasWriteSource): Promise<Planned & { start: string | null }> {
  let planned: Planned = { file: { version: 1, links: [] }, made: [], skipped: [] };
  const firstFrame = frameOf.get(plan.nodes[0]?.route ?? '') ?? null;
  const ids = new Set([...frameOf.values()].map((frame) => frame.id));
  const frames = (await deps.canvas.read(project)).canvas?.frames ?? [];
  const links = await deps.canvas.links.update(
    project,
    (current) => {
      planned = planLinks({ frameOf, scans }, current);
      const start = planned.file.start;
      const startOk = start !== undefined && (ids.has(start) || frames.some((frame) => frame.id === start));
      return startOk || !firstFrame ? planned.file : { ...planned.file, start: firstFrame.id };
    },
    source,
  );
  return { ...planned, start: links.start ?? null };
}

export async function buildFlow(deps: FlowDeps, project: Project, direction: Direction, input: FlowInput, source: CanvasWriteSource): Promise<FlowResult> {
  const scanner = await scannerFor(project);
  const before = (await deps.canvas.read(project)).canvas ?? { version: 1, frames: [], lofi: [] };
  const plan = await planFlow(deps, project, scanner, input, before);
  const size = deps.canvas.presence(project.id)?.liveSize ?? CANVAS_VIEWPORTS.desktop;
  const known = new Set(before.frames.map((frame) => frame.id));
  const snapshot = await deps.canvas.update(project, (file) => applyPlacement(seeded(file, size), layoutSpecs({ file: seeded(file, size), nodes: plan.nodes, paths: plan.paths, move: !input.from, anchorPath: plan.anchorPath, size }), direction.id).file, { source });
  const frames = snapshot.canvas?.frames ?? [];
  const frameOf = framesByRoute(plan, frames);
  const added = [...frameOf.values()].filter((frame) => !known.has(frame.id)).map((frame) => frame.id);
  const anchorFrame = plan.anchorPath !== null ? (frameAt(frames, plan.anchorPath)?.id ?? null) : null;
  const state = await inheritState(deps, project, plan.sourceFrame ?? anchorFrame, added);
  const scans = new Map<string, RouteLinksResult>();
  for (const node of plan.nodes) scans.set(node.route, await scanner.scan(node.route));
  const written = await writeLinks(deps, project, plan, frameOf, scans, source);
  const flowFrames: FlowFrame[] = plan.nodes.flatMap((node) => {
    const frame = frameOf.get(node.route);
    const isNew = frame ? added.includes(frame.id) : false;
    return frame ? [{ id: frame.id, route: node.route, path: `/${frame.path ?? ''}`, added: isNew, state: isNew ? state : null }] : [];
  });
  const needed = new Set(plan.nodes.flatMap((node) => dynamicNames(node.route)));
  return { frames: flowFrames, links: written.made, skipped: written.skipped, params: plan.params, missingParams: [...plan.missing].filter((name) => needed.has(name)), startFrame: written.start, cut: plan.cut };
}

export function describeFlow(result: FlowResult): string {
  const lines = [`Flow: ${result.frames.length} frames, ${result.links.length} prototype links.`];
  for (const frame of result.frames) lines.push(`- ${frame.id} ${frame.path} (${frame.route})${frame.added ? ' added' : ''}${frame.state ? `, state ${frame.state}` : ''}`);
  for (const link of result.links) lines.push(`- link ${link.id}: ${link.fromFrame} → ${link.toFrame} (${link.kind}${link.text ? ` “${link.text}”` : ''}) from ${link.source}`);
  for (const item of result.skipped) lines.push(`- not linked: ${item.fromRoute} → ${item.href} (${item.kind}, ${item.source}): ${item.reason}`);
  if (result.missingParams.length > 0) lines.push(`Sample params not set, so the frames use "1": ${result.missingParams.join(', ')}. Pass params {${result.missingParams.map((name) => `${name}: "…"`).join(', ')}}.`);
  if (result.cut.length > 0) lines.push(`Left out (frame limit): ${result.cut.join(', ')}.`);
  if (result.startFrame) lines.push(`Play starts at ${result.startFrame}.`);
  return lines.join('\n');
}

export function describeRouteLinks(result: RouteLinksResult): string {
  const lines = [`${result.route} (${result.file ?? 'no page file'}), ${result.scanned} source files read, ${result.links.length} links:`];
  for (const link of result.links) {
    const element = link.element ? ` on ${link.element.selector}${link.element.text ? ` “${link.element.text}”` : ''}` : ' (no element)';
    lines.push(`- ${link.kind} ${link.href} → ${link.to ?? 'no route'}${element} at ${link.file}:${link.line}`);
  }
  return lines.join('\n');
}
