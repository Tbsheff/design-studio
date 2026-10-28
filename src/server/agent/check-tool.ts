import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { CheckViewport, QualityFinding, RenderCheckResult, SelectionContext } from '../../shared/contracts.js';
import type { ResolvedRunConfig } from '../../shared/run-levels.js';
import type { RenderCheckOptions } from '../preview/browser.js';
import { capFindings, countSeverities, navFindings, sortFindings } from '../preview/quality.js';
import type { ProbeRect } from '../preview/quality-probe.js';
import { readScanFiles, scanTokenUse } from '../preview/token-scan.js';
import { diffFinding, diffImages, readPng } from '../preview/visual-diff.js';
import type { CanvasService } from '../canvas/service.js';
import type { AgentRunContext, PreviewService } from '../types.js';
import type { CriticImage } from './critic.js';
import { describeScreens, planScreens, warmScreens, type RunScreen } from './screens.js';
import { isBlocking, loopsDone, MAX_FIX_LOOPS, missingShots, recordCheck, type LoopLog } from './polish-loop.js';

const DIFF_VIEWPORTS: CheckViewport[] = ['desktop', 'mobile'];

export interface BaselineShot {
  viewport: CheckViewport;
  path: string;
  selectionRects: ProbeRect[];
}

export interface RunToolState {
  config: ResolvedRunConfig;
  shots?: number;
  log?: LoopLog;
  counters?: { shots: number; checks: number; mobileShots?: number };
  spentUsd: () => number;
  criticCostUsd: number;
  criticCalls: number;
  lastFindings: QualityFinding[];
  lastChecks: RenderCheckResult[];
  baseline: Promise<BaselineShot[]> | null;
  canvas?: CanvasService;
  startedAt?: number;
  screenCache?: { stamp: string; screens: RunScreen[] };
  lastScreens?: RunScreen[];
  reviewShots?: CriticImage[];
  regressionDone?: boolean;
  regressionNote?: string;
}

function selectionLocs(selection: SelectionContext[] | undefined): string[] {
  return (selection ?? []).flatMap((item) => (item.source ? [`${item.source.file}:${item.source.line}:${item.source.col}`] : []));
}

function checkOptions(ctx: AgentRunContext, config: ResolvedRunConfig): RenderCheckOptions {
  const checks = config.preset.checks;
  return { viewports: checks.viewports, quality: checks.quality, placeholder: checks.placeholder, selectionLocs: selectionLocs(ctx.request.selection) };
}

export function budgetLine(state: Pick<RunToolState, 'config' | 'spentUsd' | 'criticCostUsd'>): string | null {
  const cap = state.config.maxBudgetUsd;
  if (cap === null) return null;
  const spent = state.spentUsd() + state.criticCostUsd;
  const left = Math.max(0, Math.round((1 - spent / cap) * 100));
  return `Budget: about $${spent.toFixed(2)} of $${cap.toFixed(2)} used, ${left}% left.`;
}

async function tokenFindings(ctx: AgentRunContext, config: ResolvedRunConfig): Promise<QualityFinding[]> {
  const entries = ctx.designSystem?.entries ?? [];
  if (!config.preset.checks.quality || entries.length === 0) return [];
  return scanTokenUse(await readScanFiles(ctx.direction.workTree), entries);
}

async function diffOne(shot: BaselineShot, result: RenderCheckResult, targeted: boolean): Promise<QualityFinding | null> {
  if (!result.screenshotPath) return null;
  const [before, after] = await Promise.all([readPng(shot.path), readPng(result.screenshotPath)]);
  const masks = [...shot.selectionRects, ...(result.selectionRects ?? [])];
  return diffFinding(diffImages(before, after, masks), shot.viewport, targeted);
}

async function diffFindings(state: RunToolState | undefined, results: RenderCheckResult[], targeted: boolean): Promise<QualityFinding[]> {
  const shots = (await state?.baseline?.catch(() => [])) ?? [];
  const found = await Promise.all(
    shots.map((shot) => {
      const result = results.find((candidate) => candidate.viewport === shot.viewport);
      return result ? diffOne(shot, result, targeted).catch(() => null) : null;
    }),
  );
  return found.filter((finding): finding is QualityFinding => finding !== null);
}

