import { readFile } from 'node:fs/promises';
import type { Direction, Project, StructureEditRequest, StructureEditResult, StructureOp, StructureTarget, VersionMeta } from '../../shared/contracts.js';
import { writeAndCommitAll, type WrittenFile } from './batch.js';
import { assertCanEdit, publishVersion, resolveSource } from './index.js';
import type { DirectEditDeps, ResolvedSource } from './index.js';
import { structureDoc, type StructureDoc } from './structure-docs.js';
import { planStructure, positionAt, refuse, type Frame, type Placement, type StructNode } from './structure-ops.js';
import { knownTokenVars } from './tokens.js';
import { parseStructureEdit } from './validate.js';

interface FileWork {
  file: string;
  target: ResolvedSource;
  targets: StructureTarget[];
}

interface FileResult extends WrittenFile {
  select: StructureEditResult['select'];
  tags: string[];
  placeTag: string | null;
}

const VERB: Record<StructureOp, string> = { delete: 'Delete', duplicate: 'Duplicate', wrap: 'Wrap', unwrap: 'Unwrap', move: 'Move', clear: 'Clear text in', group: 'Group' };
const ONE_FILE_OPS = new Set<StructureOp>(['wrap', 'move', 'group']);
const GROUP_FRAME = { open: '<div data-name="Group">', close: '</div>' };
const FALLBACK_GAP = '8px';
const GAP_TOKEN = '--space-2';
const LIST_TAGS = new Set(['ul', 'ol', 'menu']);
const NO_WRAP_TAGS = new Set(['tr', 'td', 'th', 'thead', 'tbody', 'tfoot', 'caption', 'colgroup', 'col', 'option', 'optgroup']);

async function groupTargets(workTree: string, request: StructureEditRequest): Promise<FileWork[]> {
  const groups = new Map<string, FileWork>();
  for (const target of request.targets) {
    const resolved = await resolveSource(workTree, target.source.file);
    const group = groups.get(resolved.file) ?? { file: target.source.file, target: resolved, targets: [] };
    group.targets.push(target);
    groups.set(resolved.file, group);
  }
  return [...groups.values()];
}

async function assertSameFile(workTree: string, request: StructureEditRequest, groups: FileWork[]): Promise<void> {
  if (!ONE_FILE_OPS.has(request.op)) return;
  if (groups.length > 1) throw refuse(`${VERB[request.op]} works on elements in one file`);
  const place = request.into ?? request.before ?? request.after;
  if (!place) return;
  const resolved = await resolveSource(workTree, place.source.file);
  if (resolved.file !== groups[0]?.target.file) throw refuse('Elements can move only inside the same file');
}

function placement(request: StructureEditRequest, node: (target: StructureTarget, role: 'into' | 'ref') => StructNode): Placement {
  if (request.into) return { into: node(request.into, 'into') };
  if (request.before) return { before: node(request.before, 'ref') };
  if (request.after) return { after: node(request.after, 'ref') };
  return {};
}

async function frameGap(workTree: string): Promise<string> {
  const known = await knownTokenVars(workTree);
  return known?.has(GAP_TOKEN) ? `var(${GAP_TOKEN})` : FALLBACK_GAP;
}

function domTags(work: FileWork, nodes: StructNode[]): string[] {
  return nodes.map((node, index) => (work.targets[index]?.tag ?? node.tag).toLowerCase());
}

function listTag(source: string, nodes: StructNode[]): string {
  const parent = nodes[0]?.parent ?? -1;
  const tag = parent >= 0 ? /^<([A-Za-z][\w-]*)/.exec(source.slice(parent, parent + 40))?.[1]?.toLowerCase() : undefined;
  return tag && LIST_TAGS.has(tag) ? tag : 'ul';
}

function listFrame(relative: string, list: string, name: string): Frame {
  const jsx = !/\.html?$/i.test(relative);
  const item = jsx ? `style={{ display: 'block', gap: 'inherit' }}` : 'style="display: block; gap: inherit;"';
  const inner = jsx ? `style={{ display: 'flex', flexDirection: 'column', gap: 'inherit', margin: 0, padding: 0, listStyle: 'inherit' }}` : 'style="display: flex; flex-direction: column; gap: inherit; margin: 0; padding: 0; list-style: inherit;"';
  return { open: `<li data-name="${name}" ${item}><${list} ${inner}>`, close: `</${list}></li>` };
}

function listGroupInner(doc: StructureDoc, source: string, node: StructNode): StructNode | null {
  const child = node.children.length === 1 ? node.children[0] : undefined;
  if (node.tag !== 'li' || !child || !/^<li\s[^>]*data-name=/.test(source.slice(node.start, node.start + 200))) return null;
  const tag = /^<([A-Za-z][\w-]*)/.exec(source.slice(child.start, child.start + 20))?.[1]?.toLowerCase();
  if (!tag || !LIST_TAGS.has(tag)) return null;
  return doc.node(positionAt(source, child.start), 'target', tag);
}

