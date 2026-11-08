import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { FlowVideoResult } from "@design-studio/actions/canvas/schema";

import { BadRequestError, NotFoundError } from "../../platform/errors/index.js";
import {
  waitForPage,
  hideDevChrome,
} from "../../preview/page-capture/index.js";
import {
  CaptureUnavailableError,
  getFfmpeg,
} from "../../state-styles/index.js";
import type { ExportRuntime } from "../export-core.js";
import {
  toCandidateLinks,
  toExplicitPath,
  toStartFrameId,
} from "./engine/index.js";
import type { FlowLink } from "./engine/index.js";
import { startRecording } from "./flow-browser.js";
import type { RecordingSize } from "./flow-browser.js";
import { runConversion } from "./flow-convert.js";
import { setCursor } from "./flow-cursor.js";
import { getFlowTarget, toFrameUrl } from "./flow-load.js";
import type { FlowFrameInfo, FlowRequest, FlowTarget } from "./flow-load.js";
import { runWalk } from "./flow-walk.js";
import type { WalkRun, WalkState } from "./flow-walk.js";

const MEDIA_TYPES = {
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
} as const;

const HASH_CHARS = 12;

const MAX_VIDEO_HEIGHT = 2160;

const MIN_VIDEO_SIDE = 160;

const CURSOR_START_Y = 0.9;

const EVEN = 2;

const NO_LINKS =
  "No saved link with a click can leave the start frame. Add one with create_link.";

const NO_CLICK =
  "No link from the start frame could be clicked. The linked elements are not on the page.";

interface FlowPlan {
  readonly explicit: readonly FlowLink[] | null;
  readonly startId: string;
}

const toEven = (value: number): number =>
  Math.max(MIN_VIDEO_SIDE, Math.round(value / EVEN) * EVEN);

const toVideoSize = (frame: FlowFrameInfo, width: number): RecordingSize => {
  const ratio = frame.height / frame.width;
  const scaled = Math.min(width * ratio, MAX_VIDEO_HEIGHT);

  return { height: toEven(scaled), width: toEven(scaled / ratio) };
};

const toInputHash = (request: FlowRequest): string =>
  createHash("sha256")
    .update(
      JSON.stringify({
        directionId: request.directionId,
        format: request.format,
        linkIds: request.linkIds,
        maxSteps: request.maxSteps,
        projectId: request.projectId,
        startFrameId: request.startFrameId,
        stepMs: request.stepMs,
        width: request.width,
      })
    )
    .digest("hex")
    .slice(0, HASH_CHARS);

const getExplicitPlan = (
  target: FlowTarget,
  request: FlowRequest,
  linkIds: readonly string[]
): FlowPlan => {
  const result = toExplicitPath(target.links, target.frames, linkIds);

  if (!result.isOk) {
    throw new NotFoundError(
      `Link ${result.linkId} cannot be followed (${result.code}).`
    );
  }

  const first = result.links.at(0) ?? null;
  const startId = request.startFrameId ?? first?.fromFrame ?? null;

  if (startId === null || first === null || first.fromFrame !== startId) {
    throw new BadRequestError(NO_LINKS);
  }

  return { explicit: result.links, startId };
};

const getPlan = (target: FlowTarget, request: FlowRequest): FlowPlan => {
  if (request.linkIds !== null && request.linkIds.length > 0) {
    return getExplicitPlan(target, request, request.linkIds);
  }

  const startId = toStartFrameId(
    target.frames,
    target.document,
    request.startFrameId
  );

  if (startId === null) {
    throw new NotFoundError(
      `Frame ${request.startFrameId ?? ""} was not found.`
    );
  }

  const first = toCandidateLinks(target.links, startId, new Set([startId]));

  if (first.length === 0) {
    throw new BadRequestError(NO_LINKS);
  }

  return { explicit: null, startId };
};

const getStartFrame = (target: FlowTarget, startId: string): FlowFrameInfo => {
  const frame = target.frames.find((item) => item.id === startId) ?? null;

  if (frame === null) {
    throw new NotFoundError(`Frame ${startId} was not found.`);
  }

  return frame;
};

const runRecording = async (
  target: FlowTarget,
  request: FlowRequest,
  plan: FlowPlan,
  videoDir: string
): Promise<{ readonly state: WalkState; readonly videoPath: string }> => {
  const start = getStartFrame(target, plan.startId);

  const { browser, context } = await startRecording(
    toVideoSize(start, request.width),
    { height: start.height, width: start.width },
    videoDir
  );

  try {
    const page = await context.newPage();
    const at = { x: start.width / EVEN, y: start.height * CURSOR_START_Y };

    await page.goto(toFrameUrl(target.baseUrl, start), { waitUntil: "load" });
    await waitForPage(page);
    await hideDevChrome(page);
    await setCursor(page, { isFirst: true, ...at });
    await page.waitForTimeout(request.stepMs);

    const run: WalkRun = { explicit: plan.explicit, page, request, target };

    const state = await runWalk(run, {
      broken: [],
      context: page.mainFrame(),
      cursor: at,
      frameId: start.id,
      steps: [
        { atMs: 0, frameId: start.id, index: 0, linkId: null, selector: null },
      ],
      visited: new Set([start.id]),
    });

    const video = page.video();

    await context.close();

    const videoPath = await video?.path();

    return { state, videoPath: videoPath ?? "" };
  } finally {
    await browser.close();
  }
};

const runOutput = async (
  format: FlowRequest["format"],
  recorded: string,
  out: string
): Promise<void> => {
  if (format === "webm") {
    await copyFile(recorded, out);

    return;
  }

  await runConversion(format, recorded, out);
};

const createOutput = async (
  target: FlowTarget,
  request: FlowRequest,
  recorded: string
): Promise<{ readonly bytes: number; readonly out: string }> => {
  const folder = path.join(target.projectDir, "studio", "exports");

  await mkdir(folder, { recursive: true });

  const out = path.join(
    folder,
    `flow-${toInputHash(request)}.${request.format}`
  );

  await runOutput(request.format, recorded, out);

  const written = await stat(out);

  return { bytes: written.size, out };
};

const runFlowVideo = async (
  runtime: ExportRuntime,
  request: FlowRequest
): Promise<FlowVideoResult> => {
  const target = await getFlowTarget(runtime, request);
  const plan = getPlan(target, request);

  if (request.format !== "webm") {
    await getFfmpeg();
  }

  const videoDir = await mkdtemp(path.join(os.tmpdir(), "studio-flow-"));

  try {
    const { state, videoPath } = await runRecording(
      target,
      request,
      plan,
      videoDir
    );

    if (state.steps.length < EVEN) {
      throw new BadRequestError(NO_CLICK);
    }

    if (videoPath === "") {
      throw new CaptureUnavailableError("The browser did not write a video.");
    }

    const written = await createOutput(target, request, videoPath);

    return {
      brokenLinks: state.broken,
      bytes: written.bytes,
      durationMs: state.steps.length * request.stepMs,
      mediaType: MEDIA_TYPES[request.format],
      path: written.out,
      steps: state.steps,
    };
  } finally {
    await rm(videoDir, { force: true, recursive: true });
  }
};

export { runFlowVideo };
