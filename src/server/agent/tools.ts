import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { McpSdkServerConfigWithInstance, query } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { levelOf, resolveRunConfig, withRunTask, type ResolvedRunConfig } from '../../shared/run-levels.js';
import type { TileResult } from '../preview/browser.js';
import type { AgentRunContext, PreviewService } from '../types.js';
import { budgetLine, buildCheckReport, saveCheck, type RunToolState } from './check-tool.js';
import { recordShot } from './polish-loop.js';
import { criticImages, criticOutPrefix, describeCriticResult, runCritic } from './critic.js';
import type { TasteRule } from './taste.js';
import { tweakControlSchema } from '../tweaks/schema.js';
import { defineTweaks } from '../tweaks/store.js';
import { checkDesignSystem, describeCheck } from '../design-system/check.js';
import type { CanvasService } from '../canvas/service.js';
import { canvasList, canvasPlace, canvasPoint, frameRef, placeSchema, type CanvasToolContext, type PlaceSpec } from '../canvas/tools.js';
import { editElementShape, runEditElement, runSetToken, setTokenShape } from './direct-tools.js';
import { editLinks, editLinksShape, listLinks, probeWithPreview, type EditLinksArgs, type LinkProbe } from '../canvas/link-tools.js';
import { prepareShip } from '../git/ship-prepare.js';

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

