import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { planTiles, type TileRequest } from '../preview/browser.js';
import type { AgentRunContext } from '../types.js';
import { createFakePreview, createTempProject } from './test-fakes.js';
import { resolveRunConfig } from '../../shared/run-levels.js';
import type { RunToolState } from './check-tool.js';
import { describeTiles, runRenderCheck, takeScreenshot, type StudioToolDeps } from './tools.js';

const roots: string[] = [];
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

afterEach(async () => {
  while (roots.length) await rm(roots.pop() as string, { recursive: true, force: true });
});

async function deps(requests: TileRequest[]): Promise<StudioToolDeps> {
  const temp = await createTempProject('html');
  roots.push(temp.root);
  const preview = createFakePreview();
  preview.screenshotTiles = async (_url, request) => {
    requests.push(request);
    const paths = [`${request.outPrefix}-1.png`, `${request.outPrefix}-2.png`];
    await mkdir(path.dirname(request.outPrefix), { recursive: true });
    for (const file of paths) await writeFile(file, PNG);
    return { paths, pageHeight: 5000, from: request.from, to: request.from + 2 * request.tileHeight };
  };
  const ctx: AgentRunContext = {
    project: temp.project,
    direction: temp.direction,
    request: { prompt: 'x', mode: 'edit' },
    attachments: [],
    designMd: null,
    previewUrl: 'http://preview.test/index.html',
  };
  return { preview, ctx, runsDir: path.join(temp.root, 'runs'), runId: 'r1' };
}

describe('screenshot tool', () => {
  it('returns MCP image blocks the model can see, at the 390px mobile size, from an offset', async () => {
    const requests: TileRequest[] = [];
    const d = await deps(requests);
    const result = await takeScreenshot(d, { shots: 0, checks: 0, mobileShots: 1 }, { viewport: 'mobile', from: 1200 });
    const [first, second, text] = result.content;
    expect(first).toEqual({ type: 'image', data: PNG.toString('base64'), mimeType: 'image/png' });
    expect(second?.type).toBe('image');
    expect(text).toMatchObject({ type: 'text' });
    expect((text as { text: string }).text).toContain('call screenshot again with from=4320');
    expect(requests[0]).toMatchObject({ viewport: { width: 390, height: 844 }, tileHeight: 1560, maxTiles: 4, from: 1200 });
    expect(requests[0]?.outPrefix).toBe(path.join(d.runsDir, 'r1-shot-1-mobile'));
  });

  it('starts the first mobile screenshot of a run at the top', async () => {
    const requests: TileRequest[] = [];
    const d = await deps(requests);
    const counters = { shots: 0, checks: 0 };
    const first = await takeScreenshot(d, counters, { viewport: 'mobile', from: 1500 });
    await takeScreenshot(d, counters, { viewport: 'mobile', from: 1500 });
    expect(requests.map((request) => request.from)).toEqual([0, 1500]);
    expect((first.content.at(-1) as { text: string }).text).toContain('always starts at the top');
  });

  it('says so when there is no preview', async () => {
    const d = await deps([]);
    const result = await takeScreenshot({ ...d, ctx: { ...d.ctx, previewUrl: null } }, { shots: 0, checks: 0 }, { viewport: 'desktop', from: 0 });
    expect(result).toMatchObject({ isError: true });
  });
});

describe('render_check tool', () => {
  it('saves each result next to the run log so findings can be read later', async () => {
    const d = await deps([]);
    const counters = { shots: 0, checks: 0 };
    await runRenderCheck(d, counters);
    await runRenderCheck(d, counters);
    const saved = JSON.parse(await readFile(path.join(d.runsDir, 'r1-check-2.json'), 'utf8'));
    expect(saved).toHaveLength(2);
    expect(saved[0]).toMatchObject({ viewport: 'desktop', layout: [], layoutTotal: 0 });
  });
});

