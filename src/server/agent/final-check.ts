import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { AppReviewRecord, FinalCheck, QualityFinding, RenderCheckResult } from '../../shared/contracts.js';
import type { PreviewService, AgentRunContext } from '../types.js';
import type { CanvasService } from '../canvas/service.js';
import { buildCheckReport, saveCheck, type RunToolState } from './check-tool.js';
import { countSeverities } from '../preview/quality.js';
import { EDIT_TOOL_NAMES as EDIT_TOOLS, REVIEW_FRAME_TOOL } from './permissions.js';
import { defaultShotTarget, isContextFrame } from './run-target.js';
import { probeLayout } from './layout-region.js';
import { regionFindings } from './fit-check.js';
import { changedSince } from './screens.js';
import { runReviewFrameTool } from '../review/agent-tool.js';
import type { ImagePart } from './user-message.js';

const CHECK_TOOL = 'mcp__studio__render_check';

export function verifiedAfterLastEdit(toolOrder: readonly string[]): boolean {
  const lastEdit = toolOrder.findLastIndex((name) => EDIT_TOOLS.has(name));
  if (lastEdit === -1) return true;
  return toolOrder.lastIndexOf(CHECK_TOOL) > lastEdit;
}

function errorCount(results: RenderCheckResult[]): number {
  return results.reduce((sum, result) => sum + result.consoleErrors.length + result.pageErrors.length + (result.horizontalOverflow ? 1 : 0) + result.layout.filter((finding) => finding.severity === 'error').length, 0);
}

export function summarizeCheck(results: RenderCheckResult[], ranBy: FinalCheck['ranBy']): FinalCheck {
  const counts = countSeverities(results.flatMap((result) => result.quality ?? []));
  return { ranBy, errors: errorCount(results), ...counts };
}

interface FinalCheckInput {
  preview: PreviewService;
  ctx: AgentRunContext;
  run: RunToolState;
  toolOrder: readonly string[];
  runsDir: string;
  runId: string;
}

function wantsFinalCheck(input: Pick<FinalCheckInput, 'ctx' | 'run' | 'toolOrder'>): boolean {
  if (input.ctx.request.mode !== 'edit' || !input.ctx.previewUrl) return false;
  if (!input.run.config.preset.checks.screenshots) return false;
  return input.toolOrder.some((name) => EDIT_TOOLS.has(name));
}