interface CheckReport {
  results: RenderCheckResult[];
  findings: QualityFinding[];
  text: string;
}

function attachGlobal(results: RenderCheckResult[], global: QualityFinding[]): RenderCheckResult[] {
  return results.map((result) => {
    const mine = global.filter((finding) => (finding.viewport ?? 'desktop') === result.viewport);
    return mine.length ? { ...result, quality: [...(result.quality ?? []), ...mine] } : result;
  });
}

function viewportView(result: RenderCheckResult) {
  return {
    ...(result.screen ? { screen: result.screen } : {}),
    viewport: result.viewport,
    width: result.width,
    ok: result.ok,
    consoleErrors: result.consoleErrors,
    pageErrors: result.pageErrors,
    horizontalOverflow: result.horizontalOverflow,
    layout: result.layout,
    layoutTotal: result.layoutTotal,
    timingsMs: result.timingsMs,
  };
}

function reportText(results: RenderCheckResult[], findings: QualityFinding[], timingsMs: Record<string, number>, budget: string | null, screens: RunScreen[]): string {
  const capped = capFindings(findings);
  const body = {
    ...(screens.length > 1 ? { screens: `Checked ${screens.length} screens (findings name their screen; screenshot takes screen=<number>):\n${describeScreens(screens)}` } : {}),
    viewports: results.map(viewportView),
    quality: capped.findings,
    qualityOmitted: capped.omitted,
    counts: countSeverities(findings),
    timingsMs,
  };
  return `${JSON.stringify(body, null, 2)}${budget ? `\n${budget}` : ''}`;
}

async function timedStep<T>(timings: Record<string, number>, name: string, task: () => Promise<T>): Promise<T> {
  const started = Date.now();
  const value = await task();
  timings[name] = Date.now() - started;
  return value;
}

function loopLine(state: Pick<RunToolState, 'config' | 'log'>, blocking: number): string | null {
  const log = state.log;
  if (!log || !state.config.preset.checks.critic) return null;
  const missing = missingShots(log, state.config.preset.checks.viewports);
  const loops = loopsDone(log);
  const shots = missing.length ? ` Then take screenshots from=0 at: ${missing.join(', ')}.` : '';
  if (blocking > 0 && loops < MAX_FIX_LOOPS) return `Fix loop ${loops} of ${MAX_FIX_LOOPS} done. Required next: fix the ${blocking} high and medium findings above with Edit, run render_check again.${shots}`;
  return missing.length ? `Required next: take screenshots from=0 at: ${missing.join(', ')}, and look at every image before you finish.` : null;
}

function nextStepLine(state: Pick<RunToolState, 'config' | 'criticCalls' | 'shots' | 'log'>, blocking = 0): string | null {
  const checks = state.config.preset.checks;
  if (checks.screenshots && !state.shots) return 'Required next: call mcp__studio__screenshot with viewport mobile from=0, then the other sizes, and look at every image before you finish.';
  if (checks.critic && state.criticCalls === 0) return 'Required next: call mcp__studio__design_review for a fresh-eyes review before you finish.';
  if (state.config.preset.quickCritic && state.config.criticModel && state.criticCalls === 0) return 'Required next: call mcp__studio__design_review once (a quick fresh-eyes critic of every screen), then fix its high issues in your one fix loop.';
  return loopLine(state, blocking);
}

