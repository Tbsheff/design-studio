import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { Project } from '../src/shared/contracts';
import { ROOT } from './support/server';
import { type StudioApi, mainDirection, openHome, showVersions } from './support/studio';

const PROMPT = 'A landing page for a small independent bookshop: hero, featured books, events calendar, newsletter signup';
const SHORT = 'A landing page for a small independent bookshop';
const REVIEW_DIR = path.join(ROOT, 'design-review');
const SIZES = [
  [1440, 900],
  [800, 934],
] as const;

async function seed(page: Page, api: StudioApi): Promise<Project> {
  const { project } = await api.call<{ project: Project }>('POST', '/api/projects', { prompt: PROMPT, kind: 'html', packId: 'editorial' });
  await api.waitForRuns(project.id, 1);
  const base = `/api/projects/${project.id}/d/${mainDirection(project).id}`;
  await api.call('PUT', `/api/projects/${project.id}/design-md`, { content: '# Bookshop\n\nWarm editorial tone.\n' });
  await api.call('POST', `${base}/undo`);
  await api.call('POST', `${base}/design-system/tokens/update`, { changes: [{ path: 'color.primary', value: '#7a3b1f' }] });
  await api.call('POST', `${base}/undo`);
  await page.evaluate((id) => localStorage.setItem('design-studio.ui.v1', JSON.stringify({ activeProjectId: id })), project.id);
  await page.reload();
  await expect(page.locator('.topbar')).toBeVisible();
  return project;
}

test('versions tab: readable titles, keyboard detail, tab choice persists', async ({ page }) => {
  const api = await openHome(page);
  const project = await seed(page, api);
  await expect(page.locator('.panel.left, .left-toggle')).toHaveCount(0);
  await expect.poll(async () => (await page.getByRole('tab').allTextContents()).filter((name) => name !== 'Comments')).toEqual(['Chat', 'Design', 'Tweaks', 'Tokens', 'Components', 'Versions']);
  await showVersions(page);

  const titles = page.locator('li.version .version-toggle');
  await expect(titles).toHaveCount(6);
  await expect(titles).toHaveText([`Back to ${SHORT}`, 'Update tokens: --primary', `Back to ${SHORT}`, 'Update DESIGN.md', SHORT, 'Apply Editorial design system']);
  await expect(page.locator('li.version .version-kind')).toHaveText(['Undo', 'Tokens', 'Undo', 'DESIGN.md', 'Run', 'Start']);
  const listed = await api.versions(project.id, mainDirection(project).id);
  expect(listed.every((version) => !version.title.includes('"'))).toBe(true);

  await page.mouse.move(0, 0);
  for (const [width, height] of SIZES) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(REVIEW_DIR, `versions-after-${width}x${height}.png`) });
  }
  await page.setViewportSize({ width: 1440, height: 900 });

  const runRow = page.locator('li.version').filter({ has: page.locator('.version-kind', { hasText: 'Run' }) });
  await runRow.locator('.version-toggle').focus();
  await page.keyboard.press('Enter');
  await expect(runRow.locator('.version-toggle')).toHaveAttribute('aria-expanded', 'true');
  await expect(runRow.locator('.version-prompt')).toHaveText(PROMPT);
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(runRow.locator('.version-toggle')).toBeFocused();
  await runRow.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(REVIEW_DIR, 'versions-after-focus-title-1440x900.png') });
  await page.keyboard.press('Tab');
  await expect(runRow.getByRole('button', { name: 'Open' })).toBeFocused();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(REVIEW_DIR, 'versions-after-focus-action-1440x900.png') });
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Enter');
  await expect(runRow.locator('.version-detail')).toHaveCount(0);

  const head = page.locator('li.version.head');
  await head.locator('.version-toggle').click();
  await expect(head.locator('.version-detail')).toContainText('Undid');
  await expect(head.locator('.version-detail')).toContainText(`Back to${SHORT}`);
  await page.mouse.move(0, 0);
  await head.evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(REVIEW_DIR, 'versions-after-undo-detail-1440x900.png') });

  await page.reload();
  await expect(page.getByRole('tab', { name: 'Versions' })).toHaveAttribute('aria-selected', 'true');
});
