import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { Project, StudioEvent } from '../../../src/shared/contracts';
import { BASE_URL, readState } from '../../support/server';
import { createProjectViaUi, frontFrame, mainDirection, openHome, type StudioApi } from '../../support/studio';
import { p50, p95, saveResult } from './helpers';

const SAMPLES = 15;
const EXTRA_FILES = 3000;

const PAINT_PROBE = () => {
  const w = window as unknown as { __painted: { token: string; receivedAt: number }[] };
  w.__painted = [];
  window.addEventListener('message', (event) => {
    const data = event.data as { ns?: string; type?: string; token?: string } | null;
    if (data?.ns === 'studio' && data.type === 'painted') w.__painted.push({ token: data.token ?? '', receivedAt: Date.now() });
  });
};

class EventTap {
  readonly events: { receivedAt: number; event: StudioEvent }[] = [];
  private readonly controller = new AbortController();

  constructor(pid: string, token: string) {
    void this.read(pid, token);
  }

  private async read(pid: string, token: string): Promise<void> {
    try {
      const res = await fetch(`${BASE_URL}/api/projects/${pid}/events?token=${token}&after=0`, { signal: this.controller.signal });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) return;
        buffer += decoder.decode(value, { stream: true });
        let index = buffer.indexOf('\n\n');
        while (index >= 0) {
          const chunk = buffer.slice(0, index);
          buffer = buffer.slice(index + 2);
          const data = chunk.split('\n').find((line) => line.startsWith('data: '));
          if (data) this.events.push({ receivedAt: Date.now(), event: JSON.parse(data.slice(6)) as StudioEvent });
          index = buffer.indexOf('\n\n');
        }
      }
    } catch {
      return;
    }
  }

  async firstAfter(type: StudioEvent['type'], after: number, timeoutMs = 20_000): Promise<number> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const hit = this.events.find((entry) => entry.event.type === type && entry.receivedAt >= after);
      if (hit) return hit.receivedAt;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    return NaN;
  }

  close(): void {
    this.controller.abort();
  }
}

async function frontToken(page: Page): Promise<string> {
  const src = (await page.locator('iframe.frame.front').getAttribute('src')) ?? '';
  return new URL(src).searchParams.get('__studio_token') ?? '';
}

async function paintedAfter(page: Page, token: string, after: number): Promise<number> {
  const handle = await page.waitForFunction(
    ([t, a]) => {
      const w = window as unknown as { __painted: { token: string; receivedAt: number }[] };
      return w.__painted.find((entry) => entry.token === t && entry.receivedAt >= (a as number))?.receivedAt ?? null;
    },
    [token, after] as const,
  );
  return (await handle.jsonValue()) as number;
}

async function timeStatus(api: StudioApi, pid: string): Promise<number[]> {
  const out: number[] = [];
  for (let i = 0; i < 10; i += 1) {
    const t0 = performance.now();
    await api.status(pid, 'main');
    out.push(performance.now() - t0);
  }
  return out;
}

function timeGitAdd(project: Project): number[] {
  const gitDir = path.join(readState().dataDir, 'projects', project.id, 'git');
  const env = { ...process.env, GIT_DIR: gitDir, GIT_WORK_TREE: mainDirection(project).workTree, GIT_INDEX_FILE: path.join(gitDir, 'index-main') };
  const out: number[] = [];
  for (let i = 0; i < 10; i += 1) {
    const t0 = performance.now();
    execFileSync('git', ['add', '-A', '--', '.'], { cwd: mainDirection(project).workTree, env });
    out.push(performance.now() - t0);
  }
  return out;
}

