import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createProjectViaUi, frontFrame, mainDirection, openHome } from './support/studio';

const DISCLOSURE =
  "Prompts, selected element code, attached images and project files the agent reads are sent to Anthropic's API to generate designs. Projects, versions and history stay on this computer.";

async function artboardBox(page: Page): Promise<{ x: number; y: number; width: number }> {
  const box = await page.locator('.artboard').boundingBox();
  if (!box) throw new Error('artboard not visible');
  return { x: box.x, y: box.y, width: box.width };
}

async function stageCorner(page: Page): Promise<{ x: number; y: number }> {
  const box = await page.locator('.stage').boundingBox();
  if (!box) throw new Error('stage not visible');
  return { x: box.x + 8, y: box.y + box.height - 8 };
}

async function frameCenter(page: Page): Promise<{ x: number; y: number }> {
  const box = await page.locator('iframe.frame.front').boundingBox();
  if (!box) throw new Error('frame not visible');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function drag(page: Page, from: { x: number; y: number }, dx: number, dy: number, button: 'left' | 'middle') {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down({ button });
  for (let step = 1; step <= 5; step += 1) await page.mouse.move(from.x + (dx * step) / 5, from.y + (dy * step) / 5);
  await page.mouse.up({ button });
}

test('UI fixes: disclosure, pan drag, custom size on Enter, settings persist, svg rejected', async ({ page }) => {
  const api = await openHome(page);
  await expect(page.getByTestId('data-disclosure')).toHaveText(DISCLOSURE);

  await page.getByText('Advanced', { exact: true }).click();
  await page.getByRole('textbox', { name: 'DESIGN.md' }).fill('# Brand\nPrimary color #0B6E4F.');
  const project = await createProjectViaUi(page, api, 'Pan Test Page', 'html');
  const main = mainDirection(project);
  await expect(frontFrame(page).locator('h1')).toHaveText('Pan Test Page');
  await api.waitForRuns(project.id, 1);
  expect(readFileSync(path.join(main.workTree, 'DESIGN.md'), 'utf8')).toContain('#0B6E4F');

  await expect(page.locator('.prompt').getByTestId('data-disclosure')).toHaveText(DISCLOSURE);
  await expect(page.getByTestId('active-model')).toContainText('claude-sonnet-5-5');

  const start = await artboardBox(page);
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.focus();
  });
  await page.keyboard.down('Space');
  await expect(page.getByTestId('pan-capture')).toBeVisible();
  await drag(page, await frameCenter(page), 120, 60, 'left');
  await page.keyboard.up('Space');
  const afterSpace = await artboardBox(page);
  expect(afterSpace.x - start.x).toBeCloseTo(120, 0);
  expect(afterSpace.y - start.y).toBeCloseTo(60, 0);

  await drag(page, await stageCorner(page), -80, -40, 'middle');
  const afterMiddle = await artboardBox(page);
  expect(afterMiddle.x - afterSpace.x).toBeCloseTo(-80, 0);
  expect(afterMiddle.y - afterSpace.y).toBeCloseTo(-40, 0);

  await page.getByRole('radio', { name: 'Custom' }).click();
  const width = page.getByLabel('Width');
  await width.fill('1000');
  await width.press('Enter');
  await expect(width).toBeFocused();
  await expect.poll(() => page.locator('.artboard').evaluate((el) => (el as HTMLElement).style.width)).toBe('1000px');
  const height = page.getByLabel('Height');
  await height.fill('700');
  await height.press('Enter');
  await expect.poll(() => page.locator('.artboard').evaluate((el) => (el as HTMLElement).style.height)).toBe('700px');

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Project settings' });
  await expect(dialog.getByLabel('Allow installing packages')).toBeDisabled();
  await dialog.getByLabel('Model').selectOption('claude-haiku-5-5');
  await expect(dialog.getByLabel('Spending limit per run')).toHaveValue('');
  await expect(dialog.getByLabel('Spending limit per run')).toHaveAttribute('placeholder', 'No limit');
  await dialog.getByLabel('Spending limit per run').fill('0.5');
  await dialog.getByLabel('Max turns').fill('7');
  await dialog.getByLabel('Allow agent to run shell commands').check();
  await dialog.getByLabel('Allow installing packages').check();
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId('active-model')).toContainText('claude-haiku-5-5');
  expect((await api.project(project.id)).settings).toEqual({
    model: 'claude-haiku-5-5',
    maxBudgetUsd: 0.5,
    maxTurns: 7,
    allowBash: true,
    allowInstall: true,
    disabledSkills: [],
    defaultLevel: 'prototype',
  });

  await page.reload();
  await expect(page.getByTestId('active-model')).toContainText('claude-haiku-5-5');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const reopened = page.getByRole('dialog', { name: 'Project settings' });
  await expect(reopened.getByLabel('Model')).toHaveValue('claude-haiku-5-5');
  await expect(reopened.getByLabel('Spending limit per run')).toHaveValue('0.5');
  await expect(reopened.getByLabel('Max turns')).toHaveValue('7');
  await expect(reopened.getByLabel('Allow installing packages')).toBeChecked();
  await reopened.getByLabel('Allow agent to run shell commands').uncheck();
  await reopened.getByLabel('Spending limit per run').fill('');
  await reopened.getByRole('button', { name: 'Save' }).click();
  await expect(reopened).toBeHidden();
  expect((await api.project(project.id)).settings).toMatchObject({ allowBash: false, allowInstall: false, maxBudgetUsd: null });

  await page.locator('.prompt input[type=file]').setInputFiles({
    name: 'logo.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"/>'),
  });
  await expect(page.locator('.prompt .alert.error')).toContainText('logo.svg:');
  await expect(page.locator('.prompt .alert.error')).not.toContainText('failed: 400');
});
