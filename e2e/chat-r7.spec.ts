import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { Project } from '../src/shared/contracts';
import { createProjectViaUi, frontFrame, mainDirection, openHome, showVersions, type StudioApi } from './support/studio';

const PROMPTS = ['Harbor Lane Coffee', 'Add a menu section', 'Add opening hours', 'Add a contact form'];

const composer = (page: Page) => page.locator('.prompt [data-slot="composer-input"]');
const message = (page: Page, index: number) => page.locator('[data-run-id]').nth(index).locator('.msg.user');

async function fourMessages(page: Page): Promise<{ api: StudioApi; project: Project; files: string[] }> {
  const api = await openHome(page);
  const project = await createProjectViaUi(page, api, PROMPTS[0] as string, 'html');
  await expect(frontFrame(page).locator('h1')).toHaveText(PROMPTS[0] as string);
  await api.waitForRuns(project.id, 1);
  const file = path.join(mainDirection(project).workTree, 'index.html');
  const files = [readFileSync(file, 'utf8')];
  for (const [index, prompt] of PROMPTS.slice(1).entries()) {
    await composer(page).fill(prompt);
    await composer(page).press('Meta+Enter');
    await api.waitForRuns(project.id, index + 2);
    files.push(readFileSync(file, 'utf8'));
  }
  await expect(page.locator('[data-run-id]')).toHaveCount(4);
  return { api, project, files };
}

async function action(page: Page, index: number, name: string) {
  const msg = message(page, index);
  await msg.hover();
  return msg.getByRole('button', { name, exact: true });
}

test('R7-4: restore code at message 2 of 4, with a confirm for unfinished changes', async ({ page }) => {
  const { api, project, files } = await fourMessages(page);
  const workTree = mainDirection(project).workTree;
  const file = path.join(workTree, 'index.html');

  await expect(await action(page, 3, 'Restore code here')).toHaveAttribute('aria-disabled', 'true');
  await expect(await action(page, 3, 'Restore code here')).toHaveAttribute('data-tip', 'The code is already at this message');
  await expect(await action(page, 0, 'Edit and rerun')).toHaveAttribute('data-tip', 'No earlier version to start from');

  writeFileSync(file, `${files[3]}<!-- my unsaved edit -->\n`);
  writeFileSync(path.join(workTree, 'my-notes.txt'), 'keep me\n');
  await expect(page.locator('.banner', { hasText: 'Unfinished changes' })).toBeVisible();

  await (await action(page, 1, 'Restore code here')).click();
  const confirm = page.getByTestId('restore-confirm');
  await expect(confirm).toContainText('Unfinished changes in 2 files. Restore replaces edits to files a version tracks');
  await confirm.getByRole('button', { name: 'Cancel' }).click();
  await expect(confirm).toHaveCount(0);
  expect(readFileSync(file, 'utf8')).toContain('my unsaved edit');

  await (await action(page, 1, 'Restore code here')).click();
  await confirm.getByRole('button', { name: 'Restore' }).click();
  await expect.poll(() => readFileSync(file, 'utf8')).toBe(files[1]);
  expect(readFileSync(path.join(workTree, 'my-notes.txt'), 'utf8')).toBe('keep me\n');
  await expect(frontFrame(page).locator('body')).toContainText('Add a menu section');
  await expect(frontFrame(page).locator('body')).not.toContainText('Add opening hours');
  const runs = await api.runs(project.id);
  const second = runs.find((run) => run.request.prompt === PROMPTS[1]);
  const after = await api.project(project.id);
  const versions = await api.versions(project.id, 'main');
  const head = versions.find((version) => version.id === mainDirection(after).headVersionId);
  expect(head?.meta).toMatchObject({ kind: 'restore', restoredFrom: second?.versionId });
  expect(mainDirection(after)).toMatchObject({ sessionId: null, sessionResetReason: 'restore' });
  await expect(await action(page, 1, 'Restore code here')).toHaveAttribute('aria-disabled', 'true');
});

