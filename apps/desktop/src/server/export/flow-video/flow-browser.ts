import type { Browser, BrowserContext } from "playwright-core";

import { CaptureUnavailableError } from "../../state-styles/index.js";

interface FlowRecording {
  readonly browser: Browser;
  readonly context: BrowserContext;
}

interface RecordingSize {
  readonly height: number;
  readonly width: number;
}

const CHANNELS: readonly (string | null)[] = ["chrome", "msedge", null];

const LAUNCH_MS = 15_000;

const NO_BROWSER =
  "No Chromium browser was found. Install Google Chrome to export a prototype video.";

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

const startRecording = async (
  size: RecordingSize,
  viewport: RecordingSize,
  videoDir: string
): Promise<FlowRecording> => {
  const browser = await startBrowser(0);

  const context = await browser.newContext({
    recordVideo: { dir: videoDir, size },
    viewport,
  });

  return { browser, context };
};

export { startRecording };

export type { FlowRecording, RecordingSize };
