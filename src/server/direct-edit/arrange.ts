import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { ALIGN_OPS, DISTRIBUTE_OPS, arrangeLabel, type ArrangeMode, type ArrangeRequest, type ArrangeResult, type ArrangeWrite, type MeasureResult } from '../../shared/arrange.js';
import { planArrangeFacts, unchangedNote, type PlannedArrangeWrite } from '../../shared/arrange-plan.js';
import type { Direction, DirectEditRequest, Project, VersionMeta } from '../../shared/contracts.js';
import { measureRects } from '../../shared/measure.js';
import { withPagePath } from '../export/source.js';
import type { PreviewService } from '../types.js';
import { ArrangeProbeError, probeArrange, probeRects, type ProbedSource } from './arrange-probe.js';
import { writeAndCommitAll, type WrittenFile } from './batch.js';
import { chooseEditSite, siteRequest, type EditSiteScope } from './edit-site.js';
import { DirectEditError } from './errors.js';
import { htmlClassInfo } from './html.js';
import { assertCanEdit, parseDirectEditRequest, patchSource, publishVersion, resolveSource, themeForFile, type DirectEditDeps, type ResolvedSource } from './index.js';
import { jsxClassInfo } from './jsx.js';
import type { TailwindTheme } from './tailwind/theme.js';

export const ARRANGE_TARGETS_MAX = 50;
export const DEFAULT_ARRANGE_VIEWPORT = { width: 1440, height: 900 };

type Viewport = { width: number; height: number };

const viewportSchema = z.object({ width: z.number().int().min(100).max(10000), height: z.number().int().min(100).max(20000) }).strict();
const actionSchema = z.union([z.object({ align: z.enum(ALIGN_OPS) }).strict(), z.object({ distribute: z.enum(DISTRIBUTE_OPS) }).strict(), z.object({ tidy: z.literal(true) }).strict()]);
const requestSchema = z
  .object({
    targets: z.array(z.object({ selector: z.string().trim().min(1).max(2000) }).strip()).min(1).max(ARRANGE_TARGETS_MAX),
    action: actionSchema,
    path: z.string().trim().max(300).optional(),
    viewport: viewportSchema.optional(),
  })
  .strict();

export function parseArrangeRequest(raw: unknown): ArrangeRequest {
  const parsed = requestSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  const issue = parsed.error.issues[0];
  throw new DirectEditError('invalid_request', issue ? `arrange.${issue.path.join('.')}: ${issue.message}` : 'arrange is not valid');
}

export function isArrangeBody(body: unknown): body is { arrange: unknown } {
  return typeof body === 'object' && body !== null && 'arrange' in body;
}

export interface ArrangePlanned {
  mode: ArrangeMode;
  writes: ArrangeWrite[];
  note: string | null;
  changed: WrittenFile[];
  classes: string[];
}

interface FileState extends WrittenFile {
  theme: TailwindTheme | null;
  requests: DirectEditRequest[];
}

const locKey = (loc: { file: string; line: number; col: number }) => `${loc.file}:${loc.line}:${loc.col}`;

function refuse(message: string): DirectEditError {
  return new DirectEditError('invalid_request', message);
}

function mappedNote(write: PlannedArrangeWrite, copies: number): string {
  return `Skipped ${write.selector}: it is one of ${copies} copies made by one line of code (a .map() loop), so it cannot get its own value. Change the data or the loop in the code.`;
}

function onlyRemovals(group: PlannedArrangeWrite[]): boolean {
  return group.every((entry) => Object.values(entry.style).every((value) => value === null));
}

function keptGroup(group: PlannedArrangeWrite[], copies: number): PlannedArrangeWrite[] | null {
  const first = group[0] as PlannedArrangeWrite;
  if (copies <= 1) return group;
  if (group.length === copies && group.every((entry) => JSON.stringify(entry.style) === JSON.stringify(first.style))) return [first];
  if (onlyRemovals(group)) return [{ ...first, style: Object.assign({}, ...group.map((entry) => entry.style)) as Record<string, null> }];
  return null;
}

function withoutCopies(writes: PlannedArrangeWrite[], copiesOf: Map<string, number>): { writes: PlannedArrangeWrite[]; note: string | null } {
  const byLoc = new Map<string, PlannedArrangeWrite[]>();
  for (const entry of writes) {
    if (!entry.source) throw refuse(`${entry.selector} has no source location, so it cannot be arranged. Change it in the code.`);
    const key = locKey(entry.source);
    byLoc.set(key, [...(byLoc.get(key) ?? []), entry]);
  }
  const kept: PlannedArrangeWrite[] = [];
  const notes: string[] = [];
  for (const group of byLoc.values()) {
    const first = group[0] as PlannedArrangeWrite;
    const copies = Math.max(copiesOf.get(first.selector) ?? 1, new Set(group.map((entry) => entry.selector)).size);
    const keep = keptGroup(group, copies);
    if (keep) kept.push(...keep);
    else notes.push(mappedNote(first, copies));
  }
  if (kept.length === 0 && notes.length > 0) throw refuse(notes.join(' '));
  return { writes: kept, note: notes.length > 0 ? notes.join(' ') : null };
}

async function siteWrite(scope: EditSiteScope, entry: PlannedArrangeWrite, probed: ProbedSource | undefined): Promise<ArrangeWrite & { request: DirectEditRequest }> {
  const source = entry.source as NonNullable<PlannedArrangeWrite['source']>;
  const element = { source, usedAt: probed?.usedAt ?? null, usedBy: probed?.usedBy ?? null, tag: entry.tag };
  const site = await chooseEditSite(scope, element, { selector: entry.selector, classes: true });
  if ('error' in site) throw refuse(site.error);
  const request = parseDirectEditRequest({ ...siteRequest(site), selector: entry.selector, style: entry.style });
  return { selector: entry.selector, tag: entry.tag, source: site.source, style: entry.style, request };
}

