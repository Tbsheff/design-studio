import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { readState, ROOT } from './support/server';
import { frontFrame, mainDirection, openHome, selectInFrame, sendPrompt, openFolderByPath } from './support/studio';

const EDIT_PROMPT = 'Imported and edited';

function snapshotTree(dir: string, skip: Set<string>): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      const rel = path.relative(dir, full);
      if (skip.has(rel)) continue;
      if (entry.isSymbolicLink()) out.set(rel, `link:${realpathSync(full)}`);
      else if (entry.isDirectory()) {
        out.set(`${rel}/`, 'dir');
        walk(full);
      } else out.set(rel, createHash('sha256').update(readFileSync(full)).digest('hex'));
    }
  };
  walk(dir);
  return out;
}

function diffTrees(before: Map<string, string>, after: Map<string, string>): { added: string[]; removed: string[]; changed: string[] } {
  const added = [...after.keys()].filter((key) => !before.has(key));
  const removed = [...before.keys()].filter((key) => !after.has(key));
  const changed = [...after.keys()].filter((key) => before.has(key) && before.get(key) !== after.get(key));
  return { added, removed, changed };
}

function nodeModulesViteCache(): string {
  const cache = path.join(ROOT, 'node_modules', '.vite');
  try {
    return String(statSync(cache).mtimeMs);
  } catch {
    return 'absent';
  }
}

test('C: import a Vite folder, edit via studio, build it, nothing else touched', async ({ page }) => {
  const { workDir } = readState();
  const sandbox = path.join(workDir, 'import-sandbox');
  const folder = path.join(sandbox, 'my vite app');
  mkdirSync(sandbox, { recursive: true });
  writeFileSync(path.join(sandbox, 'neighbor.txt'), 'do not touch\n');
  cpSync(path.join(ROOT, 'src', 'server', 'templates', 'react-vite'), folder, { recursive: true });
  symlinkSync(path.join(ROOT, 'node_modules'), path.join(folder, 'node_modules'), 'dir');
  const sandboxBefore = snapshotTree(sandbox, new Set([path.join('my vite app', 'node_modules')]));
  const viteCacheBefore = nodeModulesViteCache();

  const api = await openHome(page);
  await openFolderByPath(page, folder);
  await expect(page.locator('.topbar')).toBeVisible();
  const project = (await api.projects()).find((candidate) => candidate.imported?.sourcePath === realpathSync(folder));
  if (!project) throw new Error('imported project not found');
  expect(project.kind).toBe('react');
  const main = mainDirection(project);
  expect(realpathSync(main.workTree)).toBe(realpathSync(folder));

  const frame = frontFrame(page);
  await expect(frame.locator('h1')).toHaveText('Start here', { timeout: 60_000 });
  await selectInFrame(page, 'h1');
  await sendPrompt(page, EDIT_PROMPT);
  await expect(frame.locator('h1')).toHaveText(EDIT_PROMPT);
  await api.waitForRuns(project.id, 1);

  const sandboxAfter = snapshotTree(sandbox, new Set([path.join('my vite app', 'node_modules')]));
  const delta = diffTrees(sandboxBefore, sandboxAfter);
  expect(delta.added).toEqual([]);
  expect(delta.removed).toEqual([]);
  expect(delta.changed).toEqual([path.join('my vite app', 'src', 'App.tsx')]);
  expect(lstatSync(path.join(folder, 'node_modules')).isSymbolicLink()).toBe(true);
  expect(nodeModulesViteCache()).toBe(viteCacheBefore);
  const app = readFileSync(path.join(folder, 'src', 'App.tsx'), 'utf8');
  expect(app).toContain(`<h1>${EDIT_PROMPT}</h1>`);
  expect(app).not.toContain('data-studio-loc');

  const output = execFileSync('npx', ['vite', 'build'], { cwd: folder, encoding: 'utf8' });
  expect(output).toMatch(/built in/);
  const assetsDir = path.join(folder, 'dist', 'assets');
  const builtJs = readdirSync(assetsDir).filter((name) => name.endsWith('.js'));
  expect(builtJs.length).toBeGreaterThan(0);
  const bundle = readFileSync(path.join(assetsDir, builtJs[0] ?? ''), 'utf8');
  expect(bundle).toContain(EDIT_PROMPT);
  expect(bundle).not.toContain('data-studio-loc');
  expect(bundle).not.toContain('__studio');
  const outsideAfterBuild = snapshotTree(sandbox, new Set(['my vite app']));
  const outsideBefore = new Map([...sandboxBefore].filter(([key]) => !key.startsWith('my vite app')));
  expect(diffTrees(outsideBefore, outsideAfterBuild)).toEqual({ added: [], removed: [], changed: [] });
});
