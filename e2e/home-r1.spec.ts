import { createHash } from 'node:crypto';
import { readdirSync } from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { expect, test, type Page } from '@playwright/test';
import type { Project, RunSentRecord, TrashedProject } from '../src/shared/contracts';
import { projectsDirFor, readState } from './support/server';
import { StudioApi, frontFrame, headVersion, mainDirection, openHome } from './support/studio';

const LONG_PROMPT = 'A landing page for a neighborhood bike repair shop with hours, prices and a booking form';

async function goHome(page: Page): Promise<void> {
  await page.evaluate(() => {
    const key = 'design-studio.ui.v1';
    localStorage.setItem(key, JSON.stringify({ ...JSON.parse(localStorage.getItem(key) ?? '{}'), activeProjectId: null }));
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'New project' })).toBeVisible();
}

function card(page: Page, pid: string) {
  return page.locator(`.project-card[data-project-id="${pid}"]`);
}

async function thumbHash(page: Page, pid: string): Promise<string> {
  const src = await card(page, pid).locator('.project-thumb img').getAttribute('src');
  const bytes = await page.evaluate(async (url) => [...new Uint8Array(await (await fetch(url as string)).arrayBuffer())], src);
  return createHash('sha1').update(Buffer.from(bytes)).digest('hex');
}

async function trashAll(api: StudioApi, ids: string[]): Promise<void> {
  for (const id of ids) await api.call<TrashedProject>('DELETE', `/api/projects/${id}`).catch(() => undefined);
}

test('R1-6, R1-7: a fresh data folder shows the first-run panel; the sample opens with 2 versions and no run; Close hides it for good', async ({ page }) => {
  const api = await openHome(page);
  const panel = page.getByRole('region', { name: /Three steps to a first design/ });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('listitem')).toHaveCount(3);

  await panel.getByRole('button', { name: 'Open the sample project' }).click();
  await expect(page.locator('.topbar')).toBeVisible();
  await expect(frontFrame(page).locator('h1')).toContainText('roasted to order');
  const sample = (await api.projects()).find((project) => project.name === 'Sample: Kiln Coffee');
  if (!sample) throw new Error('sample missing');
  expect(await api.versions(sample.id, 'main')).toHaveLength(2);
  expect(await api.runs(sample.id)).toHaveLength(0);

  await goHome(page);
  await page.getByRole('button', { name: 'Close getting started' }).click();
  await expect(panel).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'New project' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Three steps/ })).toHaveCount(0);
  await trashAll(api, [sample.id]);
});

test('R1-1: after a mock run ends the card shows an image of the new version within 2 s, and it changes after a second run', async ({ page }) => {
  const api = await openHome(page);
  const { project } = await api.call<{ project: Project }>('POST', '/api/projects', { prompt: LONG_PROMPT, kind: 'html' });
  await goHome(page);
  const [first] = await api.waitForRuns(project.id, 1);
  const img = card(page, project.id).locator('.project-thumb img');
  await expect(img).toBeVisible({ timeout: 10_000 });
  const firstShownAt = Date.now();
  const head1 = mainDirection(await api.project(project.id)).headVersionId;
  await expect(img).toHaveAttribute('data-version', head1 ?? 'none');
  const firstLag = firstShownAt - (first?.finishedAt ?? 0);
  const hash1 = await thumbHash(page, project.id);

  await api.call('POST', `/api/projects/${project.id}/d/main/runs`, { prompt: 'Make the hero dark navy with large white type and add a pricing table', mode: 'edit' });
  const runs = await api.waitForRuns(project.id, 2);
  const second = runs.find((run) => run.id !== first?.id);
  const head2 = mainDirection(await api.project(project.id)).headVersionId;
  expect(head2).not.toBe(head1);
  await expect(img).toHaveAttribute('data-version', head2 ?? 'none', { timeout: 10_000 });
  const secondLag = Date.now() - (second?.finishedAt ?? 0);
  expect(await thumbHash(page, project.id)).not.toBe(hash1);
  console.log(`[R1-1] thumbnail lag after run end: first ${firstLag} ms, second ${secondLag} ms`);
  expect(secondLag).toBeLessThan(2000);
  await trashAll(api, [project.id]);
});

