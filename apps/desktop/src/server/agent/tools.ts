import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  McpSdkServerConfigWithInstance,
  query,
} from "@anthropic-ai/claude-agent-sdk";
import { Schema } from "effect";

import type { FlowInput } from "../../shared/route-flow.js";
import {
  levelOf,
  resolveRunConfig,
  withRunTask,
} from "../../shared/run-levels.js";
import type { ResolvedRunConfig } from "../../shared/run-levels.js";
import { toOptional, toSdkFieldSet, toToolRun } from "../agent-tools/index.js";
import type { ToolFields, ToolInput } from "../agent-tools/index.js";
import { buildAgentTools } from "../agent-tools/registry.js";
import {
  applyFrameSession,
  applyFrameState,
  buildFlow,
  describeFlow,
  describeFrameStates,
  describeRouteLinks,
  FLOW_NOTE,
  FRAME_STATES_NOTE,
  listRouteLinks,
  readFrameStates,
  toFlowDeps,
} from "../canvas/app-flow/index.js";
import type {
  FrameStateDeps,
  FrameStateInput,
} from "../canvas/app-flow/index.js";
import type {
  CanvasService,
  CanvasToolContext,
  PlaceSpec,
} from "../canvas/index.js";
import { canvasList, canvasPlace, canvasPoint } from "../canvas/index.js";
import {
  editLinks,
  editLinksFields,
  listLinks,
  probeWithPreview,
} from "../canvas/links/index.js";
import type { EditLinksArgs, LinkProbe } from "../canvas/links/index.js";
import { checkDesignSystem, describeCheck } from "../design-system/check.js";
import { prepareShip } from "../git/ship-prepare.js";
import type { StudioRuntime } from "../main/runtime.js";
import { actionCaller } from "../mcp/registry.js";
import type { TileResult } from "../preview/browser.js";
import { reviewFrameShape, runReviewFrameTool } from "../review/agent-tool.js";
import type { CommentStore } from "../store/comments.js";
import { toLegacyPrincipal } from "../store/index.js";
import type { LayerLockStore } from "../store/layer-locks.js";
import { defineTweaks } from "../tweaks/store.js";
import type { AgentRunContext, PreviewService } from "../types.js";
import {
  inspectAccessibilityInput,
  runInspectAccessibility,
  runSetAccessibility,
  setAccessibilityInput,
} from "./accessibility-tool.js";
import {
  arrangeShape,
  measureShape,
  runArrange,
  runMeasure,
} from "./arrange-tool.js";
import type { ActionAsk } from "./ask-gate.js";
import {
  listBreakpointsInput,
  runListBreakpoints,
  runSetBreakpointStyle,
  setBreakpointStyleInput,
} from "./breakpoints-tool.js";
import {
  HELP_INPUT,
  SCREENSHOT_TOOL,
  TARGET_TOOL,
  FLOW_TOOL,
  TWEAKS_TOOL,
  canvasPlaceInput,
  canvasPointInput,
  doctorInput,
  frameSessionInput,
  frameStateInput,
  routeLinkInput,
} from "./canvas-tool-fields.js";
import {
  budgetLine,
  buildCheckReport,
  freshCapture,
  runScreens,
  saveCheck,
} from "./check-tool.js";
import {
  listCommentsInput,
  resolveCommentInput,
  runListComments,
  runResolveComment,
} from "./comment-tools.js";
import {
  createComponentShape,
  runCreateComponent,
  runSwapInstance,
  swapInstanceShape,
} from "./component-create-tool.js";
import {
  componentPreviewShape,
  runComponentPreview,
} from "./component-preview-tool.js";
import {
  createVariantInput,
  runCreateComponentVariant,
  runUpdateComponentVariant,
  updateVariantInput,
} from "./component-variant-tool.js";
import { getRunContextShape, runGetRunContext } from "./context-tool.js";
import { copyCodeInput, runCopyCode } from "./copy-code-tool.js";
import {
  beforeImages,
  changedSourceFor,
  criticImages,
  criticOutPrefix,
  describeCriticResult,
  runCritic,
} from "./critic.js";
import {
  editElementFields,
  runEditElement,
  runSetToken,
  setTokenShape,
} from "./direct-tools.js";
import { runAppDoctor } from "./doctor-tool.js";
import { exportFrameShape, runExportFrame } from "./export-tool.js";
import { figmaImportShape, runFigmaImport } from "./figma-import-tool.js";
import {
  getFillInput,
  runGetFill,
  runSetFill,
  setFillInput,
} from "./fill-tool.js";
import { baselineNote } from "./final-check.js";
import {
  insertIconInput,
  listIconsInput,
  runInsertIcon,
  runListIcons,
} from "./icon-tool.js";
import {
  placeImageInput,
  runPlaceImage,
  runSearchImages,
  searchImagesInput,
} from "./image-search-tool.js";
import { runSetImage, setImageShape } from "./image-tool.js";
import { insertComponentShape, runInsertComponent } from "./insert-tool.js";
import {
  clearTextShape,
  insertJsxShape,
  runClearText,
  runInsertJsx,
} from "./jsx-insert-tool.js";
import {
  getLayersShape,
  listComponentsShape,
  runGetLayers,
  runListComponents,
  withLayerIds,
} from "./kit-tools.js";
import {
  LAYER_STATE_TOOL,
  LIST_LOCKS_TOOL,
  layerStateShape,
  listLocksShape,
  runListLockedLayers,
  runSetLayerState,
} from "./layer-state-tool.js";
import { isLeanRun } from "./lean-run.js";
import { AGENT_OPS } from "./legacy/agent-ops.js";
import {
  listLinkInteractionsInput,
  runListLinkInteractions,
  runSetLinkInteraction,
  setLinkInteractionInput,
} from "./link-interaction-tool.js";
import {
  listMotionInput,
  runListMotion,
  runSetMotion,
  setMotionInput,
} from "./motion-tool.js";
import { importPageInput, runImportPage } from "./page-import-tool.js";
import { recordShot } from "./polish-loop.js";
import { runSetProps, setPropsShape } from "./props-tool.js";
import {
  COMPARE_REFERENCE_DESCRIPTION,
  compareReferenceShape,
  runCompareToReference,
} from "./reference-tool.js";
import { resolveShotTarget } from "./run-target.js";
import type { ShotArgs, ShotTarget, TargetDeps } from "./run-target.js";
import { describeScreens, samePage, warmScreens } from "./screens.js";
import type { RunScreen } from "./screens.js";
import { runSelectMatching, selectMatchingShape } from "./select-tool.js";
import {
  getSpacingInput,
  runGetSpacing,
  runSetSpacing,
  setSpacingInput,
} from "./spacing-tool.js";
import {
  getStackingInput,
  runGetStacking,
  runSetStacking,
  setStackingInput,
} from "./stacking-tool.js";
import {
  listStateStylesInput,
  runListStateStyles,
  runSetForcedState,
  runSetStateStyle,
  setForcedStateInput,
  setStateStyleInput,
} from "./state-styles-tool.js";
import {
  findStylesShape,
  replaceStyleShape,
  runFindStyles,
  runReplaceStyle,
} from "./style-tool.js";
import type { TasteRule } from "./taste.js";
import {
  runSearchText,
  runUpdateText,
  searchTextInput,
  updateTextInput,
} from "./text-search-tool.js";
import {
  applyTextStyleInput,
  createTextStyleInput,
  listTextStylesInput,
  runApplyTextStyle,
  runCreateTextStyle,
  runListTextStyles,
} from "./text-style-tool.js";
import { TOOL_HELP, TOOL_SHORT } from "./tool-help.js";
import type { StudioToolName } from "./tool-help.js";
import { HELP_TOOL, studioToolsFor } from "./tool-sets.js";
import type { CriticImage, RunToolState } from "./types.js";
import {
  booleanShapesShape,
  drawVectorShape,
  paintShapeShape,
  runBooleanShapes,
  runDrawVector,
  runPaintShape,
} from "./vector-tool.js";
import { diffVersionsShape, runDiffVersions } from "./version-diff-tool.js";

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

