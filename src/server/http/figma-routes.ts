import type { Context, Hono } from 'hono';
import { z } from 'zod';
import type { Direction, Project, VersionMeta } from '../../shared/contracts.js';
import { FIGMA_NODES_MAX_BYTES, type FigmaImportPreview, type FigmaImportRequest, type FigmaImportResult } from '../../shared/figma-nodes.js';
import { JSX_INSERT_POSITIONS } from '../../shared/insert.js';
import { OWNERS_MAX, OWNER_STACK_MAX } from '../../shared/props.js';
import { writeAndCommitAll } from '../direct-edit/batch.js';
import { assertCanEdit, DirectEditError, publishVersion, type DirectEditDeps } from '../direct-edit/index.js';
import { planInsertJsx } from '../direct-edit/jsx-insert.js';
import { fetchFigmaNodes, FigmaInputError, parseFigmaLink, parseFigmaNodes } from '../figma/nodes.js';
import { prepareFigmaImport, type FigmaImportScope } from '../figma/to-markup.js';
import type { PreviewService } from '../types.js';
import { previewOriginOf } from './insert-routes.js';

interface FigmaRouteDeps {
  editDeps: DirectEditDeps;
  preview: PreviewService;
  readBody: (c: Context) => Promise<unknown>;
  loadDirection: (pid: string, did: string) => Promise<{ project: Project; direction: Direction }>;
  withDirection: <T>(pid: string, did: string, task: (project: Project, direction: Direction) => Promise<T>) => Promise<T>;
}

const loc = z.object({ file: z.string().min(1).max(1000), line: z.number().int().min(1), col: z.number().int().min(1) }).strict();
const target = z.object({ source: loc.nullable(), tag: z.string().max(100).optional(), selector: z.string().max(2000).optional(), owners: z.array(z.object({ name: z.string().max(64), stack: z.string().max(OWNER_STACK_MAX) })).max(OWNERS_MAX).optional() }).strict();
const requestSchema = z
  .object({
    nodes: z.string().min(2).max(FIGMA_NODES_MAX_BYTES).optional(),
    link: z.string().trim().url().max(2000).optional(),
    nodeId: z.string().trim().min(1).max(200).optional(),
    target,
    position: z.enum(JSX_INSERT_POSITIONS as ['inside', 'before', 'after', 'replace']).default('inside'),
    dryRun: z.boolean().optional(),
  })
  .strict()
  .refine((input) => (input.nodes === undefined) !== (input.link === undefined), 'pass nodes or link, not both');

export function parseFigmaImportRequest(raw: unknown): FigmaImportRequest {
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new FigmaInputError(issue ? `${issue.path.join('.') || 'request'}: ${issue.message}` : 'The Figma import request is not valid');
  }
  return parsed.data as FigmaImportRequest;
}

export async function figmaNodesText(request: FigmaImportRequest): Promise<string> {
  if ('nodes' in request && typeof request.nodes === 'string') return request.nodes;
  const link = 'link' in request ? parseFigmaLink(request.link) : null;
  if (!link) throw new FigmaInputError('This is not a Figma file link. Copy the link to one frame (right-click the frame > Copy link).');
  const text = await fetchFigmaNodes(link);
  if (!request.nodeId && link.nodeId) request.nodeId = link.nodeId;
  return text;
}

type Scope = FigmaImportScope & { previewOrigin: string | null };

export async function applyFigmaImport(deps: DirectEditDeps, scope: Scope, raw: unknown): Promise<FigmaImportResult | FigmaImportPreview> {
  const request = parseFigmaImportRequest(raw);
  const doc = parseFigmaNodes(await figmaNodesText(request));
  const prepared = await prepareFigmaImport(scope, doc, { nodeId: request.nodeId, target: request.target, position: request.position });
  if (!request.dryRun) assertCanEdit(deps, scope.project, scope.direction);
  const plan = await planInsertJsx(scope, prepared.insert);
  if (request.dryRun) return prepared.preview;
  const { project, direction } = scope;
  const title = `Import Figma frame ${prepared.preview.frame.name}`.slice(0, 120);
  const at = plan.select[0];
  const meta: VersionMeta = { kind: 'manual', prompt: `Import Figma frame ${prepared.preview.frame.id}: ${request.position} ${at ? `${at.file}:${at.line}:${at.col}` : plan.target.relative}` };
  const version = await writeAndCommitAll(deps, project, direction, [plan], title, meta);
  deps.history?.record({ projectId: project.id, directionId: direction.id, label: version.title, versionId: version.id, files: [{ file: plan.target.file, relative: plan.target.relative, before: plan.original, after: plan.code }] });
  await publishVersion(deps, project, direction, version);
  return { file: plan.target.relative, version, select: plan.select, imports: plan.imports, usedAt: plan.usedAt, title, frame: prepared.preview.frame, stats: prepared.preview.stats };
}

function failure(c: Context, error: unknown): Response {
  if (error instanceof FigmaInputError) return c.json({ error: 'figma_input', message: error.message }, 400);
  if (error instanceof DirectEditError) return c.json({ error: error.code, message: error.message }, error.status);
  throw error;
}

export function registerFigmaRoutes(app: Hono, deps: FigmaRouteDeps): void {
  app.post('/api/projects/:pid/d/:did/figma/import', async (c) => {
    const body = await deps.readBody(c);
    const pid = c.req.param('pid');
    const did = c.req.param('did');
    const run = async (project: Project, direction: Direction) => applyFigmaImport(deps.editDeps, { project, direction, workTree: direction.workTree, previewOrigin: await previewOriginOf(deps.preview, project, direction) }, body);
    try {
      const dry = typeof body === 'object' && body !== null && (body as { dryRun?: unknown }).dryRun === true;
      if (dry) {
        const { project, direction } = await deps.loadDirection(pid, did);
        return c.json(await run(project, direction));
      }
      return c.json(await deps.withDirection(pid, did, run));
    } catch (error) {
      return failure(c, error);
    }
  });
}
