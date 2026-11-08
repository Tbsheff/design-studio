import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { query, tool as createTool } from "@anthropic-ai/claude-agent-sdk";
import type { Schema } from "effect";

import {
  levelOf,
  resolveRunConfig,
  withRunTask,
} from "../../shared/run-levels.js";
import type { ResolvedRunConfig } from "../../shared/run-levels.js";
import type {
  AgentRunContext,
  PreviewService,
} from "../../shared/server-ports.js";
import { toToolRun } from "../agent-tools/index.js";
import type { ToolFields, ToolInput } from "../agent-tools/index.js";
import type { FrameStateDeps } from "../canvas/app-flow/index.js";
import type {
  CanvasService,
  CanvasToolContext,
  PlaceSpec,
} from "../canvas/index.js";
import { canvasList, canvasPlace, canvasPoint } from "../canvas/index.js";
import { checkDesignSystem, describeCheck } from "../design-system/check.js";
import type { StudioRuntime } from "../platform/studio-runtime/index.js";
import type { TileResult } from "../preview/browser.js";
import type { CommentStore } from "../store/comments.js";
import type { LayerLockStore } from "../store/layer-locks.js";
import { defineTweaks } from "../tweaks/store.js";
import type { ActionAsk } from "./ask-gate.js";
import {
  budgetLine,
  buildCheckReport,
  freshCapture,
  runScreens,
  saveCheck,
} from "./check-tool.js";
import {
  beforeImages,
  changedSourceFor,
  criticImages,
  criticOutPrefix,
  describeCriticResult,
  runCritic,
} from "./critic.js";
import { baselineNote } from "./final-check.js";
import { AGENT_OPS } from "./legacy/agent-ops.js";
import { recordShot } from "./polish-loop.js";
import { resolveShotTarget } from "./run-target.js";
import type { ShotArgs, ShotTarget, TargetDeps } from "./run-target.js";
import { describeScreens, samePage, warmScreens } from "./screens.js";
import type { RunScreen } from "./screens.js";
import type { TasteRule } from "./taste.js";
import { TOOL_HELP } from "./tool-help.js";
import type { StudioToolName } from "./tool-help.js";
import { HELP_TOOL } from "./tool-sets.js";
import type { CriticImage, RunToolState } from "./types.js";

const VIEWPORTS = {
  desktop: { height: 900, width: 1440 },
  mobile: { height: 844, width: 390 },
  tablet: { height: 1024, width: 768 },
} as const;

type ViewportName = keyof typeof VIEWPORTS;

const TILE_PLAN: Record<
  ViewportName,
  { tileHeight: number; maxTiles: number }
> = {
  desktop: { maxTiles: 4, tileHeight: 900 },
  mobile: { maxTiles: 4, tileHeight: 1560 },
  tablet: { maxTiles: 3, tileHeight: 1024 },
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
  comments?: CommentStore;
  layerLocks?: LayerLockStore | null;
  frameStates?: FrameStateDeps | null;
  exportsDir?: string;
  runtime?: StudioRuntime | null | undefined;
  actionAsk?: ActionAsk | null;
}

const CANVAS_OFF = "The canvas is not available in this run.";

function canvasContext(
  deps: Pick<StudioToolDeps, "ctx" | "canvas">
): CanvasToolContext | null {
  if (!deps.canvas) {
    return null;
  }

  return {
    canvas: deps.canvas,
    direction: deps.ctx.direction,
    mode: deps.ctx.request.mode,
    plan: deps.ctx.request.plan === true,
    project: deps.ctx.project,
  };
}

async function withCanvas(
  deps: Pick<StudioToolDeps, "ctx" | "canvas">,
  name: string,
  run: (
    ctx: CanvasToolContext
  ) => Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }>
) {
  const ctx = canvasContext(deps);

  if (!ctx) {
    return errorText(CANVAS_OFF);
  }

  try {
    return await run(ctx);
  } catch (error) {
    return errorText(`${name} failed: ${describeError(error)}`);
  }
}

