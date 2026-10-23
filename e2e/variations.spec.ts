import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { RunSentRecord, RunSummary } from '../src/shared/contracts';
import { chooseRunSetting, closeRunSettings, createProjectViaUi, openHome, openRunSettings, sendPrompt, type StudioApi } from './support/studio';

const SHOTS = process.env.STUDIO_VARIATIONS_SHOTS === '1';
const SHOT_DIR = path.resolve('design-review');
const EDITED_BRIEF = 'Poster bands in yellow and black, condensed caps, giant opening hours, loud and dense.';

function pane(page: Page, label: string) {
  return page.locator('[data-testid="variation-pane"]').filter({ has: page.locator('.variation-pane-title .badge', { hasText: new RegExp(`^${label}$`) }) });
}

function paneFrame(page: Page, label: string) {
  return pane(page, label).frameLocator('iframe.variation-frame.front');
}

async function shot(page: Page, name: string): Promise<void> {
  if (!SHOTS) return;
  for (const size of [{ width: 1440, height: 900 }, { width: 800, height: 934 }]) {
    await page.setViewportSize(size);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SHOT_DIR, `variations-${name}-${size.width}x${size.height}.png`) });
  }
  await page.setViewportSize({ width: 1600, height: 1000 });
}

async function runDetail(api: StudioApi, runId: string): Promise<{ summary: RunSummary; sent: RunSentRecord[] }> {
  return api.call('GET', `/api/runs/${runId}`);
}

test('variations: fan-out, live grid, keep, mix', async ({ page }) => {
  const api = await openHome(page);
  const project = await createProjectViaUi(page, api, 'Spoke and Wheel bike repair', 'html');
  await api.waitForRuns(project.id, 1);
  await api.call('PATCH', `/api/projects/${project.id}/settings`, { maxBudgetUsd: 0.5 });
  await page.reload();

  await chooseRunSetting(page, { radio: '3 variations' });
  await expect(page.getByTestId('run-settings')).toHaveText(/Edit · Prototype · 3 designs/);
  await closeRunSettings(page);
  await sendPrompt(page, 'Landing page for a neighborhood bike repair shop');
  const card = page.getByTestId('variation-brief-card');
  await expect(card.getByRole('heading', { name: 'Directions to try' })).toBeVisible();
  await expect(card.locator('.variation-brief-row:not(.skeleton)')).toHaveCount(3);
  await expect(card.getByTestId('variation-budget')).toContainText('up to $0.50 per run · $1.50 total');
  await card.getByLabel('Direction B brief').fill(EDITED_BRIEF);
  await shot(page, 'brief-card');
  await card.getByRole('button', { name: 'Start 3 variations' }).click();

  const grid = page.getByTestId('variations-grid');
  await expect(grid).toBeVisible();
  await expect(grid.getByTestId('variation-pane')).toHaveCount(3);
  await api.waitForRuns(project.id, 4);
  await expect(grid.getByTestId('variation-status')).toHaveText(['Done', 'Done', 'Done']);

  const latest = await api.project(project.id);
  const group = latest.directions.filter((direction) => direction.variation);
  expect(group.map((direction) => direction.name)).toEqual(['Variation A', 'Variation B', 'Variation C']);
  for (const direction of group) {
    const versions = await api.versions(project.id, direction.id);
    expect(versions.filter((version) => version.meta.kind === 'run')).toHaveLength(1);
  }

  for (const label of ['A', 'B', 'C']) await expect(paneFrame(page, label).locator('body')).toHaveAttribute('data-variation', label);
  const layouts = await Promise.all(['A', 'B', 'C'].map((label) => paneFrame(page, label).locator('body').getAttribute('class')));
  expect(new Set(layouts).size).toBe(3);
  await expect(paneFrame(page, 'B').locator('.variation-brief')).toContainText(EDITED_BRIEF);
  await expect(page.locator('iframe')).toHaveCount(3);
  await shot(page, 'grid');

  const directionA = group[0]!;
  await pane(page, 'B').getByRole('button', { name: 'Select' }).click();
  await paneFrame(page, 'B').locator('aside').click();
  await pane(page, 'B').getByRole('button', { name: 'Use in…' }).click();
  await shot(page, 'mix-menu');
  await pane(page, 'B').getByRole('menuitem', { name: /^A / }).click();
  const runs = await api.waitForRuns(project.id, 5);
  const mixRun = runs.find((run) => run.request.reference);
  expect(mixRun?.directionId).toBe(directionA.id);
  const detail = await runDetail(api, mixRun!.id);
  expect(detail.summary.request.selection).toBeUndefined();
  expect(detail.sent[0]?.text).toContain('<reference-element from="Variation B">');
  expect(detail.sent[0]?.text).toContain('<aside aria-label="Details"><h2>Option B</h2>');
  expect(detail.sent[0]?.text).toMatch(/source snippet:\n<aside/);
  await expect(paneFrame(page, 'A').locator('.mock-mix')).toHaveAttribute('data-from', 'Variation B');
  await expect(page.locator('iframe')).toHaveCount(3);

  const directionC = group[2]!;
  await pane(page, 'C').getByRole('button', { name: 'Keep this one' }).click();
  await expect(grid).toHaveCount(0);
  await expect(page.locator('.topbar')).toContainText('/ Variation C');
  await expect(page.locator(`iframe.frame.front[src*="/${directionC.id}/"]`)).toHaveCount(1);
  await expect(page.getByTestId('variation-kept')).toContainText('Kept Variation C');
  await expect(page.getByTestId('variation-bar')).toContainText('one of 3 variations');
  expect((await api.project(project.id)).directions).toHaveLength(4);

  await page.getByTestId('variation-bar').getByRole('button', { name: 'Show all' }).click();
  await expect(grid.getByTestId('variation-pane')).toHaveCount(3);
  await expect(pane(page, 'C')).toHaveClass(/current/);
});

test('variations: React fan-out caps at 3 and runs one Vite server per direction', async ({ page }) => {
  const api = await openHome(page);
  const project = await createProjectViaUi(page, api, 'Spoke and Wheel React', 'react');
  await api.waitForRuns(project.id, 1, 120_000);
  await openRunSettings(page);
  await expect(page.getByRole('radio', { name: '4 variations' })).toBeDisabled();
  await chooseRunSetting(page, { radio: '3 variations' });
  await closeRunSettings(page);
  await sendPrompt(page, 'Bike repair landing page');
  const card = page.getByTestId('variation-brief-card');
  await expect(card.locator('.variation-brief-row:not(.skeleton)')).toHaveCount(3);
  await card.getByRole('button', { name: 'Start 3 variations' }).click();
  const grid = page.getByTestId('variations-grid');
  await expect(grid.getByTestId('variation-pane')).toHaveCount(3);
  await api.waitForRuns(project.id, 4, 120_000);
  for (const label of ['A', 'B', 'C']) await expect(paneFrame(page, label).locator(`main[data-variation="${label}"]`)).toBeVisible({ timeout: 60_000 });
  const group = (await api.project(project.id)).directions.filter((direction) => direction.variation);
  const ports = await Promise.all(group.map(async (direction) => new URL((await api.preview(project.id, direction.id)).url).port));
  expect(new Set(ports).size).toBe(3);
  await expect(page.locator('iframe')).toHaveCount(3);
});