test('R1-2: rename shows after reload; a duplicate opens with the same head version; delete removes the card and Undo brings it back', async ({ page }) => {
  const api = await openHome(page);
  const { project } = await api.call<{ project: Project }>('POST', '/api/projects/from-starter', { starterId: 'form' });
  await goHome(page);
  const target = card(page, project.id);

  await target.click({ button: 'right' });
  await page.getByRole('menuitem', { name: /Rename/ }).click();
  const field = target.getByLabel('Project name');
  await field.fill('Booking form v2');
  await field.press('Enter');
  await expect(target.locator('.project-name')).toHaveText('Booking form v2');
  await page.reload();
  await expect(card(page, project.id).locator('.project-name')).toHaveText('Booking form v2');

  await card(page, project.id).hover();
  await card(page, project.id).getByRole('button', { name: /More actions/ }).click();
  await page.getByRole('menuitem', { name: /Duplicate/ }).click();
  const toast = page.locator('.home-toast');
  await expect(toast).toContainText('Duplicated as “Booking form v2 copy”');
  await toast.getByRole('button', { name: 'Open' }).click();
  await expect(page.locator('.topbar')).toBeVisible();
  const copy = (await api.projects()).find((item) => item.name === 'Booking form v2 copy');
  if (!copy) throw new Error('copy missing');
  expect((await headVersion(api, copy.id, 'main')).id).toBe((await headVersion(api, project.id, 'main')).id);
  await expect(frontFrame(page).locator('h1')).toBeVisible();

  await goHome(page);
  await card(page, project.id).locator('.project-open').focus();
  await page.keyboard.press('ContextMenu');
  await page.getByRole('menuitem', { name: /Delete/ }).click();
  await expect(card(page, project.id)).toHaveCount(0);
  expect((await api.projects()).map((item) => item.id)).not.toContain(project.id);
  await page.locator('.home-toast').getByRole('button', { name: 'Undo' }).click();
  await expect(card(page, project.id)).toHaveCount(1);
  await expect(card(page, project.id).locator('.project-name')).toHaveText('Booking form v2');
  await trashAll(api, [project.id, copy.id]);
});

test('R1-3: a starter opens with a preview in under 2 s and no model call', async ({ page }) => {
  const api = await openHome(page);
  const before = new Set((await api.projects()).map((project) => project.id));
  const started = Date.now();
  await page.locator('[data-starter-id="dashboard"]').click();
  await expect(frontFrame(page).locator('h1')).toBeVisible();
  const elapsed = Date.now() - started;
  console.log(`[R1-3] starter click to preview h1: ${elapsed} ms`);
  expect(elapsed).toBeLessThan(2000);
  const created = (await api.projects()).find((project) => !before.has(project.id));
  if (!created) throw new Error('starter project missing');
  expect(await api.runs(created.id)).toHaveLength(0);
  await trashAll(api, [created.id]);
});

test('R1-3: a 5-word prompt shows the question form before any file write, and the answers reach the run', async ({ page }) => {
  const api = await openHome(page);
  const projectsDir = projectsDirFor(readState().dataDir);
  const before = (await api.projects()).length;
  const filesBefore = readdirSync(projectsDir).sort();
  await page.getByLabel('Describe the design').fill('Landing page for my bakery');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  const form = page.getByRole('form', { name: 'A few quick questions' });
  await expect(form).toBeVisible();
  const groups = form.getByRole('group');
  expect(await groups.count()).toBeGreaterThan(0);
  expect(await groups.count()).toBeLessThanOrEqual(3);
  expect((await api.projects()).length).toBe(before);
  expect(readdirSync(projectsDir).sort()).toEqual(filesBefore);

  await groups.first().getByRole('button').first().click();
  const answer = (await groups.first().getByRole('button').first().textContent()) ?? '';
  await form.getByRole('button', { name: 'Build with answers' }).click();
  await expect(page.locator('.topbar')).toBeVisible();
  const created = (await api.projects()).find((project) => project.name.toLowerCase().includes('bakery'));
  if (!created) throw new Error('bakery project missing');
  const [run] = await api.waitForRuns(created.id, 1);
  const detail = await api.call<{ sent: RunSentRecord[] }>('GET', `/api/runs/${run?.id}`);
  expect(detail.sent[0]?.text).toContain('Answers to your questions');
  expect(detail.sent[0]?.text).toContain(answer.trim());
  await trashAll(api, [created.id]);
});

