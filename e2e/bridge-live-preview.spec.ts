import { expect, test, type Page } from '@playwright/test';
import { loadBridgeScript } from '../src/server/preview/bridge-bundle';

const ORIGIN = 'http://bridge-preview.localhost:4999';
const TOKEN = 'live-preview-token';
const PAGE = `<!doctype html><html><head><script src="/__studio/bridge.js"></script></head><body>
<h1 id="title" style="color: green !important; margin: 0 auto">Hello <!-- c --></h1>
<p id="plain">Plain</p>
<div id="parent">Text <b>bold</b></div>
</body></html>`;

async function openBridgePage(page: Page): Promise<void> {
  const bridge = await loadBridgeScript();
  await page.route(`${ORIGIN}/**`, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/__studio/bridge.js') {
      await route.fulfill({ contentType: 'text/javascript', body: bridge });
      return;
    }
    if (url.pathname === '/__studio/changes') {
      await route.fulfill({ contentType: 'application/json', body: '{"changedAt":0}' });
      return;
    }
    await route.fulfill({ contentType: 'text/html', body: PAGE });
  });
  await page.goto(`${ORIGIN}/index.html?__studio_token=${TOKEN}&__studio_parent=${encodeURIComponent(ORIGIN)}`);
  await page.waitForFunction(() => (window as unknown as Record<string, unknown>).__studioBridgeStarted === true);
}

async function send(page: Page, message: Record<string, unknown>, token = TOKEN): Promise<void> {
  await page.evaluate(
    ([body, origin]) => {
      window.postMessage(body, origin as string);
    },
    [{ ns: 'studio', token, ...message }, ORIGIN] as const,
  );
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 20)));
}

function snapshot(page: Page): Promise<{ title: string | null; plain: string | null; titleHtml: string; plainHtml: string; parentHtml: string }> {
  return page.evaluate(() => {
    const byId = (id: string): Element => document.getElementById(id) as Element;
    return {
      title: byId('title').getAttribute('style'),
      plain: byId('plain').getAttribute('style'),
      titleHtml: byId('title').innerHTML,
      plainHtml: byId('plain').innerHTML,
      parentHtml: byId('parent').innerHTML,
    };
  });
}

test('bridge live preview applies style and text and resets them exactly', async ({ page }) => {
  await openBridgePage(page);
  const before = await snapshot(page);

  await send(page, { type: 'preview-style', selector: '#title', style: { color: 'red', 'font-size': '40px', position: 'fixed' } });
  await send(page, { type: 'preview-style', selector: '#plain', style: { 'background-color': 'blue', 'margin-top': null } });
  await send(page, { type: 'preview-style', selector: '#title', style: { color: 'purple' } });
  await send(page, { type: 'preview-text', selector: '#plain', text: 'Live <text>' });
  await send(page, { type: 'preview-text', selector: '#plain', text: 'Live again' });
  await send(page, { type: 'preview-text', selector: '#parent', text: 'nope' });

  const during = await page.evaluate(() => {
    const title = document.getElementById('title') as HTMLElement;
    const plain = document.getElementById('plain') as HTMLElement;
    return {
      color: title.style.getPropertyValue('color'),
      size: title.style.getPropertyValue('font-size'),
      position: title.style.getPropertyValue('position'),
      plainBg: plain.style.getPropertyValue('background-color'),
      plainText: plain.textContent,
      parentHtml: (document.getElementById('parent') as HTMLElement).innerHTML,
    };
  });
  expect(during).toEqual({
    color: 'purple',
    size: '40px',
    position: '',
    plainBg: 'blue',
    plainText: 'Live again',
    parentHtml: before.parentHtml,
  });

  await send(page, { type: 'preview-style', selector: '#plain', style: { color: 'red' } }, 'wrong-token');
  expect((await snapshot(page)).plain).toBe('background-color: blue;');

  await send(page, { type: 'preview-reset' });
  const after = await snapshot(page);
  expect(after.plain).toBeNull();
  expect(after.plainHtml).toBe(before.plainHtml);
  expect(after.titleHtml).toBe(before.titleHtml);
  const titleStyle = await page.evaluate(() => {
    const title = document.getElementById('title') as HTMLElement;
    return { color: title.style.getPropertyValue('color'), priority: title.style.getPropertyPriority('color'), size: title.style.getPropertyValue('font-size'), margin: title.style.getPropertyValue('margin') };
  });
  expect(titleStyle).toEqual({ color: 'green', priority: 'important', size: '', margin: '0px auto' });
});
