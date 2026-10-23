import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { createProjectViaUi, frontFrame, mainDirection, openHome, sendPrompt } from '../../support/studio';
import { frameByUrl, saveResult } from './helpers';

function listenerPid(port: number): number | null {
  try {
    const out = execFileSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'], { encoding: 'utf8' }).trim();
    return out ? Number(out.split('\n')[0]) : null;
  } catch {
    return null;
  }
}

test('AC-49: React dev server stays running between edits', async ({ page }) => {
  test.setTimeout(300_000);
  const api = await openHome(page);
  const project = await createProjectViaUi(page, api, 'Dev server stays', 'react');
  await api.waitForRuns(project.id, 1, 180_000);
  await expect(frontFrame(page).locator('h1')).toHaveText('Dev server stays', { timeout: 90_000 });
  const url = (await api.preview(project.id, 'main')).url;
  const port = Number(new URL(url).port);
  const pidBefore = listenerPid(port);
  const frame = await frameByUrl(page, new URL(url).origin);
  await frame.evaluate(() => {
    (window as unknown as { __acMarker: number }).__acMarker = 4949;
  });
  const navBefore = await frame.evaluate(() => performance.getEntriesByType('navigation').length + ':' + String(performance.timeOrigin));

  const app = path.join(mainDirection(project).workTree, 'src', 'App.tsx');
  const original = readFileSync(app, 'utf8');
  const checks: { step: string; url: string; pid: number | null; marker: unknown; timeOrigin: string }[] = [];
  for (let i = 0; i < 5; i += 1) {
    const text = `Direct edit ${i}`;
    writeFileSync(app, original.replace(/<h1>[^<]*<\/h1>/, `<h1>${text}</h1>`));
    await expect(frontFrame(page).locator('h1')).toHaveText(text);
    checks.push({
      step: `write ${i}`,
      url: (await api.preview(project.id, 'main')).url,
      pid: listenerPid(port),
      marker: await frame.evaluate(() => (window as unknown as { __acMarker?: number }).__acMarker ?? null),
      timeOrigin: await frame.evaluate(() => String(performance.timeOrigin)),
    });
  }
  for (let i = 0; i < 2; i += 1) {
    const text = `Mock run edit ${i}`;
    await sendPrompt(page, text);
    await api.waitForRuns(project.id, 2 + i);
    await expect(frontFrame(page).locator('h1')).toHaveText(text);
    checks.push({
      step: `mock run ${i}`,
      url: (await api.preview(project.id, 'main')).url,
      pid: listenerPid(port),
      marker: await frame.evaluate(() => (window as unknown as { __acMarker?: number }).__acMarker ?? null),
      timeOrigin: await frame.evaluate(() => String(performance.timeOrigin)),
    });
  }
  saveResult('ac49', { url, port, pidBefore, navBefore, checks });
  for (const check of checks) {
    expect(check.url).toBe(url);
    expect(check.pid).toBe(pidBefore);
    expect(check.marker).toBe(4949);
    expect(navBefore.endsWith(check.timeOrigin)).toBe(true);
  }
});
