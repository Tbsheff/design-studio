import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QualityFinding } from "@design-studio/contracts";

import type {
  AgentRunContext,
  PreviewService,
} from "../../shared/server-ports.js";
import type { CanvasService } from "../canvas/index.js";
import { runScreens } from "./check-tool.js";
import { EDIT_TOOL_NAMES } from "./permissions.js";
import { isBlocking } from "./polish-loop.js";
import { samePage } from "./screens.js";
import type { RunScreen } from "./screens.js";
import type { RunToolState } from "./types.js";
import type { ImagePart } from "./user-message.js";

const SIZES = [
  { box: { height: 900, width: 1440 }, name: "desktop" },
  { box: { height: 844, width: 390 }, name: "mobile" },
] as const;

const LISTED = 8;

export interface ScreenReviewInput {
  preview: PreviewService;
  canvas?: CanvasService;
  ctx: AgentRunContext;
  run: RunToolState;
  runsDir: string;
  runId: string;
}

export interface ScreenReview {
  screens: RunScreen[];
  images: ImagePart[];
  failed: string[];
  findings: QualityFinding[];
}

function wantsScreenReview(ctx: AgentRunContext, run: RunToolState): boolean {
  if (ctx.project.app || ctx.request.mode !== "edit" || !ctx.previewUrl) {
    return false;
  }

  return (
    run.config.preset.checks.screenshots && Boolean(run.config.preset.screens)
  );
}

function shotOf(run: RunToolState, screen: RunScreen, after: number): boolean {
  return (run.log?.shots ?? []).some(
    (shot) =>
      shot.at > after &&
      samePage(shot.url, screen.url) &&
      (shot.prepare ?? "") === (screen.prepare ?? "")
  );
}

function toDistinctScreens(screens: RunScreen[]): RunScreen[] {
  const seen = new Set<string>();

  return screens.filter((screen) => {
    const key = `${screen.label}|${screen.url}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
}

export async function unseenScreens(
  input: Pick<ScreenReviewInput, "preview" | "ctx" | "run">
): Promise<RunScreen[]> {
  const { ctx, run } = input;

  if (!wantsScreenReview(ctx, run)) {
    return [];
  }

  const lastEdit = (run.log?.toolOrder ?? []).findLastIndex((name) =>
    EDIT_TOOL_NAMES.has(name)
  );

  if (lastEdit === -1) {
    return [];
  }

  const screens = toDistinctScreens(
    await runScreens(input.preview, ctx, run.config, run).catch(() => [])
  );

  return screens.length > 1
    ? screens.filter((screen) => !shotOf(run, screen, lastEdit))
    : [];
}

interface ScreenShots {
  images: ImagePart[];
  failed: string[];
}

async function toSizeShot(
  input: ScreenReviewInput,
  screen: RunScreen,
  index: number,
  { name, box }: (typeof SIZES)[number]
): Promise<ImagePart> {
  const outPrefix = path.join(
    input.runsDir,
    `${input.runId}-studio-screen-${index + 1}-${name}`
  );

  const tiles = await input.preview.screenshotTiles(screen.url, {
    fresh: true,
    from: 0,
    maxTiles: 1,
    outPrefix,
    tileHeight: box.height,
    viewport: box,
    ...(screen.prepare ? { prepare: screen.prepare } : {}),
  });

  const file = tiles.paths[0];

  if (!file) {
    throw new Error("no tile");
  }

  return {
    data: (await readFile(file)).toString("base64"),
    mime: "image/png" as const,
    name: `${screen.label} ${name}`,
  };
}

function toFailedName(name: string, shot: ImagePart | null): string[] {
  if (shot === null) {
    return [name];
  }

  return [];
}

async function toScreenShots(
  input: ScreenReviewInput,
  screen: RunScreen,
  index: number
): Promise<ScreenShots> {
  const shots = await Promise.all(
    SIZES.map((size) =>
      toSizeShot(input, screen, index, size).catch(() => null)
    )
  );

  return {
    failed: SIZES.flatMap((size, at) =>
      toFailedName(`${screen.label} ${size.name}`, shots[at] ?? null)
    ),
    images: shots.filter((shot): shot is ImagePart => shot !== null),
  };
}

export async function studioScreenReview(
  input: ScreenReviewInput,
  screens: RunScreen[]
): Promise<ScreenReview> {
  const shots = await Promise.all(
    screens.map((screen, index) => toScreenShots(input, screen, index))
  );

  const labels = new Set(screens.map((screen) => screen.label));

  const findings = input.run.lastFindings.filter(
    (finding) =>
      isBlocking(finding) &&
      finding.screen !== undefined &&
      labels.has(finding.screen)
  );

  return {
    failed: shots.flatMap((shot) => shot.failed),
    findings,
    images: shots.flatMap((shot) => shot.images),
    screens,
  };
}

function toFailedLines(failed: string[]): string[] {
  if (failed.length === 0) {
    return [];
  }

  return [
    `The studio could not take these images: ${failed.join(", ")}. Take them with mcp__studio__screenshot.`,
  ];
}

function toFailedNote(failed: string[]): string {
  if (failed.length === 0) {
    return "";
  }

  return ` These images failed: ${failed.join(", ")}.`;
}

function findingLine(finding: QualityFinding): string {
  return `- [${finding.severity}] ${finding.check} on ${finding.screen ?? "page"}${finding.viewport ? ` @${finding.viewport}` : ""}: ${finding.message}`;
}

export function screenReviewPrompt(review: ScreenReview): string | null {
  if (review.images.length === 0) {
    return null;
  }

  const names = review.screens.map((screen) => `"${screen.label}"`).join(", ");

  return [
    "<studio-continue>",
    `You finished without a screenshot of ${review.screens.length} screen(s): ${names}. The studio took them at 1440 px and 390 px (attached, one image per size, top of the page).`,
    ...toFailedLines(review.failed),
    "Look at every image. Find what is broken or weak on these screens: overlap, clipped or wrapping labels, crowded buttons, empty areas, missing states.",
    ...(review.findings.length > 0
      ? [
          "render_check findings on these screens:",
          ...review.findings.slice(0, LISTED).map(findingLine),
        ]
      : []),
    "Do one fix loop: fix what you see and these findings with Edit, then run mcp__studio__render_check once. Then reply in one or two sentences with what you fixed and what is left.",
    "</studio-continue>",
  ].join("\n");
}

export function screenReviewNote(
  review: ScreenReview,
  fixLoop: boolean
): string {
  const failed = toFailedNote(review.failed);

  return `Studio screen check: the agent took no screenshot of ${review.screens.length} screen(s) (${review.screens.map((screen) => screen.label).join(", ")}), so the studio took ${review.images.length} image(s) and ${fixLoop ? "one fix loop ran" : "no fix loop ran"}.${failed}`;
}