const agentEditElementShape = toSdkFieldSet({
  ...editElementFields,
  style: toOptional(
    Schema.Record(
      Schema.String,
      Schema.Union([Schema.String, Schema.Finite, Schema.Null])
    ),
    "CSS properties to set, kebab-case or camelCase keys; null removes one. Tailwind projects get theme classes."
  ),
});

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

export function runCanvasList(deps: Pick<StudioToolDeps, "ctx" | "canvas">) {
  return withCanvas(deps, "canvas_list", canvasList);
}

export function runCanvasPlace(
  deps: Pick<StudioToolDeps, "ctx" | "canvas">,
  frames: readonly PlaceSpec[]
) {
  return withCanvas(deps, "canvas_place", (ctx) => canvasPlace(ctx, frames));
}

export function runCanvasPoint(
  deps: Pick<StudioToolDeps, "ctx" | "canvas">,
  args: { frame: string; selector?: string }
) {
  return withCanvas(deps, "canvas_point", (ctx) => canvasPoint(ctx, args));
}

function agentLinkProbe(
  deps: Pick<StudioToolDeps, "ctx" | "preview" | "frameStates">
): LinkProbe | undefined {
  return probeWithPreview(
    deps.preview,
    deps.ctx.project,
    deps.ctx.direction,
    deps.frameStates ?? null
  );
}