function errorText(message: string) {
  return { content: [{ type: 'text' as const, text: message }], isError: true };
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function describeTiles(viewport: ViewportName, tiles: TileResult): string {
  const size = `${viewport} ${VIEWPORTS[viewport].width}x${VIEWPORTS[viewport].height}`;
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

export async function takeScreenshot(deps: StudioToolDeps, counters: StudioToolCounters, args: { viewport: ViewportName; from: number; theme?: 'light' | 'dark' }) {
  const { viewport } = args;
  if (!deps.ctx.previewUrl) return errorText('Preview is not running for this direction, so no screenshot is available.');
  const start = firstMobileFrom(counters, viewport, args.from);
  counters.shots += 1;
  if (deps.run) deps.run.shots = (deps.run.shots ?? 0) + 1;
  if (deps.run?.log) recordShot(deps.run.log, viewport);
  const dark = args.theme === 'dark';
  const outPrefix = path.join(deps.runsDir, `${deps.runId}-shot-${counters.shots}-${viewport}${dark ? '-dark' : ''}`);
  try {
    await mkdir(deps.runsDir, { recursive: true });
    const tiles = await deps.preview.screenshotTiles(deps.ctx.previewUrl, { viewport: VIEWPORTS[viewport], ...TILE_PLAN[viewport], from: start.from, outPrefix, ...(dark ? { theme: 'dark' as const } : {}) });
    return { content: [...(await tileContent(tiles.paths)), { type: 'text' as const, text: `${dark ? 'Dark theme. ' : ''}${describeTiles(viewport, tiles)}${start.note}` }] };
  } catch (error) {
    return errorText(`Screenshot failed: ${describeError(error)}`);
  }
}

function configOf(deps: StudioToolDeps): ResolvedRunConfig {
  return deps.run?.config ?? withRunTask(resolveRunConfig(deps.ctx.project.settings, levelOf(deps.ctx.request, deps.ctx.project.settings)), deps.ctx.request.task);
}

export async function runRenderCheck(deps: StudioToolDeps, counters: StudioToolCounters) {
  if (!deps.ctx.previewUrl) return errorText('Preview is not running for this direction, so render_check cannot run.');
  try {
    const report = await buildCheckReport(deps.preview, deps.ctx, configOf(deps), deps.run);
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
  if (!run || !run.config.preset.checks.critic || !run.config.criticModel) return 'design_review is only available in polish runs. Use render_check and screenshots instead.';
  if (run.criticCalls >= run.config.preset.criticMaxCalls) return `design_review was already called ${run.criticCalls} times in this run, the limit. Use render_check and screenshots for the final check.`;
  if (!deps.ctx.previewUrl) return 'Preview is not running for this direction, so design_review cannot run.';
  return null;
}

export async function runDesignReview(deps: StudioToolDeps) {
  const blocked = criticBlocked(deps);
  if (blocked) return errorText(blocked);
  const run = deps.run as RunToolState;
  run.criticCalls += 1;
  try {
    const images = await criticImages(deps.preview, deps.ctx.previewUrl as string, criticOutPrefix(deps.runsDir, deps.runId, run.criticCalls));
    const input = { request: deps.ctx.request.prompt, findings: run.lastFindings, tasteRules: deps.tasteRules ?? [], images };
    const result = await runCritic(await loadQuery(deps), input, run.config.criticModel as string, run.config.maxBudgetUsd === null ? null : run.config.preset.criticBudgetUsd, deps.env);
    run.criticCostUsd += result.costUsd;
    await writeFile(`${criticOutPrefix(deps.runsDir, deps.runId, run.criticCalls)}.json`, `${JSON.stringify({ model: run.config.criticModel, costUsd: result.costUsd, error: result.error, issues: result.issues, raw: result.raw }, null, 2)}\n`);
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
    'Take PNG screenshots of the live preview at a viewport size. Returns up to four images, top to bottom, starting at the y offset `from`. The text says whether more of the page is below.',
    {
      viewport: z.enum(['desktop', 'mobile', 'tablet']).default('desktop'),
      from: z.number().int().min(0).default(0).describe('Page y offset in px where the first image starts.'),
      theme: z.enum(['light', 'dark']).default('light').describe('dark sets data-theme="dark" and the .dark class on <html> before the shot, so tokens.css uses the dark values.'),
    },
    (args) => takeScreenshot(deps, counters, args),
    { annotations: { readOnlyHint: true } },
  );

  const renderCheck = tool(
    'render_check',
    'Render the current design at the sizes this run level uses. Returns JSON: per viewport console errors, page errors, page-level horizontal overflow and `layout` findings (clipped, scrolls-sideways, past-viewport); then `quality` findings with severity high/medium/low (a11y from axe-core, tap-target, placeholder text, tokens, nav-mobile, visual-diff), selectors and source locations; then timings and the budget used.',
    {},
    () => runRenderCheck(deps, counters),
    { annotations: { readOnlyHint: true } },
  );

  const designReview = tool(
    'design_review',
    'Polish runs only. A separate critic model that has not seen your work reviews fresh desktop and mobile screenshots, the latest render_check findings, the taste rules and the request. Returns JSON issues [{severity, area, where, problem, fix}]. At most 2 calls per run.',
    {},
    () => runDesignReview(deps),
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

  const editElementTool = tool(
    'edit_element',
    'Change one element found by CSS selector on the live page, with the same code as the studio inspector: style (CSS properties, null removes; in a Tailwind project they become theme classes such as p-6, bg-primary, rounded-lg, and an arbitrary value only when no theme step fits), the text of a leaf element, or Tailwind classes {add, remove} on a plain className string or the string arguments of cn(), clsx() or twMerge(). Or pass op alone: delete, duplicate, wrap (in a flex column frame), unwrap, or move into targetSelector. It patches only that element in the source file (HTML, JSX or TSX) and leaves every other byte as it was. Elements made by .map(), a condition or a function call are refused; edit the file for those. Use it for small, exact changes to one element; use Edit or Write for new markup, new rules in a stylesheet, or many changes at once.',
    editElementShape,
    (args) => runEditElement(deps, args),
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

  return createSdkMcpServer({ name: 'studio', version: '0.1.0', tools: [screenshot, renderCheck, designReview, defineTweaksTool, designSystemCheck, canvasListTool, canvasPlaceTool, canvasPointTool, listLinksTool, editLinksTool, editElementTool, setTokenTool, prepareShipTool] });
}