test('R7-4: edit and resend forks a new direction from the version before that message; the old chat stays', async ({ page }) => {
  const { api, project, files } = await fourMessages(page);
  await (await action(page, 2, 'Edit and rerun')).click();
  const editor = page.getByTestId('message-editor');
  const box = editor.getByRole('textbox', { name: 'Edit message' });
  await expect(box).toBeFocused();
  await expect(box).toHaveValue(PROMPTS[2] as string);
  await box.press('Escape');
  await expect(editor).toHaveCount(0);

  await (await action(page, 2, 'Edit and rerun')).click();
  await box.fill('Add weekend hours');
  await box.press('Enter');

  await expect.poll(async () => (await api.project(project.id)).directions.length).toBe(project.directions.length + 1);
  const created = (await api.project(project.id)).directions.find((direction) => direction.id !== 'main');
  if (!created) throw new Error('no new direction');
  await expect.poll(async () => (await api.runs(project.id)).find((run) => run.directionId === created.id)?.status ?? 'none', { timeout: 30_000 }).toBe('completed');
  const runs = await api.runs(project.id);
  expect(runs.filter((run) => run.directionId === 'main')).toHaveLength(4);
  expect(runs.find((run) => run.directionId === created.id)?.request.prompt).toBe('Add weekend hours');
  const forked = readFileSync(path.join(created.workTree, 'index.html'), 'utf8');
  expect(forked.startsWith(files[1]?.split('</body>')[0] ?? '')).toBe(true);
  expect(forked).toContain('Add weekend hours');
  expect(forked).not.toContain('Add opening hours');
  expect(readFileSync(path.join(mainDirection(project).workTree, 'index.html'), 'utf8')).toBe(files[3]);

  await expect(page.locator('[data-run-id]')).toHaveCount(1);
  await expect(page.locator('[data-run-id] .msg.user')).toContainText('Add weekend hours');
  await showVersions(page);
  await page.locator('.dir-list button', { hasText: 'Main' }).first().click();
  await page.getByRole('tab', { name: 'Chat' }).click();
  await expect(page.locator('[data-run-id]')).toHaveCount(4);
  await expect(message(page, 2)).toContainText(PROMPTS[2] as string);
});

test('R7-7: search runs by a word in the prompt, and a rename stays after reload', async ({ page }) => {
  await fourMessages(page);
  await page.getByRole('button', { name: 'Search runs' }).click();
  const search = page.getByRole('searchbox', { name: 'Search runs' });
  await search.fill('HOURS');
  await expect(page.locator('[data-run-id]')).toHaveCount(1);
  await expect(page.getByTestId('chat-search-count')).toHaveText('1 of 4');
  await expect(message(page, 0)).toContainText('Add opening hours');
  await search.fill('nothing like this');
  await expect(page.locator('[data-run-id]')).toHaveCount(0);
  await expect(page.locator('.chat-search-empty')).toBeVisible();
  await search.press('Escape');
  await expect(page.locator('[data-run-id]')).toHaveCount(4);

  await (await action(page, 1, 'Rename')).click();
  const field = page.getByRole('textbox', { name: 'Run name' });
  await field.fill('Menu pass');
  await field.press('Enter');
  await expect(message(page, 1).getByTestId('run-title')).toHaveText('Menu pass');

  await page.reload();
  await expect(page.locator('[data-run-id]')).toHaveCount(4);
  await expect(message(page, 1).getByTestId('run-title')).toHaveText('Menu pass');
  await page.getByRole('button', { name: 'Search runs' }).click();
  await page.getByRole('searchbox', { name: 'Search runs' }).fill('pass');
  await expect(page.locator('[data-run-id]')).toHaveCount(1);
  await expect(message(page, 0).getByTestId('run-title')).toHaveText('Menu pass');

  await page.getByRole('searchbox', { name: 'Search runs' }).press('Escape');
  await message(page, 1).getByTestId('run-title').dblclick();
  await page.getByRole('textbox', { name: 'Run name' }).fill('');
  await page.getByRole('textbox', { name: 'Run name' }).press('Enter');
  await expect(page.getByTestId('run-title')).toHaveCount(0);
});
