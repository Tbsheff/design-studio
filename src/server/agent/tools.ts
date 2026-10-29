import { FRAME_STATES_NOTE, applyFrameSession, applyFrameState, configuredFrameStates, describeFrameStates, readFrameStates, type FrameStateDeps, type FrameStateInput } from '../app/frame-state-service.js';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { McpSdkServerConfigWithInstance, query } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { levelOf, resolveRunConfig, withRunTask, type ResolvedRunConfig } from '../../shared/run-levels.js';
import type { TileResult } from '../preview/browser.js';
import type { AgentRunContext, PreviewService } from '../types.js';
import { budgetLine, buildCheckReport, freshCapture, runScreens, saveCheck, type RunToolState } from './check-tool.js';
import { recordShot } from './polish-loop.js';
import { beforeImages, changedSourceFor, criticImages, criticOutPrefix, describeCriticResult, runCritic, type CriticImage } from './critic.js';
import { describeScreens, samePage, warmScreens, type RunScreen } from './screens.js';
import type { TasteRule } from './taste.js';
import { defineTweaks } from '../tweaks/store.js';
import { checkDesignSystem, describeCheck } from '../design-system/check.js';
import type { CanvasService } from '../canvas/service.js';
import { canvasList, canvasPlace, canvasPoint, frameRef, placeSchema, type CanvasToolContext, type PlaceSpec } from '../canvas/tools.js';
import { editElementShape, runEditElement, runSetToken, setTokenShape } from './direct-tools.js';
import { buildFlow, configuredFlowDeps, describeFlow, describeRouteLinks, FLOW_NOTE, listRouteLinks } from '../app/route-flow.js';
import { FLOW_MAX_DEPTH, type FlowInput } from '../../shared/route-flow.js';
import { editLinks, editLinksShape, listLinks, probeWithPreview, type EditLinksArgs, type LinkProbe } from '../canvas/link-tools.js';
import { prepareShip } from '../git/ship-prepare.js';
import { runSetProps, setPropsShape } from './props-tool.js';
import { runSetImage, setImageShape } from './image-tool.js';
import { COMPARE_REFERENCE_DESCRIPTION, compareReferenceShape, runCompareToReference } from './reference-tool.js';
import { LAYER_STATE_TOOL, LIST_LOCKS_TOOL, layerStateShape, listLocksShape, runListLockedLayers, runSetLayerState } from './layer-state-tool.js';
import { booleanShapesShape, drawVectorShape, paintShapeShape, runBooleanShapes, runDrawVector, runPaintShape } from './vector-tool.js';
import { findStylesShape, replaceStyleShape, runFindStyles, runReplaceStyle } from './style-tool.js';
import { arrangeShape, measureShape, runArrange, runMeasure } from './arrange-tool.js';
import { runSelectMatching, selectMatchingShape } from './select-tool.js';
import { diffVersionsShape, runDiffVersions } from './version-diff-tool.js';
import { getRunContextShape, runGetRunContext } from './context-tool.js';
import { componentPreviewShape, runComponentPreview } from './component-preview-tool.js';
import { reviewFrameShape, runReviewFrameTool } from '../review/agent-tool.js';
import { insertComponentShape, runInsertComponent } from './insert-tool.js';
import { resolveShotTarget, type ShotArgs, type ShotTarget, type TargetDeps } from './run-target.js';
import { clearTextShape, insertJsxShape, runClearText, runInsertJsx } from './jsx-insert-tool.js';
import { TOOL_HELP, TOOL_SHORT, type StudioToolName } from './tool-help.js';
import { HELP_TOOL, studioToolsFor } from './tool-sets.js';
import { getLayersShape, listComponentsShape, runGetLayers, runListComponents, withLayerIds } from './kit-tools.js';
import { listCommentsShape, resolveCommentShape, runListComments, runResolveComment } from './comment-tools.js';
import type { CommentStore } from '../store/comments.js';
import { runAppDoctor } from './doctor-tool.js';
import { exportFrameShape, runExportFrame } from './export-tool.js';
import { createComponentShape, runCreateComponent, runSwapInstance, swapInstanceShape } from './component-create-tool.js';

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
} as const;

type ViewportName = keyof typeof VIEWPORTS;

const TILE_PLAN: Record<ViewportName, { tileHeight: number; maxTiles: number }> = {
  desktop: { tileHeight: 900, maxTiles: 4 },
  tablet: { tileHeight: 1024, maxTiles: 3 },
  mobile: { tileHeight: 1560, maxTiles: 4 },
};

type QueryFn = typeof query;