export function runListLinks(
  deps: Pick<StudioToolDeps, "ctx" | "canvas" | "preview">
) {
  return withCanvas(deps, "list_links", (ctx) =>
    listLinks(ctx, agentLinkProbe(deps))
  );
}

type LinkToolDeps = Pick<StudioToolDeps, "ctx" | "canvas" | "preview">;

export function runSetLinkInteractionTool(
  deps: LinkToolDeps,
  args: Parameters<typeof runSetLinkInteraction>[1]
) {
  return withCanvas(deps, "set_link_interaction", (ctx) =>
    runSetLinkInteraction(ctx, args, agentLinkProbe(deps) ?? null)
  );
}

export function runListLinkInteractionsTool(
  deps: LinkToolDeps,
  args: { fromFrame?: string }
) {
  return withCanvas(deps, "list_link_interactions", (ctx) =>
    runListLinkInteractions(ctx, args.fromFrame ?? null)
  );
}

export function runEditLinks(
  deps: Pick<StudioToolDeps, "ctx" | "canvas" | "preview">,
  args: EditLinksArgs
) {
  return withCanvas(deps, "edit_links", (ctx) =>
    editLinks(ctx, args, agentLinkProbe(deps))
  );
}

async function withFrameStates(
  deps: Pick<StudioToolDeps, "ctx" | "frameStates">,
  name: string,
  run: (stateDeps: FrameStateDeps) => Promise<string>
) {
  const stateDeps = deps.frameStates ?? null;

  if (!stateDeps) {
    return errorText("Frame states are not available in this run.");
  }

  try {
    return { content: [{ text: await run(stateDeps), type: "text" as const }] };
  } catch (error) {
    return errorText(`${name} failed: ${describeError(error)}`);
  }
}

export function runListFrameStates(
  deps: Pick<StudioToolDeps, "ctx" | "frameStates">
) {
  return withFrameStates(deps, "list_frame_states", async (stateDeps) =>
    describeFrameStates(
      deps.ctx.project,
      await readFrameStates(stateDeps, deps.ctx.project)
    )
  );
}

export function runSetFrameState(
  deps: Pick<StudioToolDeps, "ctx" | "frameStates">,
  args: FrameStateInput
) {
  return withFrameStates(deps, "set_frame_state", async (stateDeps) => {
    const done = await applyFrameState(stateDeps, deps.ctx.project, args);

    return `Frame ${done.frameId} now shows ${done.state.name} (${done.state.id}).\n${describeFrameStates(deps.ctx.project, done.view)}`;
  });
}

export function runSetFrameSession(
  deps: Pick<StudioToolDeps, "ctx" | "frameStates">,
  args: { user?: { name: string; email: string }; forgetCookies?: boolean }
) {
  return withFrameStates(deps, "set_frame_session", async (stateDeps) =>
    describeFrameStates(
      deps.ctx.project,
      await applyFrameSession(stateDeps, deps.ctx.project, {
        ...(args.user ? { user: args.user } : {}),
        ...(args.forgetCookies ? { forget: true } : {}),
      })
    )
  );
}

export async function runListRouteLinks(
  deps: Pick<StudioToolDeps, "ctx">,
  route: string
) {
  try {
    return {
      content: [
        {
          text: describeRouteLinks(
            await listRouteLinks(deps.ctx.project, route)
          ),
          type: "text" as const,
        },
      ],
    };
  } catch (error) {
    return errorText(`list_route_links failed: ${describeError(error)}`);
  }
}

