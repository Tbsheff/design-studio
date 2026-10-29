import { readFile } from 'node:fs/promises';
import { parse, type DefaultTreeAdapterMap } from 'parse5';
import { z } from 'zod';
import type { Direction, VersionMeta } from '../../shared/contracts.js';
import type { InsertTarget } from '../../shared/insert.js';
import { OWNERS_MAX, OWNER_STACK_MAX } from '../../shared/props.js';
import { BOOLEAN_OPS, DEFAULT_PEN_STROKE, DEFAULT_SHAPE_FILL, VECTOR_COLOR, VECTOR_PATH_MAX, VECTOR_SHAPES, type VectorBox, type VectorPaint, type VectorRequest, type VectorResult } from '../../shared/vector.js';
import type { InsertScope } from '../components/insert.js';
import { writeAndCommitAll } from './batch.js';
import { DirectEditError } from './errors.js';
import { setHtmlAttrs, setJsxAttrs, type AttrChanges } from './image-attrs.js';
import { assertCanEdit, patchSource, publishVersion, resolveSource, type DirectEditDeps, type ResolvedSource } from './index.js';
import { planInsertJsx } from './jsx-insert.js';
import { planBoolean } from './vector-boolean.js';
import { boxOfPoints, pathRings, round, translatePath } from './vector-geometry.js';
import { elementText, jsxAttrName, svgText } from './vector-snippet.js';
import { isHtmlFile, vectorDoc, type VNode } from './vector-source.js';

type Element = DefaultTreeAdapterMap['element'];

export interface VectorPlan {
  target: ResolvedSource;
  original: string;
  code: string;
  select: VectorResult['select'];
  title: string;
}

const MIN_SIZE = 1;
const loc = z.object({ file: z.string().min(1).max(1000), line: z.number().int().min(1), col: z.number().int().min(1) }).strict();
const target = z.object({ source: loc.nullable(), tag: z.string().max(100).optional(), selector: z.string().max(2000).optional(), owners: z.array(z.object({ name: z.string().max(64), stack: z.string().max(OWNER_STACK_MAX) })).max(OWNERS_MAX).optional() }).strict();
const coord = z.number().finite().min(-100000).max(100000);
const size = z.number().finite().min(0).max(100000);
const box = z.object({ x: coord, y: coord, width: size, height: size }).strict();
const color = z.string().trim().max(100).regex(VECTOR_COLOR, 'must be a color such as #1e1e1e, rgb(…), a CSS color name, none or var(--token)');
const paint = { fill: color.nullable().optional(), stroke: color.nullable().optional(), strokeWidth: z.number().finite().min(0).max(1000).nullable().optional() };
const place = { target, relativeParent: z.boolean().optional(), page: z.string().trim().max(300).optional() };

const schema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('shape'), shape: z.enum(VECTOR_SHAPES), box, ...place, ...paint }).strict(),
  z.object({ op: z.literal('path'), d: z.string().trim().min(1).max(VECTOR_PATH_MAX), name: z.string().trim().min(1).max(60).optional(), ...place, ...paint }).strict(),
  z.object({ op: z.literal('boolean'), boolean: z.enum(BOOLEAN_OPS), targets: z.tuple([target, target]), rects: z.tuple([box, box]).optional() }).strict(),
  z.object({ op: z.literal('paint'), target, ...paint }).strict(),
]);

export function parseVectorRequest(raw: unknown): VectorRequest {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new DirectEditError('invalid_request', issue ? `${issue.path.join('.') || 'request'}: ${issue.message}` : 'The vector request is not valid');
  }
  return parsed.data as VectorRequest;
}

function paintAttrs(request: VectorPaint, fill: string, stroke: string | undefined, width: number | undefined): Record<string, string | number | undefined> {
  const strokeColor = request.stroke === null ? undefined : (request.stroke ?? stroke);
  const strokeWidth = request.strokeWidth === null ? undefined : (request.strokeWidth ?? width);
  return { fill: request.fill === null ? 'none' : (request.fill ?? fill), stroke: strokeColor, 'stroke-width': strokeColor ? strokeWidth : undefined };
}

function shapeSnippet(request: Extract<VectorRequest, { op: 'shape' }>, html: boolean): string {
  const width = Math.max(MIN_SIZE, round(request.box.width));
  const height = Math.max(MIN_SIZE, round(request.box.height));
  const colors = paintAttrs(request, DEFAULT_SHAPE_FILL, undefined, 1);
  const child = request.shape === 'rect'
    ? elementText('rect', { width, height, ...colors }, html)
    : elementText('ellipse', { cx: round(width / 2), cy: round(height / 2), rx: round(width / 2), ry: round(height / 2), ...colors }, html);
  return svgText(request.shape === 'rect' ? 'Rectangle' : 'Ellipse', { x: request.box.x, y: request.box.y, width, height }, child, html);
}