export async function buildCheckReport(preview: PreviewService, ctx: AgentRunContext, config: ResolvedRunConfig, state?: RunToolState): Promise<CheckReport> {
  const timings: Record<string, number> = {};
  const started = Date.now();
  const raw = await timedStep(timings, 'render', () => preview.renderCheck(ctx.project, ctx.direction, checkOptions(ctx, config)));
  const screens = state ? await timedStep(timings, 'screens', () => runScreens(preview, ctx, config, state).catch(() => [])) : [];
  const extra = await timedStep(timings, 'screenChecks', () => screenChecks(preview, ctx, config, screens));
  const tokens = await timedStep(timings, 'tokens', () => tokenFindings(ctx, config).catch(() => []));
  const targeted = (ctx.request.selection ?? []).length > 0;
  const diff = config.preset.checks.quality ? await timedStep(timings, 'diff', () => diffFindings(state, raw, targeted)) : [];
  const global = [...(config.preset.checks.navCheck ? navFindings(raw) : []), ...tokens, ...diff];
  const main = attachGlobal(raw, global);
  const entry = screens.length > 1 && screens[0] && isEntry(ctx, screens[0]) ? screens[0].label : null;
  const results = [...(entry ? main.map((result) => tagScreen(result, entry)) : main), ...extra];
  const findings = sortFindings(results.flatMap((result) => result.quality ?? []));
  timings['total'] = Date.now() - started;
  if (state?.log) recordCheck(state.log, findings);
  const tail = state ? [budgetLine(state), nextStepLine(state, findings.filter(isBlocking).length)].filter(Boolean).join('\n') : null;
  return { results, findings, text: reportText(results, findings, timings, tail, screens) };
}

export async function runScreens(preview: PreviewService, ctx: AgentRunContext, config: ResolvedRunConfig, state: RunToolState, maxScreens?: number): Promise<RunScreen[]> {
  const plan = config.preset.screens;
  if (!plan) return [];
  const screens = await planScreens({ preview, ctx, ...(state.canvas ? { canvas: state.canvas } : {}), ...(state.startedAt !== undefined ? { startedAt: state.startedAt } : {}), ...(state.screenCache ? { cache: state.screenCache } : {}) }, { ...plan, maxScreens: maxScreens ?? plan.maxScreens });
  state.lastScreens = screens;
  return screens;
}

function isEntry(ctx: AgentRunContext, screen: RunScreen): boolean {
  return !screen.prepare && screen.url === ctx.previewUrl;
}

function tagScreen(result: RenderCheckResult, screen: string): RenderCheckResult {
  return { ...result, screen, quality: (result.quality ?? []).map((finding) => ({ ...finding, screen })) };
}

async function screenChecks(preview: PreviewService, ctx: AgentRunContext, config: ResolvedRunConfig, screens: RunScreen[]): Promise<RenderCheckResult[]> {
  const extra = screens.filter((screen) => !isEntry(ctx, screen)).slice(0, config.preset.screens?.checkScreens ?? 0);
  if (extra.length === 0) return [];
  await warmScreens(preview, ctx.project, extra);
  const viewports = config.preset.checks.viewports.filter((viewport) => viewport !== 'tablet');
  const checked = await Promise.all(
    extra.map(async (screen, index) => {
      const options = { ...checkOptions(ctx, config), viewports, url: screen.url, filePrefix: `${ctx.direction.id}-screen-${index + 1}`, ...(screen.prepare ? { prepare: screen.prepare } : {}) };
      const results = await preview.renderCheck(ctx.project, ctx.direction, options).catch((error: unknown) => {
        console.warn(`[agent] screen check failed for ${screen.label}: ${error instanceof Error ? error.message : String(error)}`);
        return [];
      });
      return results.map((result) => tagScreen(result, screen.label));
    }),
  );
  return checked.flat();
}

export async function saveCheck(runsDir: string, runId: string, index: number | string, results: RenderCheckResult[]): Promise<void> {
  await mkdir(runsDir, { recursive: true });
  await writeFile(path.join(runsDir, `${runId}-check-${index}.json`), `${JSON.stringify(results, null, 2)}\n`);
}

export async function captureBaseline(preview: PreviewService, ctx: AgentRunContext, runsDir: string, runId: string): Promise<BaselineShot[]> {
  const url = ctx.previewUrl;
  if (!url || !ctx.direction.headVersionId || ctx.request.mode !== 'edit') return [];
  const locs = selectionLocs(ctx.request.selection);
  return Promise.all(
    DIFF_VIEWPORTS.map(async (viewport) => {
      const shot = await preview.inspect(url, viewport, path.join(runsDir, `${runId}-baseline-${viewport}.png`), locs);
      return { viewport, path: shot.path, selectionRects: shot.selectionRects };
    }),
  );
}
