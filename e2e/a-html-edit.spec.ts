import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';
import { createProjectViaUi, frontFrame, headVersion, mainDirection, openHome, selectInFrame, sendPrompt, showVersions, versionRow } from './support/studio';

const CREATE_PROMPT = 'Harbor Coffee Roasters';
const EDIT_PROMPT = 'Fresh beans every morning';

function changedLines(before: string, after: string): { index: number; before: string; after: string }[] {
  const a = before.split('\n');
  const b = after.split('\n');
  expect(b.length).toBe(a.length);
  return a.flatMap((line, index) => (line === b[index] ? [] : [{ index, before: line, after: b[index] ?? '' }]));
}

test('A: HTML mock create, select edit, undo, restore, export', async ({ page, context }) => {
  const api = await openHome(page);
  const project = await createProjectViaUi(page, api, CREATE_PROMPT, 'html');
  const main = mainDirection(project);
  const frame = frontFrame(page);

  await expect(frame.locator('h1')).toHaveText(CREATE_PROMPT);
  await api.waitForRuns(project.id, 1);
  await expect(page.locator('li.version')).toHaveCount(1);
  const firstHead = await headVersion(api, project.id, main.id);

  const indexFile = path.join(main.workTree, 'index.html');
  const beforeEdit = readFileSync(indexFile, 'utf8');
  const ledeBefore = await frame.locator('.lede').textContent();
  const cardsBefore = await frame.locator('.card').allTextContents();

  await selectInFrame(page, 'h1');
  await expect(page.locator('.chip')).toHaveCount(1);
  await sendPrompt(page, EDIT_PROMPT);

  await expect(frame.locator('h1')).toHaveText(EDIT_PROMPT);
  await api.waitForRuns(project.id, 2);
  await expect(frame.locator('.lede')).toHaveText(ledeBefore ?? '');
  expect(await frame.locator('.card').allTextContents()).toEqual(cardsBefore);

  const afterEdit = readFileSync(indexFile, 'utf8');
  const diff = changedLines(beforeEdit, afterEdit);
  expect(diff).toHaveLength(1);
  expect(diff[0]?.before.trim()).toBe(`<h1>${CREATE_PROMPT}</h1>`);
  expect(diff[0]?.after.trim()).toBe(`<h1>${EDIT_PROMPT}</h1>`);
  await expect(page.locator('li.version')).toHaveCount(2);
  const editVersion = await headVersion(api, project.id, main.id);
  expect(editVersion.meta.prompt).toBe(EDIT_PROMPT);
  expect(editVersion.changedFiles).toEqual(['index.html']);

  await showVersions(page);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(async () => (await headVersion(api, project.id, main.id)).meta.kind).toBe('undo');
  await expect(frame.locator('h1')).toHaveText(CREATE_PROMPT);
  expect(readFileSync(indexFile, 'utf8')).toBe(beforeEdit);
  await expect(page.locator('li.version')).toHaveCount(3);
  const versionsAfterUndo = await api.versions(project.id, main.id);
  expect(versionsAfterUndo.map((version) => version.id)).toContain(editVersion.id);
  const undoHead = await headVersion(api, project.id, main.id);
  expect(undoHead.meta.kind).toBe('undo');
  expect(undoHead.id).not.toBe(firstHead.id);

  const undoneRow = page.locator('li.version').filter({ has: page.locator(`.version-title span[title="${EDIT_PROMPT}"]`) });
  await expect(undoneRow).toHaveCount(1);
  await undoneRow.getByRole('button', { name: 'Restore' }).click();
  await expect.poll(async () => (await headVersion(api, project.id, main.id)).meta.kind).toBe('restore');
  await expect(frame.locator('h1')).toHaveText(EDIT_PROMPT);
  expect(readFileSync(indexFile, 'utf8')).toBe(afterEdit);
  const restoredHead = await headVersion(api, project.id, main.id);
  expect(restoredHead.meta.kind).toBe('restore');
  await expect(page.locator('li.version')).toHaveCount(4);

  const headRow = versionRow(page, restoredHead.title).filter({ has: page.locator('.badge', { hasText: 'Head' }) });
  const downloadPromise = page.waitForEvent('download');
  await headRow.getByRole('button', { name: 'Export' }).click();
  const download = await downloadPromise;
  const outDir = mkdtempSync(path.join(os.tmpdir(), 'studio export '));
  const zipPath = path.join(outDir, 'design.zip');
  await download.saveAs(zipPath);
  const listing = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' }).split('\n').filter(Boolean);
  expect(listing).toContain('index.html');
  const extracted = path.join(outDir, 'site');
  execFileSync('unzip', ['-q', zipPath, '-d', extracted]);
  const exportedHtml = readFileSync(path.join(extracted, 'index.html'), 'utf8');
  expect(exportedHtml).not.toContain('data-studio-loc');
  expect(exportedHtml).not.toContain('__studio');
  expect(existsSync(path.join(extracted, '.studio'))).toBe(false);

  const standalone = await context.newPage();
  const errors: string[] = [];
  standalone.on('pageerror', (error) => errors.push(error.message));
  await standalone.goto(pathToFileURL(path.join(extracted, 'index.html')).href);
  await expect(standalone.locator('h1')).toHaveText(EDIT_PROMPT);
  await expect(standalone.locator('.lede')).toHaveText(ledeBefore ?? '');
  expect(errors).toEqual([]);
  await standalone.close();
});
