import { mkdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const startersDir = path.join(root, 'src/server/templates/starters');
const outDir = path.join(root, 'src/ui/assets/starters');
const ids = ['landing', 'dashboard', 'mobile-app', 'deck', 'form', 'docs'] as const;

async function main(): Promise<void> {
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const failures: string[] = [];
  try {
    const external: string[] = [];
    const thumbs = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 0.5, reducedMotion: 'reduce' });
    const narrow = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    for (const context of [thumbs, narrow]) {
      await context.route(/^(?!file:|data:|about:)/, (route) => {
        external.push(route.request().url());
        return route.abort();
      });
    }
    for (const id of ids) {
      const url = pathToFileURL(path.join(startersDir, id, 'index.html')).href;
      const page = await thumbs.newPage();
      await page.goto(url, { waitUntil: 'load' });
      const file = path.join(outDir, `${id}.png`);
      await page.screenshot({ path: file, fullPage: false, scale: 'device' });
      await page.close();
      const kb = (statSync(file).size / 1024).toFixed(1);
      const small = await narrow.newPage();
      await small.goto(url, { waitUntil: 'load' });
      const scrollWidth = await small.evaluate(() => document.documentElement.scrollWidth);
      await small.close();
      const fits = scrollWidth <= 390;
      if (!fits) failures.push(`${id}: scrollWidth ${scrollWidth} at 390 px`);
      console.log(`${id}: ${kb} KB thumbnail, scrollWidth at 390 px = ${scrollWidth} ${fits ? 'ok' : 'OVERFLOW'}`);
    }
    if (external.length > 0) failures.push(`external requests: ${external.join(', ')}`);
  } finally {
    await browser.close();
  }
  if (failures.length > 0) {
    console.error(failures.join('\n'));
    process.exitCode = 1;
  }
}

await main();
