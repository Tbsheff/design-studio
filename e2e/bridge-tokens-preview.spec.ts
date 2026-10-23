import { copyFile, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { PACK_FILE, TOKEN_PREVIEW_STYLE_ID, TOKENS_FILE } from '../src/shared/contracts';
import { compileTokens, parseTokenFile } from '../src/server/design-system/compile';
import { previewTokens } from '../src/server/design-system/token-preview';
import { loadBridgeScript } from '../src/server/preview/bridge-bundle';

const ORIGIN = 'http://bridge-tokens.localhost:4998';
const TOKEN = 'tokens-preview-token';
const PACK_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'server', 'design-system', '__fixtures__', 'test-pack');
const PAGE = `<!doctype html><html class="page"><head>
<link rel="stylesheet" href="/design-system/tokens.css">
<script src="/__studio/bridge.js"></script>
</head><body>
<button id="cta" style="background-color: var(--primary); border: 2px solid var(--ring); border-radius: var(--radius-md)">Go</button>
</body></html>`;

let workTree = '';

test.beforeAll(async () => {
  workTree = await mkdtemp(path.join(tmpdir(), 'studio-tokens-preview-'));
  await mkdir(path.dirname(path.join(workTree, TOKENS_FILE)), { recursive: true });
  await copyFile(path.join(PACK_DIR, 'tokens.json'), path.join(workTree, TOKENS_FILE));
  await copyFile(path.join(PACK_DIR, 'pack.json'), path.join(workTree, PACK_FILE));
});

test.afterAll(async () => {
  await rm(workTree, { recursive: true, force: true });
});

interface Probe {
  primary: string;
  ring: string;
  radius: string;
  background: string;
  marker: unknown;
  previewLast: boolean;
  previewCount: number;
  theme: string | null;
  className: string | null;
}

async function tokensCss(): Promise<string> {
  const parsed = parseTokenFile(await readFile(path.join(PACK_DIR, 'tokens.json'), 'utf8'));
  if (!parsed.file) throw new Error(parsed.error ?? 'bad fixture');
  return compileTokens(parsed.file).css;
}

async function openPage(page: Page): Promise<void> {
  const [bridge, css] = await Promise.all([loadBridgeScript(), tokensCss()]);
  await page.route(`${ORIGIN}/**`, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/__studio/bridge.js') return route.fulfill({ contentType: 'text/javascript', body: bridge });
    if (url.pathname === '/__studio/changes') return route.fulfill({ contentType: 'application/json', body: '{"changedAt":0}' });
    if (url.pathname === '/design-system/tokens.css') return route.fulfill({ contentType: 'text/css', body: css });
    return route.fulfill({ contentType: 'text/html', body: PAGE });
  });
  await page.goto(`${ORIGIN}/index.html?__studio_token=${TOKEN}&__studio_parent=${encodeURIComponent(ORIGIN)}`);
  await page.waitForFunction(() => (window as unknown as Record<string, unknown>).__studioBridgeStarted === true);
  await page.evaluate(() => {
    (window as unknown as Record<string, unknown>).__tokenMarker = 'kept';
  });
}

async function send(page: Page, message: Record<string, unknown>, token = TOKEN): Promise<void> {
  await page.evaluate(([body, origin]) => window.postMessage(body, origin as string), [{ ns: 'studio', token, ...message }, ORIGIN] as const);
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 30)));
}

function probe(page: Page): Promise<Probe> {
  return page.evaluate((id) => {
    const root = document.documentElement;
    const rootStyle = getComputedStyle(root);
    const preview = document.getElementById(id);
    return {
      primary: rootStyle.getPropertyValue('--primary').trim(),
      ring: rootStyle.getPropertyValue('--ring').trim(),
      radius: rootStyle.getPropertyValue('--radius-md').trim(),
      background: getComputedStyle(document.getElementById('cta') as Element).backgroundColor,
      marker: (window as unknown as Record<string, unknown>).__tokenMarker,
      previewLast: preview !== null && document.head.lastElementChild === preview,
      previewCount: document.querySelectorAll(`#${id}`).length,
      theme: root.getAttribute('data-theme'),
      className: root.getAttribute('class'),
    };
  }, TOKEN_PREVIEW_STYLE_ID);
}

