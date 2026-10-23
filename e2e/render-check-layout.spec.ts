import { readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { expect, test } from '@playwright/test';
import { BrowserPool } from '../src/server/preview/browser';
import { wantsElectronRenderer } from './support/render-host';
import { ROOT } from './support/server';

const FIXTURE = readFileSync(path.join(ROOT, 'e2e', 'fixtures', 'layout-clipping.html'), 'utf8');

let server: Server;
let pool: BrowserPool;
let url = '';
let outDir = '';

test.beforeAll(async () => {
  server = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(FIXTURE);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/index.html`;
  pool = new BrowserPool('http://127.0.0.1');
  outDir = mkdtempSync(path.join(os.tmpdir(), 'studio-layout-check-'));
});

test.afterAll(async () => {
  await pool.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  rmSync(outDir, { recursive: true, force: true });
});

test('render_check reports a sideways-scrolling table and a clipped nav at 390px, with selectors and cut items', async () => {
  const results = await pool.renderCheck(url, outDir, 'fixture');
  expect(results.map((result) => result.backend)).toEqual(results.map(() => (wantsElectronRenderer() ? 'electron' : 'playwright')));
  const mobile = results.find((result) => result.viewport === 'mobile');
  const desktop = results.find((result) => result.viewport === 'desktop');
  expect(mobile?.horizontalOverflow).toBe(false);

  const nav = mobile?.layout.find((finding) => finding.selector.includes('nav.site-nav'));
  expect(nav).toMatchObject({ kind: 'clipped', severity: 'error', axis: 'x' });
  expect(nav?.cutItems).toContain('Settings');
  expect(nav?.scrollSize).toBeGreaterThan(nav?.clientSize ?? Infinity);

  const table = mobile?.layout.find((finding) => finding.selector.includes('div.table-wrap'));
  expect(table).toMatchObject({ kind: 'scrolls-sideways', severity: 'warning', axis: 'x' });
  expect(table?.cutItems.length).toBeGreaterThan(0);
  expect(table?.detail).toMatch(/scroll sideways/);

  expect(mobile?.layout.some((finding) => finding.selector.includes('sr-only') || finding.selector.includes('truncate') || finding.selector.includes('offscreen'))).toBe(false);
  expect(mobile?.layout.length).toBeLessThanOrEqual(10);
  expect(desktop?.layout).toEqual([]);
  expect(desktop?.layoutTotal).toBe(0);
});

test('screenshotTiles returns viewport-wide tiles from an offset and reports the page height', async () => {
  const tiles = await pool.screenshotTiles(url, { viewport: { width: 390, height: 844 }, tileHeight: 200, from: 0, maxTiles: 2, outPrefix: path.join(outDir, 'tile') });
  expect(tiles.paths.length).toBeGreaterThan(0);
  expect(tiles.from).toBe(0);
  expect(tiles.to).toBeLessThanOrEqual(tiles.pageHeight);
  const png = readFileSync(tiles.paths[0] ?? '');
  expect(png.readUInt32BE(16)).toBe(390);
});