async function measure(page: Page, api: StudioApi, project: Project) {
  const file = path.join(mainDirection(project).workTree, 'index.html');
  const original = readFileSync(file, 'utf8');
  const tap = new EventTap(project.id, api.token);
  await page.waitForTimeout(500);
  const paint: number[] = [];
  const filesChanged: number[] = [];
  const statusChanged: number[] = [];
  for (let i = 0; i < SAMPLES; i += 1) {
    const text = `Scale sample ${i}`;
    await page.waitForTimeout(Number(process.env.AC48_GAP_MS ?? 700));
    const t0 = Date.now();
    writeFileSync(file, original.replace(/<h1>[^<]*<\/h1>/, `<h1>${text}</h1>`));
    await expect(frontFrame(page).locator('h1')).toHaveText(text);
    paint.push((await paintedAfter(page, await frontToken(page), t0)) - t0);
    filesChanged.push((await tap.firstAfter('files.changed', t0)) - t0);
    statusChanged.push((await tap.firstAfter('status.changed', t0)) - t0);
  }
  tap.close();
  await page.waitForTimeout(1000);
  const status = await timeStatus(api, project.id);
  const gitAdd = timeGitAdd(project);
  const summarize = (values: number[]) => ({ p50: Math.round(p50(values)), p95: Math.round(p95(values)), samples: values.map(Math.round) });
  return { paint: summarize(paint), filesChanged: summarize(filesChanged), statusChanged: summarize(statusChanged), getStatus: summarize(status), gitAddAll: summarize(gitAdd) };
}

test('AC-48: single-file change cost does not grow with 3,000 extra files', async ({ page }) => {
  test.setTimeout(600_000);
  await page.addInitScript(PAINT_PROBE);
  const api = await openHome(page);

  const small = await createProjectViaUi(page, api, 'Scale small', 'html');
  await api.waitForRuns(small.id, 1);
  await expect(frontFrame(page).locator('h1')).toHaveText('Scale small');
  const smallResult = await measure(page, api, small);

  await page.getByRole('button', { name: 'Projects' }).click();
  const large = await createProjectViaUi(page, api, 'Scale large', 'html');
  await api.waitForRuns(large.id, 1);
  await expect(frontFrame(page).locator('h1')).toHaveText('Scale large');
  const root = mainDirection(large).workTree;
  for (let i = 0; i < EXTRA_FILES; i += 1) {
    const dir = path.join(root, 'bulk', `d${String(i % 30).padStart(2, '0')}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, `f${i}.txt`), `extra file ${i}\n${'x'.repeat(200)}\n`);
  }
  const coldStart = performance.now();
  await expect.poll(async () => (await api.status(large.id, 'main')).changed.length, { timeout: 120_000 }).toBeGreaterThanOrEqual(EXTRA_FILES);
  const coldStatusMs = performance.now() - coldStart;
  await api.call('POST', `/api/projects/${large.id}/d/main/keep`);
  await expect.poll(async () => (await api.status(large.id, 'main')).dirty, { timeout: 60_000 }).toBe(false);
  await page.reload();
  await expect(frontFrame(page).locator('h1')).toHaveText('Scale large');
  const largeResult = await measure(page, api, large);

  const result = { extraFiles: EXTRA_FILES, samples: SAMPLES, coldStatusMsAfterAdding3000: Math.round(coldStatusMs), small: smallResult, large: largeResult };
  saveResult(`ac48-${process.env.AC48_GAP_MS ?? 700}-${test.info().repeatEachIndex}`, result);
  console.log(`[ac48] ${JSON.stringify({ small: { paint: smallResult.paint.p95, files: smallResult.filesChanged.p95, status: smallResult.getStatus.p95, git: smallResult.gitAddAll.p95 }, large: { paint: largeResult.paint.p95, files: largeResult.filesChanged.p95, status: largeResult.getStatus.p95, git: largeResult.gitAddAll.p95 } })}`);
  expect.soft(largeResult.paint.p95).toBeLessThan(smallResult.paint.p95 * 1.5 + 50);
  expect.soft(largeResult.filesChanged.p95).toBeLessThan(smallResult.filesChanged.p95 * 1.5 + 20);
});