function unwrapTarget(request: StructureEditRequest, doc: StructureDoc, source: string, node: StructNode): StructNode {
  if (request.op !== 'unwrap') return node;
  const list = listGroupInner(doc, source, node);
  return list ? { ...node, inner: list.inner, children: list.children } : node;
}

function frameFor(work: FileWork, request: StructureEditRequest, doc: StructureDoc, nodes: StructNode[], source: string, gap: string): Frame {
  const plain = request.op === 'group' ? GROUP_FRAME : doc.frame(gap);
  if (request.op !== 'group' && request.op !== 'wrap') return plain;
  const tags = domTags(work, nodes);
  const fixed = tags.find((tag) => NO_WRAP_TAGS.has(tag));
  if (fixed) throw refuse(`A <${fixed}> cannot sit inside a new ${request.op === 'group' ? 'group' : 'frame'}: its parent allows no other element there. Select the whole table or list instead`);
  if (!tags.includes('li')) return plain;
  return listFrame(work.target.relative, listTag(source, nodes), request.op === 'group' ? 'Group' : 'Frame');
}

async function planFile(work: FileWork, request: StructureEditRequest, gap: string): Promise<FileResult> {
  const original = await readFile(work.target.file, 'utf8');
  const doc = structureDoc(work.target.relative, original);
  const locate = (target: StructureTarget, role: 'target' | 'into' | 'ref') => doc.node(target.source, role, target.tag);
  const nodes = work.targets.map((target) => unwrapTarget(request, doc, original, locate(target, 'target')));
  const place = placement(request, locate);
  const plan = planStructure(original, { op: request.op, nodes, place, frame: frameFor(work, request, doc, nodes, original, gap), closeTag: doc.closeTag });
  const positions = plan.select.map((offset) => positionAt(plan.code, offset));
  doc.verify(plan.code, positions);
  const selectTag = (offset: number) => /^<([A-Za-z][\w.-]*)/.exec(plan.code.slice(offset, offset + 80))?.[1]?.toLowerCase() ?? '';
  const select = positions.map((position, index) => ({ file: work.file, ...position, tag: selectTag(plan.select[index] ?? 0) }));
  const placeTag = (place.into ?? place.before ?? place.after)?.tag ?? null;
  return { target: work.target, original, code: plan.code, select, tags: nodes.map((node) => node.tag), placeTag };
}

function subject(tags: string[]): string {
  return tags.length === 1 ? (tags[0] ?? 'element') : `${tags.length} elements`;
}

function structureTitle(request: StructureEditRequest, tags: string[], placeTag: string | null): string {
  const what = subject(tags);
  if (request.op === 'wrap') return `Wrap ${what} in frame`;
  if (request.op === 'move' && placeTag) return request.into ? `Move ${what} into ${placeTag}` : `Move ${what} next to ${placeTag}`;
  return `${VERB[request.op]} ${what}`;
}

function structurePrompt(request: StructureEditRequest): string {
  const locs = request.targets.map((target) => `${target.source.file}:${target.source.line}:${target.source.col}`).join(', ');
  const place = request.into ?? request.before ?? request.after;
  const where = place ? ` ${request.into ? 'into' : request.before ? 'before' : 'after'} ${place.source.file}:${place.source.line}:${place.source.col}` : '';
  return `Structure edit: ${request.op} ${locs}${where}`;
}

export interface StructurePlan {
  request: StructureEditRequest;
  changed: FileResult[];
  title: string;
}

export async function planStructureEdit(workTree: string, raw: unknown): Promise<StructurePlan> {
  const request = parseStructureEdit(raw);
  const groups = await groupTargets(workTree, request);
  await assertSameFile(workTree, request, groups);
  const gap = await frameGap(workTree);
  const results = await Promise.all(groups.map((group) => planFile(group, request, gap)));
  const changed = results.filter((result) => result.code !== result.original);
  return { request, changed, title: structureTitle(request, results.flatMap((result) => result.tags), results[0]?.placeTag ?? null) };
}

export async function applyStructureEdit(deps: DirectEditDeps, project: Project, direction: Direction, raw: unknown): Promise<StructureEditResult> {
  const parsed = parseStructureEdit(raw);
  const headVersionId = assertCanEdit(deps, project, direction);
  const { request, changed, title } = await planStructureEdit(direction.workTree, parsed);
  if (changed.length === 0) return { files: [], version: await deps.versions.get(project, headVersionId), select: [] };
  const meta: VersionMeta = { kind: 'manual', prompt: structurePrompt(request) };
  const version = await writeAndCommitAll(deps, project, direction, changed, title, meta);
  deps.history?.record({
    projectId: project.id,
    directionId: direction.id,
    label: version.title,
    versionId: version.id,
    files: changed.map((result) => ({ file: result.target.file, relative: result.target.relative, before: result.original, after: result.code })),
  });
  await publishVersion(deps, project, direction, version);
  return { files: changed.map((result) => result.target.relative), version, select: changed.flatMap((result) => result.select) };
}
