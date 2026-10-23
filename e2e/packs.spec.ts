import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { readState } from './support/server';
import { createProjectViaUi, mainDirection, openHome } from './support/studio';

async function choosePack(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: 'Design system', exact: true }).click();
  const list = page.getByRole('listbox', { name: 'Design systems' });
  await expect(list).toBeVisible();
  await list.getByRole('option', { name, exact: true }).click();
  await expect(list).toBeHidden();
}

test('design-system packs: picker, project files, top bar chip and popover', async ({ page }) => {
  const api = await openHome(page);
  const { dataDir } = readState();

  const trigger = page.getByRole('button', { name: 'Design system', exact: true });
  await trigger.click();
  const list = page.getByRole('listbox', { name: 'Design systems' });
  const options = list.getByRole('option');
  await expect(options.first()).toHaveAccessibleName('No design system');
  await expect.poll(() => options.count()).toBeGreaterThanOrEqual(9);
  await expect(options.first()).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(options.nth(1)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(list).toBeHidden();
  await expect(trigger).toBeFocused();

  const packs = await api.call<{ id: string; name: string }[]>('GET', '/api/packs');
  expect(packs.length).toBeGreaterThanOrEqual(8);
  const pack = packs[0];
  if (!pack) throw new Error('no packs');

  await choosePack(page, pack.name);
  await expect(trigger).toContainText(pack.name);
  const project = await createProjectViaUi(page, api, 'Pack Landing Page', 'html');
  expect(project.packId).toBe(pack.id);
  const tree = mainDirection(project).workTree;
  expect(tree.startsWith(dataDir)).toBe(true);
  for (const file of ['design-system/tokens.json', 'design-system/tokens.css', 'DESIGN.md']) {
    await expect.poll(() => existsSync(path.join(tree, file)), { message: file }).toBe(true);
  }
  expect(readFileSync(path.join(tree, 'design-system/tokens.css'), 'utf8')).toContain('--primary');

  const chip = page.locator('.topbar').getByRole('button', { name: `Design system: ${pack.name}` });
  await expect(chip).toBeVisible();
  await expect(chip).toContainText(pack.name);
  await chip.click();
  const popover = page.getByRole('dialog', { name: 'Design system' });
  await expect(popover.getByRole('list', { name: 'Tokens' })).toContainText('--primary');
  await popover.getByRole('button', { name: 'Open DESIGN.md' }).click();
  await expect(page.getByRole('dialog', { name: 'DESIGN.md' })).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Projects', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Design system', exact: true })).toContainText(pack.name);
  await choosePack(page, 'No design system');
  const plain = await createProjectViaUi(page, api, 'Plain Page', 'html');
  expect(plain.packId ?? null).toBeNull();
  const plainTree = mainDirection(plain).workTree;
  await expect.poll(() => existsSync(path.join(plainTree, 'index.html'))).toBe(true);
  expect(existsSync(path.join(plainTree, 'design-system'))).toBe(false);
  await expect(page.locator('.topbar .ds-chip')).toHaveCount(0);
});