const TWEAK_CONTROLS_NOTE = 'Each control: {id, label, cssVar, type: range {min, max, step?, unit?, default: number} | color {default} | toggle {on, off, default: boolean} | select {options: [{label, value}], default}}.';

const agentEditElementShape = {
  ...editElementShape,
  style: z.record(z.string(), z.union([z.string(), z.number(), z.null()])).optional().describe('CSS properties to set, kebab-case or camelCase keys; null removes one. Tailwind projects get theme classes.'),
};

const TARGET_SHAPE = {
  frame: frameRef.optional().describe('Canvas frame id or @label: render its page with its frame state. Leave out for the frame from <canvas-context>.'),
  path: z.string().trim().max(300).optional().describe('Page path instead of the frame page, such as /settings or about.html.'),
  state: z.string().regex(/^[a-z][a-z0-9-]{0,23}$/).optional().describe('Attached apps: frame state id (default, session, empty, loading, error or a mock id) instead of the frame state.'),
};

export interface StudioToolDeps {
  preview: PreviewService;
  ctx: AgentRunContext;
  runsDir: string;
  runId: string;
  run?: RunToolState;
  tasteRules?: TasteRule[];
  queryFn?: QueryFn;
  env?: Record<string, string | undefined>;
  canvas?: CanvasService;
  comments?: CommentStore;
  exportsDir?: string;
}

const CANVAS_OFF = 'The canvas is not available in this run.';

function canvasContext(deps: Pick<StudioToolDeps, 'ctx' | 'canvas'>): CanvasToolContext | null {
  if (!deps.canvas) return null;
  return { canvas: deps.canvas, project: deps.ctx.project, direction: deps.ctx.direction, mode: deps.ctx.request.mode, plan: deps.ctx.request.plan === true };
}

async function withCanvas(deps: Pick<StudioToolDeps, 'ctx' | 'canvas'>, name: string, run: (ctx: CanvasToolContext) => Promise<{ content: { type: 'text'; text: string }[]; isError?: boolean }>) {
  const ctx = canvasContext(deps);
  if (!ctx) return errorText(CANVAS_OFF);
  try {
    return await run(ctx);
  } catch (error) {
    return errorText(`${name} failed: ${describeError(error)}`);
  }
}

export function runCanvasList(deps: Pick<StudioToolDeps, 'ctx' | 'canvas'>) {
  return withCanvas(deps, 'canvas_list', canvasList);
}

export function runCanvasPlace(deps: Pick<StudioToolDeps, 'ctx' | 'canvas'>, frames: PlaceSpec[]) {
  return withCanvas(deps, 'canvas_place', (ctx) => canvasPlace(ctx, frames));
}

export function runCanvasPoint(deps: Pick<StudioToolDeps, 'ctx' | 'canvas'>, args: { frame: string; selector?: string }) {
  return withCanvas(deps, 'canvas_point', (ctx) => canvasPoint(ctx, args));
}

function agentLinkProbe(deps: Pick<StudioToolDeps, 'ctx' | 'preview'>): LinkProbe | undefined {
  return probeWithPreview(deps.preview, deps.ctx.project, deps.ctx.direction);
}

export function runListLinks(deps: Pick<StudioToolDeps, 'ctx' | 'canvas' | 'preview'>) {
  return withCanvas(deps, 'list_links', (ctx) => listLinks(ctx, agentLinkProbe(deps)));
}

export function runEditLinks(deps: Pick<StudioToolDeps, 'ctx' | 'canvas' | 'preview'>, args: EditLinksArgs) {
  return withCanvas(deps, 'edit_links', (ctx) => editLinks(ctx, args, agentLinkProbe(deps)));
}

async function withFrameStates(deps: Pick<StudioToolDeps, 'ctx'>, name: string, run: (stateDeps: FrameStateDeps) => Promise<string>) {
  const stateDeps = configuredFrameStates();
  if (!stateDeps) return errorText('Frame states are not available in this run.');
  try {
    return { content: [{ type: 'text' as const, text: await run(stateDeps) }] };
  } catch (error) {
    return errorText(`${name} failed: ${describeError(error)}`);
  }
}

export function runListFrameStates(deps: Pick<StudioToolDeps, 'ctx'>) {
  return withFrameStates(deps, 'list_frame_states', async (stateDeps) => describeFrameStates(deps.ctx.project, await readFrameStates(stateDeps, deps.ctx.project)));
}

export function runSetFrameState(deps: Pick<StudioToolDeps, 'ctx'>, args: FrameStateInput) {
  return withFrameStates(deps, 'set_frame_state', async (stateDeps) => {
    const done = await applyFrameState(stateDeps, deps.ctx.project, args);
    return `Frame ${done.frameId} now shows ${done.state.name} (${done.state.id}).\n${describeFrameStates(deps.ctx.project, done.view)}`;
  });
}

