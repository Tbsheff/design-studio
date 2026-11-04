import type { Browser, BrowserType, Page } from "playwright-core";

import type { Capture, CaptureFailure, CapturedPage } from "./captured.js";
import { collectScript } from "./collect-script.js";
import { PAGE_IMPORT_FONT_FACES_MAX, PAGE_IMPORT_NODES_MAX } from "./deps.js";
import { PageImportError } from "./errors.js";
import { letRun, quietly } from "./quiet.js";
import { createRequestGuard } from "./request-guard.js";
import type { RequestGuard } from "./request-guard.js";

const CHANNELS: readonly (string | null)[] = ["chrome", "msedge", null];

const CHROME_ARGS = [
  "--proxy-server=http://127.0.0.1:9",
  "--proxy-bypass-list=<-loopback>",
  "--disable-features=DnsOverHttps",
];

const LOAD_MS = 8000;

const SETTLE_MS = 1200;

const LAUNCH_MS = 10_000;

const MIN_LEFT_MS = 1000;

const URL_TEXT_MAX = 160;

const ERROR_STATUS = 400;

const SCROLL_SCRIPT =
  "window.scrollTo(0, document.documentElement.scrollHeight); window.scrollTo(0, 0);";

const NO_BROWSER =
  "No Chromium browser was found. Install Google Chrome to import pages.";

interface CaptureInput {
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly selector: string | null;
  readonly allowLoopback: boolean;
  readonly deadline: number;
}

const msLeft = (deadline: number): number =>
  Math.max(MIN_LEFT_MS, deadline - Date.now());

const loadChromium = async (): Promise<BrowserType | null> => {
  try {
    const playwright = await import("playwright-core");

    return playwright.chromium;
  } catch {
    return null;
  }
};

const launchWith = (
  chromium: BrowserType,
  channel: string | null
): Promise<Browser | null> => {
  const options = {
    args: CHROME_ARGS,
    chromiumSandbox: true,
    handleSIGHUP: false,
    handleSIGINT: false,
    handleSIGTERM: false,
    headless: true,
    timeout: LAUNCH_MS,
  };

  if (channel === null) {
    return quietly(chromium.launch(options));
  }

  return quietly(chromium.launch({ ...options, channel }));
};

const launchFrom = async (
  chromium: BrowserType,
  index: number
): Promise<Browser> => {
  if (index >= CHANNELS.length) {
    throw new PageImportError(NO_BROWSER);
  }

  const browser = await launchWith(chromium, CHANNELS[index] ?? null);

  if (browser !== null) {
    return browser;
  }

  return launchFrom(chromium, index + 1);
};

const launchBrowser = async (): Promise<Browser> => {
  const chromium = await loadChromium();

  if (chromium === null) {
    throw new PageImportError(NO_BROWSER);
  }

  return launchFrom(chromium, 0);
};

const isFailure = (
  value: CapturedPage | CaptureFailure
): value is CaptureFailure => !value.ok;

const settle = async (page: Page, deadline: number): Promise<void> => {
  const timeout = Math.min(LOAD_MS, msLeft(deadline));

  await quietly(page.waitForLoadState("load", { timeout }));
  await quietly(page.evaluate(SCROLL_SCRIPT));
  await quietly(page.waitForTimeout(SETTLE_MS));
};

const navigate = async (
  page: Page,
  input: CaptureInput,
  guard: RequestGuard
): Promise<number> => {
  try {
    const response = await page.goto(input.url, {
      timeout: msLeft(input.deadline),
      waitUntil: "domcontentloaded",
    });

    return guard.mainStatus() || (response?.status() ?? 0);
  } catch (error) {
    const refused = guard.refused.find((line) =>
      line.startsWith(input.url.slice(0, URL_TEXT_MAX))
    );

    const [reason] = String(error).split("\n");

    throw new PageImportError(refused ?? `The page did not load: ${reason}`);
  }
};

const readPage = async (
  page: Page,
  input: CaptureInput,
  guard: RequestGuard
): Promise<CapturedPage> => {
  const status = await navigate(page, input, guard);

  if (status >= ERROR_STATUS) {
    throw new PageImportError(`${input.url} answered ${status}.`);
  }

  await settle(page, input.deadline);

  const result = await page.evaluate<CapturedPage | CaptureFailure>(
    collectScript(
      input.selector,
      PAGE_IMPORT_NODES_MAX,
      PAGE_IMPORT_FONT_FACES_MAX
    )
  );

  if (isFailure(result)) {
    throw new PageImportError(result.error);
  }

  return result;
};

const openPage = async (
  browser: Browser,
  input: CaptureInput,
  guard: RequestGuard
): Promise<Page> => {
  const context = await browser.newContext({
    acceptDownloads: false,
    colorScheme: "light",
    javaScriptEnabled: true,
    locale: "en-US",
    permissions: [],
    reducedMotion: "reduce",
    serviceWorkers: "block",
    viewport: { height: input.height, width: input.width },
  });

  await context.route("**/*", (route) => guard.handle(route));
  await context.routeWebSocket(/.*/u, (socket) => {
    letRun(socket.close());
  });

  const page = await context.newPage();

  context.on("page", (other) => {
    if (other !== page) {
      letRun(other.close());
    }
  });
  page.on("dialog", (dialog) => {
    letRun(dialog.dismiss());
  });
  page.on("download", (download) => {
    letRun(download.cancel());
  });

  return page;
};

const capturePage = async (input: CaptureInput): Promise<Capture> => {
  const browser = await launchBrowser();
  const guard = createRequestGuard(input.allowLoopback, input.deadline);

  const killer = setTimeout(
    () => {
      letRun(browser.close());
    },
    msLeft(input.deadline) + MIN_LEFT_MS
  );

  try {
    const page = await openPage(browser, input, guard);
    const captured = await readPage(page, input, guard);

    return { kept: guard.kept, page: captured, refused: guard.refused };
  } finally {
    clearTimeout(killer);
    guard.close();
    await quietly(browser.close());
  }
};

export { capturePage };

export type { CaptureInput };
