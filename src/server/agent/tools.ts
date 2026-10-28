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
import { tweakControlSchema } from '../tweaks/schema.js';
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
import { findStylesShape, replaceStyleShape, runFindStyles, runReplaceStyle } from './style-tool.js';
import { arrangeShape, measureShape, runArrange, runMeasure } from './arrange-tool.js';
import { SELECT_MATCHING_DESCRIPTION, runSelectMatching, selectMatchingShape } from './select-tool.js';
import { getRunContextShape, runGetRunContext } from './context-tool.js';
import { componentPreviewShape, runComponentPreview } from './component-preview-tool.js';
import { reviewFrameShape, runReviewFrameTool } from '../review/agent-tool.js';
import { insertComponentShape, runInsertComponent } from './insert-tool.js';
import { resolveShotTarget, type ShotArgs, type ShotTarget, type TargetDeps } from './run-target.js';
import { clearTextShape, insertJsxShape, runClearText, runInsertJsx } from './jsx-insert-tool.js';
import { getLayersShape, listComponentsShape, runGetLayers, runListComponents, withLayerIds } from './kit-tools.js';
import { listCommentsShape, resolveCommentShape, runListComments, runResolveComment } from './comment-tools.js';
import type { CommentStore } from '../store/comments.js';
import { APP_DOCTOR_DESCRIPTION, runAppDoctor } from './doctor-tool.js';

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
  if (deps.run?.log) recordShot(deps.run.log, viewport);
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
    'Take PNG screenshots of one page of the live preview. With no frame or path it shows the frame from <canvas-context> (its page, size and frame state), or the entry page. Returns up to four images, top to bottom, starting at the y offset `from`. The text names the page and says whether more of it is below.',
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
    'Render one page of the current design at the sizes this run level uses. With no frame or path it checks the frame from <canvas-context> (its page and frame state), or the entry page. Returns JSON: `page`, then per viewport console errors, page errors, page-level horizontal overflow and `layout` findings (clipped, scrolls-sideways, past-viewport); then `quality` findings with severity high/medium/low (a11y from axe-core, tap-target, placeholder text, tokens, nav-mobile, visual-diff), selectors and source locations; then timings and the budget used.',
    TARGET_SHAPE,
    (args) => runRenderCheck(deps, counters, args),
    { annotations: { readOnlyHint: true } },
  );

  const designReview = tool(
    'design_review',
    'Prototype and polish runs. A separate critic model that has not seen your work reviews fresh desktop and mobile screenshots of every screen (the frame from <canvas-context> first, then each view of a multi-view page, each canvas frame, each changed app route; pass frame or path to review only that page), the latest render_check findings, the taste rules and the request. Returns JSON issues [{severity, area, screen, where, problem, fix}]. Prototype: one quick call. Polish: at most 2 calls; the second also compares desktop with the first call and files regressions.',
    TARGET_SHAPE,
    (args) => runDesignReview(deps, args),
    { annotations: { readOnlyHint: true } },
  );

  const defineTweaksTool = tool(
    'define_tweaks',
    'Save the Tweaks panel controls for this design (replaces the whole list). Each control sets one CSS custom property: range {min, max, step?, unit?, default: number}, color {default}, toggle {on, off, default: boolean}, select {options: [{label, value}], default}. The user drags them for a live preview with no model call, and Commit writes the values into the :root declaration. Every cssVar must be declared in a top-level :root rule of the page CSS with the default value (a design-system token from tokens.css is already declared; Commit then updates tokens.json) and used with var() in the rules it changes. The result lists any var that is not declared or not used.',
    { controls: z.array(tweakControlSchema).max(12) },
    (args) => runDefineTweaks(deps, args.controls),
  );

  const designSystemCheck = tool(
    'design_system_check',
    'Design-system projects only. Checks the design system files and returns "passed" or a list of problems: required tokens present and valid (DTCG, OKLCH, dark values), WCAG AA contrast (4.5:1) for fg and fg-muted on bg, fg on surface and each X-fg on X in light and dark, the 9 DESIGN.md sections with no "_To do:" lines, no raw colors in the kit page index.html, and font tokens that match the Google Fonts link and pack.json.',
    {},
    () => runDesignSystemCheck(deps),
    { annotations: { readOnlyHint: true } },
  );

  const canvasListTool = tool(
    'canvas_list',
    'List the frames on the studio canvas: id, label, page, size and position of each frame, which directions use the lo-fi look, what the user has selected, which frame is live and which frames are in view. Call it before you place or point at frames.',
    {},
    () => runCanvasList(deps),
    { annotations: { readOnlyHint: true } },
  );

  const canvasPlaceTool = tool(
    'canvas_place',
    'Add or move frames on the studio canvas. Pass { frames: [...] }, applied in order, so a later frame can use the @label of an earlier one. Each item: frame (id or @label to move; leave out to add), label, path (the page it shows), viewport or width/height, and one of below / rightOf / leftOf / above (another frame id or @label) with gap (default 80), or absolute x/y. With no placement a new frame goes to the right of all frames. Returns the placed frames and a warnings list when frames overlap.',
    { frames: z.array(placeSchema).min(1).max(12) },
    (args) => runCanvasPlace(deps, args.frames),
  );

  const canvasPointTool = tool(
    'canvas_point',
    'Show the user one frame: the studio makes the frame live, selects the element when you pass a CSS selector for an element inside that frame, and scrolls and zooms the canvas to it. Use it to say "this one" at the end of a reply.',
    { frame: frameRef.describe('Frame id or @label.'), selector: z.string().max(400).optional() },
    (args) => runCanvasPoint(deps, args),
    { annotations: { readOnlyHint: true } },
  );

  const listLinksTool = tool(
    'list_links',
    'List the prototype links (on click of an element, go to a frame) used by Play mode: id, frame, selector, target frame or "back", transition, broken (null or why the link no longer works) and startFrame. Each page with links is rendered to check the elements.',
    {},
    () => runListLinks(deps),
    { annotations: { readOnlyHint: true } },
  );

  const editLinksTool = tool(
    'edit_links',
    'Add, replace or remove prototype links and set the Play start frame. add: [{fromFrame, selector, toFrame, transition?}] links the element (CSS selector on the page of fromFrame, which must exist on the rendered page) to toFrame (frame id or @label, or "back"); transition is instant, dissolve, slide-left or slide-right. A new link on the same element replaces the old one. remove: link ids. startFrame: frame id or @label. Links live in the studio, not in the page code.',
    editLinksShape,
    (args) => runEditLinks(deps, args),
  );

  const listFrameStatesTool = tool(
    'list_frame_states',
    `Attached apps only. Read only. List the frame preview states (signed in, empty, loading, error, mock), which frame shows which, and the session in use. ${FRAME_STATES_NOTE}`,
    {},
    () => runListFrameStates(deps),
    { annotations: { readOnlyHint: true } },
  );

  const setFrameStateTool = tool(
    'set_frame_state',
    `Attached apps only. Show one canvas frame in a preview state with the same code as the frame state menu: state is default, session, empty, loading, error, a mock state id, or mock with mock {name?, rules: [{path, method?, status?, body?, delayMs?}], signedIn?} to make one. Changes no file. ${FRAME_STATES_NOTE}`,
    {
      frame: frameRef.describe('Frame id or @label.'),
      state: z.string().regex(/^[a-z][a-z0-9-]{0,23}$/),
      mock: z.object({ name: z.string().max(40).optional(), rules: z.array(z.record(z.string(), z.unknown())).max(40).optional(), signedIn: z.boolean().optional() }).optional(),
    },
    (args) => runSetFrameState(deps, args),
  );

  const setFrameSessionTool = tool(
    'set_frame_session',
    `Attached apps only. Change the session that signed-in frame states use, with the same code as the frame state menu: user {name, email} sets the mock user; forgetCookies drops the cookies the app set in signed-in frames. Changes no file. ${FRAME_STATES_NOTE}`,
    { user: z.object({ name: z.string().max(80), email: z.string().max(120) }).optional(), forgetCookies: z.boolean().optional() },
    (args) => runSetFrameSession(deps, args),
  );

  const listRouteLinksTool = tool(
    'list_route_links',
    `Attached apps only. Read only. List the links found in the source of one app route (route pattern or concrete path): kind, href, target route, element and file:line. ${FLOW_NOTE}`,
    { route: z.string().min(1).max(300) },
    (args) => runListRouteLinks(deps, args.route),
    { annotations: { readOnlyHint: true } },
  );

  const addFlowTool = tool(
    'add_flow',
    `Attached apps only. Lay out route frames left to right with the same code as Flow in the studio, and make prototype links from the links in their source. routes: routes in order; or from: a route or frame id/@label, with depth (default 1) to add the routes it links to. params: sample values for dynamic segments. ${FLOW_NOTE}`,
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
    'Change one element found by CSS selector on the live page, with the same code as the studio inspector: style (CSS properties, null removes; in a Tailwind project they become theme classes such as p-6, bg-primary, rounded-lg, and an arbitrary value only when no theme step fits), the text of a leaf element, or Tailwind classes {add, remove} on a plain className string or the string arguments of cn(), clsx() or twMerge(). Or pass op alone: delete, duplicate, wrap (in a flex column frame), unwrap, or move into targetSelector. It patches only that element in the source file (HTML, JSX or TSX) and leaves every other byte as it was. Elements made by .map(), a condition or a function call are refused; edit the file for those. Use it for small, exact changes to one element; use Edit or Write for new markup, new rules in a stylesheet, or many changes at once.',
    editElementShape,
    withLayerIds(deps, (args) => runEditElement(deps, args)),
  );

  const setTokenTool = tool(
    'set_token',
    'Change one design token value with the same code as the studio Tokens panel: design-system/tokens.json (tokens.css is rebuilt) in a studio design system, or only that declaration in the app token CSS file of an imported app (Tailwind @theme, :root or .dark). theme dark changes the dark value. Use it instead of editing tokens.json or the token CSS by hand when you change a token value.',
    setTokenShape,
    (args) => runSetToken(deps, args),
  );

  const prepareShipTool = tool(
    'prepare_ship',
    'Attached app projects only. Read only. Lists the files the studio changed since the last ship (or since the app was attached), the files that cannot ship (secrets, .env, conflicts with the user\'s own changes) and the default branch name and pull request text. You cannot ship; only the user can, with the Ship button.',
    {},
    () => runPrepareShip(deps),
    { annotations: { readOnlyHint: true } },
  );

  const setPropsTool = tool(
    'set_props',
    'Change the props of one React component instance with the same code as the studio inspector Component section: it adds, replaces or removes JSX attributes at the use site, such as <Button variant="outline"> to variant="destructive" or size="sm", and leaves every other byte as it was. Find the instance by selector (an element inside it on the live page) or source (file:line:col of the JSX tag). Use it for a variant, size or flag change on a component; use Edit for new markup.',
    setPropsShape,
    withLayerIds(deps, (args) => runSetProps(deps, args)),
  );

  const findStylesTool = tool(
    'find_styles',
    'Read only. List the colors, font sizes, radii and spacing used on the page (or one canvas frame) with element counts and whether each value is a token, raw or mixed, like the inspector Selection colors panel. With value (and property) it lists the elements that use that computed value; inherited values count only on the element that sets them.',
    findStylesShape,
    (args) => runFindStyles(deps, args),
    { annotations: { readOnlyHint: true } },
  );

  const replaceStyleTool = tool(
    'replace_style',
    'Replace one style value with a token on every element of the page (or frame) that uses it, with the same code as "Replace with token…" in the studio inspector. token is a CSS variable or, in a Tailwind project, a theme class; Tailwind projects get classes, not inline style. Elements made by .map(), elements with a className built in code, and shared elements where only some copies use the value are skipped and counted. Use it to move raw values such as #1c1f23 or p-[13px] to tokens.',
    replaceStyleShape,
    (args) => runReplaceStyle(deps, args),
  );

  const arrangeTool = tool(
    'arrange',
    'Align, distribute or tidy up sibling elements like Figma, with the same code as the studio arrange bar. In a flex parent it writes the parent layout (align-items, justify-content, gap) or align-self on some children; in a grid justify-items or align-items; absolute children move by left/top. align and distribute in a parent with no auto layout are refused; tidy adds auto layout (flex, gap) to it. Tailwind projects get classes. Pass one of align, distribute or tidy.',
    arrangeShape,
    (args) => runArrange(deps, args),
  );

  const selectMatchingTool = tool('select_matching', SELECT_MATCHING_DESCRIPTION, selectMatchingShape, (args) => runSelectMatching(deps, args), { annotations: { readOnlyHint: true } });

  const measureTool = tool(
    'measure',
    'Read only. Measure the distance between two elements on the live page, like holding Alt in the studio: boxes, relation, horizontal and vertical gap, inset when one is inside the other, center offset and guide lines.',
    measureShape,
    (args) => runMeasure(deps, args),
    { annotations: { readOnlyHint: true } },
  );

  const reviewFrameTool = tool(
    'review_frame',
    'Run the studio Review panel checks on one canvas frame of the live page: color contrast with the nearest passing color token, tap target size, missing alt text and other axe-core rules, off-token values (raw colors or spacing that are not project tokens, Tailwind arbitrary values) and clipped or overflowing content. Returns JSON findings with severity, element, selector, source, message and directFix (the exact style for edit_element) or null when the fix needs judgment. Read only.',
    reviewFrameShape,
    withLayerIds(deps, (args) => runReviewFrameTool(deps, args)),
    { annotations: { readOnlyHint: true } },
  );

  const insertComponentTool = tool(
    'insert_component',
    'Insert one instance of a React component from the project library with the same code as the studio Components panel: it writes <Name …>Text</Name> inside (as the last child) or after the target element, fills required props from the props type, and adds or extends the import line with the path the project uses (workspace package such as @workspace/ui/components/button, tsconfig path, or relative). Find the target by targetSelector on the live page or targetSource (file:line:col). Targets made by .map() or shown by a condition, and the top element of a component, are refused. Use it to add a library component; use Edit for other new markup.',
    insertComponentShape,
    withLayerIds(deps, (args) => runInsertComponent(deps, args)),
  );

  const insertJsxTool = tool(
    'insert_jsx',
    'Insert a group of elements in one step with the same server code as the MCP insert_jsx tool and the studio Paste JSX menu: a JSX snippet (HTML in an HTML project) inside, before, after or in place of the target. Component tags that the file does not import are found in the project library and their import lines are added or extended. The snippet keeps its line breaks and gets the file indent. Markup only: text, string props, numbers, style objects and references to names the file has; functions, calls (hooks), conditions, .map() and spreads are refused. Targets made by .map() or a condition are refused. Use it to build a card, row or section from library components; clear_text removes stray text next to child elements.',
    insertJsxShape,
    withLayerIds(deps, (args) => runInsertJsx(deps, args)),
  );

  const clearTextTool = tool(
    'clear_text',
    'Remove the plain text inside an element and keep its child elements, such as placeholder text next to children you inserted. On a library component it clears the text where the page uses it. Text from a prop or a { } expression stays.',
    clearTextShape,
    withLayerIds(deps, (args) => runClearText(deps, args)),
  );

  const listComponentsTool = tool(
    'list_components',
    'Read only. Find the React components of the project with the same server code as the MCP list_components tool and the studio Components panel: shared workspace packages (the kit, such as packages/ui) first, then app components by use count. Each item has source (package or app), file, folder, parts (other components of the same file, such as CardHeader for Card), a ready import line, a minimal JSX example, the use count and the props schema with cva variants and their options. query searches names, then folders and files, then props and variants. Pages hold 20 items; pass nextCursor as cursor for the next page. Use the names in insert_jsx or insert_component and the variant options in set_props.',
    listComponentsShape,
    (args) => runListComponents(deps, args),
    { annotations: { readOnlyHint: true } },
  );

  const getLayersTool = tool(
    'get_layers',
    'Read only. List the elements of the rendered page (or one canvas frame) as a compact tree with the same server code as the MCP get_layers tool: one line per element with a layer id, tag, <Component> when the element is the root of a component use, source file:line, a text preview and "+N inside" when deeper levels are cut. A layer id (such as "e0k3pz") works in place of a CSS selector in selector or targetSelector of edit_element, set_props, insert_component, insert_jsx, clear_text and review_frame; the page of the id is used when you leave out path. Ids come from the source location, so they stay the same after edits while that JSX stays on the same line. Use root to list one part of the page.',
    getLayersShape,
    (args) => runGetLayers(deps, args),
    { annotations: { readOnlyHint: true } },
  );

  const listCommentsTool = tool(
    'list_comments',
    'Read only. List the comments pinned on this direction with the same server code as the studio Comments pane and the MCP list_comments tool: number, author (an outside agent or the user), text, replies, element (selector, source file:line, component), frame and status. status: open (default), all or one status; frame: frame id, @label or page path.',
    listCommentsShape,
    (args) => runListComments(deps, args),
    { annotations: { readOnlyHint: true } },
  );

  const resolveCommentTool = tool(
    'resolve_comment',
    'Mark one pinned comment resolved, with the same code as Resolve in the studio Comments pane. Use it only when the user asks you to resolve a comment; after a run the user resolves the comments you fixed with the Resolve button. comment: id or number.',
    resolveCommentShape,
    (args) => runResolveComment(deps, args),
  );

  const getRunContextTool = tool(
    'get_run_context',
    'Read only. Read the repo context of this run again with the same server code as the MCP get_run_context tool: the app folder and workspace root AGENTS.md, CLAUDE.md, DESIGN.md and PRODUCT.md, cut to about 8 KB, secret-looking lines left out. The run message already has it as <repo_context>; call this only when you need the file list or a fresh copy.',
    getRunContextShape,
    () => runGetRunContext(deps),
    { annotations: { readOnlyHint: true } },
  );

  const appDoctorTool = tool(
    'app_doctor',
    APP_DOCTOR_DESCRIPTION,
    { fresh: z.boolean().optional() },
    (args) => runAppDoctor(deps, args.fresh === true),
    { annotations: { readOnlyHint: true } },
  );

  const componentPreviewTool = tool(
    'component_preview',
    'Read only. Render one component of the project library alone with its default props, with the same server code as the studio Components panel tiles and the MCP component_preview tool, and see it as an image. Use it to check what a kit component looks like before you use it. Components that need data, server code or an open state return the reason.',
    componentPreviewShape,
    (args) => runComponentPreview(deps, args),
    { annotations: { readOnlyHint: true } },
  );

  return createSdkMcpServer({ name: 'studio', version: '0.1.0', tools: [screenshot, renderCheck, designReview, defineTweaksTool, designSystemCheck, canvasListTool, canvasPlaceTool, canvasPointTool, listLinksTool, editLinksTool, listFrameStatesTool, setFrameStateTool, setFrameSessionTool, editElementTool, setTokenTool, prepareShipTool, setPropsTool, findStylesTool, replaceStyleTool, reviewFrameTool, insertComponentTool, insertJsxTool, clearTextTool, listComponentsTool, getLayersTool, listCommentsTool, resolveCommentTool, listRouteLinksTool, addFlowTool, arrangeTool, measureTool, getRunContextTool, appDoctorTool, componentPreviewTool, selectMatchingTool] });
}