export function runSetFrameSession(deps: Pick<StudioToolDeps, 'ctx'>, args: { user?: { name: string; email: string }; forgetCookies?: boolean }) {
  return withFrameStates(deps, 'set_frame_session', async (stateDeps) => describeFrameStates(deps.ctx.project, await applyFrameSession(stateDeps, deps.ctx.project, { ...(args.user ? { user: args.user } : {}), ...(args.forgetCookies ? { forget: true } : {}) })));
}

export async function runListRouteLinks(deps: Pick<StudioToolDeps, 'ctx'>, route: string) {
  try {
    return { content: [{ type: 'text' as const, text: describeRouteLinks(await listRouteLinks(deps.ctx.project, route)) }] };
  } catch (error) {
    return errorText(`list_route_links failed: ${describeError(error)}`);
  }
}

export function runAddFlow(deps: Pick<StudioToolDeps, 'ctx' | 'canvas'>, args: FlowInput) {
  return withCanvas(deps, 'add_flow', async (ctx) => {
    if (ctx.plan) return errorText('Plan mode is on, so the canvas stays as it is. Describe the flow in the plan.');
    if (ctx.mode === 'critique') return errorText('add_flow is not available in critique runs.');
    const flowDeps = configuredFlowDeps(ctx.canvas);
    if (!flowDeps) return errorText('Flow is not available in this run.');
    return { content: [{ type: 'text' as const, text: describeFlow(await buildFlow(flowDeps, ctx.project, ctx.direction, args, 'agent')) }] };
  });
}

