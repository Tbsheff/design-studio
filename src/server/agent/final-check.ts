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
import { changedLinesSince, type BaseFile, type ChangedFile } from './screens.js';
import { recordShot } from './polish-loop.js';
import { cutLine, mobileCuts, type CutElement } from './mobile-cut.js';
import { runReviewFrameTool } from '../review/agent-tool.js';
import type { ImagePart } from './user-message.js';
import type { FinalCheckWithReference, ReferenceRecord } from '../../shared/reference.js';
import { baselineFindingsFile, checkItems, levelCounts, splitByBaseline, type BaselineFindings, type FinalCheckWithBaseline } from '../../shared/final-check-baseline.js';

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

async function readBaselineFindings(runsDir: string, runId: string): Promise<BaselineFindings | null> {
  const text = await readFile(path.join(runsDir, baselineFindingsFile(runId)), 'utf8').catch(() => null);
  if (text === null) return null;
  try {
    const parsed = JSON.parse(text) as Partial<BaselineFindings>;
    return Array.isArray(parsed.items) ? (parsed as BaselineFindings) : null;
  } catch {
    return null;
  }
}

export async function baselineNote(results: RenderCheckResult[], runsDir: string, runId: string): Promise<string | null> {
  const baseline = await readBaselineFindings(runsDir, runId);
  if (!baseline) return null;
  const { fresh, old } = splitByBaseline(checkItems(results), baseline.items);
  if (old.length === 0) return null;
  const was = levelCounts(old);
  const now = levelCounts(fresh);
  return `Before this run: ${old.length} of these findings were already on the page (${was.error} errors, ${was.high} high). They are not from your change, so do not list them as problems in your reply. New from this run: ${now.error} errors, ${now.high} high, ${now.medium} medium${fresh.length > 0 ? `: ${fresh.slice(0, 3).map((item) => item.key.slice(0, 140)).join('; ')}` : ''}.`;
}

export function judgeChange(results: RenderCheckResult[], ranBy: FinalCheck['ranBy'], baseline: BaselineFindings | null): FinalCheckWithBaseline {
  if (!baseline) return summarizeCheck(results, ranBy);
  const { fresh, old } = splitByBaseline(checkItems(results), baseline.items);
  const now = levelCounts(fresh);
  const was = levelCounts(old);
  return { ranBy, errors: now.error, high: now.high, medium: now.medium, low: now.low, baseline: { errors: was.error, high: was.high, medium: was.medium, low: was.low, keys: old.map((item) => `${item.level}|${item.key}`) } };
}

