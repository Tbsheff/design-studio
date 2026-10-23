import { existsSync, mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import type { Project } from '../../../src/shared/contracts';
import { openHome } from '../../support/studio';
import { saveResult } from './helpers';

test('AC-54b: undo in an imported folder keeps files the user added outside the studio', async ({ page }) => {
  const parent = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'ac54b parent ')));
  const folder = path.join(parent, 'user html');
  mkdirSync(folder);
  writeFileSync(path.join(folder, 'index.html'), '<!doctype html><html><body><h1>User page</h1><p class="lede">x</p></body></html>\n');
  writeFileSync(path.join(folder, '.gitignore'), 'secret.env\n');
  const api = await openHome(page);
  const { project } = await api.call<{ project: Project }>('POST', '/api/projects/import', { path: folder });
  await api.call('POST', `/api/projects/${project.id}/d/main/runs`, { prompt: 'Studio edit', mode: 'edit' });
  await api.waitForRuns(project.id, 1);
  writeFileSync(path.join(folder, 'user-notes.txt'), 'my notes, written in my editor\n');
  writeFileSync(path.join(folder, 'secret.env'), 'IGNORED=1\n');
  await page.waitForTimeout(1200);
  const statusBefore = await api.status(project.id, 'main');
  await api.call('POST', `/api/projects/${project.id}/d/main/undo`);
  const result = {
    statusBeforeUndo: statusBefore,
    userNotesExistsAfterUndo: existsSync(path.join(folder, 'user-notes.txt')),
    ignoredFileExistsAfterUndo: existsSync(path.join(folder, 'secret.env')),
  };
  saveResult('ac54b', result);
  expect.soft(result.userNotesExistsAfterUndo, 'undo must not delete a file the user created in the imported folder').toBe(true);
});
