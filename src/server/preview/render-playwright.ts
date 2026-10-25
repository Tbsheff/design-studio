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

function collectErrors(page: Page): RenderErrors {
  const errors: RenderErrors = { consoleErrors: [], pageErrors: [] };
  page.on('console', (message) => {
    if (message.type() !== 'error' || isFaviconMiss(message.location().url)) return;
    errors.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => errors.pageErrors.push(error.stack ?? error.message));
  return errors;
}

function wrapPage(context: BrowserContext, page: Page): RenderPage {
  const errors = collectErrors(page);
  return {
    async goto(url) {
      await page.goto(url, { waitUntil: 'load', timeout: NAVIGATION_TIMEOUT_MS });
      await page.waitForLoadState('networkidle', { timeout: SETTLE_TIMEOUT_MS }).catch(() => undefined);
    },
    evaluate: <T>(expression: string) => page.evaluate<T>(expression),
    async screenshot(outPath: string, clip?: RenderClip) {
      await page.screenshot({ path: outPath, fullPage: true, ...(clip ? { clip } : {}) });
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
