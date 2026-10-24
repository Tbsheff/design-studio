import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, readlinkSync, realpathSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import type { Project, RunSummary, Version } from '../../../src/shared/contracts';
import { BASE_URL, PREVIEW_PORT, projectsDirFor, readState, ROOT, startServer, stopServer, writeState } from '../../support/server';
import { createProjectViaUi, frontFrame, headVersion, mainDirection, openHome, selectInFrame, sendPrompt, StudioApi, openFolderByPath } from '../../support/studio';

function listTree(dir: string, skip = new Set(['node_modules', 'dist'])): string[] {
  const out: string[] = [];
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.push(path.relative(dir, full));
    }
  };
  walk(dir);
  return out.sort();
}

async function exportVersion(api: StudioApi, pid: string, vid: string, dest: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/projects/${pid}/versions/${vid}/export`, { headers: { 'x-studio-token': api.token } });
  expect(res.status).toBe(200);
  mkdirSync(dest, { recursive: true });
  const zip = path.join(dest, '..', `${path.basename(dest)}.zip`);
  writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
  execFileSync('unzip', ['-q', zip, '-d', dest]);
}

function log(label: string, value: unknown): void {
  console.log(`[ac-core] ${label}: ${typeof value === 'string' ? value : JSON.stringify(value)}`);
}

test('AC-01 AC-02 AC-03: create HTML from a text prompt, no deps and no build', async ({ page }) => {
  const api = await openHome(page);
  await expect(page.getByRole('radiogroup', { name: 'Project kind' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'HTML' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'React + Vite' })).toBeVisible();
  const prompt = 'Harbor Street Coffee Roasters';
  const started = Date.now();
  const project = await createProjectViaUi(page, api, prompt, 'html');
  expect(project.kind).toBe('html');
  const main = mainDirection(project);
  await expect(frontFrame(page).locator('h1')).toHaveText(prompt);
  const renderMs = Date.now() - started;
  const runs = await api.waitForRuns(project.id, 1);
  expect(runs[0]?.request.prompt).toBe(prompt);
  expect(runs[0]?.status).toBe('completed');
  const files = listTree(main.workTree, new Set());
  log('AC-03 html work tree', files);
  expect(files).not.toContain('package.json');
  expect(existsSync(path.join(main.workTree, 'node_modules'))).toBe(false);
  expect(readFileSync(path.join(main.workTree, project.entry), 'utf8')).toContain(prompt);
  const preview = (await api.preview(project.id, main.id)).url;
  log('AC-03 preview url', preview);
  expect(new URL(preview).port).toBe(String(PREVIEW_PORT));
  const served = await fetch(preview);
  expect(served.status).toBe(200);
  expect(await served.text()).toContain(prompt);
  log('AC-01 create-to-h1 ms', renderMs);
});

test('AC-02 AC-04: React/Vite project uses standard conventions and npm run build works on an export', async ({ page }) => {
  const api = await openHome(page);
  const prompt = 'Northwind Trail Maps';
  const project = await createProjectViaUi(page, api, prompt, 'react');
  expect(project.kind).toBe('react');
  const main = mainDirection(project);
  await expect(frontFrame(page).locator('h1')).toHaveText(prompt, { timeout: 60_000 });
  await api.waitForRuns(project.id, 1);
  const files = listTree(main.workTree);
  log('AC-04 react work tree', files);
  for (const required of ['package.json', 'index.html', 'tsconfig.json', 'vite.config.ts', 'src/main.tsx', 'src/App.tsx']) expect(files).toContain(required);
  const pkg = JSON.parse(readFileSync(path.join(main.workTree, 'package.json'), 'utf8')) as { scripts: Record<string, string>; dependencies: Record<string, string>; devDependencies: Record<string, string> };
  log('AC-04 scripts', pkg.scripts);
  expect(pkg.scripts.dev).toMatch(/\bvite\b/);
  expect(pkg.scripts.build).toMatch(/vite build/);
  expect(Object.keys(pkg.dependencies)).toEqual(expect.arrayContaining(['react', 'react-dom']));
  expect(Object.keys(pkg.devDependencies)).toEqual(expect.arrayContaining(['vite', 'typescript', '@vitejs/plugin-react']));
  expect(readFileSync(path.join(main.workTree, 'src', 'main.tsx'), 'utf8')).toMatch(/createRoot/);
  const preview = (await api.preview(project.id, main.id)).url;
  expect(new URL(preview).port).not.toBe(String(PREVIEW_PORT));

  const head = await headVersion(api, project.id, main.id);
  const dest = path.join(readState().workDir, `export-${project.id}`);
  await exportVersion(api, project.id, head.id, dest);
  const exported = listTree(dest);
  log('AC-04 exported files', exported);
  expect(exported).toContain('package.json');
  expect(exported.some((file) => file.includes('data-studio'))).toBe(false);
  const exportedLink = path.join(dest, 'node_modules');
  const linkInZip = existsSync(exportedLink) || readdirSync(dest).includes('node_modules');
  log('AC-04 export contains node_modules entry', linkInZip ? `yes -> ${readlinkSync(exportedLink)}` : 'no');
  expect(linkInZip).toBe(false);
  symlinkSync(path.join(ROOT, 'node_modules'), exportedLink, 'dir');
  const output = execFileSync('npm', ['run', 'build'], { cwd: dest, encoding: 'utf8' });
  log('AC-04 build tail', output.trim().split('\n').slice(-3).join(' | '));
  expect(existsSync(path.join(dest, 'dist', 'index.html'))).toBe(true);
  const assets = readdirSync(path.join(dest, 'dist', 'assets')).filter((name) => name.endsWith('.js'));
  expect(assets.length).toBeGreaterThan(0);
  expect(readFileSync(path.join(dest, 'dist', 'assets', assets[0] ?? ''), 'utf8')).toContain(prompt);
});

test('AC-05: open an existing create-vite style React project', async ({ page }) => {
  const { workDir } = readState();
  const folder = path.join(workDir, 'existing apps', 'create vite app');
  mkdirSync(path.join(folder, 'src'), { recursive: true });
  const files: Record<string, string> = {
    'package.json': JSON.stringify({ name: 'create-vite-app', private: true, version: '0.0.0', type: 'module', scripts: { dev: 'vite', build: 'tsc -b && vite build', preview: 'vite preview' }, dependencies: { react: '^19.0.0', 'react-dom': '^19.0.0' }, devDependencies: { '@types/react': '^19.0.0', '@types/react-dom': '^19.0.0', '@vitejs/plugin-react': '^5.0.0', typescript: '^5.6.0', vite: '^7.0.0' } }, null, 2),
    'index.html': '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <title>Existing</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>\n',
    'tsconfig.json': JSON.stringify({ files: [], references: [{ path: './tsconfig.app.json' }, { path: './tsconfig.node.json' }] }, null, 2),
    'tsconfig.app.json': JSON.stringify({ compilerOptions: { tsBuildInfoFile: './node_modules/.tmp/tsconfig.app.tsbuildinfo', target: 'ES2022', lib: ['ES2022', 'DOM', 'DOM.Iterable'], module: 'ESNext', moduleResolution: 'bundler', jsx: 'react-jsx', strict: true, skipLibCheck: true, noEmit: true, isolatedModules: true }, include: ['src'] }, null, 2),
    'tsconfig.node.json': JSON.stringify({ compilerOptions: { tsBuildInfoFile: './node_modules/.tmp/tsconfig.node.tsbuildinfo', target: 'ES2023', lib: ['ES2023'], module: 'ESNext', moduleResolution: 'bundler', strict: true, skipLibCheck: true, noEmit: true }, include: ['vite.config.ts'] }, null, 2),
    'vite.config.ts': "import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({\n  plugins: [react()],\n});\n",
    'src/main.tsx': "import { StrictMode } from 'react';\nimport { createRoot } from 'react-dom/client';\nimport App from './App';\nimport './index.css';\n\ncreateRoot(document.getElementById('root')!).render(\n  <StrictMode>\n    <App />\n  </StrictMode>,\n);\n",
    'src/App.tsx': "import { useState } from 'react';\n\nexport default function App() {\n  const [count, setCount] = useState(0);\n  return (\n    <main>\n      <h1>Existing Vite App</h1>\n      <button onClick={() => setCount((c) => c + 1)}>count is {count}</button>\n    </main>\n  );\n}\n",
    'src/index.css': 'body { font-family: system-ui; margin: 2rem; }\n',
  };
  for (const [rel, content] of Object.entries(files)) writeFileSync(path.join(folder, rel), content);
  symlinkSync(path.join(ROOT, 'node_modules'), path.join(folder, 'node_modules'), 'dir');

  const api = await openHome(page);
  await openFolderByPath(page, folder);
  await expect(page.locator('.topbar')).toBeVisible();
  const project = (await api.projects()).find((candidate) => candidate.imported?.sourcePath === realpathSync(folder));
  if (!project) throw new Error('imported project not found');
  expect(project.kind).toBe('react');
  expect(realpathSync(mainDirection(project).workTree)).toBe(realpathSync(folder));
  const frame = frontFrame(page);
  await expect(frame.locator('h1')).toHaveText('Existing Vite App', { timeout: 60_000 });
  await frame.locator('button').click();
  await expect(frame.locator('button')).toHaveText('count is 1');
  await selectInFrame(page, 'h1');
  await sendPrompt(page, 'Edited after open');
  await expect(frame.locator('h1')).toHaveText('Edited after open');
  await api.waitForRuns(project.id, 1);
  expect(readFileSync(path.join(folder, 'src', 'App.tsx'), 'utf8')).toContain('<h1>Edited after open</h1>');
  expect(readFileSync(path.join(folder, 'vite.config.ts'), 'utf8')).toBe(files['vite.config.ts']);
  const output = execFileSync('npm', ['run', 'build'], { cwd: folder, encoding: 'utf8' });
  log('AC-05 build tail', output.trim().split('\n').slice(-2).join(' | '));
  expect(existsSync(path.join(folder, 'dist', 'index.html'))).toBe(true);
});

test('AC-06 AC-07: generated source is real, editable on disk, and stored as plain files', async ({ page }) => {
  const api = await openHome(page);
  const prompt = 'Maple Grove Library';
  const project = await createProjectViaUi(page, api, prompt, 'html');
  const main = mainDirection(project);
  const frame = frontFrame(page);
  await expect(frame.locator('h1')).toHaveText(prompt);
  await api.waitForRuns(project.id, 1);
  const indexFile = path.join(main.workTree, 'index.html');
  const source = readFileSync(indexFile, 'utf8');
  log('AC-06 index.html lines', source.split('\n').length);
  expect(source).toMatch(/<!doctype html>/i);
  expect(source).toContain(`<h1>${prompt}</h1>`);
  expect(source).not.toContain('data-studio-loc');
  writeFileSync(indexFile, source.replace(`<h1>${prompt}</h1>`, '<h1>Hand edited in a text editor</h1>'));
  await expect(frame.locator('h1')).toHaveText('Hand edited in a text editor');
  await expect(page.locator('.banner')).toContainText('Unfinished changes');
  await page.locator('.banner').getByRole('button', { name: 'Keep' }).click();
  await expect(page.locator('.banner')).toHaveCount(0);

  const react = await api.call<{ project: Project }>('POST', '/api/projects', { prompt: 'Editable React', kind: 'react' });
  await api.waitForRuns(react.project.id, 1);
  const appFile = path.join(mainDirection(react.project).workTree, 'src', 'App.tsx');
  const app = readFileSync(appFile, 'utf8');
  expect(app).toMatch(/export default function App/);
  expect(app).not.toContain('data-studio-loc');

  const { dataDir } = readState();
  const projectDir = path.join(dataDir, 'projects', project.id);
  const projectJson = JSON.parse(readFileSync(path.join(projectDir, 'project.json'), 'utf8')) as Project;
  expect(projectJson.id).toBe(project.id);
  expect(realpathSync(main.workTree).startsWith(realpathSync(projectsDirFor(dataDir)) + path.sep)).toBe(true);
  expect(existsSync(path.join(main.workTree, '.git'))).toBe(false);
  expect(statSync(indexFile).isFile()).toBe(true);
  const head = await headVersion(api, project.id, main.id);
  const gitEnv = { ...process.env, GIT_DIR: path.join(projectDir, 'git') };
  expect(execFileSync('git', ['cat-file', '-t', head.id], { env: gitEnv, encoding: 'utf8' }).trim()).toBe('commit');
  const committed = execFileSync('git', ['show', `${head.id}:index.html`], { env: gitEnv, encoding: 'utf8' });
  expect(committed).toContain('Hand edited in a text editor');
  const runFiles = readdirSync(path.join(projectDir, 'runs'));
  expect(runFiles.some((name) => name.endsWith('.jsonl'))).toBe(true);
  const allFiles = execFileSync('find', [dataDir, '-type', 'f', '-not', '-path', '*/git/objects/*', '-not', '-path', '*/node_modules/*'], { encoding: 'utf8' }).trim().split('\n');
  const blobs = allFiles.filter((file) => /\.(db|sqlite|sqlite3|leveldb|ldb)$/i.test(file));
  log('AC-07 data files', { count: allFiles.length, dbFiles: blobs.length, top: readdirSync(projectDir) });
  expect(blobs).toEqual([]);
});

test('AC-14: failed and canceled runs keep the last completed version', async ({ page }) => {
  const api = await openHome(page);
  const prompt = 'Cedar Hill Bakery';
  const project = await createProjectViaUi(page, api, prompt, 'html');
  const main = mainDirection(project);
  const frame = frontFrame(page);
  await expect(frame.locator('h1')).toHaveText(prompt);
  await api.waitForRuns(project.id, 1);
  const completed = await headVersion(api, project.id, main.id);
  const indexFile = path.join(main.workTree, 'index.html');
  const completedHtml = readFileSync(indexFile, 'utf8');
  const gitEnv = { ...process.env, GIT_DIR: path.join(readState().dataDir, 'projects', project.id, 'git') };
  const treeOf = (commit: string) => execFileSync('git', ['rev-parse', `${commit}^{tree}`], { env: gitEnv, encoding: 'utf8' }).trim();
  const completedTree = treeOf(completed.id);

  await sendPrompt(page, '[fail] Add an opening hours table');
  const runs = await api.waitForRuns(project.id, 2);
  const failed = runs.find((run) => run.request.prompt.startsWith('[fail]')) as RunSummary;
  log('AC-14 failed run', { status: failed.status, error: failed.error, versionId: failed.versionId });
  expect(failed.status).toBe('failed');
  expect(failed.versionId).toBeNull();
  expect((await headVersion(api, project.id, main.id)).id).toBe(completed.id);
  expect(treeOf(completed.id)).toBe(completedTree);
  const versionPreview = await api.call<{ url: string }>('GET', `/api/projects/${project.id}/versions/${completed.id}/preview`);
  expect(await (await fetch(versionPreview.url)).text()).toContain(prompt);
  await expect(page.locator('.status.failed')).toHaveCount(1);
  if ((await api.status(project.id, main.id)).dirty) {
    await page.getByRole('radio', { name: 'Last completed' }).click();
    await expect(frame.locator('h1')).toHaveText(prompt);
    await page.getByRole('radio', { name: 'Live', exact: true }).click();
    await page.locator('.banner').getByRole('button', { name: 'Discard' }).click();
  }
  await expect.poll(() => readFileSync(indexFile, 'utf8')).toBe(completedHtml);

  await sendPrompt(page, '[slow] Add a long event schedule');
  await expect.poll(() => readFileSync(indexFile, 'utf8') !== completedHtml, { timeout: 15_000, intervals: [50] }).toBe(true);
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect.poll(async () => (await api.runs(project.id)).find((run) => run.request.prompt.startsWith('[slow]'))?.status).toBe('canceled');
  expect((await headVersion(api, project.id, main.id)).id).toBe(completed.id);
  expect(treeOf(completed.id)).toBe(completedTree);
  await page.getByRole('radio', { name: 'Last completed' }).click();
  await expect(frame.locator('h1')).toHaveText(prompt);
  await page.getByRole('radio', { name: 'Live', exact: true }).click();
  await page.locator('.banner').getByRole('button', { name: 'Discard' }).click();
  await expect.poll(() => readFileSync(indexFile, 'utf8')).toBe(completedHtml);
  const versions = await api.versions(project.id, main.id);
  log('AC-14 versions after fail+cancel', versions.map((version) => [version.id.slice(0, 7), version.meta.kind]));
  expect(versions.map((version) => version.id)).toContain(completed.id);
});

test('AC-16 (settings API): all settings are accepted on create and can change later', async ({ page }) => {
  const api = await openHome(page);
  const created = await api.call<{ project: Project }>('POST', '/api/projects', {
    prompt: 'Settings probe',
    kind: 'html',
    settings: { model: 'claude-haiku-5-5', maxBudgetUsd: 0.25, maxTurns: 5, allowBash: true, allowInstall: true },
  });
  await api.waitForRuns(created.project.id, 1);
  const stored = (await api.project(created.project.id)).settings;
  log('AC-16 stored settings', stored);
  expect(stored).toEqual({ model: 'claude-haiku-5-5', maxBudgetUsd: 0.25, maxTurns: 5, allowBash: true, allowInstall: true, disabledSkills: [], defaultLevel: 'prototype' });
  const route = `${BASE_URL}/api/projects/${created.project.id}/settings`;
  const patch = (body: unknown) => fetch(route, { method: 'PATCH', headers: { 'x-studio-token': api.token, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const ok = await patch({ allowBash: false, allowInstall: false, maxTurns: 9 });
  expect(ok.status).toBe(200);
  expect((await api.project(created.project.id)).settings).toEqual({ model: 'claude-haiku-5-5', maxBudgetUsd: 0.25, maxTurns: 9, allowBash: false, allowInstall: false, disabledSkills: [], defaultLevel: 'prototype' });
  expect((await patch({ maxBudgetUsd: 100 })).status).toBe(400);
  expect((await patch({ allowBash: 'yes' })).status).toBe(400);
});

test('AC-08: restart keeps designs, history and settings', async ({ page }) => {
  const api = await openHome(page);
  const settings = { model: 'claude-haiku-5-5', maxBudgetUsd: 0.75, maxTurns: 7 };
  const { project } = await api.call<{ project: Project }>('POST', '/api/projects', { prompt: 'Restart Settings Studio', kind: 'html', settings });
  await api.waitForRuns(project.id, 1);
  const main = mainDirection(project);
  await api.call('POST', `/api/projects/${project.id}/d/${main.id}/runs`, { prompt: 'Second pass copy', mode: 'edit' });
  await api.waitForRuns(project.id, 2);
  const head = (await api.project(project.id)).directions[0]?.headVersionId ?? '';
  const alt = await api.call<{ id: string }>('POST', `/api/projects/${project.id}/directions`, { fromVersionId: head, name: 'Alt' });
  await api.call('POST', `/api/projects/${project.id}/d/${alt.id}/runs`, { prompt: 'Alt copy', mode: 'edit' });
  await api.waitForRuns(project.id, 3);
  const indexHtml = readFileSync(path.join(main.workTree, 'index.html'), 'utf8');

  const snapshot = async (client: StudioApi) => {
    const current = await client.project(project.id);
    const versions: Record<string, Version[]> = {};
    for (const direction of current.directions) versions[direction.id] = await client.versions(project.id, direction.id);
    const runs = (await client.runs(project.id)).map((run) => ({ id: run.id, status: run.status, prompt: run.request.prompt, finalText: run.finalText, versionId: run.versionId, sessionId: run.sessionId }));
    return { project: current, versions, runs };
  };
  const before = await snapshot(api);
  expect(before.project.settings).toMatchObject(settings);

  const state = readState();
  await stopServer(state.pid);
  await expect.poll(() => fetch(`${BASE_URL}/`).then(() => 'up', () => 'down')).toBe('down');
  const { pid } = await startServer(state.dataDir);
  writeState({ ...state, pid });

  await page.goto('/');
  const token = (await page.locator('meta[name="studio-token"]').getAttribute('content')) ?? '';
  const fresh = new StudioApi(token);
  const after = await snapshot(fresh);
  log('AC-08 settings after restart', after.project.settings);
  expect(after).toEqual(before);
  expect(readFileSync(path.join(main.workTree, 'index.html'), 'utf8')).toBe(indexHtml);
  await page.evaluate((pid) => localStorage.setItem('design-studio.ui.v1', JSON.stringify({ activeProjectId: pid })), project.id);
  await page.reload();
  await expect(page.locator('.topbar')).toContainText('Restart Settings Studio');
  await expect(page.locator('.msg.user .msg-body').first()).toHaveText('Restart Settings Studio');
  await expect(frontFrame(page).locator('h1')).toHaveText('Restart Settings Studio');
});
