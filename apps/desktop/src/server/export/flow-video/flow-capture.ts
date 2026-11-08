import { writeFile } from "node:fs/promises";
import path from "node:path";

import type { CDPSession, Page } from "playwright-core";

interface CapturedFrame {
  readonly atMs: number;
  readonly file: string;
}

interface CapturedVideo {
  readonly endMs: number;
  readonly frames: readonly CapturedFrame[];
}

interface FlowCapture {
  readonly stop: () => Promise<CapturedVideo>;
}

const JPEG_QUALITY = 85;

const PAD_WIDTH = 6;

const SHOT_TIMEOUT_MS = 3000;

const toFramePath = (dir: string, index: number): string =>
  path.join(dir, `f${String(index).padStart(PAD_WIDTH, "0")}.jpg`);

const createFirstFrame = async (
  page: Page,
  dir: string
): Promise<CapturedFrame | null> => {
  try {
    const bytes = await page.screenshot({
      quality: JPEG_QUALITY,
      timeout: SHOT_TIMEOUT_MS,
      type: "jpeg",
    });

    const file = toFramePath(dir, 0);

    await writeFile(file, bytes);

    return { atMs: 0, file };
  } catch {
    return null;
  }
};

const stopSession = async (session: CDPSession): Promise<boolean> => {
  try {
    await session.send("Page.stopScreencast");

    return true;
  } catch {
    return false;
  }
};

const runAck = async (
  session: CDPSession,
  sessionId: number
): Promise<boolean> => {
  try {
    await session.send("Page.screencastFrameAck", { sessionId });

    return true;
  } catch {
    return false;
  }
};

const startCapture = async (
  source: Page,
  dir: string
): Promise<FlowCapture> => {
  const frames: CapturedFrame[] = [];
  const writes: Promise<unknown>[] = [];
  const startedAt = Date.now();
  const first = await createFirstFrame(source, dir);

  if (first !== null) {
    frames.push(first);
  }

  const session = await source.context().newCDPSession(source);

  session.on("Page.screencastFrame", (event) => {
    const file = toFramePath(dir, frames.length);

    frames.push({ atMs: Date.now() - startedAt, file });
    writes.push(
      writeFile(file, Buffer.from(event.data, "base64")),
      runAck(session, event.sessionId)
    );
  });

  await session.send("Page.startScreencast", {
    everyNthFrame: 1,
    format: "jpeg",
    quality: JPEG_QUALITY,
  });

  const stop = async (): Promise<CapturedVideo> => {
    const endMs = Date.now() - startedAt;

    await stopSession(session);
    await Promise.all(writes);

    return { endMs, frames };
  };

  return { stop };
};

export { startCapture };

export type { CapturedFrame, CapturedVideo, FlowCapture };