function pathSnippet(request: Extract<VectorRequest, { op: 'path' }>, html: boolean): string {
  const bounds = boxOfPoints(pathRings(request.d).flat()) ?? boxOfPoints(pointsOfMove(request.d));
  if (!bounds) throw new DirectEditError('invalid_request', 'The path has no points');
  const colors = paintAttrs(request, 'none', DEFAULT_PEN_STROKE, 2);
  const pad = colors.stroke ? Math.ceil(Number(colors['stroke-width'] ?? 1) / 2) : 0;
  const frame: VectorBox = { x: bounds.x - pad, y: bounds.y - pad, width: Math.max(MIN_SIZE, bounds.width + pad * 2), height: Math.max(MIN_SIZE, bounds.height + pad * 2) };
  const d = translatePath(request.d, -frame.x, -frame.y);
  const child = elementText('path', { d, ...colors, 'stroke-linecap': colors.stroke ? 'round' : undefined, 'stroke-linejoin': colors.stroke ? 'round' : undefined }, html);
  return svgText(request.name ?? 'Vector', frame, child, html);
}

function pointsOfMove(d: string): [number, number][] {
  const match = /[Mm]\s*([-+]?[\d.]+)[\s,]*([-+]?[\d.]+)/.exec(d);
  return match ? [[Number(match[1]), Number(match[2])]] : [];
}

function relativeTo(plan: { target: ResolvedSource; code: string }, request: { target: InsertTarget; relativeParent?: boolean }): string {
  const source = request.target.source;
  if (!request.relativeParent || !source || source.file !== plan.target.relative) return plan.code;
  const patched = patchSource(plan.target.relative, plan.code, { source, selector: request.target.selector ?? '', ...(request.target.tag ? { tag: request.target.tag } : {}), style: { position: 'relative' } });
  return patched.code;
}

