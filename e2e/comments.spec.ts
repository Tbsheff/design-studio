import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';
import type { DesignComment, Project } from '../src/shared/contracts';
import { ROOT } from './support/server';
import { createProjectViaUi, frontFrame, headVersion, mainDirection, openHome, setSelectMode, type StudioApi } from './support/studio';

const REVIEW_DIR = path.join(ROOT, 'design-review');
const SIZES = [
  [1440, 900],
  [800, 934],
] as const;

function comments(api: StudioApi, project: Project): Promise<DesignComment[]> {
  return api.call('GET', `/api/projects/${project.id}/d/${mainDirection(project).id}/comments`);
}

async function statuses(api: StudioApi, project: Project): Promise<string[]> {
  return (await comments(api, project)).map((comment) => comment.status);
}

async function setCommentMode(page: Page, on: boolean): Promise<void> {
  const button = page.getByRole('button', { name: 'Comment', exact: true });
  if ((await button.getAttribute('aria-pressed')) !== String(on)) await page.keyboard.press('c');
  await expect(button).toHaveAttribute('aria-pressed', String(on));
}

async function pinComment(page: Page, selector: string, text: string, key: 'Enter' | 'ControlOrMeta+Enter' = 'Enter'): Promise<void> {
  await setCommentMode(page, true);
  await frontFrame(page).locator(selector).first().click();
  const pop = page.getByTestId('comment-compose');
  await expect(pop).toBeVisible();
  const input = pop.getByRole('textbox', { name: 'Comment' });
  await expect(input).toBeFocused();
  await input.fill(text);
  await input.press(key);
  await expect(pop).toHaveCount(0);
}

function pin(page: Page, n: number): Locator {
  return page.locator('[data-testid="comment-pin"]', { hasText: new RegExp(`^${n}$`) });
}

async function expectPinOn(page: Page, n: number, selector: string): Promise<void> {
  await expect
    .poll(async () => {
      const box = await pin(page, n).boundingBox();
      const target = await frontFrame(page).locator(selector).first().boundingBox();
      if (!box || !target) return Number.POSITIVE_INFINITY;
      return Math.max(Math.abs(box.x + box.width + 4 - target.x), Math.abs(box.y - target.y));
    })
    .toBeLessThan(3);
}

async function shoot(page: Page, name: string): Promise<void> {
  mkdirSync(REVIEW_DIR, { recursive: true });
  for (const [width, height] of SIZES) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(REVIEW_DIR, `comments-${name}-${width}x${height}.png`) });
  }
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.waitForTimeout(200);
}

async function newProject(page: Page, name: string): Promise<{ api: StudioApi; project: Project; indexFile: string }> {
  const api = await openHome(page);
  const project = await createProjectViaUi(page, api, name, 'html');
  await expect(frontFrame(page).locator('h1')).toHaveText(name);
  await api.waitForRuns(project.id, 1);
  return { api, project, indexFile: path.join(mainDirection(project).workTree, 'index.html') };
}