function classesBefore(file: string, code: string, request: DirectEditRequest, theme: TailwindTheme | null): string[] {
  const position = { line: request.source.line, col: request.source.col };
  const extension = path.extname(file).toLowerCase();
  try {
    const info = extension === '.html' || extension === '.htm' ? htmlClassInfo(code, position, theme) : jsxClassInfo(code, position, extension === '.tsx', theme);
    return info?.classes ?? [];
  } catch {
    return [];
  }
}

async function stateFor(files: Map<string, FileState>, workTree: string, kind: Project['kind'], request: DirectEditRequest): Promise<FileState> {
  const target: ResolvedSource = await resolveSource(workTree, request.source.file);
  let state = files.get(target.file);
  if (!state) {
    const original = await readFile(target.file, 'utf8');
    state = { target, original, code: original, theme: await themeForFile(workTree, target.relative, original, { projectKind: kind }), requests: [] };
    files.set(target.file, state);
  }
  return state;
}

function byPositionFromEnd(a: DirectEditRequest, b: DirectEditRequest): number {
  return b.source.line - a.source.line || b.source.col - a.source.col;
}

async function patchFiles(workTree: string, kind: Project['kind'], requests: DirectEditRequest[]): Promise<{ changed: WrittenFile[]; classes: string[] }> {
  const files = new Map<string, FileState>();
  for (const request of requests) (await stateFor(files, workTree, kind, request)).requests.push(request);
  const classes = new Set<string>();
  for (const state of files.values()) {
    for (const request of state.requests.sort(byPositionFromEnd)) {
      const before = new Set(classesBefore(state.target.relative, state.code, request, state.theme));
      const patch = patchSource(state.target.relative, state.code, request, state.theme);
      state.code = patch.code;
      if (patch.tailwind?.mode === 'classes') for (const name of patch.tailwind.classes) if (!before.has(name)) classes.add(name);
    }
  }
  return { changed: [...files.values()].filter((state) => state.code !== state.original).map(({ target, original, code }) => ({ target, original, code })), classes: [...classes] };
}

export interface ArrangeScope {
  workTree: string;
  project: Pick<Project, 'app' | 'kind'>;
}

export async function planArrange(preview: PreviewService, url: string, scope: ArrangeScope, request: ArrangeRequest): Promise<ArrangePlanned> {
  const selectors = request.targets.map((target) => target.selector);
  const probe = await probeArrange(preview, url, request.viewport ?? DEFAULT_ARRANGE_VIEWPORT, selectors).catch((error: unknown) => {
    throw error instanceof ArrangeProbeError ? refuse(error.message) : error;
  });
  const plan = planArrangeFacts(probe.facts, request.action);
  if (!plan.ok) throw refuse(plan.reason);
  const copies = new Map(probe.facts.targets.map((target) => [target.selector, target.copies]));
  const kept = withoutCopies(plan.writes, copies);
  const writes = await Promise.all(kept.writes.map((entry) => siteWrite(scope, entry, probe.sources.get(entry.selector))));
  const patched = await patchFiles(scope.workTree, scope.project.kind, writes.map((entry) => entry.request));
  const note = [plan.note, kept.note].filter((part): part is string => Boolean(part)).join(' ') || null;
  return { mode: plan.mode, writes: writes.map(({ request: _request, ...entry }) => entry), note, ...patched };
}

function arrangeTitle(request: ArrangeRequest): string {
  const count = request.targets.length;
  return `${arrangeLabel(request.action)}: ${count === 1 ? '1 element' : `${count} elements`}`;
}

export async function applyArrange(deps: DirectEditDeps & { preview: PreviewService }, project: Project, direction: Direction, body: { arrange: unknown }): Promise<ArrangeResult> {
  const request = parseArrangeRequest(body.arrange);
  const headVersionId = assertCanEdit(deps, project, direction);
  const url = withPagePath(await deps.preview.directionUrl(project, direction), request.path || undefined);
  const plan = await planArrange(deps.preview, url, { workTree: direction.workTree, project }, request);
  const base = { mode: plan.mode, writes: plan.writes, classes: plan.classes };
  if (plan.changed.length === 0) return { ...base, changed: false, files: [], version: await deps.versions.get(project, headVersionId), note: unchangedNote(request.action, plan.note) };
  const title = arrangeTitle(request);
  const meta: VersionMeta = { kind: 'manual', prompt: title };
  const version = await writeAndCommitAll(deps, project, direction, plan.changed, title, meta);
  deps.history?.record({ projectId: project.id, directionId: direction.id, label: version.title, versionId: version.id, files: plan.changed.map((file) => ({ file: file.target.file, relative: file.target.relative, before: file.original, after: file.code })) });
  await publishVersion(deps, project, direction, version);
  return { ...base, changed: true, files: plan.changed.map((file) => file.target.relative), version, note: plan.note };
}

export async function measureTargets(preview: PreviewService, url: string, viewport: Viewport | undefined, a: string, b: string): Promise<MeasureResult> {
  const [first, second] = await probeRects(preview, url, viewport ?? DEFAULT_ARRANGE_VIEWPORT, [a, b]);
  if (!first) throw refuse(`No element matches ${a} on the page.`);
  if (!second) throw refuse(`No element matches ${b} on the page.`);
  return measureRects(first, second);
}