function pageFile(scope: InsertScope, page: string | undefined): string {
  const clean = (page ?? '').split(/[?#]/)[0]?.replace(/^\/+/, '') ?? '';
  if (clean === '') return scope.project.entry ?? 'index.html';
  if (clean.endsWith('/')) return `${clean}index.html`;
  return /\.[a-z0-9]+$/i.test(clean) ? clean : `${clean}.html`;
}

async function bodyTarget(scope: InsertScope, request: Extract<VectorRequest, { op: 'shape' | 'path' }>): Promise<Extract<VectorRequest, { op: 'shape' | 'path' }>> {
  if (request.target.source || request.target.tag !== 'body' || scope.project.kind === 'react') return request;
  const resolved = await resolveSource(scope.workTree, pageFile(scope, request.page));
  const doc = parse(await readFile(resolved.file, 'utf8'), { sourceCodeLocationInfo: true });
  const html = doc.childNodes.find((node): node is Element => 'tagName' in node && node.tagName === 'html');
  const body = html?.childNodes.find((node): node is Element => 'tagName' in node && node.tagName === 'body');
  const start = body?.sourceCodeLocation?.startTag;
  if (!start) throw new DirectEditError('invalid_request', `${resolved.relative} has no <body> tag to draw into`);
  return { ...request, target: { ...request.target, source: { file: resolved.relative, line: start.startLine, col: start.startCol } } };
}

async function planPlaced(scope: InsertScope, raw: Extract<VectorRequest, { op: 'shape' | 'path' }>): Promise<VectorPlan> {
  const request = await bodyTarget(scope, raw);
  const file = request.target.source?.file ?? '';
  const html = isHtmlFile(file);
  const jsx = request.op === 'shape' ? shapeSnippet(request, html) : pathSnippet(request, html);
  const plan = await planInsertJsx(scope, { target: request.target, position: 'inside', jsx });
  const code = relativeTo(plan, request);
  const what = request.op === 'shape' ? (request.shape === 'rect' ? 'rectangle' : 'ellipse') : 'vector path';
  return { target: plan.target, original: plan.original, code, select: plan.select, title: `Draw ${what} in ${request.target.tag ? `<${request.target.tag}>` : plan.target.relative}` };
}

async function sourceOf(scope: InsertScope, item: InsertTarget): Promise<{ resolved: ResolvedSource; code: string; at: { line: number; col: number } }> {
  if (!item.source) throw new DirectEditError('invalid_request', 'The shape has no source location. Select it again');
  const resolved = await resolveSource(scope.workTree, item.source.file);
  return { resolved, code: await readFile(resolved.file, 'utf8'), at: { line: item.source.line, col: item.source.col } };
}

async function planBooleanOp(scope: InsertScope, request: Extract<VectorRequest, { op: 'boolean' }>): Promise<VectorPlan> {
  const first = await sourceOf(scope, request.targets[0]);
  const second = await sourceOf(scope, request.targets[1]);
  if (first.resolved.file !== second.resolved.file) throw new DirectEditError('cannot_restructure', 'The two shapes are in different files. Boolean operations work on shapes in one file');
  const doc = vectorDoc(first.resolved.relative, first.code);
  const plan = planBoolean(first.code, doc, [doc.node(first.at), doc.node(second.at)], request.boolean, request.rects);
  return { target: first.resolved, original: first.code, code: plan.code, select: [{ file: first.resolved.relative, ...plan.at, tag: 'path' }], title: plan.title };
}

function paintTargets(node: VNode, name: string): VNode[] {
  if (node.tag !== 'svg') return [node];
  const shapes: VNode[] = [];
  const walk = (item: VNode) => {
    for (const child of item.children) {
      if (child.attrs[name] !== undefined || child.style[name] !== undefined) shapes.push(child);
      walk(child);
    }
  };
  walk(node);
  return shapes.length > 0 ? shapes : [node];
}

function paintChanges(request: VectorPaint): AttrChanges {
  const out: AttrChanges = {};
  if (request.fill !== undefined) out.fill = request.fill ?? 'none';
  if (request.stroke !== undefined) out.stroke = request.stroke;
  if (request.strokeWidth !== undefined) out['stroke-width'] = request.strokeWidth === null ? null : String(round(request.strokeWidth));
  return out;
}

function planPaintCode(code: string, node: VNode, changes: AttrChanges, html: boolean, typescript: boolean): string {
  const byNode = new Map<VNode, AttrChanges>();
  for (const [name, value] of Object.entries(changes)) for (const item of paintTargets(node, name)) byNode.set(item, { ...byNode.get(item), [html ? name : jsxAttrName(name)]: value });
  let out = code;
  for (const [item, set] of [...byNode.entries()].sort((a, b) => b[0].start - a[0].start)) {
    const at = { line: item.line, col: item.col };
    out = html ? setHtmlAttrs(out, at, set) : setJsxAttrs(out, at, typescript, set);
  }
  return out;
}

async function planPaint(scope: InsertScope, request: Extract<VectorRequest, { op: 'paint' }>): Promise<VectorPlan> {
  const found = await sourceOf(scope, request.target);
  const doc = vectorDoc(found.resolved.relative, found.code);
  const node = doc.node(found.at);
  if (node.tag !== 'svg' && !doc.svgOf(node)) throw new DirectEditError('invalid_request', `<${node.tag}> is not an SVG shape`);
  const changes = paintChanges(request);
  if (Object.keys(changes).length === 0) throw new DirectEditError('invalid_request', 'Pass fill, stroke or strokeWidth');
  const code = planPaintCode(found.code, node, changes, doc.html, doc.typescript);
  const what = Object.keys(changes).map((name) => name.replace('-', ' ')).join(' and ');
  return { target: found.resolved, original: found.code, code, select: [{ file: found.resolved.relative, line: node.line, col: node.col, tag: node.tag }], title: `Set ${what} of <${node.tag}>` };
}

export async function planVector(scope: InsertScope, raw: unknown): Promise<VectorPlan> {
  const request = parseVectorRequest(raw);
  if (request.op === 'shape' || request.op === 'path') return planPlaced(scope, request);
  if (request.op === 'boolean') return planBooleanOp(scope, request);
  return planPaint(scope, request);
}

export async function applyVector(deps: DirectEditDeps, scope: InsertScope & { direction: Direction }, raw: unknown): Promise<VectorResult> {
  const { project, direction } = scope;
  parseVectorRequest(raw);
  assertCanEdit(deps, project, direction);
  const plan = await planVector(scope, raw);
  if (plan.code === plan.original) throw new DirectEditError('invalid_request', 'Nothing changed');
  const meta: VersionMeta = { kind: 'manual', prompt: `Vector: ${plan.title}` };
  const version = await writeAndCommitAll(deps, project, direction, [plan], plan.title, meta);
  deps.history?.record({ projectId: project.id, directionId: direction.id, label: version.title, versionId: version.id, files: [{ file: plan.target.file, relative: plan.target.relative, before: plan.original, after: plan.code }] });
  await publishVersion(deps, project, direction, version);
  return { file: plan.target.relative, version, select: plan.select, title: plan.title };
}
