import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { buildUserText } from '../../../src/server/agent/user-message';
import { frontFrame, mainDirection, selectInFrame, sendPrompt } from '../../support/studio';
import { artboardTransform, createProject, evidence, previewFrame, readState, runFile } from '../../../scripts/ac-edit/helpers';

function appSource(heading: string, extra = ''): string {
  return `export default function App() {
  return (
    <main className="page">
      <section className="hero">
        <h1>${heading}</h1>
        <p>Stable paragraph text.</p>
        <button type="button" className="cta">Primary</button>${extra}
      </section>
    </main>
  );
}
`;
}

function listenerPid(port: number): string {
  try {
    return execFileSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'], { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

async function marker(page: Page, origin: string): Promise<number | undefined> {
  const frame = await previewFrame(page, origin);
  return frame.evaluate(() => (window as unknown as { __acMarker?: number }).__acMarker);
}

test('AC-19 React edits use HMR on one dev server with no full reload', async ({ page }) => {
  const { api, project } = await createProject(page, 'Five Edit Hmr', 'react');
  const main = mainDirection(project);
  const frame = frontFrame(page);
  await expect(frame.locator('h1')).toHaveText('Five Edit Hmr', { timeout: 90_000 });
  const previewUrl = (await api.preview(project.id, main.id)).url;
  const origin = new URL(previewUrl).origin;
  const port = Number(new URL(previewUrl).port);
  const serverPid = readState().pid;
  const pidBefore = listenerPid(port);
  const vite = await previewFrame(page, origin);
  await vite.evaluate(() => {
    (window as unknown as { __acMarker?: number }).__acMarker = 42;
  });
  const navigations: string[] = [];
  page.on('framenavigated', (navigated) => {
    if (navigated.url().startsWith(origin)) navigations.push(navigated.url());
  });
  const srcBefore = await page.locator('iframe.frame.front').getAttribute('src');
  const appFile = path.join(main.workTree, 'src', 'App.tsx');
  const perEdit: { edit: number; port: number; pid: string; marker: number | undefined; frames: number; src: boolean; ms: number }[] = [];
  for (let edit = 1; edit <= 5; edit += 1) {
    const started = Date.now();
    writeFileSync(appFile, appSource(`Hmr edit ${edit}`));
    await expect(frame.locator('h1')).toHaveText(`Hmr edit ${edit}`);
    const nowUrl = (await api.preview(project.id, main.id)).url;
    perEdit.push({
      edit,
      port: Number(new URL(nowUrl).port),
      pid: listenerPid(port),
      marker: await marker(page, origin),
      frames: await page.locator('iframe.frame').count(),
      src: (await page.locator('iframe.frame.front').getAttribute('src')) === srcBefore,
      ms: Date.now() - started,
    });
  }
  evidence('AC-19', { port, serverPid, pidBefore, perEdit, navigations });
  const parentOfListener = execFileSync('ps', ['-o', 'ppid=', '-p', pidBefore], { encoding: 'utf8' }).trim();
  const grandparentOfListener = execFileSync('ps', ['-o', 'ppid=', '-p', parentOfListener], { encoding: 'utf8' }).trim();
  evidence('AC-19-pid', { serverPid, listenerPid: pidBefore, parentOfListener, grandparentOfListener });
  expect(pidBefore).not.toBe(String(serverPid));
  expect([parentOfListener, grandparentOfListener]).toContain(String(serverPid));
  for (const row of perEdit) {
    expect(row.port).toBe(port);
    expect(row.pid).toBe(pidBefore);
    expect(row.marker).toBe(42);
    expect(row.frames).toBe(1);
    expect(row.src).toBe(true);
  }
  expect(navigations).toEqual([]);
});

test('AC-20 HMR update keeps zoom, viewport, chat scroll, draft and selection', async ({ page }) => {
  const { api, project } = await createProject(page, 'Hmr State', 'react');
  const main = mainDirection(project);
  const frame = frontFrame(page);
  await expect(frame.locator('h1')).toHaveText('Hmr State', { timeout: 90_000 });
  for (let index = 1; index <= 4; index += 1) {
    await sendPrompt(page, `Heading filler ${index} with a few more words so the chat panel grows taller than its box`);
    await api.waitForRuns(project.id, index + 1);
  }
  await expect(frame.locator('h1')).toContainText('Heading filler 4');
  await page.getByRole('radio', { name: 'Mobile 390' }).click();
  await page.getByLabel('Zoom', { exact: true }).selectOption('1.25');
  const stage = await page.locator('.stage').boundingBox();
  if (!stage) throw new Error('no stage');
  await page.mouse.move(stage.x + 5, stage.y + stage.height - 5);
  await page.mouse.wheel(-30, 50);
  const chat = page.locator('.chat');
  const scrollable = await chat.evaluate((el) => el.scrollHeight > el.clientHeight + 20);
  await chat.evaluate((el) => {
    el.scrollTop = 30;
  });
  await selectInFrame(page, 'section.hero p');
  await page.getByRole('button', { name: /^Select/ }).click();
  await page.getByPlaceholder('Describe a change').fill('react draft survives');
  const origin = new URL((await api.preview(project.id, main.id)).url).origin;
  const vite = await previewFrame(page, origin);
  await vite.evaluate(() => {
    (window as unknown as { __acMarker?: number }).__acMarker = 7;
  });
  const snapshot = async () => ({
    viewport: await page.locator('[role="radiogroup"][aria-label="Viewport"] [aria-checked="true"]').textContent(),
    zoom: await page.getByLabel('Zoom', { exact: true }).inputValue(),
    transform: await artboardTransform(page),
    chatScrollTop: await chat.evaluate((el) => el.scrollTop),
    draft: await page.getByPlaceholder('Describe a change').inputValue(),
    chips: await page.locator('.chip').count(),
    selectedBoxes: await page.locator('.overlay .box.selected').count(),
  });
  const before = await snapshot();
  const appFile = path.join(main.workTree, 'src', 'App.tsx');
  writeFileSync(appFile, readFileSync(appFile, 'utf8').replace(/<h1>[^<]*<\/h1>/, '<h1>Hmr state updated</h1>'));
  await expect(frame.locator('h1')).toHaveText('Hmr state updated');
  await api.call('POST', `/api/projects/${project.id}/d/${main.id}/keep`);
  await expect(page.locator('.banner')).toHaveCount(0);
  await page.waitForTimeout(300);
  const after = await snapshot();
  const markerAfter = await marker(page, origin);
  evidence('AC-20-hmr', { scrollable, before, after, markerAfter });
  expect(markerAfter).toBe(7);
  expect(after).toEqual(before);
  expect(scrollable).toBe(true);
});

test('AC-23 React syntax error shows file and line in the studio', async ({ page }) => {
  const { project } = await createProject(page, 'Broken Build', 'react');
  const main = mainDirection(project);
  await expect(frontFrame(page).locator('h1')).toHaveText('Broken Build', { timeout: 90_000 });
  const appFile = path.join(main.workTree, 'src', 'App.tsx');
  const broken = `export default function App() {\n  const value = ;\n  return <main><h1>Broken</h1></main>;\n}\n`;
  writeFileSync(appFile, broken);
  const panel = page.getByRole('region', { name: 'Preview errors' });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('App.tsx:2');
  const items = await panel.locator('li').allTextContents();
  await panel.locator('li', { hasText: 'App.tsx:2' }).first().getByRole('button', { name: 'Send to agent' }).click();
  const draft = await page.getByPlaceholder('Describe a change').inputValue();
  writeFileSync(appFile, appSource('Fixed again'));
  await expect(frontFrame(page).locator('h1')).toHaveText('Fixed again', { timeout: 30_000 });
  evidence('AC-23-react', { items, draft });
  expect(items.join('\n')).toMatch(/App\.tsx:2/);
  expect(draft).toMatch(/App\.tsx:2/);
});

test('AC-27 and AC-32 React selection carries DOM, styles, source and edits the element', async ({ page }) => {
  const { api, project } = await createProject(page, 'React Select', 'react');
  const main = mainDirection(project);
  const frame = frontFrame(page);
  await expect(frame.locator('h1')).toHaveText('React Select', { timeout: 90_000 });
  const appFile = path.join(main.workTree, 'src', 'App.tsx');
  writeFileSync(appFile, appSource('React Select'));
  await expect(frame.locator('button.cta')).toHaveText('Primary');
  await api.call('POST', `/api/projects/${project.id}/d/${main.id}/keep`);
  const before = readFileSync(appFile, 'utf8');
  await selectInFrame(page, 'button.cta');
  await sendPrompt(page, 'color #c00');
  const runs = await api.waitForRuns(project.id, 2);
  const run = runs.find((candidate) => candidate.request.prompt === 'color #c00');
  if (!run) throw new Error('run missing');
  await expect.poll(() => frame.locator('button.cta').evaluate((el) => getComputedStyle(el).color)).toBe('rgb(204, 0, 0)');
  const h1Color = await frame.locator('h1').evaluate((el) => getComputedStyle(el).color);
  const after = readFileSync(appFile, 'utf8');
  const stored = runFile(project.id, run.id);
  const selection = stored.request.selection?.[0];
  const userText = buildUserText({ request: stored.request, designMd: '' });
  const changed = before.split('\n').filter((line, index) => line !== after.split('\n')[index]);
  evidence('AC-27-react', {
    runId: run.id,
    selectionSource: selection?.source,
    tag: selection?.tag,
    selector: selection?.selector,
    styleKeys: Object.keys(selection?.styles ?? {}),
    outerHTML: selection?.outerHTML,
    ancestors: selection?.ancestors,
    userText,
  });
  evidence('AC-32-react', { changedLines: changed, after: after.split('\n').filter((line) => line.includes('cta')), h1Color, versionKind: (await api.versions(project.id, main.id)).length });
  expect(selection?.source?.file).toBe('src/App.tsx');
  expect(selection?.source?.line).toBe(7);
  expect(Object.keys(selection?.styles ?? {}).length).toBeGreaterThan(3);
  expect(selection?.outerHTML).toContain('Primary');
  expect(userText).toContain('source: src/App.tsx:7:');
  expect(userText).toContain('styles: ');
  expect(userText).toContain('outerHTML:');
  expect(changed).toHaveLength(1);
  expect(changed[0]).toContain('className="cta"');
  expect(h1Color).not.toBe('rgb(204, 0, 0)');
});