async function previewCss(changes: { path: string; value?: string; darkValue?: string | null }[]): Promise<string> {
  const result = await previewTokens(workTree, { changes });
  expect(result.errors).toEqual([]);
  return result.css;
}

test('tokens-preview overrides token values live and survives head mutations', async ({ page }) => {
  await openPage(page);
  const before = await probe(page);
  expect(before.primary).toBe('oklch(55% 0.2 260)');
  expect(before.ring).toBe(before.primary);
  expect(before.previewCount).toBe(0);

  const css = await previewCss([
    { path: 'color.primary', value: '#ff0000' },
    { path: 'radius.md', value: '13px' },
  ]);
  await send(page, { type: 'tokens-preview', css: 'ignored' }, 'wrong-token');
  expect((await probe(page)).previewCount).toBe(0);

  await send(page, { type: 'tokens-preview', css });
  const during = await probe(page);
  expect(during.marker).toBe('kept');
  expect(during.primary).not.toBe(before.primary);
  expect(during.ring).toBe(during.primary);
  expect(during.radius).toBe('13px');
  expect(during.background).toMatch(/^(rgb\(255, 0, 0\)|oklch\(0\.62)/);
  expect(during.previewLast).toBe(true);

  await page.evaluate(() => {
    const style = document.createElement('style');
    style.setAttribute('data-vite-dev-id', '/src/index.css');
    style.textContent = ':root { --primary: blue; --radius-md: 1px; }';
    document.head.appendChild(style);
  });
  await page.waitForFunction((id) => document.head.lastElementChild?.id === id, TOKEN_PREVIEW_STYLE_ID);
  await page.evaluate((id) => document.getElementById(id)?.remove(), TOKEN_PREVIEW_STYLE_ID);
  await page.waitForFunction((id) => document.head.lastElementChild?.id === id, TOKEN_PREVIEW_STYLE_ID);
  const afterHmr = await probe(page);
  expect(afterHmr).toMatchObject({ previewLast: true, previewCount: 1, radius: '13px', primary: during.primary, marker: 'kept' });

  await page.evaluate(() => document.querySelector('style[data-vite-dev-id]')?.remove());
  await send(page, { type: 'tokens-preview', css: '' });
  const cleared = await probe(page);
  expect(cleared).toMatchObject({ previewCount: 0, primary: before.primary, radius: before.radius, marker: 'kept' });
});

test('set-theme switches dark and light and null restores the original root attributes', async ({ page }) => {
  await openPage(page);
  await send(page, { type: 'set-theme', theme: 'dark' });
  const dark = await probe(page);
  expect(dark).toMatchObject({ theme: 'dark', primary: 'oklch(70% 0.15 260)' });
  expect(dark.className?.split(' ').sort()).toEqual(['dark', 'page']);

  await send(page, { type: 'tokens-preview', css: await previewCss([{ path: 'color.primary', darkValue: '#00ff00' }]) });
  const darkPreview = await probe(page);
  expect(darkPreview.primary).not.toBe(dark.primary);
  expect(darkPreview.ring).toBe(darkPreview.primary);

  await send(page, { type: 'tokens-preview', css: await previewCss([{ path: 'color.primary', darkValue: null }]) });
  expect((await probe(page)).primary).toBe('oklch(55% 0.2 260)');

  await send(page, { type: 'set-theme', theme: 'light' });
  expect(await probe(page)).toMatchObject({ theme: 'light', className: 'page' });

  await send(page, { type: 'tokens-preview', css: '' });
  await page.emulateMedia({ colorScheme: 'dark' });
  expect((await probe(page)).primary).toBe('oklch(55% 0.2 260)');
  await send(page, { type: 'set-theme', theme: null });
  const restored = await probe(page);
  expect(restored).toMatchObject({ theme: null, className: 'page', marker: 'kept' });
  expect(restored.primary).toBe('oklch(70% 0.15 260)');
});
