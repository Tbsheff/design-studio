import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { Project } from '../src/shared/contracts';
import { ROOT } from './support/server';
import { type StudioApi, openHome, sendPrompt } from './support/studio';

const REVIEW_DIR = path.join(ROOT, 'design-review');
const SIZES = [
  [1440, 900],
  [800, 934],
] as const;

async function openProject(page: Page, api: StudioApi): Promise<Project> {
  const { project } = await api.call<{ project: Project }>('POST', '/api/projects', { prompt: 'Chat Panel Bakery', kind: 'html' });
  await api.waitForRuns(project.id, 1);
  await page.evaluate((id) => {
    const raw = localStorage.getItem('design-studio.ui.v1');
    const state = raw ? JSON.parse(raw) : {};
    localStorage.setItem('design-studio.ui.v1', JSON.stringify({ ...state, activeProjectId: id }));
  }, project.id);
  await page.reload();
  await expect(page.locator('.topbar')).toBeVisible();
  return api.project(project.id);
}

async function shoot(page: Page, name: string, width: number, height: number): Promise<void> {
  mkdirSync(REVIEW_DIR, { recursive: true });
  await page.screenshot({ path: path.join(REVIEW_DIR, `ai-chat-${name}-${width}x${height}.png`) });
}

test('chat panel: markdown replies, tool rows, live status, error, composer', async ({ page }) => {
  const api = await openHome(page);
  const project = await openProject(page, api);
  const chat = page.locator('.chat');

  const firstReply = chat.locator('.msg.assistant .msg-body').first();
  await expect(firstReply.locator('code', { hasText: 'index.html' })).toBeVisible();
  await expect(firstReply).not.toContainText('`');
  await expect(page.getByRole('button', { name: /^Show (more|less)$/ })).toHaveCount(0);
  await expect(chat.locator('.run .status.completed')).toHaveCount(1);
  await expect(chat.locator('.tools-toggle').first()).toContainText('5 tool calls');
  await chat.locator('.tools-toggle').first().click();
  const fileRows = chat.locator('.tool-row').filter({ has: page.locator('[data-slot=chip]', { hasText: 'index.html' }) });
  await expect(fileRows.and(chat.locator('.tool-row.done'))).toHaveCount(1);
  await expect(chat.locator('.tool-row.done[data-tool="mcp__studio__render_check"]').first()).toBeVisible();
  await expect(chat.locator('.tool-row [data-slot=chip]').first()).toHaveText('index.html');

  const input = page.getByPlaceholder('Describe a change');
  await input.focus();
  const inputStyle = await input.evaluate((el) => {
    const s = getComputedStyle(el);
    return { shadow: s.boxShadow, radius: s.borderRadius, padding: s.padding, font: s.fontFamily };
  });
  expect(inputStyle).toMatchObject({ shadow: 'none', radius: '0px', padding: '8px 12px' });
  expect(inputStyle.font).toContain('Inter');
  const triggerStyle = await chat.locator('[data-slot=action-trigger]').first().evaluate((el) => {
    const s = getComputedStyle(el);
    return { border: s.borderTopWidth, background: s.backgroundColor, font: s.fontFamily };
  });
  expect(triggerStyle).toMatchObject({ border: '0px', background: 'rgba(0, 0, 0, 0)' });
  expect(triggerStyle.font).toContain('Inter');

  let runs = 1;
  for (const [width, height] of SIZES) {
    await page.setViewportSize({ width, height });
    await sendPrompt(page, `[slow] Add opening hours at ${width}`);
    runs += 1;
    await expect(chat.locator('.tool-row.pending')).toHaveCount(1);
    await expect(page.locator('.live-status [role=status]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible();
    await shoot(page, 'streaming', width, height);
    await api.waitForRuns(project.id, runs);
    await expect(chat.locator('.run .status.completed')).toHaveCount(runs);
    await expect(chat.locator('.tool-row.pending')).toHaveCount(0);
    await chat.locator('.tools-toggle').last().click();
    await fileRows.last().locator('[data-slot=action-trigger]').click();
    await expect(chat.locator('[data-slot=action-content]').last()).toContainText('Edit index.html');
    await page.waitForTimeout(250);
    await shoot(page, 'tool-rows', width, height);
  }

  await sendPrompt(page, '[fail] Add a footer');
  runs += 1;
  await api.waitForRuns(project.id, runs);
  await expect(chat.locator('.status.failed')).toHaveCount(1);
  await expect(chat.locator('.run-error')).toContainText('Mock failure after first write.');
  await expect(page.getByRole('button', { name: /^Show (more|less)$/ })).toHaveCount(0);
  for (const [width, height] of SIZES) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(300);
    await shoot(page, 'finished', width, height);
  }
  await page.setViewportSize({ width: 1600, height: 1000 });
});
