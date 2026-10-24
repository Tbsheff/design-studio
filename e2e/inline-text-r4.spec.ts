import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createProjectViaUi, frontFrame, mainDirection, openHome, selectInFrame, setSelectMode, type StudioApi } from './support/studio';

const h1 = (page: Page) => frontFrame(page).locator('h1');
const composer = (page: Page) => page.locator('.prompt [data-slot="composer-input"]');

async function newProject(page: Page, name: string, kind: 'html' | 'react') {
  const api = await openHome(page);
  const project = await createProjectViaUi(page, api, name, kind);
  await expect(h1(page)).toHaveText(name, { timeout: kind === 'react' ? 90_000 : 20_000 });
  await api.waitForRuns(project.id, 1);
  const main = mainDirection(project);
  const file = path.join(main.workTree, kind === 'react' ? path.join('src', 'App.tsx') : 'index.html');
  return { api, project, file };
}

async function runCount(api: StudioApi, pid: string): Promise<number> {
  return (await api.runs(pid)).length;
}

async function armCommitProbe(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __commitAt?: number; __commitProbe?: boolean };
    w.__commitAt = 0;
    if (w.__commitProbe) return;
    w.__commitProbe = true;
    window.addEventListener('message', (event) => {
      if ((event.data as { type?: string } | null)?.type === 'text-commit') w.__commitAt = Date.now();
    });
  });
}

async function bytesOnDisk(file: string, needle: string): Promise<number> {
  const deadline = Date.now() + 5000;
  for (;;) {
    if (readFileSync(file, 'utf8').includes(needle)) return Date.now();
    if (Date.now() > deadline) throw new Error(`${needle} never reached ${file}`);
    await new Promise((resolve) => setTimeout(resolve, 2));
  }
}

async function caretReady(page: Page): Promise<boolean> {
  return h1(page).evaluate((el) => {
    const selection = window.getSelection();
    return document.activeElement === el && (el as HTMLElement).isContentEditable && selection !== null && selection.rangeCount > 0 && el.contains(selection.getRangeAt(0).startContainer);
  });
}

async function editH1(page: Page): Promise<number> {
  const started = Date.now();
  await h1(page).dblclick();
  await expect.poll(() => caretReady(page), { intervals: [5] }).toBe(true);
  return Date.now() - started;
}

async function frontSrc(page: Page): Promise<string | null> {
  return page.locator('iframe.frame.front').getAttribute('src');
}

async function swapped(page: Page, before: string | null): Promise<void> {
  await expect.poll(() => frontSrc(page)).not.toBe(before);
  await expect(page.locator('iframe.frame')).toHaveCount(1);
}

function stats(values: number[]): { median: number; max: number } {
  const sorted = [...values].sort((a, b) => a - b);
  return { median: sorted[Math.floor(sorted.length / 2)] ?? 0, max: sorted.at(-1) ?? 0 };
}

test('R4-1: dblclick, type, Cmd+Enter writes the h1 to the source in under 200 ms with no model call', async ({ page }) => {
  const { api, project, file } = await newProject(page, 'Inline Harbor', 'html');
  const runsBefore = await runCount(api, project.id);
  await selectInFrame(page, 'h1');
  await armCommitProbe(page);
  const fromKey: number[] = [];
  const fromCommit: number[] = [];
  const caret: number[] = [];
  for (let i = 1; i <= 5; i += 1) {
    const text = `Inline Harbor ${i}`;
    caret.push(await editH1(page));
    await page.keyboard.press('Meta+A');
    await page.keyboard.type(text);
    await armCommitProbe(page);
    const src = await frontSrc(page);
    const pressed = Date.now();
    await page.keyboard.press('Meta+Enter');
    const onDisk = await bytesOnDisk(file, `<h1>${text}</h1>`);
    const commitAt = await page.evaluate(() => (window as unknown as { __commitAt: number }).__commitAt);
    fromKey.push(onDisk - pressed);
    fromCommit.push(onDisk - commitAt);
    await swapped(page, src);
    await expect(h1(page)).toHaveText(text);
    await expect(h1(page)).not.toHaveAttribute('contenteditable');
    await expect(page.getByLabel('Text content')).toHaveValue(text);
    await expect(page.locator('.ins-status.saving')).toHaveCount(0);
  }
  const key = stats(fromKey);
  const commit = stats(fromCommit);
  const dbl = stats(caret);
  console.log(`[R4-1] key -> bytes on disk ms ${JSON.stringify(fromKey)} median ${key.median} max ${key.max}`);
  console.log(`[R4-1] text-commit -> bytes on disk ms ${JSON.stringify(fromCommit)} median ${commit.median} max ${commit.max}`);
  console.log(`[R4-1] dblclick -> caret visible ms ${JSON.stringify(caret)} median ${dbl.median} max ${dbl.max}`);
  expect(commit.max).toBeLessThan(200);
  expect(key.median).toBeLessThan(200);
  expect(await runCount(api, project.id)).toBe(runsBefore);
});