export async function runFinalCheck(input: FinalCheckInput): Promise<FinalCheck | null> {
  if (!wantsFinalCheck(input)) return null;
  if (verifiedAfterLastEdit(input.toolOrder)) return summarizeCheck(input.run.lastChecks, 'agent');
  try {
    const report = await buildCheckReport(input.preview, input.ctx, input.run.config, input.run);
    await saveCheck(input.runsDir, input.runId, 'final', report.results);
    return summarizeCheck(report.results, 'studio');
  } catch (error) {
    console.warn(`[agent] studio final check failed: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

export interface ReviewNote {
  at: number;
  frame: string | null;
}

export function noteReview(run: RunToolState, name: string, input: unknown): void {
  if (name !== REVIEW_FRAME_TOOL) return;
  const frame = (input as { frame?: unknown } | null)?.frame;
  (run.reviews ??= []).push({ at: run.log?.toolOrder.length ?? 0, frame: typeof frame === 'string' ? frame : null });
}

export interface AppReviewGaps {
  mobile: boolean;
  review: boolean;
}

export function appReviewGaps(ctx: Pick<AgentRunContext, 'project' | 'target' | 'request' | 'previewUrl'>, run: RunToolState, toolOrder: readonly string[]): AppReviewGaps | null {
  if (!ctx.project.app || !ctx.target || !ctx.previewUrl || ctx.request.mode !== 'edit') return null;
  const firstEdit = toolOrder.findIndex((name) => EDIT_TOOLS.has(name));
  if (firstEdit === -1) return null;
  const mobile = !(run.log?.shots ?? []).some((shot) => shot.viewport === 'mobile' && shot.at > firstEdit);
  const review = !(run.reviews ?? []).some((note) => note.at > firstEdit && (note.frame === null || isContextFrame(ctx, note.frame)));
  return mobile || review ? { mobile, review } : null;
}

interface ReviewItem {
  severity: string;
  kind: string;
  element: string;
  selector: string | null;
  source: string | null;
  message: string;
  directFix: { style?: unknown } | null;
}

export interface StudioReviewInput {
  preview: PreviewService;
  canvas?: CanvasService;
  ctx: AgentRunContext;
  run: RunToolState;
  runsDir: string;
  runId: string;
}

export interface StudioReview {
  record: AppReviewRecord;
  images: ImagePart[];
  lines: string[];
}

const MOBILE = { width: 390, height: 2400 };
const LISTED = 8;

async function mobileImage(input: StudioReviewInput): Promise<ImagePart | null> {
  const url = defaultShotTarget(input.ctx)?.url;
  if (!url) return null;
  const out = path.join(input.runsDir, `${input.runId}-studio-mobile.png`);
  await input.preview.screenshot(url, MOBILE, out);
  return { mime: 'image/png', data: (await readFile(out)).toString('base64'), name: 'studio-mobile.png' };
}

function inChanged(source: string | null, changed: readonly string[]): boolean {
  const file = source?.replace(/:\d+(:\d+)?$/, '');
  return Boolean(file) && changed.some((entry) => entry === file || entry.endsWith(`/${file}`) || (file as string).endsWith(`/${entry}`));
}

async function reviewItems(input: StudioReviewInput): Promise<ReviewItem[]> {
  const result = await runReviewFrameTool({ preview: input.preview, ctx: input.ctx, ...(input.canvas ? { canvas: input.canvas } : {}) }, {});
  const text = result.content[0]?.text ?? '';
  if (result.isError) throw new Error(text);
  const app = input.ctx.project.app;
  const changed = app && input.run.startedAt !== undefined ? await changedSince(input.ctx.direction.workTree, app.appDir, input.run.startedAt) : [];
  const findings = (JSON.parse(text) as { findings?: ReviewItem[] }).findings ?? [];
  return findings.filter((item) => item.severity !== 'low' && inChanged(item.source, changed));
}

function reviewLine(item: ReviewItem): string {
  const fix = item.directFix?.style ? ` directFix.style: ${JSON.stringify(item.directFix.style)}` : '';
  return `- [${item.severity}] ${item.kind} on ${item.element}${item.source ? ` (${item.source})` : ''}: ${item.message}${fix}`;
}

function outsideLine(finding: QualityFinding): string {
  return `- [${finding.severity}] ${finding.check}: ${finding.message} Fix: ${finding.fix ?? ''}`;
}

async function layoutNow(input: StudioReviewInput): Promise<QualityFinding[]> {
  const target = input.ctx.target;
  const url = defaultShotTarget(input.ctx)?.url;
  if (!target?.layout || !url) return [];
  return regionFindings(target.layout, await probeLayout(input.preview, url), target.owner, input.ctx.request.prompt);
}

export async function studioAppReview(input: StudioReviewInput, gaps: AppReviewGaps): Promise<StudioReview> {
  const [image, items, outside] = await Promise.all([
    gaps.mobile ? mobileImage(input).catch(() => null) : Promise.resolve(null),
    gaps.review ? reviewItems(input).catch((error: unknown) => (console.warn(`[agent] studio review_frame failed: ${error instanceof Error ? error.message : String(error)}`), [])) : Promise.resolve([]),
    layoutNow(input).catch(() => []),
  ]);
  const lines = [...outside.map(outsideLine), ...items.slice(0, LISTED).map(reviewLine)];
  const record: AppReviewRecord = { mobileShot: gaps.mobile ? (image ? 'studio' : 'failed') : 'agent', review: gaps.review ? 'studio' : 'agent', findings: lines.length, fixLoop: false };
  return { record, images: image ? [image] : [], lines };
}

export function appReviewPrompt(review: StudioReview, gaps: AppReviewGaps): string | null {
  if (review.lines.length === 0 && review.images.length === 0) return null;
  const ran = [gaps.mobile ? 'a mobile screenshot at 390 px wide, 2400 px tall so content in inner scroll areas shows (attached)' : null, gaps.review ? 'review_frame on the context frame' : null].filter(Boolean).join(' and ');
  const body = review.lines.length ? ['Findings in the files you changed:', ...review.lines] : ['review_frame found nothing high or medium in the files you changed.'];
  return [
    '<studio-continue>',
    `You finished an app run without ${ran}, so the studio ran them.`,
    ...body,
    review.images.length ? 'Look at the mobile image: the new UI must sit inside the page content and fit 390 px without overlap or sideways scroll.' : '',
    'Do one fix loop: fix these findings and what you see in your new UI only, with edit_element or Edit. Then run mcp__studio__render_check once. Do not edit code you did not touch. Then reply in one or two sentences with what you fixed and what is left.',
    '</studio-continue>',
  ].filter(Boolean).join('\n');
}

export function appReviewNote(record: AppReviewRecord): string {
  const ran = [record.mobileShot === 'studio' ? 'mobile screenshot' : null, record.review === 'studio' ? 'review_frame' : null].filter(Boolean).join(' and ');
  return `Studio app check: the agent skipped the ${ran || 'app checks'}, so the studio ran them; ${record.findings} finding(s) in changed files; ${record.fixLoop ? 'one fix loop ran' : 'no fix loop ran'}.`;
}
