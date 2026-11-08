import type { Browser, BrowserType, Page } from "playwright-core";

import {
  createRequestGuard,
  PageImportError,
} from "../../page-import/index.js";
import type { RequestGuard } from "../../page-import/index.js";

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

const ERROR_STATUS = 400;

const VIEWPORT_HEIGHT = 900;

const URL_TEXT_MAX = 160;

const SCROLL_SCRIPT =
  "window.scrollTo(0, document.documentElement.scrollHeight); window.scrollTo(0, 0);";

const NO_BROWSER =
  "No Chromium browser was found. Install Google Chrome to capture patterns.";

interface UrlPageInput {
  readonly allowLoopback: boolean;
  readonly deadline: number;
  readonly url: string;
  readonly width: number;
}

const toMsLeft = (deadline: number): number =>
  Math.max(MIN_LEFT_MS, deadline - Date.now());

const toQuiet = async <Value>(work: Promise<Value>): Promise<Value | null> => {
  try {
    return await work;
  } catch {
    return null;
  }
};

const toLoadChromium = async (): Promise<BrowserType | null> => {
  try {
    const playwright = await import("playwright-core");

    return playwright.chromium;
  } catch {
    return null;
  }
};

const toLaunchWith = (
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
    return toQuiet(chromium.launch(options));
  }

  return toQuiet(chromium.launch({ ...options, channel }));
};

const toLaunchFrom = async (
  chromium: BrowserType,
  index: number
): Promise<Browser> => {
  if (index >= CHANNELS.length) {
    throw new PageImportError(NO_BROWSER);
  }

  const browser = await toLaunchWith(chromium, CHANNELS[index] ?? null);

  if (browser !== null) {
    return browser;
  }

  return toLaunchFrom(chromium, index + 1);
};

const toLaunchBrowser = async (): Promise<Browser> => {
  const chromium = await toLoadChromium();

  if (chromium === null) {
    throw new PageImportError(NO_BROWSER);
  }

  return toLaunchFrom(chromium, 0);
};

const toOpenPage = async (
  browser: Browser,
  input: UrlPageInput,
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
    viewport: { height: VIEWPORT_HEIGHT, width: input.width },
  });

  await context.route("**/*", (route) => guard.handle(route));
  await context.routeWebSocket(/.*/u, (socket) => {
    toQuiet(socket.close());
  });

  const page = await context.newPage();

  page.on("dialog", (dialog) => {
    toQuiet(dialog.dismiss());
  });
  page.on("download", (download) => {
    toQuiet(download.cancel());
  });

  return page;
};

const toNavigate = async (
  page: Page,
  input: UrlPageInput,
  guard: RequestGuard
): Promise<number> => {
  try {
    const response = await page.goto(input.url, {
      timeout: toMsLeft(input.deadline),
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

const toLoadPage = async (
  page: Page,
  input: UrlPageInput,
  guard: RequestGuard
): Promise<void> => {
  const status = await toNavigate(page, input, guard);

  if (status >= ERROR_STATUS) {
    throw new PageImportError(`${input.url} answered ${status}.`);
  }

  const timeout = Math.min(LOAD_MS, toMsLeft(input.deadline));

  await toQuiet(page.waitForLoadState("load", { timeout }));
  await toQuiet(page.evaluate(SCROLL_SCRIPT));
  await toQuiet(page.waitForTimeout(SETTLE_MS));
};

const toWithUrlPage = async <Value>(
  input: UrlPageInput,
  read: (page: Page) => Promise<Value>
): Promise<Value> => {
  const browser = await toLaunchBrowser();
  const guard = createRequestGuard(input.allowLoopback, input.deadline);

  const killer = setTimeout(
    () => {
      toQuiet(browser.close());
    },
    toMsLeft(input.deadline) + MIN_LEFT_MS
  );

  try {
    const page = await toOpenPage(browser, input, guard);

    await toLoadPage(page, input, guard);

    return await read(page);
  } finally {
    clearTimeout(killer);
    guard.close();
    await toQuiet(browser.close());
  }
};

export { toWithUrlPage };

export type { UrlPageInput };
