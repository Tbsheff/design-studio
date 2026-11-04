import { stat } from "node:fs/promises";
import path from "node:path";

import type { Browser, Page } from "playwright-core";

import { getFfmpeg, startEncoder } from "./animation-ffmpeg.js";
import type { Encoder } from "./animation-ffmpeg.js";
import { CaptureUnavailableError } from "./animation-unavailable.js";
import { BadRequestError, NotFoundError } from "./deps.js";
import { isHtmlFile, isTimelineTrigger, toTimelineMs } from "./engine/index.js";
import type { AnimationModel } from "./engine/index.js";

interface CaptureCommand {
  readonly model: AnimationModel;
  readonly out: string;
  readonly workTree: string;
}

interface CaptureResult {
  readonly bytes: number;
  readonly frames: number;
}

const FPS = 30;

const WIDTH = 1280;

const HEIGHT = 720;

const MAX_MS = 20_000;

const MS_PER_SECOND = 1000;

const LAUNCH_MS = 15_000;

const SETTLE_MS = 60;

const MIN_FRAMES = 2;

const CHANNELS: readonly (string | null)[] = ["chrome", "msedge", null];

const NO_BROWSER =
  "No Chromium browser was found. Install Google Chrome to export webm.";

const NOT_HTML =
  "webm export captures an HTML page. This animation writes to a CSS file, so there is no page to record. Export css or react instead.";

const NO_SCROLL =
  "The page does not scroll, so a scroll timeline has no progress to record. Add content below the fold or use another trigger.";

const startChannel = async (
  channel: string | null
): Promise<Browser | null> => {
  const { chromium } = await import("playwright-core");
  const options = { headless: true, timeout: LAUNCH_MS };

  try {
    if (channel === null) {
      return await chromium.launch(options);
    }

    return await chromium.launch({ ...options, channel });
  } catch {
    return null;
  }
};

const startBrowser = async (index: number): Promise<Browser> => {
  if (index >= CHANNELS.length) {
    throw new CaptureUnavailableError(NO_BROWSER);
  }

  const browser = await startChannel(CHANNELS[index] ?? null);

  if (browser !== null) {
    return browser;
  }

  return await startBrowser(index + 1);
};

const getPageFile = async (command: CaptureCommand): Promise<string> => {
  const { model, workTree } = command;

  if (!isHtmlFile(model.file)) {
    throw new CaptureUnavailableError(NOT_HTML);
  }

  const file = path.join(workTree, model.file);

  try {
    await stat(file);
  } catch {
    throw new NotFoundError(`${model.file} does not exist in this direction.`);
  }

  return file;
};

const setTrigger = async (page: Page, model: AnimationModel): Promise<void> => {
  const selector = model.tracks[0]?.selector ?? "body";

  if (model.trigger === "hover" || model.trigger === "click") {
    await page.hover(selector);
  }

  if (model.trigger === "click") {
    await page.mouse.down();
  }

  await page.waitForTimeout(SETTLE_MS);
};

const setTime = (page: Page, timeMs: number): Promise<void> =>
  page.evaluate((at) => {
    for (const animation of document.getAnimations()) {
      if (animation.timeline === document.timeline) {
        animation.pause();
        animation.currentTime = at;
      }
    }
  }, timeMs);

const setScroll = async (page: Page, progress: number): Promise<void> => {
  await page.evaluate((at) => {
    const room = document.documentElement.scrollHeight - window.innerHeight;

    window.scrollTo(0, Math.round(room * at));
  }, progress);
  await page.waitForTimeout(SETTLE_MS);
};

const getScrollRoom = (page: Page): Promise<number> =>
  page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight
  );

interface FrameRun {
  readonly encoder: Encoder;
  readonly frames: number;
  readonly model: AnimationModel;
  readonly page: Page;
  readonly totalMs: number;
}

const setProgress = async (run: FrameRun, progress: number): Promise<void> => {
  if (isTimelineTrigger(run.model.trigger)) {
    await setScroll(run.page, progress);

    return;
  }

  await setTime(run.page, progress * run.totalMs);
};

const runFrame = async (run: FrameRun, index: number): Promise<void> => {
  if (index >= run.frames) {
    return;
  }

  await setProgress(run, index / (run.frames - 1));
  await run.encoder.push(await run.page.screenshot({ type: "png" }));
  await runFrame(run, index + 1);
};

const runFrames = async (
  page: Page,
  model: AnimationModel,
  encoder: Encoder
): Promise<number> => {
  const totalMs = toTimelineMs(model);

  const frames = Math.max(
    MIN_FRAMES,
    Math.ceil((totalMs / MS_PER_SECOND) * FPS)
  );

  if (isTimelineTrigger(model.trigger) && (await getScrollRoom(page)) <= 0) {
    throw new BadRequestError(NO_SCROLL);
  }

  await runFrame({ encoder, frames, model, page, totalMs }, 0);

  return frames;
};

const runPage = async (
  file: string,
  model: AnimationModel,
  encoder: Encoder
): Promise<number> => {
  const browser = await startBrowser(0);

  try {
    const page = await browser.newPage({
      viewport: { height: HEIGHT, width: WIDTH },
    });

    await page.goto(`file://${file}`, { waitUntil: "load" });
    await setTrigger(page, model);

    return await runFrames(page, model, encoder);
  } finally {
    await browser.close();
  }
};

const runCapture = async (command: CaptureCommand): Promise<CaptureResult> => {
  const { model } = command;
  const file = await getPageFile(command);

  if (toTimelineMs(model) > MAX_MS) {
    throw new BadRequestError(
      `webm export records timelines up to ${MAX_MS / MS_PER_SECOND} seconds. Shorten the duration or the delays.`
    );
  }

  const encoder = await startEncoder(await getFfmpeg(), FPS, command.out);

  try {
    const frames = await runPage(file, model, encoder);

    await encoder.finish();

    const written = await stat(command.out);

    return { bytes: written.size, frames };
  } catch (error) {
    await Promise.allSettled([encoder.finish()]);

    throw error;
  }
};

export { runCapture };

export type { CaptureResult };