test('R4-1: Esc cancels, keeps select mode, restores the text; blur commits; Enter keeps the R2 child move', async ({ page }) => {
  const { api, project, file } = await newProject(page, 'Inline Esc Probe', 'html');
  const runsBefore = await runCount(api, project.id);
  const original = readFileSync(file, 'utf8');
  await selectInFrame(page, 'h1');

  await editH1(page);
  await page.keyboard.type(' zzz');
  await expect(h1(page)).toHaveText(/zzz/);
  await page.keyboard.press('Escape');
  await expect(h1(page)).toHaveText('Inline Esc Probe');
  await expect(h1(page)).not.toHaveAttribute('contenteditable');
  await expect(page.getByRole('button', { name: /^Select/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.overlay .box.selected')).toHaveCount(1);
  await page.waitForTimeout(300);
  expect(readFileSync(file, 'utf8')).toBe(original);

  await page.keyboard.press('Enter');
  await expect.poll(() => caretReady(page)).toBe(true);
  await page.keyboard.type('Typed After Enter');
  let src = await frontSrc(page);
  await page.keyboard.press('Enter');
  await bytesOnDisk(file, '<h1>Typed After Enter</h1>');
  await expect(page.getByLabel('Text content')).toHaveValue('Typed After Enter');
  await swapped(page, src);

  await editH1(page);
  await page.keyboard.press('Meta+A');
  await page.keyboard.type('Blur In Frame');
  src = await frontSrc(page);
  await frontFrame(page).locator('p.lede').click();
  await bytesOnDisk(file, '<h1>Blur In Frame</h1>');
  await expect(page.locator('.ins-tag')).toHaveText('p');
  await swapped(page, src);

  await selectInFrame(page, 'h1');
  await editH1(page);
  await page.keyboard.press('Meta+A');
  await page.keyboard.type('Blur In Studio');
  src = await frontSrc(page);
  await page.locator('.ins-header .ins-tag').click();
  await bytesOnDisk(file, '<h1>Blur In Studio</h1>');
  await swapped(page, src);

  await selectInFrame(page, 'article.card h2');
  await expect(page.locator('.ins-tag')).toHaveText('h2');
  await page.keyboard.press('Shift+Enter');
  await expect(page.locator('.ins-tag')).toHaveText('article');
  await page.keyboard.press('Enter');
  await expect(page.locator('.ins-tag')).toHaveText('h2');
  await expect(frontFrame(page).locator('[contenteditable]')).toHaveCount(0);
  expect(await runCount(api, project.id)).toBe(runsBefore);
});

test('R4-1: inline edit is off while a run is active', async ({ page }) => {
  const { api, project, file } = await newProject(page, 'Inline Run Probe', 'html');
  await composer(page).fill('Walk while editing [steps]');
  await composer(page).press('Meta+Enter');
  await expect(page.locator('[data-run-id]').last().locator('.tool-row[data-state="pending"]')).toHaveCount(1);
  const during = readFileSync(file, 'utf8');
  await selectInFrame(page, 'h1');
  await h1(page).dblclick();
  await h1(page).press('Enter');
  await page.waitForTimeout(200);
  await expect(frontFrame(page).locator('[contenteditable]')).toHaveCount(0);
  expect(readFileSync(file, 'utf8')).toBe(during);
  await api.waitForRuns(project.id, 2);
  await expect(page.locator('[data-run-id]').last().locator('.run-foot .status.running')).toHaveCount(0);
  await editH1(page);
  await page.keyboard.press('Escape');
});

test('R4-1: React project, two inline edits in a row write App.tsx', async ({ page }) => {
  const { api, project, file } = await newProject(page, 'Inline Orbit', 'react');
  const runsBefore = await runCount(api, project.id);
  await selectInFrame(page, 'h1');
  for (const text of ['Inline Orbit One', 'Inline Orbit Two']) {
    await editH1(page);
    await page.keyboard.press('Meta+A');
    await page.keyboard.type(text);
    await page.keyboard.press('Meta+Enter');
    await bytesOnDisk(file, `<h1>${text}</h1>`);
    await expect(h1(page)).toHaveText(text);
    await expect(h1(page)).not.toHaveAttribute('contenteditable');
    await expect(page.getByLabel('Text content')).toHaveValue(text);
    await expect(page.locator('.ins-status.saving')).toHaveCount(0);
  }
  await page.waitForTimeout(500);
  await expect(h1(page)).toHaveText('Inline Orbit Two');
  await setSelectMode(page, false);
  expect(await runCount(api, project.id)).toBe(runsBefore);
});