test('R1-4: a dropped PNG shows a chip in under 200 ms; a pasted link shows a reference chip and the run prompt holds the captured page', async ({ page }) => {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end('<html><head><title>Copperline Bikes</title></head><body><h1>Tune-ups in 48 hours</h1><p>Flat fix from $12.</p></body></html>');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const api = await openHome(page);
    const box = page.getByLabel('Describe the design');
    const dropMs = await page.evaluate(async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 4;
      canvas.height = 4;
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((value) => resolve(value as Blob), 'image/png'));
      const data = new DataTransfer();
      data.items.add(new File([blob], 'sketch.png', { type: 'image/png' }));
      const form = document.querySelector('form.home-composer') as HTMLFormElement;
      const started = performance.now();
      const shown = new Promise<number>((resolve) => {
        const check = () => (document.querySelector('.home-chip.image img') ? resolve(performance.now() - started) : requestAnimationFrame(check));
        check();
      });
      form.dispatchEvent(new DragEvent('dragover', { dataTransfer: data, bubbles: true, cancelable: true }));
      form.dispatchEvent(new DragEvent('drop', { dataTransfer: data, bubbles: true, cancelable: true }));
      return shown;
    });
    console.log(`[R1-4] drop to thumbnail chip: ${dropMs.toFixed(1)} ms`);
    expect(dropMs).toBeLessThan(200);
    await expect(page.locator('.home-chip.image')).toContainText('sketch.png');
    await page.getByRole('button', { name: 'Remove sketch.png' }).click();

    const paste = (text: string) =>
      box.evaluate((element, value) => {
        const data = new DataTransfer();
        data.setData('text/plain', value);
        element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
      }, text);
    await box.focus();
    await paste('https://example.com');
    const chip = page.locator('.home-chip.reference');
    await expect(chip).toContainText('Use as reference');
    await expect(chip).toContainText('example.com');
    await expect(box).toHaveValue('');
    await page.getByRole('button', { name: 'Remove example.com' }).click();

    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
    await paste(url);
    await expect(chip).toContainText('127.0.0.1');
    await box.fill(LONG_PROMPT);
    const before = new Set((await api.projects()).map((project) => project.id));
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.locator('.topbar')).toBeVisible();
    const created = (await api.projects()).find((project) => !before.has(project.id));
    if (!created) throw new Error('project missing');
    const [run] = await api.waitForRuns(created.id, 1);
    const detail = await api.call<{ sent: RunSentRecord[] }>('GET', `/api/runs/${run?.id}`);
    expect(detail.sent[0]?.text).toContain('<reference-page');
    expect(detail.sent[0]?.text).toContain('Tune-ups in 48 hours');
    expect(detail.sent[0]?.text).toContain('Flat fix from $12.');
    await trashAll(api, [created.id]);
  } finally {
    server.close();
  }
});

test('R1-5, R1-8: 3 letters filter 50 projects in under 50 ms, / focuses search, and keys alone open the third project in 4 presses', async ({ page }) => {
  const api = await openHome(page);
  const made: string[] = [];
  for (let index = 0; index < 50; index += 1) {
    const { project } = await api.call<{ project: Project }>('POST', '/api/projects', { prompt: `Search fixture ${index} ${index % 5 === 0 ? 'zephyr' : 'plain'} page`, kind: 'html', startRun: false });
    made.push(project.id);
  }
  try {
    await goHome(page);
    await expect(page.locator('.project-card[data-project-id]')).not.toHaveCount(0);
    expect(await page.locator('.project-card[data-project-id]').count()).toBeGreaterThanOrEqual(50);

    await page.getByRole('heading', { name: 'Recent projects' }).click();
    await page.keyboard.press('/');
    const search = page.getByRole('searchbox', { name: 'Search projects' });
    await expect(search).toBeFocused();

    const filterMs = await search.evaluate(async (element) => {
      const input = element as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      const started = performance.now();
      setter?.call(input, 'zep');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const elapsed = performance.now() - started;
      return { elapsed, shown: document.querySelectorAll('.project-card[data-project-id]').length };
    });
    console.log(`[R1-5] filter 50+ projects with 3 letters: ${filterMs.elapsed.toFixed(1)} ms, ${filterMs.shown} shown`);
    expect(filterMs.shown).toBe(10);
    expect(filterMs.elapsed).toBeLessThan(50);

    await search.fill('');
    await search.focus();
    const third = await page.locator('.project-card[data-project-id]').nth(2).getAttribute('data-project-id');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect(page.locator('.topbar')).toBeVisible();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('design-studio.ui.v1') ?? '{}').activeProjectId)).toBe(third);
  } finally {
    await trashAll(api, made);
  }
});
