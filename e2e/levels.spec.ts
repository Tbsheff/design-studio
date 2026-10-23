import { expect, test, type Page } from '@playwright/test';
import type { Project, RunLevel } from '../src/shared/contracts';
import { type StudioApi, chooseRunSetting, closeRunSettings, createProjectViaUi, mainDirection, openHome, openRunSettings, sendPrompt, showVersions } from './support/studio';

async function createProject(api: StudioApi, prompt: string): Promise<Project> {
  const { project } = await api.call<{ project: Project }>('POST', '/api/projects', { prompt, kind: 'html' });
  await api.waitForRuns(project.id, 1);
  return project;
}

async function openProject(page: Page, projectId: string): Promise<void> {
  await page.evaluate((id) => {
    const raw = localStorage.getItem('design-studio.ui.v1');
    const state = raw ? JSON.parse(raw) : {};
    localStorage.setItem('design-studio.ui.v1', JSON.stringify({ ...state, activeProjectId: id }));
  }, projectId);
  await page.reload();
  await expect(page.locator('.topbar')).toBeVisible();
}

async function expectLevel(page: Page, level: RunLevel): Promise<void> {
  await openRunSettings(page);
  const control = page.getByTestId('level-control');
  await expect(control.getByRole('radio', { checked: true })).toHaveCount(1);
  await expect(page.getByTestId(`level-option-${level}`)).toHaveAttribute('aria-checked', 'true');
}

async function savedLevel(api: StudioApi, projectId: string): Promise<RunLevel> {
  return (await api.project(projectId)).settings.defaultLevel;
}

test('level control: Prototype by default, keyboard and click change it, choice persists per project', async ({ page }) => {
  const api = await openHome(page);
  const first = await createProject(api, 'Levels Bakery');
  const second = await createProject(api, 'Levels Florist');
  await openProject(page, first.id);

  await expectLevel(page, 'prototype');
  await expect(page.getByTestId('level-option-prototype')).toHaveAttribute('aria-describedby', /.+/);
  await expect(page.getByTestId('level-option-polish')).toHaveAttribute('data-tip', /thorough/i);
  await expect(page.getByTestId('level-option-wireframe')).toHaveAttribute('tabindex', '-1');

  await page.getByTestId('level-option-prototype').focus();
  await page.keyboard.press('ArrowRight');
  await expectLevel(page, 'polish');
  await expect(page.getByTestId('level-option-polish')).toBeFocused();
  const outline = await page.getByTestId('level-option-polish').evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe('none');
  await page.keyboard.press('ArrowRight');
  await expectLevel(page, 'wireframe');
  await expect(page.getByTestId('level-option-wireframe')).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expectLevel(page, 'polish');

  await page.getByTestId('level-option-wireframe').click();
  await expectLevel(page, 'wireframe');
  await expect(page.getByTestId('run-settings')).toHaveText(/Edit · Wireframe/);
  await expect.poll(() => savedLevel(api, first.id)).toBe('wireframe');

  await page.reload();
  await expect(page.locator('.topbar')).toBeVisible();
  await expectLevel(page, 'wireframe');

  await openProject(page, second.id);
  await expectLevel(page, 'prototype');
  expect(await savedLevel(api, second.id)).toBe('prototype');
});

test('new project flow sends the chosen level with the first run', async ({ page }) => {
  const api = await openHome(page);
  await expectLevel(page, 'prototype');
  await page.getByTestId('level-option-wireframe').click();
  await expectLevel(page, 'wireframe');
  await closeRunSettings(page);
  const project = await createProjectViaUi(page, api, 'Levels Kiosk', 'html');
  const runs = await api.waitForRuns(project.id, 1);
  expect(runs[0]?.level).toBe('wireframe');
  expect(await savedLevel(api, project.id)).toBe('wireframe');
  await expect(page.getByTestId('run-level-chip').first()).toHaveText('Wireframe');
  await expectLevel(page, 'wireframe');
});

test('wireframe run shows its level; Polish this on the head starts a polish run', async ({ page }) => {
  const api = await openHome(page);
  const project = await createProject(api, 'Levels Bookshop');
  const did = mainDirection(project).id;
  await openProject(page, project.id);
  const chat = page.locator('.chat');
  const chips = page.getByTestId('run-level-chip');

  await expect(chips).toHaveText(['Prototype']);
  await expect(page.getByTestId('polish-this')).toHaveCount(1);

  await chooseRunSetting(page, { testId: 'level-option-wireframe' });
  await expectLevel(page, 'wireframe');
  await closeRunSettings(page);
  await sendPrompt(page, 'Add a short opening hours line');
  await expect(chips).toHaveText(['Prototype', 'Wireframe']);
  await api.waitForRuns(project.id, 2);
  await expect(chat.locator('.run .status.completed')).toHaveCount(2);
  await expect(chips).toHaveText(['Prototype', 'Wireframe']);
  const polishInChat = page.getByTestId('polish-this');
  await expect(polishInChat).toHaveCount(1);
  await expect(chat.locator('.run').last().getByTestId('polish-this')).toBeVisible();

  await showVersions(page);
  const head = page.locator('li.version.head');
  await expect(head.getByTestId('version-level')).toHaveText('Wireframe');
  await expect(page.locator('li.version').filter({ has: page.locator('.version-kind', { hasText: 'Run' }) }).getByTestId('version-level')).toHaveText([
    'Wireframe',
    'Prototype',
  ]);
  await expect(page.getByTestId('version-polish-this')).toHaveCount(1);
  await head.hover();
  await page.waitForTimeout(400);
  await page.screenshot({ path: test.info().outputPath('levels-versions-head.png') });

  await head.getByTestId('version-polish-this').click();
  await expect(page.getByRole('tab', { name: 'Chat' })).toHaveAttribute('aria-selected', 'true');
  await expect(chips).toHaveText(['Prototype', 'Wireframe', 'Polish']);
  const runs = await api.waitForRuns(project.id, 3);
  const polishRun = runs.find((run) => run.level === 'polish');
  expect(polishRun?.request.prompt).toContain('Polish this design');
  expect(polishRun?.request.mode).toBe('edit');
  await expect(chat.locator('.run .status.completed')).toHaveCount(3);
  await expect(page.getByTestId('polish-this')).toHaveCount(0);
  await expectLevel(page, 'wireframe');
  await closeRunSettings(page);
  await page.screenshot({ path: test.info().outputPath('levels-chat-polish.png') });

  await showVersions(page);
  await expect(page.locator('li.version.head').getByTestId('version-level')).toHaveText('Polish');
  await expect(page.getByTestId('version-polish-this')).toHaveCount(0);
  const headVersion = (await api.versions(project.id, did)).find((version) => version.id === polishRun?.versionId);
  expect(headVersion?.meta.level).toBe('polish');
});

test('Polish this is disabled while a run is in progress', async ({ page }) => {
  const api = await openHome(page);
  const project = await createProject(api, 'Levels Gallery');
  await openProject(page, project.id);
  const polishInChat = page.getByTestId('polish-this');
  await expect(polishInChat).toBeEnabled();

  await sendPrompt(page, '[slow] Add a gallery hours line');
  await expect(page.locator('.chat .run .status.running')).toHaveCount(1);
  await expect(polishInChat).toBeDisabled();
  await showVersions(page);
  await expect(page.getByTestId('version-polish-this')).toBeDisabled();

  await api.waitForRuns(project.id, 2);
  await expect(page.getByTestId('version-polish-this')).toBeEnabled();
});