function errorText(message: string) {
  return { content: [{ text: message, type: "text" as const }], isError: true };
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function describeTiles(
  viewport: ViewportName,
  tiles: TileResult,
  box: { width: number; height: number } = VIEWPORTS[viewport]
): string {
  const size = `${viewport} ${box.width}x${box.height}`;
  const span = `${tiles.paths.length} image(s) cover y=${tiles.from}-${tiles.to}px of a ${tiles.pageHeight}px page`;

  const more =
    tiles.to < tiles.pageHeight
      ? ` More of the page is below: call screenshot again with from=${tiles.to}.`
      : " This is the end of the page.";

  return `${size}: ${span}.${more}`;
}

async function tileContent(paths: string[]) {
  const images = await Promise.all(
    paths.map(async (file) => (await readFile(file)).toString("base64"))
  );

  return images.map((data) => ({
    data,
    mimeType: "image/png",
    type: "image" as const,
  }));
}

export interface StudioToolCounters {
  shots: number;
  checks: number;
  mobileShots?: number;
}

function firstMobileFrom(
  counters: StudioToolCounters,
  viewport: ViewportName,
  from: number
): { from: number; note: string } {
  if (viewport !== "mobile") {
    return { from, note: "" };
  }

  const first = (counters.mobileShots ?? 0) === 0;
  counters.mobileShots = (counters.mobileShots ?? 0) + 1;

  if (!first || from === 0) {
    return { from, note: "" };
  }

  return {
    from: 0,
    note: " The first mobile screenshot of a run always starts at the top, so from was set to 0.",
  };
}

async function screenTarget(
  deps: StudioToolDeps,
  screen: number | undefined
): Promise<RunScreen | string | null> {
  if (screen === undefined || !deps.run) {
    return null;
  }

  const screens = deps.run.lastScreens?.length
    ? deps.run.lastScreens
    : await runScreens(deps.preview, deps.ctx, deps.run.config, deps.run).catch(
        () => []
      );

  const picked = screens[screen - 1];

  if (!picked) {
    return `There is no screen ${screen}. Screens:\n${describeScreens(screens) || "1. Entry"}`;
  }

  await warmScreens(deps.preview, deps.ctx.project, [picked]);

  return picked;
}

export function targetDeps(
  deps: Pick<StudioToolDeps, "canvas" | "frameStates">
): TargetDeps | null {
  const states = deps.frameStates ?? null;
  const canvas = deps.canvas ?? states?.canvas;

  return canvas && states ? { canvas, projectDir: states.projectDir } : null;
}

async function pickTarget(
  deps: Pick<StudioToolDeps, "ctx" | "canvas">,
  args: ShotArgs
): Promise<ShotTarget | string> {
  try {
    return (
      (await resolveShotTarget(targetDeps(deps), deps.ctx, args)) ??
      "Preview is not running for this direction."
    );
  } catch (error) {
    return describeError(error);
  }
}

function viewportName(width: number): ViewportName {
  if (width <= 500) {
    return "mobile";
  }

  return width <= 1024 ? "tablet" : "desktop";
}

function shotBox(
  target: ShotTarget,
  viewport: ViewportName | undefined
): { name: ViewportName; box: { width: number; height: number } } {
  if (viewport) {
    return { box: VIEWPORTS[viewport], name: viewport };
  }

  if (target.size !== null) {
    return { box: target.size, name: viewportName(target.size.width) };
  }

  return { box: VIEWPORTS.desktop, name: "desktop" };
}

interface PickedShot {
  url: string;
  label: string;
  prepare?: string;
  viewport: ViewportName;
  box: { width: number; height: number };
}

async function pickShot(
  deps: StudioToolDeps,
  args: ShotArgs & { viewport?: ViewportName; screen?: number }
): Promise<PickedShot | string> {
  const screen = await screenTarget(deps, args.screen);

  if (typeof screen === "string") {
    return screen;
  }

  if (screen) {
    const viewport = args.viewport ?? "desktop";

    return {
      url: screen.url,
      label: `screen ${args.screen}: ${screen.label}`,
      ...(screen.prepare ? { prepare: screen.prepare } : {}),
      viewport,
      box: VIEWPORTS[viewport],
    };
  }

  const target = await pickTarget(deps, args);

  if (typeof target === "string") {
    return `Screenshot failed: ${target}`;
  }

  const { name, box } = shotBox(target, args.viewport);

  return { box, label: target.label, url: target.url, viewport: name };
}

export async function takeScreenshot(
  deps: StudioToolDeps,
  counters: StudioToolCounters,
  args: ShotArgs & {
    viewport?: ViewportName;
    from: number;
    theme?: "light" | "dark";
    screen?: number;
  }
) {
  if (!deps.ctx.previewUrl) {
    return errorText(
      "Preview is not running for this direction, so no screenshot is available."
    );
  }

  const target = await pickShot(deps, args);

  if (typeof target === "string") {
    return errorText(target);
  }

  const { viewport, box } = target;
  const start = firstMobileFrom(counters, viewport, args.from);
  counters.shots += 1;

  if (deps.run) {
    deps.run.shots = (deps.run.shots ?? 0) + 1;
  }

  if (deps.run?.log) {
    recordShot(deps.run.log, viewport, {
      url: target.url,
      ...(target.prepare ? { prepare: target.prepare } : {}),
    });
  }

  const dark = args.theme === "dark";

  const outPrefix = path.join(
    deps.runsDir,
    `${deps.runId}-shot-${counters.shots}-${viewport}${dark ? "-dark" : ""}`
  );

  try {
    await mkdir(deps.runsDir, { recursive: true });
    const fresh = freshCapture(deps.ctx, deps.run);

    const tiles = await deps.preview.screenshotTiles(target.url, {
      viewport: box,
      ...TILE_PLAN[viewport],
      from: start.from,
      outPrefix,
      ...(fresh ? { fresh } : {}),
      ...(dark ? { theme: "dark" as const } : {}),
      ...(target.prepare ? { prepare: target.prepare } : {}),
    });

    return {
      content: [
        ...(await tileContent(tiles.paths)),
        {
          text: `Page ${target.label}. ${dark ? "Dark theme. " : ""}${describeTiles(viewport, tiles, box)}${start.note}`,
          type: "text" as const,
        },
      ],
    };
  } catch (error) {
    return errorText(`Screenshot failed: ${describeError(error)}`);
  }
}

function configOf(deps: StudioToolDeps): ResolvedRunConfig {
  return (
    deps.run?.config ??
    withRunTask(
      resolveRunConfig(
        deps.ctx.project.settings,
        levelOf(deps.ctx.request, deps.ctx.project.settings)
      ),
      deps.ctx.request.task
    )
  );
}

export async function runRenderCheck(
  deps: StudioToolDeps,
  counters: StudioToolCounters,
  args: ShotArgs = {}
) {
  if (!deps.ctx.previewUrl) {
    return errorText(
      "Preview is not running for this direction, so render_check cannot run."
    );
  }

  const target = await pickTarget(deps, args);

  if (typeof target === "string") {
    return errorText(`render_check failed: ${target}`);
  }

  try {
    const report = await buildCheckReport(
      deps.preview,
      deps.ctx,
      configOf(deps),
      deps.run,
      target
    );

    counters.checks += 1;

    if (deps.run) {
      deps.run.lastFindings = report.findings;
      deps.run.lastChecks = report.results;
    }

    await saveCheck(deps.runsDir, deps.runId, counters.checks, report.results);

    const note = await baselineNote(
      report.results,
      deps.runsDir,
      deps.runId
    ).catch(() => null);

    return {
      content: [
        {
          text: note ? `${report.text}\n\n${note}` : report.text,
          type: "text" as const,
        },
      ],
    };
  } catch (error) {
    return errorText(`render_check failed: ${describeError(error)}`);
  }
}

async function loadQuery(deps: StudioToolDeps): Promise<QueryFn> {
  if (deps.queryFn) {
    return deps.queryFn;
  }

  return (await import("@anthropic-ai/claude-agent-sdk")).query;
}

function criticBlocked(deps: StudioToolDeps): string | null {
  const { run } = deps;

  if (
    !run ||
    !run.config.criticModel ||
    run.config.preset.criticMaxCalls === 0
  ) {
    return "design_review is only available in prototype and polish runs. Use render_check and screenshots instead.";
  }

  if (run.criticCalls >= run.config.preset.criticMaxCalls) {
    return `design_review was already called ${run.criticCalls} times in this run, the limit. Use render_check and screenshots for the final check.`;
  }

  if (!deps.ctx.previewUrl) {
    return "Preview is not running for this direction, so design_review cannot run.";
  }

  return null;
}

function explicitTarget(args: ShotArgs): boolean {
  return Boolean(args.frame || args.path || args.state);
}

async function reviewScreens(
  deps: StudioToolDeps,
  run: RunToolState,
  target: ShotTarget,
  args: ShotArgs
): Promise<RunScreen[]> {
  const own: RunScreen = {
    key: target.url,
    label: target.label,
    pagePath: target.path,
    url: target.url,
  };

  const screens = explicitTarget(args)
    ? []
    : await runScreens(deps.preview, deps.ctx, run.config, run).catch(() => []);

  const rest = screens.filter(
    (screen) => screen.prepare || !samePage(screen.url, target.url)
  );

  const first =
    screens.find(
      (screen) => !screen.prepare && samePage(screen.url, target.url)
    ) ?? own;

  const all = [first, ...rest];
  await warmScreens(deps.preview, deps.ctx.project, all);

  return all;
}

async function reviewInput(
  deps: StudioToolDeps,
  run: RunToolState,
  screens: RunScreen[],
  images: CriticImage[]
) {
  const { app } = deps.ctx.project;

  const changedSource = app
    ? await changedSourceFor(
        deps.ctx.direction.workTree,
        app.appDir,
        run.startedAt
      ).catch(() => [])
    : [];

  const before =
    !run.config.preset.quickCritic && run.reviewShots?.length
      ? beforeImages(run.reviewShots)
      : [];

  return {
    designRules: (deps.ctx.designRules ?? []).map((rule) => rule.text),
    findings: run.lastFindings,
    images,
    kind: run.config.preset.quickCritic
      ? ("quick" as const)
      : ("full" as const),
    request: deps.ctx.request.prompt,
    tasteRules: deps.tasteRules ?? [],
    ...(screens.length > 1 ? { screens: describeScreens(screens) } : {}),
    ...(app ? { app: true } : {}),
    ...(changedSource.length > 0 ? { changedSource } : {}),
    ...(before.length > 0 ? { before } : {}),
  };
}

export async function runDesignReview(
  deps: StudioToolDeps,
  args: ShotArgs = {}
) {
  const blocked = criticBlocked(deps);

  if (blocked) {
    return errorText(blocked);
  }

  const target = await pickTarget(deps, args);

  if (typeof target === "string") {
    return errorText(`design_review failed: ${target}`);
  }

  const run = deps.run as RunToolState;
  run.criticCalls += 1;

  try {
    const screens = await reviewScreens(deps, run, target, args);
    const prefix = criticOutPrefix(deps.runsDir, deps.runId, run.criticCalls);

    const images = await criticImages(
      deps.preview,
      screens,
      prefix,
      run.config.preset.screens?.maxImages,
      freshCapture(deps.ctx, run)
    );

    const input = await reviewInput(deps, run, screens, images);

    const result = await runCritic(
      await loadQuery(deps),
      input,
      run.config.criticModel as string,
      run.config.maxBudgetUsd === null
        ? null
        : run.config.preset.criticBudgetUsd,
      deps.env
    );

    run.criticCostUsd += result.costUsd;
    run.reviewShots = images;
    await writeFile(
      `${prefix}.json`,
      `${JSON.stringify({ before: input.before?.length ?? 0, costUsd: result.costUsd, error: result.error, images: images.map((image) => image.label), issues: result.issues, kind: input.kind, model: run.config.criticModel, raw: result.raw, screens: screens.map((screen) => screen.label) }, null, 2)}\n`
    );

    return {
      content: [
        {
          text: [describeCriticResult(result, run), budgetLine(run)]
            .filter(Boolean)
            .join("\n"),
          type: "text" as const,
        },
      ],
    };
  } catch (error) {
    return errorText(`design_review failed: ${describeError(error)}`);
  }
}

export async function runDefineTweaks(
  deps: Pick<StudioToolDeps, "ctx">,
  controls: unknown
) {
  if (deps.ctx.request.mode === "critique") {
    return errorText("define_tweaks is not available in critique runs.");
  }

  try {
    const result = await defineTweaks(deps.ctx.direction.workTree, controls);

    return result.ok
      ? { content: [{ text: result.text, type: "text" as const }] }
      : errorText(result.text);
  } catch (error) {
    return errorText(`define_tweaks failed: ${describeError(error)}`);
  }
}

export async function runDesignSystemCheck(deps: Pick<StudioToolDeps, "ctx">) {
  if (!deps.ctx.project.designSystemFor) {
    return errorText(
      "design_system_check works only in a design-system project (the workbench of a design system)."
    );
  }

  try {
    const result = await checkDesignSystem(deps.ctx.direction.workTree);

    return {
      content: [{ text: describeCheck(result), type: "text" as const }],
    };
  } catch (error) {
    return errorText(`design_system_check failed: ${describeError(error)}`);
  }
}

export const toDecodedRun = <Fields extends ToolFields, Reply>(
  input: ToolInput<Fields>,
  run: (data: Schema.Struct.Type<Fields>) => Promise<Reply>
): ReturnType<typeof toToolRun<Fields, ReturnType<typeof errorText>, Reply>> =>
  toToolRun(input, errorText, run);

export type ToolFactory = typeof createTool;

export function studioHelp(name: string, allowed: ReadonlySet<string>): string {
  const short = name.replace(/^mcp__studio__/, "");

  if (!allowed.has(short) || short === HELP_TOOL) {
    return `No studio tool ${short} in this run. Tools: ${[...allowed].filter((entry) => entry !== HELP_TOOL).join(", ")}.`;
  }

  return toolHelpText(short);
}

function toolHelpText(short: string): string {
  return (
    AGENT_OPS.help.get(short) ??
    TOOL_HELP[short as Exclude<StudioToolName, "studio_help">]
  );
}
