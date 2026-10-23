import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { navFindings } from '../src/server/preview/quality';
import { BrowserPool } from '../src/server/preview/browser';
import { ROOT } from './support/server';

const FIXTURE = readFileSync(path.join(ROOT, 'e2e', 'fixtures', 'quality-checks.html'), 'utf8');
const GENERIC = readFileSync(path.join(ROOT, 'e2e', 'fixtures', 'pricing-generic.html'), 'utf8');
const TABLE_FIRST = readFileSync(path.join(ROOT, 'e2e', 'fixtures', 'pricing-table-first.html'), 'utf8');
const TABLE_THEN_CARDS = readFileSync(path.join(ROOT, 'e2e', 'fixtures', 'pricing-table-then-cards.html'), 'utf8');
const DOUBLED = readFileSync(path.join(ROOT, 'e2e', 'fixtures', 'pricing-doubled.html'), 'utf8');
const CTAS = `<!doctype html><html><body><main>
<section><h2>Team</h2><p>For growing teams.</p><a href="/signup?plan=team">Start trial</a></section>
<section><h2>Why Plotline</h2><p>Fast answers.</p><a href="/signup?plan=team">Start trial</a></section>
<section><h2>Ready?</h2><p>Sticky bar.</p><a data-studio-repeat href="/signup?plan=team">Start trial</a></section>
<section><h2>Other</h2><p>Other plan.</p><a href="/signup?plan=pro">Start trial</a></section>
<details><summary>More</summary><a href="/signup?plan=team">Start trial</a></details>
</main></body></html>`;
const RESPONSIVE = readFileSync(path.join(ROOT, 'e2e', 'fixtures', 'pricing-responsive.html'), 'utf8');
const WITH_MENU = FIXTURE.replace('<header>', '<header><button aria-expanded="false" aria-controls="menu" class="big">Menu</button>');

let server: Server;
let pool: BrowserPool;
let base = '';
let outDir = '';

test.beforeAll(async () => {
  server = createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    const pages: Record<string, string> = { '/menu.html': WITH_MENU, '/generic.html': GENERIC, '/table-first.html': TABLE_FIRST, '/table-then-cards.html': TABLE_THEN_CARDS, '/doubled.html': DOUBLED, '/responsive.html': RESPONSIVE, '/ctas.html': CTAS };
    res.end(pages[(req.url ?? '').split('?')[0] ?? ''] ?? FIXTURE);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  pool = new BrowserPool('http://127.0.0.1');
  outDir = mkdtempSync(path.join(os.tmpdir(), 'studio-quality-check-'));
});

test.afterAll(async () => {
  await pool.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  rmSync(outDir, { recursive: true, force: true });
});

const OPTIONS = { viewports: ['desktop', 'tablet', 'mobile'] as const, quality: true, placeholder: 'high' as const };

test('quality checks find contrast, alt, label, tap-target and placeholder problems, with timings', async () => {
  const results = await pool.renderCheck(`${base}/index.html`, outDir, 'q', { ...OPTIONS, viewports: [...OPTIONS.viewports] });
  expect(results.map((result) => result.viewport)).toEqual(['desktop', 'tablet', 'mobile']);
  const desktop = results.find((result) => result.viewport === 'desktop');
  const mobile = results.find((result) => result.viewport === 'mobile');
  const a11y = (desktop?.quality ?? []).filter((finding) => finding.check === 'a11y').map((finding) => finding.message.split(':')[0]);
  expect(a11y).toEqual(expect.arrayContaining(['color-contrast', 'image-alt', 'label']));
  expect(desktop?.quality?.find((finding) => finding.message.startsWith('color-contrast'))?.severity).toBe('high');

  const taps = (mobile?.quality ?? []).filter((finding) => finding.check === 'tap-target');
  expect(taps.find((finding) => finding.selector?.includes('button.tiny'))?.severity).toBe('high');
  expect(taps.some((finding) => finding.selector?.includes('button.extended'))).toBe(false);
  expect(taps.some((finding) => finding.selector?.includes('button.big'))).toBe(false);
  expect(taps.some((finding) => finding.message.includes('"terms"'))).toBe(false);

  const placeholders = (desktop?.quality ?? []).filter((finding) => finding.check === 'placeholder');
  expect(placeholders.find((finding) => finding.selector?.includes('p#draft'))?.severity).toBe('high');
  expect(placeholders.find((finding) => finding.message.includes('Sample data'))?.severity).toBe('low');
  expect(placeholders.find((finding) => finding.selector?.includes('p#mail'))?.severity).toBe('high');
  expect(mobile?.quality?.some((finding) => finding.check === 'placeholder')).toBe(false);

  for (const result of results) expect(result.timingsMs?.total).toBeLessThan(5000);
});