export function runAddFlow(
  deps: Pick<StudioToolDeps, "ctx" | "canvas" | "frameStates">,
  args: FlowInput
) {
  return withCanvas(deps, "add_flow", async (ctx) => {
    if (ctx.plan) {
      return errorText(
        "Plan mode is on, so the canvas stays as it is. Describe the flow in the plan."
      );
    }

    if (ctx.mode === "critique") {
      return errorText("add_flow is not available in critique runs.");
    }

    const flowDeps = toFlowDeps(ctx.canvas, deps.frameStates);

    if (!flowDeps) {
      return errorText("Flow is not available in this run.");
    }

    return {
      content: [
        {
          text: describeFlow(
            await buildFlow(flowDeps, ctx.project, ctx.direction, args, "agent")
          ),
          type: "text" as const,
        },
      ],
    };
  });
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

interface StudioToolCounters {
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

function targetDeps(
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

export async function runPrepareShip(
  deps: Pick<StudioToolDeps, "ctx" | "runsDir">
) {
  if (!deps.ctx.project.app) {
    return errorText("prepare_ship works only in an attached app project.");
  }

  try {
    const plan = await prepareShip({
      project: deps.ctx.project,
      projectDir: path.dirname(deps.runsDir),
    });

    const files = plan.files.map((f) => ({
      additions: f.additions,
      conflict: f.conflict,
      deletions: f.deletions,
      path: f.path,
      refused: f.refused,
      status: f.status,
    }));

    const text = JSON.stringify(
      {
        base: plan.base?.title ?? null,
        blocked: plan.blocked,
        checkedOut: plan.repo?.branch ?? null,
        defaults: plan.defaults,
        files,
        note: "Only the user can ship, with the Ship button in the studio. Tell them what is ready and what blocks it.",
      },
      null,
      2
    );

    return { content: [{ text, type: "text" as const }] };
  } catch (error) {
    return errorText(`prepare_ship failed: ${describeError(error)}`);
  }
}

const toDecodedRun = <Fields extends ToolFields, Reply>(
  input: ToolInput<Fields>,
  run: (data: Schema.Struct.Type<Fields>) => Promise<Reply>
) => toToolRun(input, errorText, run);

export async function createStudioMcpServer(
  deps: StudioToolDeps
): Promise<McpSdkServerConfigWithInstance> {
  const { createSdkMcpServer, tool } =
    await import("@anthropic-ai/claude-agent-sdk");

  const counters: StudioToolCounters = deps.run
    ? (deps.run.counters ??= { checks: 0, shots: 0 })
    : { checks: 0, shots: 0 };

  const screenshot = tool(
    "screenshot",
    TOOL_SHORT.screenshot,
    SCREENSHOT_TOOL.sdkFields,
    toDecodedRun(SCREENSHOT_TOOL.input, (args) =>
      takeScreenshot(deps, counters, args)
    ),
    { annotations: { readOnlyHint: true } }
  );

  const renderCheck = tool(
    "render_check",
    TOOL_SHORT.render_check,
    TARGET_TOOL.sdkFields,
    toDecodedRun(TARGET_TOOL.input, (args) =>
      runRenderCheck(deps, counters, args)
    ),
    { annotations: { readOnlyHint: true } }
  );

  const designReview = tool(
    "design_review",
    TOOL_SHORT.design_review,
    TARGET_TOOL.sdkFields,
    toDecodedRun(TARGET_TOOL.input, (args) => runDesignReview(deps, args)),
    { annotations: { readOnlyHint: true } }
  );

  const defineTweaksTool = tool(
    "define_tweaks",
    TOOL_SHORT.define_tweaks,
    TWEAKS_TOOL.sdkFields,
    toDecodedRun(TWEAKS_TOOL.input, (args) =>
      runDefineTweaks(deps, args.controls)
    )
  );

  const designSystemCheck = tool(
    "design_system_check",
    TOOL_SHORT.design_system_check,
    {},
    () => runDesignSystemCheck(deps),
    { annotations: { readOnlyHint: true } }
  );

  const canvasListTool = tool(
    "canvas_list",
    TOOL_SHORT.canvas_list,
    {},
    () => runCanvasList(deps),
    { annotations: { readOnlyHint: true } }
  );

  const canvasPlaceTool = tool(
    "canvas_place",
    TOOL_SHORT.canvas_place,
    canvasPlaceInput.sdkFields,
    toDecodedRun(canvasPlaceInput.input, (args) =>
      runCanvasPlace(deps, args.frames)
    )
  );

  const canvasPointTool = tool(
    "canvas_point",
    TOOL_SHORT.canvas_point,
    canvasPointInput.sdkFields,
    toDecodedRun(canvasPointInput.input, (args) => runCanvasPoint(deps, args)),
    { annotations: { readOnlyHint: true } }
  );

  const listLinksTool = tool(
    "list_links",
    TOOL_SHORT.list_links,
    {},
    () => runListLinks(deps),
    { annotations: { readOnlyHint: true } }
  );

  const editLinksTool = tool(
    "edit_links",
    TOOL_SHORT.edit_links,
    editLinksFields,
    (args) => runEditLinks(deps, args)
  );

  const listFrameStatesTool = tool(
    "list_frame_states",
    TOOL_SHORT.list_frame_states,
    {},
    () => runListFrameStates(deps),
    { annotations: { readOnlyHint: true } }
  );

  const setFrameStateTool = tool(
    "set_frame_state",
    TOOL_SHORT.set_frame_state,
    frameStateInput.sdkFields,
    toDecodedRun(frameStateInput.input, (args) => runSetFrameState(deps, args))
  );

  const setFrameSessionTool = tool(
    "set_frame_session",
    TOOL_SHORT.set_frame_session,
    frameSessionInput.sdkFields,
    toDecodedRun(frameSessionInput.input, (args) =>
      runSetFrameSession(deps, args)
    )
  );

  const listRouteLinksTool = tool(
    "list_route_links",
    TOOL_SHORT.list_route_links,
    routeLinkInput.sdkFields,
    toDecodedRun(routeLinkInput.input, (args) =>
      runListRouteLinks(deps, args.route)
    ),
    { annotations: { readOnlyHint: true } }
  );

  const addFlowTool = tool(
    "add_flow",
    TOOL_SHORT.add_flow,
    FLOW_TOOL.sdkFields,
    toDecodedRun(FLOW_TOOL.input, (args) => runAddFlow(deps, args))
  );

  const editElementTool = tool(
    "edit_element",
    TOOL_SHORT.edit_element,
    agentEditElementShape,
    withLayerIds(deps, (args) => runEditElement(deps, args))
  );

  const setTokenTool = tool(
    "set_token",
    TOOL_SHORT.set_token,
    setTokenShape,
    (args) => runSetToken(deps, args)
  );

  const prepareShipTool = tool(
    "prepare_ship",
    TOOL_SHORT.prepare_ship,
    {},
    () => runPrepareShip(deps),
    { annotations: { readOnlyHint: true } }
  );

  const setPropsTool = tool(
    "set_props",
    TOOL_SHORT.set_props,
    setPropsShape,
    withLayerIds(deps, (args) => runSetProps(deps, args))
  );

  const findStylesTool = tool(
    "find_styles",
    TOOL_SHORT.find_styles,
    findStylesShape,
    (args) => runFindStyles(deps, args),
    { annotations: { readOnlyHint: true } }
  );

  const replaceStyleTool = tool(
    "replace_style",
    TOOL_SHORT.replace_style,
    replaceStyleShape,
    (args) => runReplaceStyle(deps, args)
  );

  const searchTextTool = tool(
    "search_text",
    TOOL_SHORT.search_text,
    searchTextInput.sdkFields,
    toDecodedRun(searchTextInput.input, (args) => runSearchText(deps, args)),
    { annotations: { readOnlyHint: true } }
  );

  const updateTextTool = tool(
    "update_text",
    TOOL_SHORT.update_text,
    updateTextInput.sdkFields,
    toDecodedRun(updateTextInput.input, (args) => runUpdateText(deps, args))
  );

  const arrangeTool = tool(
    "arrange",
    TOOL_SHORT.arrange,
    arrangeShape,
    (args) => runArrange(deps, args)
  );

  const selectMatchingTool = tool(
    "select_matching",
    TOOL_SHORT.select_matching,
    selectMatchingShape,
    (args) => runSelectMatching(deps, args),
    { annotations: { readOnlyHint: true } }
  );

  const diffVersionsTool = tool(
    "diff_versions",
    TOOL_SHORT.diff_versions,
    diffVersionsShape,
    (args) =>
      runDiffVersions(
        {
          headVersionId: deps.ctx.direction.headVersionId,
          runsDir: deps.runsDir,
        },
        args
      ),
    { annotations: { readOnlyHint: true } }
  );

  const measureTool = tool(
    "measure",
    TOOL_SHORT.measure,
    measureShape,
    (args) => runMeasure(deps, args),
    { annotations: { readOnlyHint: true } }
  );

  const reviewFrameTool = tool(
    "review_frame",
    TOOL_SHORT.review_frame,
    reviewFrameShape,
    withLayerIds(deps, (args) => runReviewFrameTool(deps, args)),
    { annotations: { readOnlyHint: true } }
  );

  const insertComponentTool = tool(
    "insert_component",
    TOOL_SHORT.insert_component,
    insertComponentShape,
    withLayerIds(deps, (args) => runInsertComponent(deps, args))
  );

  const listIconsTool = tool(
    "list_icons",
    TOOL_SHORT.list_icons,
    listIconsInput,
    (args) => runListIcons(deps, args),
    { annotations: { readOnlyHint: true } }
  );

  const insertIconTool = tool(
    "insert_icon",
    TOOL_SHORT.insert_icon,
    insertIconInput,
    withLayerIds(deps, (args) => runInsertIcon(deps, args))
  );

  const listTextStylesTool = tool(
    "list_text_styles",
    TOOL_SHORT.list_text_styles,
    listTextStylesInput,
    (args) => runListTextStyles(deps, args),
    { annotations: { readOnlyHint: true } }
  );

  const applyTextStyleTool = tool(
    "apply_text_style",
    TOOL_SHORT.apply_text_style,
    applyTextStyleInput,
    withLayerIds(deps, (args) => runApplyTextStyle(deps, args))
  );

  const createTextStyleTool = tool(
    "create_text_style",
    TOOL_SHORT.create_text_style,
    createTextStyleInput,
    withLayerIds(deps, (args) => runCreateTextStyle(deps, args))
  );

  const listMotionTool = tool(
    "list_motion",
    TOOL_SHORT.list_motion,
    listMotionInput,
    withLayerIds(deps, (args) => runListMotion(deps, args)),
    { annotations: { readOnlyHint: true } }
  );

  const setMotionTool = tool(
    "set_motion",
    TOOL_SHORT.set_motion,
    setMotionInput,
    withLayerIds(deps, (args) => runSetMotion(deps, args))
  );

  const getFillTool = tool(
    "get_fill",
    TOOL_SHORT.get_fill,
    getFillInput,
    withLayerIds(deps, (args) => runGetFill(deps, args)),
    { annotations: { readOnlyHint: true } }
  );

  const listLinkInteractionsTool = tool(
    "list_link_interactions",
    TOOL_SHORT.list_link_interactions,
    listLinkInteractionsInput,
    (args) => runListLinkInteractionsTool(deps, args),
    { annotations: { readOnlyHint: true } }
  );

  const setLinkInteractionTool = tool(
    "set_link_interaction",
    TOOL_SHORT.set_link_interaction,
    setLinkInteractionInput,
    (args) => runSetLinkInteractionTool(deps, args)
  );

  const setFillTool = tool(
    "set_fill",
    TOOL_SHORT.set_fill,
    setFillInput,
    withLayerIds(deps, (args) => runSetFill(deps, args))
  );

  const getSpacingTool = tool(
    "get_spacing",
    TOOL_SHORT.get_spacing,
    getSpacingInput,
    withLayerIds(deps, (args) => runGetSpacing(deps, args)),
    { annotations: { readOnlyHint: true } }
  );

  const setSpacingTool = tool(
    "set_spacing",
    TOOL_SHORT.set_spacing,
    setSpacingInput,
    withLayerIds(deps, (args) => runSetSpacing(deps, args))
  );

  const listBreakpointsTool = tool(
    "list_breakpoints",
    TOOL_SHORT.list_breakpoints,
    listBreakpointsInput,
    withLayerIds(deps, (args) => runListBreakpoints(deps, args)),
    { annotations: { readOnlyHint: true } }
  );

  const setBreakpointStyleTool = tool(
    "set_breakpoint_style",
    TOOL_SHORT.set_breakpoint_style,
    setBreakpointStyleInput,
    withLayerIds(deps, (args) => runSetBreakpointStyle(deps, args))
  );

  const listStateStylesTool = tool(
    "list_state_styles",
    TOOL_SHORT.list_state_styles,
    listStateStylesInput,
    withLayerIds(deps, (args) => runListStateStyles(deps, args)),
    { annotations: { readOnlyHint: true } }
  );

  const setStateStyleTool = tool(
    "set_state_style",
    TOOL_SHORT.set_state_style,
    setStateStyleInput,
    withLayerIds(deps, (args) => runSetStateStyle(deps, args))
  );

  const setForcedStateTool = tool(
    "set_forced_state",
    TOOL_SHORT.set_forced_state,
    setForcedStateInput,
    (args) => runSetForcedState(deps, args)
  );

  const getStackingTool = tool(
    "get_stacking",
    TOOL_SHORT.get_stacking,
    getStackingInput,
    withLayerIds(deps, (args) => runGetStacking(deps, args)),
    { annotations: { readOnlyHint: true } }
  );

  const setStackingTool = tool(
    "set_stacking",
    TOOL_SHORT.set_stacking,
    setStackingInput,
    withLayerIds(deps, (args) => runSetStacking(deps, args))
  );

  const copyCodeTool = tool(
    "copy_code",
    TOOL_SHORT.copy_code,
    copyCodeInput,
    withLayerIds(deps, (args) => runCopyCode(deps, args)),
    { annotations: { readOnlyHint: true } }
  );

  const insertJsxTool = tool(
    "insert_jsx",
    TOOL_SHORT.insert_jsx,
    insertJsxShape,
    withLayerIds(deps, (args) => runInsertJsx(deps, args))
  );

  const clearTextTool = tool(
    "clear_text",
    TOOL_SHORT.clear_text,
    clearTextShape,
    withLayerIds(deps, (args) => runClearText(deps, args))
  );

  const listComponentsTool = tool(
    "list_components",
    TOOL_SHORT.list_components,
    listComponentsShape,
    (args) => runListComponents(deps, args),
    { annotations: { readOnlyHint: true } }
  );

  const getLayersTool = tool(
    "get_layers",
    TOOL_SHORT.get_layers,
    getLayersShape,
    (args) => runGetLayers(deps, args),
    { annotations: { readOnlyHint: true } }
  );

  const listCommentsTool = tool(
    "list_comments",
    TOOL_SHORT.list_comments,
    listCommentsInput.sdkFields,
    toDecodedRun(listCommentsInput.input, (args) =>
      runListComments(deps, args)
    ),
    { annotations: { readOnlyHint: true } }
  );

  const resolveCommentTool = tool(
    "resolve_comment",
    TOOL_SHORT.resolve_comment,
    resolveCommentInput.sdkFields,
    toDecodedRun(resolveCommentInput.input, (args) =>
      runResolveComment(deps, args)
    )
  );

  const getRunContextTool = tool(
    "get_run_context",
    TOOL_SHORT.get_run_context,
    getRunContextShape,
    () => runGetRunContext(deps),
    { annotations: { readOnlyHint: true } }
  );

  const appDoctorTool = tool(
    "app_doctor",
    TOOL_SHORT.app_doctor,
    doctorInput.sdkFields,
    toDecodedRun(doctorInput.input, (args) =>
      runAppDoctor(deps, args.fresh === true)
    ),
    { annotations: { readOnlyHint: true } }
  );

  const componentPreviewTool = tool(
    "component_preview",
    TOOL_SHORT.component_preview,
    componentPreviewShape,
    (args) => runComponentPreview(deps, args),
    { annotations: { readOnlyHint: true } }
  );

  const createComponentTool = tool(
    "create_component",
    TOOL_SHORT.create_component,
    createComponentShape,
    (args) => runCreateComponent(deps, args)
  );

  const createComponentVariantTool = tool(
    "create_component_variant",
    TOOL_SHORT.create_component_variant,
    createVariantInput,
    (args) => runCreateComponentVariant(deps, args)
  );

  const updateComponentVariantTool = tool(
    "update_component_variant",
    TOOL_SHORT.update_component_variant,
    updateVariantInput,
    (args) => runUpdateComponentVariant(deps, args)
  );

  const swapInstanceTool = tool(
    "swap_instance",
    TOOL_SHORT.swap_instance,
    swapInstanceShape,
    withLayerIds(deps, (args) => runSwapInstance(deps, args))
  );

  const exportFrameTool = tool(
    "export_frame",
    TOOL_SHORT.export_frame,
    exportFrameShape,
    withLayerIds(deps, (args) => runExportFrame(deps, args))
  );

  const importPageTool = tool(
    "import_page",
    TOOL_SHORT.import_page,
    importPageInput.sdkFields,
    toDecodedRun(importPageInput.input, (args) => runImportPage(deps, args))
  );

  const setImageTool = tool(
    "set_image",
    TOOL_SHORT.set_image,
    setImageShape,
    (args) => runSetImage(deps, args)
  );

  const searchImagesTool = tool(
    "search_images",
    TOOL_SHORT.search_images,
    searchImagesInput,
    (args) => runSearchImages(deps, args),
    { annotations: { readOnlyHint: true } }
  );

  const placeImageTool = tool(
    "place_image",
    TOOL_SHORT.place_image,
    placeImageInput,
    withLayerIds(deps, (args) => runPlaceImage(deps, args))
  );

  const inspectAccessibilityTool = tool(
    "inspect_accessibility",
    TOOL_SHORT.inspect_accessibility,
    inspectAccessibilityInput,
    withLayerIds(deps, (args) => runInspectAccessibility(deps, args)),
    { annotations: { readOnlyHint: true } }
  );

  const setAccessibilityTool = tool(
    "set_accessibility",
    TOOL_SHORT.set_accessibility,
    setAccessibilityInput,
    withLayerIds(deps, (args) => runSetAccessibility(deps, args))
  );

  const drawVectorTool = tool(
    "draw_vector",
    TOOL_SHORT.draw_vector,
    drawVectorShape,
    (args) => runDrawVector(deps, args)
  );

  const booleanShapesTool = tool(
    "boolean_shapes",
    TOOL_SHORT.boolean_shapes,
    booleanShapesShape,
    (args) => runBooleanShapes(deps, args)
  );

  const setLayerStateTool = tool(
    LAYER_STATE_TOOL,
    TOOL_SHORT.set_layer_state,
    layerStateShape,
    (args) => runSetLayerState(deps, args)
  );

  const listLockedLayersTool = tool(
    LIST_LOCKS_TOOL,
    TOOL_SHORT.list_locked_layers,
    listLocksShape,
    (args) => runListLockedLayers(deps, args),
    { annotations: { readOnlyHint: true } }
  );

  const compareReferenceTool = tool(
    "compare_to_reference",
    TOOL_SHORT.compare_to_reference,
    compareReferenceShape,
    (args) =>
      runCompareToReference({ ...deps, targets: targetDeps(deps) }, args),
    { annotations: { readOnlyHint: true } }
  );

  const figmaImportTool = tool(
    "import_figma_frame",
    TOOL_SHORT.import_figma_frame,
    figmaImportShape,
    withLayerIds(deps, (args) => runFigmaImport(deps, args))
  );

  const paintShapeTool = tool(
    "paint_shape",
    TOOL_SHORT.paint_shape,
    paintShapeShape,
    (args) => runPaintShape(deps, args)
  );

  const allowed = studioToolsFor(
    deps.ctx.project,
    deps.ctx.request.mode,
    deps.ctx.request.mode === "edit" && isLeanRun(deps.ctx.request)
  );

  const helpTool = tool(
    HELP_TOOL,
    TOOL_SHORT.studio_help,
    HELP_INPUT.sdkFields,
    toDecodedRun(HELP_INPUT.input, async (args) => ({
      content: [
        { text: studioHelp(args.tool, allowed), type: "text" as const },
      ],
    })),
    { annotations: { readOnlyHint: true } }
  );

  const all = [
    screenshot,
    renderCheck,
    designReview,
    defineTweaksTool,
    designSystemCheck,
    canvasListTool,
    canvasPlaceTool,
    canvasPointTool,
    listLinksTool,
    editLinksTool,
    listLinkInteractionsTool,
    setLinkInteractionTool,
    listFrameStatesTool,
    setFrameStateTool,
    setFrameSessionTool,
    editElementTool,
    setTokenTool,
    prepareShipTool,
    setPropsTool,
    findStylesTool,
    replaceStyleTool,
    reviewFrameTool,
    insertComponentTool,
    insertJsxTool,
    listIconsTool,
    insertIconTool,
    listTextStylesTool,
    applyTextStyleTool,
    createTextStyleTool,
    listMotionTool,
    setMotionTool,
    getFillTool,
    setFillTool,
    getSpacingTool,
    setSpacingTool,
    listBreakpointsTool,
    setBreakpointStyleTool,
    listStateStylesTool,
    setStateStyleTool,
    setForcedStateTool,
    getStackingTool,
    setStackingTool,
    copyCodeTool,
    clearTextTool,
    listComponentsTool,
    getLayersTool,
    listCommentsTool,
    resolveCommentTool,
    listRouteLinksTool,
    addFlowTool,
    arrangeTool,
    measureTool,
    getRunContextTool,
    appDoctorTool,
    componentPreviewTool,
    createComponentTool,
    createComponentVariantTool,
    updateComponentVariantTool,
    swapInstanceTool,
    selectMatchingTool,
    diffVersionsTool,
    exportFrameTool,
    setImageTool,
    searchImagesTool,
    placeImageTool,
    inspectAccessibilityTool,
    setAccessibilityTool,
    importPageTool,
    searchTextTool,
    updateTextTool,
    drawVectorTool,
    booleanShapesTool,
    paintShapeTool,
    setLayerStateTool,
    listLockedLayersTool,
    compareReferenceTool,
    figmaImportTool,
    helpTool,
    ...buildAgentTools(
      actionCaller(deps.runtime, toLegacyPrincipal(), deps.actionAsk ?? null),
      tool
    ),
  ];

  return createSdkMcpServer({
    name: "studio",
    tools: all.filter((entry) => allowed.has(entry.name)),
    version: "0.1.0",
  });
}

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
