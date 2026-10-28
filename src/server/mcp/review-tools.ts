import { z } from 'zod';
import { REVIEW_FIX_MAX, type ReviewFinding, type ReviewFixResult, type ReviewResult } from '../../shared/review.js';
import { frameRef } from '../canvas/tools.js';
import { loadTarget, refuseWhileRunning, studioCall } from './edit-deps.js';
import { base, defineTool, directionId, ok, pagePath, projectId, versionActivity, type Done } from './edit-kit.js';

const VIEWPORTS = { desktop: { width: 1440, height: 900 }, tablet: { width: 768, height: 1024 }, mobile: { width: 390, height: 844 } } as const;

const findingId = z.string().trim().min(1).max(80);

const reviewSchema = z
  .object({
    projectId,
    directionId,
    frame: frameRef.optional().describe('Frame id or @label from canvas_list. Leave out for the frame the user has live, or the first frame.'),
    path: pagePath,
    viewport: z.enum(['desktop', 'tablet', 'mobile']).optional().describe('Render size instead of the frame size.'),
  })
  .strict();

const fixSchema = z
  .object({
    projectId,
    directionId,
    findingId: findingId.optional().describe('id of one finding from review_frame.'),
    findingIds: z.array(findingId).min(1).max(REVIEW_FIX_MAX).optional().describe('Or several finding ids, applied as one version.'),
  })
  .strict()
  .refine((input) => (input.findingId === undefined) !== (input.findingIds === undefined), 'pass findingId or findingIds');

function outline(finding: ReviewFinding) {
  return { id: finding.id, kind: finding.kind, severity: finding.severity, element: finding.element, selector: finding.selector, source: finding.source, message: finding.message, fix: finding.fix ? finding.fix.label : null };
}

const reviewFrame = defineTool(
  'review_frame',
  reviewSchema,
  {
    title: 'Review a frame',
    description: 'Run the studio Review panel checks on one canvas frame and return the findings: color contrast (with the nearest passing color token), tap target size, missing alt text and other axe-core accessibility rules, off-token values (raw colors or spacing that are not project tokens, Tailwind arbitrary values) and clipped or overflowing content. Each finding has an id, severity, element, selector, source and message; fix is the label of a direct fix that needs no judgment, or null when it needs judgment. Read only. Apply a fix with apply_fix.',
    readOnly: true,
    idempotent: true,
  },
  async (deps, input): Promise<Done> => {
    const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
    const size = input.viewport ? VIEWPORTS[input.viewport] : {};
    const review = await studioCall<ReviewResult>(deps, 'POST', `${base(project, direction.id)}/review`, { ...(input.frame ? { frame: input.frame } : {}), ...(input.path ? { path: input.path } : {}), ...size });
    const fixable = review.findings.filter((finding) => finding.fix).length;
    return { result: ok({ frame: review.frame, counts: review.counts, fixable, findings: review.findings.map(outline), notes: review.notes }) };
  },
);

const applyFix = defineTool(
  'apply_fix',
  fixSchema,
  {
    title: 'Apply a review fix',
    description: 'Apply the direct fix of one or more review_frame findings, with the same code path as the Fix button in the Review panel (the studio inspector edit, Tailwind-aware). Several ids make one version and one undo step. Findings with fix null need judgment and are skipped; change those with edit_element or write_file. Runs review_frame again first when the design changed since the last review.',
  },
  async (deps, input): Promise<Done> => {
    const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
    refuseWhileRunning(deps, project, direction);
    const ids = input.findingIds ?? [input.findingId ?? ''];
    const result = await studioCall<ReviewFixResult>(deps, 'POST', `${base(project, direction.id)}/review/fix`, { findingIds: ids });
    const output = ok({ applied: result.applied, skipped: result.skipped, files: result.files, versionId: result.version?.id ?? null, title: result.version?.title ?? null });
    if (result.applied.length === 0) return { result: output };
    const summary = `Applied ${result.applied.length} review ${result.applied.length === 1 ? 'fix' : 'fixes'}`;
    return { result: output, activity: versionActivity(project, direction, summary, result.version) };
  },
);

export const REVIEW_TOOLS = [reviewFrame, applyFix];
