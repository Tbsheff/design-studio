import type { Browser, BrowserContext, Page } from 'playwright-core';
import type { RenderClip, RenderErrors } from '../../shared/render-rpc.js';
import { NAVIGATION_TIMEOUT_MS, SETTLE_TIMEOUT_MS, type RenderBackend, type RenderPage } from './render-backend.js';

function isFaviconMiss(url: string): boolean {
  try {
    return new URL(url).pathname === '/favicon.ico';
  } catch {
    return false;
  }
}

const QUIET_MS = 120;
const LONG_REQUEST_MS = 1500;
const STREAM_TYPES = new Set(['eventsource', 'websocket']);

interface NetworkTracker {
  inflight: Map<object, number>;
  lastAt: number;
}

function trackNetwork(page: Page): NetworkTracker {
  const tracker: NetworkTracker = { inflight: new Map(), lastAt: Date.now() };
  const done = (request: object) => {
    tracker.inflight.delete(request);
    tracker.lastAt = Date.now();
  };
  page.on('request', (request) => {
    if (STREAM_TYPES.has(request.resourceType())) return;
    tracker.inflight.set(request, Date.now());
    tracker.lastAt = Date.now();
  });
  page.on('requestfinished', done);
  page.on('requestfailed', done);
  return tracker;
}

function networkBusy(tracker: NetworkTracker, now: number): boolean {
  for (const started of tracker.inflight.values()) if (now - started < LONG_REQUEST_MS) return true;
  return now - tracker.lastAt < QUIET_MS;
}

async function networkQuiet(tracker: NetworkTracker, deadline: number): Promise<void> {
  while (Date.now() < deadline && networkBusy(tracker, Date.now())) await new Promise((resolve) => setTimeout(resolve, 25));
}

function collectErrors(page: Page): RenderErrors {
  const errors: RenderErrors = { consoleErrors: [], pageErrors: [] };
  page.on('console', (message) => {
    if (message.type() !== 'error' || isFaviconMiss(message.location().url)) return;
    errors.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => errors.pageErrors.push(error.stack ?? error.message));
  return errors;
}

const JPEG_QUALITY = 82;

async function clearOrigin(context: BrowserContext, page: Page, url: string): Promise<void> {
  await context.clearCookies().catch(() => undefined);
  if (!/^https?:/.test(url)) return;
  const origin = new URL(url).origin;
  const session = await context.newCDPSession(page).catch(() => null);
  await session?.send('Storage.clearDataForOrigin', { origin, storageTypes: 'local_storage,session_storage,indexeddb,cache_storage,service_workers' }).catch(() => undefined);
  await session?.detach().catch(() => undefined);
}

function wrapPage(context: BrowserContext, page: Page): RenderPage {
  const errors = collectErrors(page);
  const network = trackNetwork(page);
  let nav: { loadMs: number; idleMs: number } | null = null;
  return {
    async reset() {
      await clearOrigin(context, page, page.url());
      await page.goto('about:blank').catch(() => undefined);
    },
    async goto(url) {
      errors.consoleErrors.length = 0;
      errors.pageErrors.length = 0;
      const started = Date.now();
      await page.goto(url, { waitUntil: 'load', timeout: NAVIGATION_TIMEOUT_MS });
      const loaded = Date.now();
      await networkQuiet(network, loaded + SETTLE_TIMEOUT_MS);
      nav = { loadMs: loaded - started, idleMs: Date.now() - loaded };
    },
    lastNav: () => nav,
    evaluate: <T>(expression: string) => page.evaluate<T>(expression),
    async screenshot(outPath: string, clip?: RenderClip) {
      const jpeg = /\.jpe?g$/i.test(outPath);
      await page.screenshot({ path: outPath, fullPage: true, ...(jpeg ? { type: 'jpeg' as const, quality: JPEG_QUALITY } : {}), ...(clip ? { clip } : {}) });
    },
    errors: async () => ({ consoleErrors: [...errors.consoleErrors], pageErrors: [...errors.pageErrors] }),
    close: () => context.close().catch(() => undefined),
  };
}

export function createPlaywrightBackend(): RenderBackend {
  let browserPromise: Promise<Browser> | null = null;
  let closed = false;
  const browser = (): Promise<Browser> => {
    if (closed) return Promise.reject(new Error('Browser pool is closed'));
    if (!browserPromise) {
      const pending: Promise<Browser> = import('playwright-core')
        .then(({ chromium }) => chromium.launch({ channel: 'chrome', headless: true }))
        .then(
          (launched) => {
            launched.on('disconnected', () => {
              if (browserPromise === pending) browserPromise = null;
            });
            return launched;
          },
          (error: unknown) => {
            browserPromise = null;
            throw error;
          },
        );
      browserPromise = pending;
    }
    return browserPromise;
  };
  return {
    name: 'playwright',
    reusablePages: true,
    async open(viewport) {
      const { scale, ...size } = viewport;
      const context = await (await browser()).newContext({ viewport: size, ...(scale && scale !== 1 ? { deviceScaleFactor: scale } : {}) });
      return wrapPage(context, await context.newPage());
    },
    async close() {
      closed = true;
      const pending = browserPromise;
      browserPromise = null;
      const launched = await pending?.catch(() => null);
      await launched?.close().catch(() => undefined);
    },
  };
}
