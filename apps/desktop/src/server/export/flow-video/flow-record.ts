import { mkdir } from "node:fs/promises";
import path from "node:path";

import type { Page } from "playwright-core";

import {
  hideDevChrome,
  waitForPage,
} from "../../preview/page-capture/index.js";
import { startRecording } from "./flow-browser.js";
import type { RecordingSize } from "./flow-browser.js";
import { startCapture } from "./flow-capture.js";
import type { CapturedFrame, FlowCapture } from "./flow-capture.js";
import { setCursor } from "./flow-cursor.js";
import { toFrameUrl } from "./flow-load.js";
import type { FlowFrameInfo, FlowRequest, FlowTarget } from "./flow-load.js";
import { getStartFrame } from "./flow-plan.js";
import type { FlowPlan } from "./flow-plan.js";
import { runWalk } from "./flow-walk.js";
import type { WalkRun, WalkState } from "./flow-walk.js";

interface Recorded {
  readonly frames: readonly CapturedFrame[];
  readonly nativePath: string | null;
  readonly size: RecordingSize;
  readonly state: WalkState;
}

interface RecordJob {
  readonly isNative: boolean;
  readonly plan: FlowPlan;
  readonly request: FlowRequest;
  readonly target: FlowTarget;
  readonly workDir: string;
}

const MAX_VIDEO_HEIGHT = 2160;

const MIN_VIDEO_SIDE = 160;

const CURSOR_START_Y = 0.9;

const EVEN = 2;

const toEven = (value: number): number =>
  Math.max(MIN_VIDEO_SIDE, Math.round(value / EVEN) * EVEN);

const toVideoSize = (frame: FlowFrameInfo, width: number): RecordingSize => {
  const ratio = frame.height / frame.width;
  const scaled = Math.min(width * ratio, MAX_VIDEO_HEIGHT);

  return { height: toEven(scaled), width: toEven(scaled / ratio) };
};

const toNativeDir = (isNative: boolean, dir: string): string | null => {
  if (isNative) {
    return dir;
  }

  return null;
};

const startOrSkip = (job: RecordJob, page: Page): FlowCapture => {
  if (job.isNative) {
    return { stop: () => Promise.resolve([]) };
  }

  return startCapture(page, job.workDir);
};

const runRecording = async (job: RecordJob): Promise<Recorded> => {
  const { plan, request, target } = job;
  const start = getStartFrame(target, plan.startId);
  const size = toVideoSize(start, request.width);
  const videoDir = path.join(job.workDir, "native");

  if (job.isNative) {
    await mkdir(videoDir, { recursive: true });
  }

  const { browser, context } = await startRecording(
    size,
    { height: start.height, width: start.width },
    toNativeDir(job.isNative, videoDir)
  );

  try {
    const page = await context.newPage();
    const at = { x: start.width / EVEN, y: start.height * CURSOR_START_Y };

    await page.goto(toFrameUrl(target.baseUrl, start), { waitUntil: "load" });
    await waitForPage(page);
    await hideDevChrome(page);
    await setCursor(page, { isFirst: true, ...at });

    const capture = startOrSkip(job, page);

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

    const shots = await capture.stop();
    const video = page.video();

    await context.close();

    const nativePath = await video?.path();

    return { frames: shots, nativePath: nativePath ?? null, size, state };
  } finally {
    await browser.close();
  }
};

export { runRecording };

export type { RecordJob, Recorded };