async function finalResults(input: FinalCheckInput): Promise<{ results: RenderCheckResult[]; ranBy: FinalCheck['ranBy'] } | null> {
  if (verifiedAfterLastEdit(input.toolOrder)) return { results: input.run.lastChecks, ranBy: 'agent' };
  try {
    const report = await buildCheckReport(input.preview, input.ctx, input.run.config, input.run);
    await saveCheck(input.runsDir, input.runId, 'final', report.results);
    return { results: report.results, ranBy: 'studio' };
  } catch (error) {
    console.warn(`[agent] studio final check failed: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

export async function runFinalCheck(input: FinalCheckInput): Promise<FinalCheckWithBaseline | null> {
  if (!wantsFinalCheck(input)) return null;
  const checked = await finalResults(input);
  if (!checked) return null;
  return judgeChange(checked.results, checked.ranBy, await readBaselineFindings(input.runsDir, input.runId));
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
  const lastEdit = toolOrder.findLastIndex((name) => EDIT_TOOLS.has(name));
  if (lastEdit === -1) return null;
  const mobile = !(run.log?.shots ?? []).some((shot) => shot.viewport === 'mobile' && shot.at > lastEdit);
  const review = !(run.reviews ?? []).some((note) => note.at > lastEdit && (note.frame === null || isContextFrame(ctx, note.frame)));
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
  baseFile?: BaseFile;
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

const NEAR_LINES = 3;

function changedEntry(source: string | null, changed: readonly ChangedFile[]): { entry: ChangedFile; line: number | null } | null {
  const match = source?.match(/^(.*?)(?::(\d+))?(?::\d+)?$/);
  const file = match?.[1];
  if (!file) return null;
  const entry = changed.find((item) => item.file === file || item.file.endsWith(`/${file}`) || file.endsWith(`/${item.file}`));
  return entry ? { entry, line: match?.[2] ? Number(match[2]) : null } : null;
}

function inChangedFile(source: string | null, changed: readonly ChangedFile[]): boolean {
  return changedEntry(source, changed) !== null;
}

function inChanged(source: string | null, changed: readonly ChangedFile[]): boolean {
  const hit = changedEntry(source, changed);
  if (!hit) return false;
  const { entry, line } = hit;
  if (entry.lines === null || line === null) return true;
  return entry.lines.some(([from, to]) => line >= from - NEAR_LINES && line <= to);
}

async function reviewAt(input: StudioReviewInput, viewport: 'mobile' | null): Promise<ReviewItem[]> {
  const result = await runReviewFrameTool({ preview: input.preview, ctx: input.ctx, ...(input.canvas ? { canvas: input.canvas } : {}) }, viewport ? { viewport } : {});
  const text = result.content[0]?.text ?? '';
  if (result.isError) throw new Error(text);
  const findings = (JSON.parse(text) as { findings?: ReviewItem[] }).findings ?? [];
  return viewport ? findings.map((item) => ({ ...item, element: `${item.element} at 390 px` })) : findings;
}

async function changedFiles(input: StudioReviewInput): Promise<ChangedFile[]> {
  const app = input.ctx.project.app;
  return app && input.run.startedAt !== undefined ? changedLinesSince(input.ctx.direction.workTree, app.appDir, input.run.startedAt, input.baseFile) : [];
}

interface Cuts {
  cuts: CutElement[];
  oldCode: number;
}

const NO_CUTS: Cuts = { cuts: [], oldCode: 0 };

async function cutsNow(input: StudioReviewInput): Promise<Cuts> {
  const url = defaultShotTarget(input.ctx)?.url;
  if (!url) return NO_CUTS;
  const [all, changed] = await Promise.all([mobileCuts(input.preview, url), changedFiles(input)]);
  const inFiles = all.filter((cut) => inChangedFile(cut.usedAt, changed) || inChangedFile(cut.source, changed));
  const cuts = inFiles.filter((cut) => inChanged(cut.usedAt, changed) || inChanged(cut.source, changed));
  return { cuts, oldCode: inFiles.length - cuts.length };
}

interface ReviewItems {
  items: ReviewItem[];
  oldCode: number;
}

async function reviewItems(input: StudioReviewInput): Promise<ReviewItems> {
  const [frame, mobile] = await Promise.all([reviewAt(input, null), reviewAt(input, 'mobile').catch(() => [])]);
  const changed = await changedFiles(input);
  const seen = new Set(frame.map((item) => `${item.kind}|${item.selector ?? item.element}`));
  const extra = mobile.filter((item) => !seen.has(`${item.kind}|${item.selector ?? item.element}`));
  const inFiles = [...frame, ...extra].filter((item) => item.severity !== 'low' && inChangedFile(item.source, changed));
  const items = inFiles.filter((item) => inChanged(item.source, changed));
  return { items, oldCode: inFiles.length - items.length };
}

const NO_ITEMS: ReviewItems = { items: [], oldCode: 0 };

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
  const [image, review, outside, { cuts, oldCode: oldCuts }] = await Promise.all([
    gaps.mobile ? mobileImage(input).catch(() => null) : Promise.resolve(null),
    gaps.review ? reviewItems(input).catch((error: unknown) => (console.warn(`[agent] studio review_frame failed: ${error instanceof Error ? error.message : String(error)}`), NO_ITEMS)) : Promise.resolve(NO_ITEMS),
    layoutNow(input).catch(() => []),
    gaps.mobile ? cutsNow(input).catch(() => NO_CUTS) : Promise.resolve(NO_CUTS),
  ]);
  const log = input.run.log;
  if (image && log) recordShot(log, 'mobile');
  if (gaps.review) (input.run.reviews ??= []).push({ at: log?.toolOrder.length ?? 0, frame: null });
  const lines = [...outside.map(outsideLine), ...cuts.slice(0, LISTED).map(cutLine), ...review.items.slice(0, LISTED).map(reviewLine)];
  const oldCode = review.oldCode + oldCuts;
  const record: AppReviewRecord = { mobileShot: gaps.mobile ? (image ? 'studio' : 'failed') : 'agent', review: gaps.review ? 'studio' : 'agent', findings: lines.length, fixLoop: false, oldCode };
  return { record, images: image && lines.length > 0 ? [image] : [], lines };
}

export function appReviewPrompt(review: StudioReview, gaps: AppReviewGaps, pass = 1): string | null {
  if (review.lines.length === 0) return null;
  const ran = [gaps.mobile ? 'a mobile screenshot at 390 px wide, 2400 px tall so content in inner scroll areas shows (attached)' : null, gaps.review ? 'review_frame on the context frame at its size and at 390 px' : null].filter(Boolean).join(' and ');
  const opening = pass > 1 ? `You edited again after the studio checks, so the studio ran ${ran} once more.` : `You finished an app run without ${ran}, so the studio ran them.`;
  return [
    '<studio-continue>',
    opening,
    'Findings on the lines you changed:',
    ...review.lines,
    review.images.length ? 'Look at the mobile image: the new UI must sit inside the page content and fit 390 px without overlap or sideways scroll.' : '',
    'Do one fix loop: fix these findings and what you see in your new UI only, with edit_element or Edit. Then run mcp__studio__render_check once. Do not edit code you did not touch. Then reply in one or two sentences with what you fixed and what is left.',
    '</studio-continue>',
  ].filter(Boolean).join('\n');
}

function passText(record: AppReviewRecord, index: number): string {
  const old = record.oldCode ? ` (${record.oldCode} on old code not counted)` : '';
  return `pass ${index + 1}: ${record.findings} finding(s) on changed lines${old}, ${record.fixLoop ? 'a fix loop ran' : 'no fix loop'}`;
}

export function appReviewNote(records: readonly AppReviewRecord[]): string {
  const first = records[0];
  if (!first) return '';
  const ran = [first.mobileShot === 'studio' ? 'mobile screenshot' : null, first.review === 'studio' ? 'review_frame' : null].filter(Boolean).join(' and ');
  return `Studio app check: the agent skipped the ${ran || 'app checks'} after its last edit, so the studio ran them (desktop and 390 px); ${records.map(passText).join('; ')}.`;
}

export function mergeAppReviews(records: readonly AppReviewRecord[]): AppReviewRecord | null {
  const first = records[0];
  const last = records.at(-1);
  if (!first || !last) return null;
  const passes = records.map((record) => ({ mobileShot: record.mobileShot, review: record.review, findings: record.findings, oldCode: record.oldCode ?? 0, fixLoop: record.fixLoop }));
  return { ...first, mobileShot: records.some((record) => record.mobileShot === 'failed') ? 'failed' : first.mobileShot, findings: last.findings, oldCode: last.oldCode ?? 0, fixLoop: records.some((record) => record.fixLoop), passes };
}

const EMPTY_CHECK: FinalCheck = { ranBy: 'studio', errors: 0, high: 0, medium: 0, low: 0 };

export function withReference(check: FinalCheck | null | undefined, reference: ReferenceRecord | null): FinalCheck | undefined {
  if (!reference) return check ?? undefined;
  const merged: FinalCheckWithReference = { ...(check ?? EMPTY_CHECK), reference };
  return merged;
}

export function referenceNote(record: ReferenceRecord | null): string {
  if (!record) return '';
  if (record.score === null) return `Studio reference check: could not compare with ${record.name ?? 'the reference'} (${record.error ?? 'unknown error'}).`;
  const loop = record.fixLoop ? `; one fix loop ran (score before it: ${record.before ?? '?'})` : '';
  return `Studio reference check: the frame matches ${record.name ?? 'the reference picture'} at ${record.score}/100${loop}.`;
}