test('Comments: queue two pins, survive reload and zoom, send in one run', async ({ page }) => {
  const { api, project, indexFile } = await newProject(page, 'Harbor Comments');

  await pinComment(page, 'h1', 'Welcome to Harbor');
  await expect(pin(page, 1)).toBeVisible();
  await setCommentMode(page, true);
  await frontFrame(page).locator('.lede').click();
  await expect(page.getByTestId('comment-compose')).toBeVisible();
  await page.getByTestId('comment-compose').getByRole('textbox').fill('Harbor keeps your team in sync.');
  await shoot(page, 'popover');
  await page
    .getByTestId('comment-compose')
    .getByRole('button', { name: /Add to queue/ })
    .click();
  await expect(pin(page, 2)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Comment', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Comment', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: /^Select/ })).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Comment', exact: true })).toHaveAttribute('aria-pressed', 'false');

  expect(await statuses(api, project)).toEqual(['queued', 'queued']);
  await expect(page.getByTestId('comments-badge')).toHaveText('2');
  await expect(pin(page, 1)).toHaveAccessibleName('Comment 1: Welcome to Harbor');
  await expectPinOn(page, 1, 'h1');
  await expectPinOn(page, 2, '.lede');

  await pin(page, 1).click();
  const opened = page.getByTestId('comment-open');
  await expect(opened.getByRole('button', { name: 'Close comment' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(opened).toHaveCount(0);
  await expect(pin(page, 1)).toBeFocused();
  await pin(page, 1).hover();
  await expect(page.getByRole('tooltip', { name: 'Welcome to Harbor' })).toBeVisible();
  await shoot(page, 'pins');

  const before = readFileSync(indexFile, 'utf8');
  writeFileSync(indexFile, before.replace('<main>', '<main>\n    <p class="eyebrow">New this week</p>'));
  await expect(frontFrame(page).locator('.eyebrow')).toBeVisible();
  await expectPinOn(page, 1, 'h1');
  await expectPinOn(page, 2, '.lede');
  await expect.poll(async () => (await comments(api, project))[1]?.target.selector).toContain('nth-of-type(2)');
  expect(await statuses(api, project)).toEqual(['queued', 'queued']);

  await page.getByRole('button', { name: 'Zoom in' }).click();
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expectPinOn(page, 1, 'h1');
  await expectPinOn(page, 2, '.lede');
  await page.getByRole('combobox', { name: 'Zoom', exact: true }).selectOption('fit');

  await page.getByRole('tab', { name: 'Comments' }).click();
  await expect(page.getByTestId('comments-panel').getByTestId('comment-row')).toHaveCount(2);
  await shoot(page, 'tab-queued');
  const runsBefore = (await api.runs(project.id)).length;
  await page.getByRole('button', { name: 'Send 2 queued' }).click();
  await expect.poll(() => statuses(api, project), { timeout: 30_000 }).toEqual(['resolved', 'resolved']);
  const runs = await api.runs(project.id);
  expect(runs.length).toBe(runsBefore + 1);
  const run = runs.find((candidate) => candidate.request.comments?.length === 2);
  expect(run?.status).toBe('completed');
  expect(run?.finalText).toBe('Done: #1, #2.');
  await expect(frontFrame(page).locator('h1')).toHaveText('Welcome to Harbor');
  await expect(frontFrame(page).locator('.lede')).toHaveText('Harbor keeps your team in sync.');
  const head = await headVersion(api, project.id, mainDirection(project).id);
  expect((await comments(api, project)).map((comment) => comment.versionId)).toEqual([head.id, head.id]);
  expect(head.meta.runId).toBe(run?.id);
  await expect(page.locator('[data-status="resolved"]')).toHaveCount(2);
  await expect(page.getByTestId('comment-version-link').first()).toHaveText(`Version ${head.id.slice(0, 7)}`);
  await expect(page.getByTestId('comments-badge')).toHaveCount(0);
  await expect(page.getByTestId('comment-pin')).toHaveCount(0);
  await shoot(page, 'tab-resolved');
});

test('Comments: send now, and queue while the agent runs', async ({ page }) => {
  const { api, project } = await newProject(page, 'Harbor Send Now');

  await pinComment(page, '.card h2', 'Faster setup', 'ControlOrMeta+Enter');
  await expect.poll(() => statuses(api, project), { timeout: 30_000 }).toEqual(['resolved']);
  await expect(frontFrame(page).locator('.card h2').first()).toHaveText('Faster setup');

  await setCommentMode(page, true);
  await frontFrame(page).locator('h1').click();
  const input = page.getByTestId('comment-compose').getByRole('textbox');
  await input.fill('Bigger title');
  await api.call('POST', `/api/projects/${project.id}/d/${mainDirection(project).id}/runs`, { prompt: 'Add a footer [slow]', mode: 'edit' });
  await input.press('ControlOrMeta+Enter');
  await expect(page.getByTestId('queued-bar')).toContainText('Agent is running: queued');
  await expect(page.getByTestId('queued-bar')).toContainText('1 queued');
  expect(await statuses(api, project)).toEqual(['resolved', 'queued']);
  await api.waitForRuns(project.id, 3);
  await page.getByTestId('queued-bar').getByRole('button', { name: 'Send 1 queued' }).click();
  await expect.poll(() => statuses(api, project), { timeout: 30_000 }).toEqual(['resolved', 'resolved']);
  await expect(frontFrame(page).locator('h1')).toHaveText('Bigger title');
});

test('Comments: orphaned when the element is deleted, then re-pinned', async ({ page }) => {
  const { api, project, indexFile } = await newProject(page, 'Harbor Orphan');

  await pinComment(page, '.cta', 'Use a stronger verb');
  await page.keyboard.press('Escape');
  await expect(pin(page, 1)).toBeVisible();
  const source = readFileSync(indexFile, 'utf8');
  writeFileSync(indexFile, source.replace(/\s*<button class="cta"[^>]*>[^<]*<\/button>/, ''));
  await expect(frontFrame(page).locator('.cta')).toHaveCount(0);
  await expect.poll(() => statuses(api, project), { timeout: 15_000 }).toEqual(['orphaned']);
  await expect(page.getByTestId('comment-pin')).toHaveCount(0);

  await page.getByRole('tab', { name: 'Comments' }).click();
  const row = page.locator('[data-status="orphaned"]');
  await expect(row).toContainText('Element not found');
  await shoot(page, 'tab-orphaned');
  await row.getByRole('button', { name: 'Re-pin' }).click();
  await expect(page.getByRole('button', { name: 'Comment', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await frontFrame(page).locator('h1').click();
  await expect.poll(() => statuses(api, project)).toEqual(['queued']);
  expect((await comments(api, project))[0]?.target.tag).toBe('h1');
  await expect(page.getByRole('button', { name: 'Comment', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expectPinOn(page, 1, 'h1');
});

test('Comments: quick feedback popover in select mode', async ({ page }) => {
  const { api, project } = await newProject(page, 'Harbor Feedback');

  await setSelectMode(page, true);
  await frontFrame(page).locator('h1').click();
  await expect(page.getByRole('tab', { name: 'Design' })).toHaveAttribute('aria-selected', 'true');
  const feedback = page.getByTestId('comment-feedback');
  await expect(feedback).toBeVisible();
  const input = feedback.getByRole('textbox', { name: 'Feedback on selection' });
  await expect(input).not.toBeFocused();
  await page.getByLabel('Text content').click();
  await expect(page.getByLabel('Text content')).toBeFocused();
  await expect(feedback).toBeVisible();
  await page.locator('.ins-header .ins-tag').click();
  await page.keyboard.press('f');
  await expect(input).toBeFocused();
  await input.fill('Tighter letter spacing');
  await shoot(page, 'feedback');
  await input.press('Enter');
  await expect(feedback).toHaveCount(0);
  expect(await statuses(api, project)).toEqual(['queued']);
  await expect(pin(page, 1)).toBeVisible();

  await frontFrame(page).locator('.card h2').nth(0).click();
  await frontFrame(page)
    .locator('.card h2')
    .nth(1)
    .click({ modifiers: ['Shift'] });
  await expect(page.locator('.overlay .box.selected')).toHaveCount(2);
  const multi = page.getByTestId('comment-feedback');
  await expect(multi.getByRole('textbox', { name: 'Feedback on 2 elements' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(multi).toHaveCount(0);
  await setSelectMode(page, true);
  await frontFrame(page).locator('.card h2').nth(2).click();
  await frontFrame(page)
    .locator('.card h2')
    .nth(1)
    .click({ modifiers: ['Shift'] });
  await expect(page.getByTestId('comment-feedback').getByRole('textbox', { name: 'Feedback on 2 elements' })).toBeVisible();
  await page.keyboard.press('f');
  await page.getByTestId('comment-feedback').getByRole('textbox').fill('Shorter headings');
  await page.keyboard.press('Enter');
  await expect.poll(() => statuses(api, project)).toEqual(['queued', 'queued', 'queued']);
  await expect(page.getByTestId('comment-pin')).toHaveCount(3);

  await page.getByRole('tab', { name: 'Chat' }).click();
  const bar = page.getByTestId('queued-bar');
  await expect(bar).toContainText('3 queued');
  await shoot(page, 'composer-bar');
  await bar.getByRole('button', { name: 'Send 3 queued' }).click();
  await expect.poll(() => statuses(api, project), { timeout: 30_000 }).toEqual(['resolved', 'resolved', 'resolved']);
  await expect(frontFrame(page).locator('h1')).toHaveText('Tighter letter spacing');
  await expect(bar).toHaveCount(0);
});