function errorText(message: string) {
  return { content: [{ type: 'text' as const, text: message }], isError: true };
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function describeTiles(viewport: ViewportName, tiles: TileResult, box: { width: number; height: number } = VIEWPORTS[viewport]): string {
  const size = `${viewport} ${box.width}x${box.height}`;
  const span = `${tiles.paths.length} image(s) cover y=${tiles.from}-${tiles.to}px of a ${tiles.pageHeight}px page`;
  const more = tiles.to < tiles.pageHeight ? ` More of the page is below: call screenshot again with from=${tiles.to}.` : ' This is the end of the page.';
  return `${size}: ${span}.${more}`;
}

async function tileContent(paths: string[]) {
  const images = await Promise.all(paths.map(async (file) => (await readFile(file)).toString('base64')));
  return images.map((data) => ({ type: 'image' as const, data, mimeType: 'image/png' }));
}

interface StudioToolCounters {
  shots: number;
  checks: number;
  mobileShots?: number;
}

function firstMobileFrom(counters: StudioToolCounters, viewport: ViewportName, from: number): { from: number; note: string } {
  if (viewport !== 'mobile') return { from, note: '' };
  const first = (counters.mobileShots ?? 0) === 0;
  counters.mobileShots = (counters.mobileShots ?? 0) + 1;
  if (!first || from === 0) return { from, note: '' };
  return { from: 0, note: ' The first mobile screenshot of a run always starts at the top, so from was set to 0.' };
}

async function screenTarget(deps: StudioToolDeps, screen: number | undefined): Promise<RunScreen | string | null> {
  if (screen === undefined || !deps.run) return null;
  const screens = deps.run.lastScreens?.length ? deps.run.lastScreens : await runScreens(deps.preview, deps.ctx, deps.run.config, deps.run).catch(() => []);
  const picked = screens[screen - 1];
  if (!picked) return `There is no screen ${screen}. Screens:\n${describeScreens(screens) || '1. Entry'}`;
  await warmScreens(deps.preview, deps.ctx.project, [picked]);
  return picked;
}

function targetDeps(deps: Pick<StudioToolDeps, 'canvas'>): TargetDeps | null {
  const states = configuredFrameStates();
  const canvas = deps.canvas ?? states?.canvas;
  return canvas && states ? { canvas, projectDir: states.projectDir } : null;
}

async function pickTarget(deps: Pick<StudioToolDeps, 'ctx' | 'canvas'>, args: ShotArgs): Promise<ShotTarget | string> {
  try {
    return (await resolveShotTarget(targetDeps(deps), deps.ctx, args)) ?? 'Preview is not running for this direction.';
  } catch (error) {
    return describeError(error);
  }
}

function viewportName(width: number): ViewportName {
  if (width <= 500) return 'mobile';
  return width <= 1024 ? 'tablet' : 'desktop';
}

function shotBox(target: ShotTarget, viewport: ViewportName | undefined): { name: ViewportName; box: { width: number; height: number } } {
  if (viewport) return { name: viewport, box: VIEWPORTS[viewport] };
  if (target.size) return { name: viewportName(target.size.width), box: target.size };
  return { name: 'desktop', box: VIEWPORTS.desktop };
}

interface PickedShot {
  url: string;
  label: string;
  prepare?: string;
  viewport: ViewportName;
  box: { width: number; height: number };
}

async function pickShot(deps: StudioToolDeps, args: ShotArgs & { viewport?: ViewportName; screen?: number }): Promise<PickedShot | string> {
  const screen = await screenTarget(deps, args.screen);
  if (typeof screen === 'string') return screen;
  if (screen) {
    const viewport = args.viewport ?? 'desktop';
    return { url: screen.url, label: `screen ${args.screen}: ${screen.label}`, ...(screen.prepare ? { prepare: screen.prepare } : {}), viewport, box: VIEWPORTS[viewport] };
  }
  const target = await pickTarget(deps, args);
  if (typeof target === 'string') return `Screenshot failed: ${target}`;
  const { name, box } = shotBox(target, args.viewport);
  return { url: target.url, label: target.label, viewport: name, box };
}

export async function takeScreenshot(deps: StudioToolDeps, counters: StudioToolCounters, args: ShotArgs & { viewport?: ViewportName; from: number; theme?: 'light' | 'dark'; screen?: number }) {
  if (!deps.ctx.previewUrl) return errorText('Preview is not running for this direction, so no screenshot is available.');
  const target = await pickShot(deps, args);
  if (typeof target === 'string') return errorText(target);
  const { viewport, box } = target;
  const start = firstMobileFrom(counters, viewport, args.from);
  counters.shots += 1;
  if (deps.run) deps.run.shots = (deps.run.shots ?? 0) + 1;
  if (deps.run?.log) recordShot(deps.run.log, viewport, { url: target.url, ...(target.prepare ? { prepare: target.prepare } : {}) });
  const dark = args.theme === 'dark';
  const outPrefix = path.join(deps.runsDir, `${deps.runId}-shot-${counters.shots}-${viewport}${dark ? '-dark' : ''}`);
  try {
    await mkdir(deps.runsDir, { recursive: true });
    const fresh = freshCapture(deps.ctx, deps.run);
    const tiles = await deps.preview.screenshotTiles(target.url, { viewport: box, ...TILE_PLAN[viewport], from: start.from, outPrefix, ...(fresh ? { fresh } : {}), ...(dark ? { theme: 'dark' as const } : {}), ...(target.prepare ? { prepare: target.prepare } : {}) });
    return { content: [...(await tileContent(tiles.paths)), { type: 'text' as const, text: `Page ${target.label}. ${dark ? 'Dark theme. ' : ''}${describeTiles(viewport, tiles, box)}${start.note}` }] };
  } catch (error) {
    return errorText(`Screenshot failed: ${describeError(error)}`);
  }
}

function configOf(deps: StudioToolDeps): ResolvedRunConfig {
  return deps.run?.config ?? withRunTask(resolveRunConfig(deps.ctx.project.settings, levelOf(deps.ctx.request, deps.ctx.project.settings)), deps.ctx.request.task);
}

export async function runRenderCheck(deps: StudioToolDeps, counters: StudioToolCounters, args: ShotArgs = {}) {
  if (!deps.ctx.previewUrl) return errorText('Preview is not running for this direction, so render_check cannot run.');
  const target = await pickTarget(deps, args);
  if (typeof target === 'string') return errorText(`render_check failed: ${target}`);
  try {
    const report = await buildCheckReport(deps.preview, deps.ctx, configOf(deps), deps.run, target);
    counters.checks += 1;
    if (deps.run) {
      deps.run.lastFindings = report.findings;
      deps.run.lastChecks = report.results;
    }
    await saveCheck(deps.runsDir, deps.runId, counters.checks, report.results);
    return { content: [{ type: 'text' as const, text: report.text }] };
  } catch (error) {
    return errorText(`render_check failed: ${describeError(error)}`);
  }
}

async function loadQuery(deps: StudioToolDeps): Promise<QueryFn> {
  if (deps.queryFn) return deps.queryFn;
  return (await import('@anthropic-ai/claude-agent-sdk')).query;
}

function criticBlocked(deps: StudioToolDeps): string | null {
  const run = deps.run;
  if (!run || !run.config.criticModel || run.config.preset.criticMaxCalls === 0) return 'design_review is only available in prototype and polish runs. Use render_check and screenshots instead.';
  if (run.criticCalls >= run.config.preset.criticMaxCalls) return `design_review was already called ${run.criticCalls} times in this run, the limit. Use render_check and screenshots for the final check.`;
  if (!deps.ctx.previewUrl) return 'Preview is not running for this direction, so design_review cannot run.';
  return null;
}

function explicitTarget(args: ShotArgs): boolean {
  return Boolean(args.frame || args.path || args.state);
}

async function reviewScreens(deps: StudioToolDeps, run: RunToolState, target: ShotTarget, args: ShotArgs): Promise<RunScreen[]> {
  const own: RunScreen = { key: target.url, label: target.label, url: target.url, pagePath: target.path };
  const screens = explicitTarget(args) ? [] : await runScreens(deps.preview, deps.ctx, run.config, run).catch(() => []);
  const rest = screens.filter((screen) => screen.prepare || !samePage(screen.url, target.url));
  const first = screens.find((screen) => !screen.prepare && samePage(screen.url, target.url)) ?? own;
  const all = [first, ...rest];
  await warmScreens(deps.preview, deps.ctx.project, all);
  return all;
}

async function reviewInput(deps: StudioToolDeps, run: RunToolState, screens: RunScreen[], images: CriticImage[]) {
  const app = deps.ctx.project.app;
  const changedSource = app ? await changedSourceFor(deps.ctx.direction.workTree, app.appDir, run.startedAt).catch(() => []) : [];
  const before = !run.config.preset.quickCritic && run.reviewShots?.length ? beforeImages(run.reviewShots) : [];
  return {
    request: deps.ctx.request.prompt,
    findings: run.lastFindings,
    tasteRules: deps.tasteRules ?? [],
    designRules: (deps.ctx.designRules ?? []).map((rule) => rule.text),
    images,
    kind: run.config.preset.quickCritic ? ('quick' as const) : ('full' as const),
    ...(screens.length > 1 ? { screens: describeScreens(screens) } : {}),
    ...(app ? { app: true } : {}),
    ...(changedSource.length ? { changedSource } : {}),
    ...(before.length ? { before } : {}),
  };
}

export async function runDesignReview(deps: StudioToolDeps, args: ShotArgs = {}) {
  const blocked = criticBlocked(deps);
  if (blocked) return errorText(blocked);
  const target = await pickTarget(deps, args);
  if (typeof target === 'string') return errorText(`design_review failed: ${target}`);
  const run = deps.run as RunToolState;
  run.criticCalls += 1;
  try {
    const screens = await reviewScreens(deps, run, target, args);
    const prefix = criticOutPrefix(deps.runsDir, deps.runId, run.criticCalls);
    const images = await criticImages(deps.preview, screens, prefix, run.config.preset.screens?.maxImages, freshCapture(deps.ctx, run));
    const input = await reviewInput(deps, run, screens, images);
    const result = await runCritic(await loadQuery(deps), input, run.config.criticModel as string, run.config.maxBudgetUsd === null ? null : run.config.preset.criticBudgetUsd, deps.env);
    run.criticCostUsd += result.costUsd;
    run.reviewShots = images;
    await writeFile(`${prefix}.json`, `${JSON.stringify({ model: run.config.criticModel, kind: input.kind, screens: screens.map((screen) => screen.label), images: images.map((image) => image.label), before: input.before?.length ?? 0, costUsd: result.costUsd, error: result.error, issues: result.issues, raw: result.raw }, null, 2)}\n`);
    return { content: [{ type: 'text' as const, text: [describeCriticResult(result, run), budgetLine(run)].filter(Boolean).join('\n') }] };
  } catch (error) {
    return errorText(`design_review failed: ${describeError(error)}`);
  }
}

export async function runDefineTweaks(deps: Pick<StudioToolDeps, 'ctx'>, controls: unknown) {
  if (deps.ctx.request.mode === 'critique') return errorText('define_tweaks is not available in critique runs.');
  try {
    const result = await defineTweaks(deps.ctx.direction.workTree, controls);
    return result.ok ? { content: [{ type: 'text' as const, text: result.text }] } : errorText(result.text);
  } catch (error) {
    return errorText(`define_tweaks failed: ${describeError(error)}`);
  }
}

export async function runDesignSystemCheck(deps: Pick<StudioToolDeps, 'ctx'>) {
  if (!deps.ctx.project.designSystemFor) return errorText('design_system_check works only in a design-system project (the workbench of a design system).');
  try {
    const result = await checkDesignSystem(deps.ctx.direction.workTree);
    return { content: [{ type: 'text' as const, text: describeCheck(result) }] };
  } catch (error) {
    return errorText(`design_system_check failed: ${describeError(error)}`);
  }
}

export async function runPrepareShip(deps: Pick<StudioToolDeps, 'ctx' | 'runsDir'>) {
  if (!deps.ctx.project.app) return errorText('prepare_ship works only in an attached app project.');
  try {
    const plan = await prepareShip({ projectDir: path.dirname(deps.runsDir), project: deps.ctx.project });
    const files = plan.files.map((f) => ({ path: f.path, status: f.status, additions: f.additions, deletions: f.deletions, refused: f.refused, conflict: f.conflict }));
    const text = JSON.stringify({ blocked: plan.blocked, base: plan.base?.title ?? null, checkedOut: plan.repo?.branch ?? null, files, defaults: plan.defaults, note: 'Only the user can ship, with the Ship button in the studio. Tell them what is ready and what blocks it.' }, null, 2);
    return { content: [{ type: 'text' as const, text }] };
  } catch (error) {
    return errorText(`prepare_ship failed: ${describeError(error)}`);
  }
}

export async function createStudioMcpServer(deps: StudioToolDeps): Promise<McpSdkServerConfigWithInstance> {
  const { createSdkMcpServer, tool } = await import('@anthropic-ai/claude-agent-sdk');
  const counters: StudioToolCounters = deps.run ? (deps.run.counters ??= { shots: 0, checks: 0 }) : { shots: 0, checks: 0 };

  const screenshot = tool(
    'screenshot',
    TOOL_SHORT.screenshot,
    {
      ...TARGET_SHAPE,
      viewport: z.enum(['desktop', 'mobile', 'tablet']).optional().describe('Render size. Leave out for the frame size (desktop when there is no frame).'),
      from: z.number().int().min(0).default(0).describe('Page y offset in px where the first image starts.'),
      theme: z.enum(['light', 'dark']).default('light').describe('dark sets data-theme="dark" and the .dark class on <html> before the shot, so tokens.css uses the dark values.'),
      screen: z.number().int().min(1).max(12).optional().describe('Screen number from the render_check screens list: a view inside a multi-view page, a canvas frame or an app route frame. Overrides frame and path.'),
    },
    (args) => takeScreenshot(deps, counters, args),
    { annotations: { readOnlyHint: true } },
  );

  const renderCheck = tool(
    'render_check',
    TOOL_SHORT.render_check,
    TARGET_SHAPE,
    (args) => runRenderCheck(deps, counters, args),
    { annotations: { readOnlyHint: true } },
  );

  const designReview = tool(
    'design_review',
    TOOL_SHORT.design_review,
    TARGET_SHAPE,
    (args) => runDesignReview(deps, args),
    { annotations: { readOnlyHint: true } },
  );

  const defineTweaksTool = tool(
    'define_tweaks',
    TOOL_SHORT.define_tweaks,
    { controls: z.array(z.record(z.string(), z.unknown())).max(12).describe(TWEAK_CONTROLS_NOTE) },
    (args) => runDefineTweaks(deps, args.controls),
  );

  const designSystemCheck = tool(
    'design_system_check',
    TOOL_SHORT.design_system_check,
    {},
    () => runDesignSystemCheck(deps),
    { annotations: { readOnlyHint: true } },
  );

  const canvasListTool = tool(
    'canvas_list',
    TOOL_SHORT.canvas_list,
    {},
    () => runCanvasList(deps),
    { annotations: { readOnlyHint: true } },
  );

  const canvasPlaceTool = tool(
    'canvas_place',
    TOOL_SHORT.canvas_place,
    { frames: z.array(placeSchema).min(1).max(12) },
    (args) => runCanvasPlace(deps, args.frames),
  );

  const canvasPointTool = tool(
    'canvas_point',
    TOOL_SHORT.canvas_point,
    { frame: frameRef.describe('Frame id or @label.'), selector: z.string().max(400).optional() },
    (args) => runCanvasPoint(deps, args),
    { annotations: { readOnlyHint: true } },
  );

  const listLinksTool = tool(
    'list_links',
    TOOL_SHORT.list_links,
    {},
    () => runListLinks(deps),
    { annotations: { readOnlyHint: true } },
  );

  const editLinksTool = tool(
    'edit_links',
    TOOL_SHORT.edit_links,
    editLinksShape,
    (args) => runEditLinks(deps, args),
  );

  const listFrameStatesTool = tool(
    'list_frame_states',
    TOOL_SHORT.list_frame_states,
    {},
    () => runListFrameStates(deps),
    { annotations: { readOnlyHint: true } },
  );

  const setFrameStateTool = tool(
    'set_frame_state',
    TOOL_SHORT.set_frame_state,
    {
      frame: frameRef.describe('Frame id or @label.'),
      state: z.string().regex(/^[a-z][a-z0-9-]{0,23}$/),
      mock: z.object({ name: z.string().max(40).optional(), rules: z.array(z.record(z.string(), z.unknown())).max(40).optional(), signedIn: z.boolean().optional() }).optional(),
    },
    (args) => runSetFrameState(deps, args),
  );

  const setFrameSessionTool = tool(
    'set_frame_session',
    TOOL_SHORT.set_frame_session,
    { user: z.object({ name: z.string().max(80), email: z.string().max(120) }).optional(), forgetCookies: z.boolean().optional() },
    (args) => runSetFrameSession(deps, args),
  );

  const listRouteLinksTool = tool(
    'list_route_links',
    TOOL_SHORT.list_route_links,
    { route: z.string().min(1).max(300) },
    (args) => runListRouteLinks(deps, args.route),
    { annotations: { readOnlyHint: true } },
  );

  const addFlowTool = tool(
    'add_flow',
    TOOL_SHORT.add_flow,
    {
      routes: z.array(z.string().min(1).max(300)).max(12).optional(),
      from: z.string().min(1).max(300).optional(),
      depth: z.number().int().min(0).max(FLOW_MAX_DEPTH).optional(),
      params: z.record(z.string(), z.string().max(80)).optional(),
    },
    (args) => runAddFlow(deps, args),
  );

  const editElementTool = tool(
    'edit_element',
    TOOL_SHORT.edit_element,
    agentEditElementShape,
    withLayerIds(deps, (args) => runEditElement(deps, args)),
  );

  const setTokenTool = tool(
    'set_token',
    TOOL_SHORT.set_token,
    setTokenShape,
    (args) => runSetToken(deps, args),
  );

  const prepareShipTool = tool(
    'prepare_ship',
    TOOL_SHORT.prepare_ship,
    {},
    () => runPrepareShip(deps),
    { annotations: { readOnlyHint: true } },
  );

  const setPropsTool = tool(
    'set_props',
    TOOL_SHORT.set_props,
    setPropsShape,
    withLayerIds(deps, (args) => runSetProps(deps, args)),
  );

  const findStylesTool = tool(
    'find_styles',
    TOOL_SHORT.find_styles,
    findStylesShape,
    (args) => runFindStyles(deps, args),
    { annotations: { readOnlyHint: true } },
  );

  const replaceStyleTool = tool(
    'replace_style',
    TOOL_SHORT.replace_style,
    replaceStyleShape,
    (args) => runReplaceStyle(deps, args),
  );

  const arrangeTool = tool(
    'arrange',
    TOOL_SHORT.arrange,
    arrangeShape,
    (args) => runArrange(deps, args),
  );

  const selectMatchingTool = tool('select_matching', TOOL_SHORT.select_matching, selectMatchingShape, (args) => runSelectMatching(deps, args), { annotations: { readOnlyHint: true } });
  const diffVersionsTool = tool('diff_versions', TOOL_SHORT.diff_versions, diffVersionsShape, (args) => runDiffVersions({ runsDir: deps.runsDir, headVersionId: deps.ctx.direction.headVersionId }, args), { annotations: { readOnlyHint: true } });

  const measureTool = tool(
    'measure',
    TOOL_SHORT.measure,
    measureShape,
    (args) => runMeasure(deps, args),
    { annotations: { readOnlyHint: true } },
  );

  const reviewFrameTool = tool(
    'review_frame',
    TOOL_SHORT.review_frame,
    reviewFrameShape,
    withLayerIds(deps, (args) => runReviewFrameTool(deps, args)),
    { annotations: { readOnlyHint: true } },
  );

  const insertComponentTool = tool(
    'insert_component',
    TOOL_SHORT.insert_component,
    insertComponentShape,
    withLayerIds(deps, (args) => runInsertComponent(deps, args)),
  );

  const insertJsxTool = tool(
    'insert_jsx',
    TOOL_SHORT.insert_jsx,
    insertJsxShape,
    withLayerIds(deps, (args) => runInsertJsx(deps, args)),
  );

  const clearTextTool = tool(
    'clear_text',
    TOOL_SHORT.clear_text,
    clearTextShape,
    withLayerIds(deps, (args) => runClearText(deps, args)),
  );

  const listComponentsTool = tool(
    'list_components',
    TOOL_SHORT.list_components,
    listComponentsShape,
    (args) => runListComponents(deps, args),
    { annotations: { readOnlyHint: true } },
  );

  const getLayersTool = tool(
    'get_layers',
    TOOL_SHORT.get_layers,
    getLayersShape,
    (args) => runGetLayers(deps, args),
    { annotations: { readOnlyHint: true } },
  );

  const listCommentsTool = tool(
    'list_comments',
    TOOL_SHORT.list_comments,
    listCommentsShape,
    (args) => runListComments(deps, args),
    { annotations: { readOnlyHint: true } },
  );

  const resolveCommentTool = tool(
    'resolve_comment',
    TOOL_SHORT.resolve_comment,
    resolveCommentShape,
    (args) => runResolveComment(deps, args),
  );

  const getRunContextTool = tool(
    'get_run_context',
    TOOL_SHORT.get_run_context,
    getRunContextShape,
    () => runGetRunContext(deps),
    { annotations: { readOnlyHint: true } },
  );

  const appDoctorTool = tool(
    'app_doctor',
    TOOL_SHORT.app_doctor,
    { fresh: z.boolean().optional() },
    (args) => runAppDoctor(deps, args.fresh === true),
    { annotations: { readOnlyHint: true } },
  );

  const componentPreviewTool = tool(
    'component_preview',
    TOOL_SHORT.component_preview,
    componentPreviewShape,
    (args) => runComponentPreview(deps, args),
    { annotations: { readOnlyHint: true } },
  );

  const createComponentTool = tool('create_component', TOOL_SHORT.create_component, createComponentShape, (args) => runCreateComponent(deps, args));

  const swapInstanceTool = tool('swap_instance', TOOL_SHORT.swap_instance, swapInstanceShape, withLayerIds(deps, (args) => runSwapInstance(deps, args)));

  const exportFrameTool = tool('export_frame', TOOL_SHORT.export_frame, exportFrameShape, withLayerIds(deps, (args) => runExportFrame(deps, args)));

  const setImageTool = tool('set_image', TOOL_SHORT.set_image, setImageShape, (args) => runSetImage(deps, args));
  const drawVectorTool = tool('draw_vector', TOOL_SHORT.draw_vector, drawVectorShape, (args) => runDrawVector(deps, args));
  const booleanShapesTool = tool('boolean_shapes', TOOL_SHORT.boolean_shapes, booleanShapesShape, (args) => runBooleanShapes(deps, args));
  const setLayerStateTool = tool(LAYER_STATE_TOOL, TOOL_SHORT.set_layer_state, layerStateShape, (args) => runSetLayerState(deps, args));
  const listLockedLayersTool = tool(LIST_LOCKS_TOOL, TOOL_SHORT.list_locked_layers, listLocksShape, (args) => runListLockedLayers(deps, args), { annotations: { readOnlyHint: true } });
  const compareReferenceTool = tool('compare_to_reference', TOOL_SHORT.compare_to_reference, compareReferenceShape, (args) => runCompareToReference({ ...deps, targets: targetDeps(deps) }, args), { annotations: { readOnlyHint: true } });
  const paintShapeTool = tool('paint_shape', TOOL_SHORT.paint_shape, paintShapeShape, (args) => runPaintShape(deps, args));

  const allowed = studioToolsFor(deps.ctx.project, deps.ctx.request.mode);
  const helpTool = tool(HELP_TOOL, TOOL_SHORT.studio_help, { tool: z.string().trim().max(40).describe('Tool name without the mcp__studio__ prefix.') }, async (args) => ({ content: [{ type: 'text' as const, text: studioHelp(args.tool, allowed) }] }), { annotations: { readOnlyHint: true } });
  const all = [screenshot, renderCheck, designReview, defineTweaksTool, designSystemCheck, canvasListTool, canvasPlaceTool, canvasPointTool, listLinksTool, editLinksTool, listFrameStatesTool, setFrameStateTool, setFrameSessionTool, editElementTool, setTokenTool, prepareShipTool, setPropsTool, findStylesTool, replaceStyleTool, reviewFrameTool, insertComponentTool, insertJsxTool, clearTextTool, listComponentsTool, getLayersTool, listCommentsTool, resolveCommentTool, listRouteLinksTool, addFlowTool, arrangeTool, measureTool, getRunContextTool, appDoctorTool, componentPreviewTool, createComponentTool, swapInstanceTool, selectMatchingTool, diffVersionsTool, exportFrameTool, setImageTool, drawVectorTool, booleanShapesTool, paintShapeTool, setLayerStateTool, listLockedLayersTool, compareReferenceTool, helpTool];
  return createSdkMcpServer({ name: 'studio', version: '0.1.0', tools: all.filter((entry) => allowed.has(entry.name)) });
}

export function studioHelp(name: string, allowed: ReadonlySet<string>): string {
  const short = name.replace(/^mcp__studio__/, '');
  if (!allowed.has(short) || short === HELP_TOOL) return `No studio tool ${short} in this run. Tools: ${[...allowed].filter((entry) => entry !== HELP_TOOL).join(', ')}.`;
  return TOOL_HELP[short as Exclude<StudioToolName, 'studio_help'>];

}
