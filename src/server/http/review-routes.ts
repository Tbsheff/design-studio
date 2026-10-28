import type { Context, Hono } from 'hono';
import { z } from 'zod';
import type { Direction, Project } from '../../shared/contracts.js';
import { REVIEW_FIX_MAX, type ReviewFinding, type ReviewFixResult, type ReviewResult } from '../../shared/review.js';
import type { CanvasService } from '../canvas/service.js';
import { DirectEditError, type DirectEditDeps } from '../direct-edit/index.js';
import { applyFindingFixes } from '../review/fixes.js';
import { resolveReviewFrame } from '../review/frame.js';
import { lastReview, rememberReview, runReview } from '../review/run.js';
import { BadRequestError } from '../store/errors.js';
import type { PreviewService } from '../types.js';

interface ReviewRouteDeps {
  editDeps: DirectEditDeps;
  preview: PreviewService;
  canvas: CanvasService;
  readBody: (c: Context) => Promise<unknown>;
  loadDirection: (pid: string, did: string) => Promise<{ project: Project; direction: Direction }>;
  withDirection: <T>(pid: string, did: string, task: (project: Project, direction: Direction) => Promise<T>) => Promise<T>;
}

const side = z.number().int().min(200).max(4000);
const reviewSchema = z.object({ frame: z.string().trim().min(1).max(60).optional(), path: z.string().trim().max(300).optional(), width: side.optional(), height: side.optional() }).strict();
const fixSchema = z.object({ findingIds: z.array(z.string().min(1).max(80)).min(1).max(REVIEW_FIX_MAX) }).strict();

function parse<S extends z.ZodType>(schema: S, body: unknown): z.output<S> {
  const parsed = schema.safeParse(body ?? {});
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new BadRequestError(issue ? `${issue.path.join('.') || 'body'}: ${issue.message}` : 'body is not valid');
  }
  return parsed.data;
}

async function currentReview(deps: ReviewRouteDeps, project: Project, direction: Direction): Promise<ReviewResult> {
  const last = lastReview(project.id, direction.id);
  if (!last) throw new BadRequestError('Run a review of this frame first (review_frame or the Review panel).');
  if (last.versionId === direction.headVersionId) return last;
  const fresh = await runReview(deps.preview, { project, direction, frame: last.frame });
  rememberReview(fresh);
  return fresh;
}

export async function fixFindings(deps: ReviewRouteDeps, project: Project, direction: Direction, ids: string[]): Promise<ReviewFixResult> {
  const review = await currentReview(deps, project, direction);
  const byId = new Map(review.findings.map((finding) => [finding.id, finding]));
  const chosen: ReviewFinding[] = [];
  const skipped: ReviewFixResult['skipped'] = [];
  for (const id of new Set(ids)) {
    const finding = byId.get(id);
    if (!finding) skipped.push({ id, reason: 'This finding is gone from the latest review. Run the review again.' });
    else if (!finding.fix) skipped.push({ id, reason: 'This finding needs judgment, so it has no direct fix. Ask the agent or edit it yourself.' });
    else chosen.push(finding);
  }
  if (chosen.length === 0) return { applied: [], skipped, files: [], version: null };
  const done = await applyFindingFixes(deps.editDeps, project, direction, chosen);
  return { applied: chosen.map((finding) => finding.id), skipped, ...done };
}

function editError(c: Context, error: unknown): Response {
  if (error instanceof DirectEditError) return c.json({ error: error.code, message: error.message }, error.status);
  throw error;
}

export function registerReviewRoutes(app: Hono, deps: ReviewRouteDeps): void {
  app.get('/api/projects/:pid/d/:did/review', async (c) => {
    const { project, direction } = await deps.loadDirection(c.req.param('pid'), c.req.param('did'));
    return c.json({ review: lastReview(project.id, direction.id) });
  });

  app.post('/api/projects/:pid/d/:did/review', async (c) => {
    const input = parse(reviewSchema, await deps.readBody(c));
    const { project, direction } = await deps.loadDirection(c.req.param('pid'), c.req.param('did'));
    const frame = await resolveReviewFrame(deps.canvas, project, direction, input);
    const result = await runReview(deps.preview, { project, direction, frame });
    rememberReview(result);
    return c.json(result);
  });

  app.post('/api/projects/:pid/d/:did/review/fix', async (c) => {
    const input = parse(fixSchema, await deps.readBody(c));
    try {
      return c.json(await deps.withDirection(c.req.param('pid'), c.req.param('did'), (project, direction) => fixFindings(deps, project, direction, input.findingIds)));
    } catch (error) {
      return editError(c, error);
    }
  });
}