describe('render_check quality report', () => {
  it('passes the level options, adds the nav rule, caps findings and reports timings and budget', async () => {
    const d = await deps([]);
    const seen: unknown[] = [];
    d.preview.renderCheck = async (_project, _direction, options) => {
      seen.push(options);
      const base = { width: 1440, height: 900, ok: true, consoleErrors: [], pageErrors: [], horizontalOverflow: false, layout: [], layoutTotal: 0, screenshotPath: '' };
      return [
        { ...base, viewport: 'desktop', nav: { navs: 1, totalLinks: 4, visibleLinks: 4, menuControl: false }, quality: [{ check: 'a11y', severity: 'high', viewport: 'desktop', selector: 'p', source: null, message: 'color-contrast' }] },
        { ...base, viewport: 'mobile', width: 390, nav: { navs: 1, totalLinks: 4, visibleLinks: 0, menuControl: false }, quality: [] },
      ];
    };
    const config = resolveRunConfig({ ...d.ctx.project.settings, maxBudgetUsd: 1.5 }, 'polish');
    const run: RunToolState = { config, spentUsd: () => 1.2, criticCostUsd: 0.1, criticCalls: 0, lastFindings: [], lastChecks: [], baseline: null };
    const result = await runRenderCheck({ ...d, run }, { shots: 0, checks: 0 });
    const text = (result.content[0] as { text: string }).text;
    expect(seen[0]).toMatchObject({ viewports: ['desktop', 'tablet', 'mobile'], quality: true, placeholder: 'high' });
    const body = JSON.parse(text.slice(0, text.lastIndexOf('}') + 1));
    expect(body.counts).toEqual({ high: 2, medium: 0, low: 0 });
    expect(body.quality.map((finding: { check: string }) => finding.check).sort()).toEqual(['a11y', 'nav-mobile']);
    expect(body.timingsMs.total).toBeGreaterThanOrEqual(0);
    expect(text).toContain('Budget: about $1.30 of $1.50 used, 13% left.');
    const unlimited = await runRenderCheck({ ...d, run: { ...run, config: resolveRunConfig(d.ctx.project.settings, 'polish') } }, { shots: 0, checks: 0 });
    expect((unlimited.content[0] as { text: string }).text).not.toMatch(/Budget|\nnull/);
    expect(run.lastFindings).toHaveLength(2);
    expect(text).toContain('Required next: call mcp__studio__screenshot with viewport mobile from=0');
    run.shots = 2;
    const again = await runRenderCheck({ ...d, run }, { shots: 2, checks: 1 });
    expect((again.content[0] as { text: string }).text).toContain('Required next: call mcp__studio__design_review');
    run.criticCalls = 1;
    const last = await runRenderCheck({ ...d, run }, { shots: 2, checks: 2 });
    expect((last.content[0] as { text: string }).text).not.toContain('Required next');
  });
});

describe('render_check in wireframe runs', () => {
  it('runs the nav-mobile check without the other quality checks', async () => {
    const d = await deps([]);
    const seen: unknown[] = [];
    d.preview.renderCheck = async (_project, _direction, options) => {
      seen.push(options);
      const base = { width: 1440, height: 900, ok: true, consoleErrors: [], pageErrors: [], horizontalOverflow: false, layout: [], layoutTotal: 0, screenshotPath: '' };
      return [
        { ...base, viewport: 'desktop', nav: { navs: 1, totalLinks: 3, visibleLinks: 3, menuControl: false } },
        { ...base, viewport: 'mobile', width: 390, nav: { navs: 1, totalLinks: 3, visibleLinks: 0, menuControl: false } },
      ];
    };
    const config = resolveRunConfig(d.ctx.project.settings, 'wireframe');
    const run: RunToolState = { config, spentUsd: () => 0, criticCostUsd: 0, criticCalls: 0, lastFindings: [], lastChecks: [], baseline: null };
    const result = await runRenderCheck({ ...d, run }, { shots: 0, checks: 0 });
    const text = (result.content[0] as { text: string }).text;
    expect(seen[0]).toMatchObject({ quality: false, placeholder: 'off' });
    expect(run.lastFindings.map((finding) => [finding.check, finding.severity])).toEqual([['nav-mobile', 'high']]);
    expect(text).not.toContain('Required next');
  });
});

describe('tiles', () => {
  it('plans tiles from an offset and stops at the page end or the tile cap', () => {
    expect(planTiles(2000, 900, 0, 4)).toEqual([
      { y: 0, height: 900 },
      { y: 900, height: 900 },
      { y: 1800, height: 200 },
    ]);
    expect(planTiles(10000, 900, 1000, 2)).toEqual([
      { y: 1000, height: 900 },
      { y: 1900, height: 900 },
    ]);
    expect(planTiles(500, 900, 9000, 4)).toEqual([{ y: 499, height: 1 }]);
  });

  it('describes the end of the page', () => {
    expect(describeTiles('desktop', { paths: ['a'], pageHeight: 700, from: 0, to: 700 })).toBe('desktop 1440x900: 1 image(s) cover y=0-700px of a 700px page. This is the end of the page.');
  });
});