test('the nav rule flags a desktop nav that mobile hides with no menu, and accepts a menu button', async () => {
  const hidden = await pool.renderCheck(`${base}/index.html`, outDir, 'n1', { viewports: ['desktop', 'mobile'], quality: false });
  expect(hidden[0]?.nav?.visibleLinks).toBe(4);
  expect(hidden[1]?.nav).toMatchObject({ visibleLinks: 0, menuControl: false });
  expect(navFindings(hidden)).toMatchObject([{ check: 'nav-mobile', severity: 'high', viewport: 'mobile' }]);

  const menu = await pool.renderCheck(`${base}/menu.html`, outDir, 'n2', { viewports: ['desktop', 'mobile'], quality: false });
  expect(menu[1]?.nav?.menuControl).toBe(true);
  expect(navFindings(menu)).toEqual([]);
});

test('wireframe-style checks skip quality probes', async () => {
  const results = await pool.renderCheck(`${base}/index.html`, outDir, 'w', { viewports: ['desktop', 'mobile'], quality: false, placeholder: 'off' });
  expect(results.every((result) => (result.quality ?? []).length === 0)).toBe(true);
});

test('the generic-layout check names the stock pricing pattern and passes a table-first page', async () => {
  const generic = await pool.renderCheck(`${base}/generic.html`, outDir, 'g1', { viewports: ['desktop', 'mobile'], quality: true });
  const found = (generic[0]?.quality ?? []).filter((finding) => finding.check === 'generic-layout');
  expect(found).toHaveLength(1);
  expect(found[0]).toMatchObject({ severity: 'medium', viewport: 'desktop' });
  expect(found[0]?.message).toContain('three equal plan cards in one row with the middle one filled or raised, then a comparison table, then an FAQ');
  expect((generic[1]?.quality ?? []).some((finding) => finding.check === 'generic-layout')).toBe(false);
  const tableFirst = await pool.renderCheck(`${base}/table-first.html`, outDir, 'g2', { viewports: ['desktop'], quality: true });
  expect((tableFirst[0]?.quality ?? []).some((finding) => finding.check === 'generic-layout')).toBe(false);
  expect(generic[0]?.timingsMs?.total).toBeLessThan(5000);
  const moved = await pool.renderCheck(`${base}/table-then-cards.html`, outDir, 'g3', { viewports: ['desktop'], quality: true });
  expect((moved[0]?.quality ?? []).some((finding) => finding.check === 'generic-layout')).toBe(false);
});

test('duplicate-content flags the prices and plans doubled by run g at desktop, and passes a cards-on-mobile, table-on-desktop page', async () => {
  const doubled = await pool.renderCheck(`${base}/doubled.html`, outDir, 'd1', { viewports: ['desktop', 'mobile'], quality: true });
  const desktop = (doubled[0]?.quality ?? []).filter((finding) => finding.check === 'duplicate-content');
  const texts = desktop.map((finding) => finding.message);
  expect(desktop.every((finding) => finding.severity === 'medium')).toBe(true);
  for (const price of ['$19/mo', '$49/mo', '$129/mo']) expect(texts.some((text) => text.includes(`"${price}" shows 2 times at desktop`))).toBe(true);
  const responsive = await pool.renderCheck(`${base}/responsive.html`, outDir, 'd2', { viewports: ['desktop', 'mobile'], quality: true });
  for (const result of responsive) expect((result.quality ?? []).filter((finding) => finding.check === 'duplicate-content')).toEqual([]);
  const ctas = await pool.renderCheck(`${base}/ctas.html`, outDir, 'd3', { viewports: ['desktop'], quality: true });
  const ctaHits = (ctas[0]?.quality ?? []).filter((finding) => finding.check === 'duplicate-content');
  expect(ctaHits.map((finding) => finding.message)).toEqual([expect.stringContaining('"Start trial" shows 2 times at desktop')]);
});
