import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import type { Project, Version } from '../../../src/shared/contracts';
import { BASE_URL, ROOT } from '../../support/server';
import { frontFrame, openHome, sendPrompt, openFolderByPath } from '../../support/studio';
import { diffTrees, saveResult, treeHash } from './helpers';

function gitInit(folder: string): void {
  const env = { ...process.env, GIT_AUTHOR_NAME: 'ac', GIT_AUTHOR_EMAIL: 'ac@example.test', GIT_COMMITTER_NAME: 'ac', GIT_COMMITTER_EMAIL: 'ac@example.test' };
  execFileSync('git', ['init', '-q'], { cwd: folder, env });
  writeFileSync(path.join(folder, '.gitignore'), 'node_modules\n');
  execFileSync('git', ['add', '-A'], { cwd: folder, env });
  execFileSync('git', ['commit', '-q', '-m', 'user commit'], { cwd: folder, env });
}

test('AC-54: imported React folder is never modified outside the agreed workspace', async ({ page }) => {
  test.setTimeout(300_000);
  const parent = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'ac54 parent ')));
  const folder = path.join(parent, 'user site');
  writeFileSync(path.join(parent, 'sibling.txt'), 'sibling\n');
  mkdirSync(path.join(parent, 'sibling-dir'));
  writeFileSync(path.join(parent, 'sibling-dir', 'note.md'), 'note\n');
  cpSync(path.join(ROOT, 'src', 'server', 'templates', 'react-vite'), folder, { recursive: true });
  symlinkSync(path.join(ROOT, 'node_modules'), path.join(folder, 'node_modules'), 'dir');
  gitInit(folder);

  const outsideFolder = (relative: string) => relative === 'user site' || relative.startsWith(`user site${path.sep}`);
  const parentBefore = treeHash(parent, outsideFolder);
  const gitBefore = treeHash(path.join(folder, '.git'));
  const folderBefore = treeHash(folder, (relative) => relative === '.git' || relative.startsWith(`.git${path.sep}`) || relative === 'node_modules');
  const userGitStatusBefore = execFileSync('git', ['--no-optional-locks', 'status', '--porcelain'], { cwd: folder, encoding: 'utf8' });

  const api = await openHome(page);
  await openFolderByPath(page, folder);
  await expect(page.locator('.topbar')).toBeVisible();
  const project = (await api.projects()).find((candidate) => candidate.imported?.sourcePath === folder) as Project;
  expect(project).toBeTruthy();
  await expect(frontFrame(page).locator('h1')).toBeVisible({ timeout: 90_000 });

  await sendPrompt(page, 'Imported edit one');
  await api.waitForRuns(project.id, 1);
  await expect(frontFrame(page).locator('h1')).toHaveText('Imported edit one');
  await sendPrompt(page, 'Imported edit two');
  await api.waitForRuns(project.id, 2);
  await expect(frontFrame(page).locator('h1')).toHaveText('Imported edit two');
  await api.call('PUT', `/api/projects/${project.id}/design-md`, { content: '# Design\nPrimary #0B6E4F\n' });
  await api.call('POST', `/api/projects/${project.id}/d/main/check`);
  await api.call('POST', `/api/projects/${project.id}/d/main/undo`);
  const versions = await api.versions(project.id, 'main');
  const head = versions[0] as Version;
  const direction = await api.call<{ id: string }>('POST', `/api/projects/${project.id}/directions`, { fromVersionId: head.id, name: 'Alt' });
  await api.preview(project.id, direction.id);
  await api.call('POST', `/api/projects/${project.id}/d/${direction.id}/runs`, { prompt: 'Edit in alt direction', mode: 'edit' });
  await api.waitForRuns(project.id, 3);
  const exportRes = await fetch(`${BASE_URL}/api/projects/${project.id}/versions/${head.id}/export`, { headers: { 'x-studio-token': api.token } });
  expect(exportRes.status).toBe(200);
  await page.waitForTimeout(1500);

  const parentAfter = treeHash(parent, outsideFolder);
  const gitAfter = treeHash(path.join(folder, '.git'));
  const folderAfter = treeHash(folder, (relative) => relative === '.git' || relative.startsWith(`.git${path.sep}`) || relative === 'node_modules');
  const userGitStatusAfter = execFileSync('git', ['--no-optional-locks', 'status', '--porcelain'], { cwd: folder, encoding: 'utf8' });
  const result = {
    parent,
    parentHashBefore: parentBefore.hash,
    parentHashAfter: parentAfter.hash,
    parentDiff: diffTrees(parentBefore.files, parentAfter.files),
    userGitHashBefore: gitBefore.hash,
    userGitHashAfter: gitAfter.hash,
    userGitDiff: diffTrees(gitBefore.files, gitAfter.files),
    folderDiff: diffTrees(folderBefore.files, folderAfter.files),
    userGitStatusBefore,
    userGitStatusAfter,
  };
  saveResult('ac54', result);
  expect(parentAfter.hash).toBe(parentBefore.hash);
  expect(gitAfter.hash).toBe(gitBefore.hash);
});
