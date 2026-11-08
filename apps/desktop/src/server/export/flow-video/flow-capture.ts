import { writeFile } from "node:fs/promises";
import path from "node:path";

import type { Page } from "playwright-core";

interface CapturedFrame {
  readonly atMs: number;
  readonly file: string;
}

interface FlowCapture {
  readonly stop: () => Promise<readonly CapturedFrame[]>;
}

interface CaptureLoop {
  readonly dir: string;
  readonly frames: CapturedFrame[];
  readonly isStopped: () => boolean;
  readonly page: Page;
  readonly startedAt: number;
}

const JPEG_QUALITY = 85;

const PAD_WIDTH = 6;

const SHOT_TIMEOUT_MS = 3000;

const createShot = async (page: Page): Promise<Buffer | null> => {
  try {
    return await page.screenshot({
      quality: JPEG_QUALITY,
      timeout: SHOT_TIMEOUT_MS,
      type: "jpeg",
    });
  } catch {
    return null;
  }
};

const runCaptureLoop = async (loop: CaptureLoop): Promise<void> => {
  if (loop.isStopped()) {
    return;
  }

  const atMs = Date.now() - loop.startedAt;
  const bytes = await createShot(loop.page);

  if (bytes !== null) {
    const name = `f${String(loop.frames.length).padStart(PAD_WIDTH, "0")}.jpg`;
    const file = path.join(loop.dir, name);

    await writeFile(file, bytes);
    loop.frames.push({ atMs, file });
  }

  await runCaptureLoop(loop);
};

const startCapture = (source: Page, dir: string): FlowCapture => {
  const frames: CapturedFrame[] = [];
  const control = { isStopped: false };

  const loop = runCaptureLoop({
    dir,
    frames,
    isStopped: () => control.isStopped,
    page: source,
    startedAt: Date.now(),
  });

  const stop = async (): Promise<readonly CapturedFrame[]> => {
    control.isStopped = true;
    await loop;

    return frames;
  };

  return { stop };
};

export { startCapture };

export type { CapturedFrame, FlowCapture };
