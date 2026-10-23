import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { Direction, Project, Version } from '../../../src/shared/contracts';
import { frontFrame, headVersion, mainDirection, sendPrompt, showVersions, type StudioApi } from '../../support/studio';
import { createProject, evidence, evidencePath, git, readState, runStatus, startRun, waitRun } from '../../../scripts/ac-edit/helpers';

function byTime(versions: Version[]): Version[] {
  return [...versions].sort((a, b) => a.createdAt - b.createdAt);
}

async function versionHtml(api: StudioApi, pid: string, vid: string): Promise<string> {
  const { url } = await api.call<{ url: string }>('GET', `/api/projects/${pid}/versions/${vid}/preview`);
  const res = await fetch(url);
  return res.text();
}

async function threeEdits(page: Page, api: StudioApi, project: Project): Promise<Version[]> {
  for (const [index, text] of ['First note', 'Second note', 'Third note'].entries()) {
    await sendPrompt(page, text);
    await api.waitForRuns(project.id, index + 2);
    await expect(frontFrame(page).locator('.mock-edit').last()).toHaveText(text);
  }
  return byTime(await api.versions(project.id, mainDirection(project).id));
}

test('AC-33 AC-34 every completed iteration makes a recoverable version, and any version opens', async ({ page }) => {
  const { api, project } = await createProject(page, 'Version Trail', 'html');
  const main = mainDirection(project);
  await expect(frontFrame(page).locator('h1')).toHaveText('Version Trail');
  const versions = await threeEdits(page, api, project);
  const failRun = await startRun(api, project.id, main.id, '[fail] Broken attempt');
  const failed = await waitRun(api, failRun);
  await api.call('POST', `/api/projects/${project.id}/d/${main.id}/discard`);
  const cancelRun = await startRun(api, project.id, main.id, '[slow] Canceled attempt');
  await page.waitForTimeout(400);
  await api.call('POST', `/api/runs/${cancelRun}/cancel`);
  const canceled = await waitRun(api, cancelRun);
  await api.call('POST', `/api/projects/${project.id}/d/${main.id}/discard`);
  const afterFailures = byTime(await api.versions(project.id, main.id));
  const runs = await api.runs(project.id);
  const completed = runs.filter((run) => run.status === 'completed');
  const completedHaveVersions = completed.every((run) => run.versionId && afterFailures.some((v) => v.id === run.versionId));
  const recoverable: { id: string; kind: string; notes: number; gitType: string }[] = [];
  for (const version of afterFailures) {
    const html = await versionHtml(api, project.id, version.id);
    recoverable.push({ id: version.id.slice(0, 7), kind: version.meta.kind, notes: (html.match(/class="mock-edit"/g) ?? []).length, gitType: git(project.id, ['cat-file', '-t', version.id]).trim() });
  }
  const opened: { title: string; pill: string | null; notes: number }[] = [];
  await showVersions(page);
  for (const version of afterFailures) {
    const row = page.locator('li.version').filter({ has: page.locator(`.version-title span[title="${version.meta.prompt ?? version.title}"]`) }).first();
    await row.getByRole('button', { name: 'Open' }).click();
    await expect(page.locator('.pill')).toContainText(`Viewing ${version.title}`);
    await expect(page.locator('iframe.frame.front')).toHaveAttribute('src', new RegExp(`/s/[^/]+/${version.id}/`));
    const expectedNotes = recoverable.find((r) => r.id === version.id.slice(0, 7))?.notes ?? -1;
    await expect(frontFrame(page).locator('.mock-edit')).toHaveCount(expectedNotes);
    opened.push({ title: version.title, pill: await page.locator('.pill').textContent(), notes: await frontFrame(page).locator('.mock-edit').count() });
  }
  await page.getByRole('button', { name: 'Back to live' }).click();
  await expect(page.locator('.pill')).toHaveCount(0);
  evidence('AC-33', { completedRuns: completed.length, versionCount: afterFailures.length, completedHaveVersions, failed: { status: failed.status, versionId: failed.versionId }, canceled: { status: canceled.status, versionId: canceled.versionId }, recoverable });
  evidence('AC-34', { opened });
  expect(versions.length).toBe(completed.length);
  expect(afterFailures.length).toBe(versions.length);
  expect(completedHaveVersions).toBe(true);
  expect(failed.status).toBe('failed');
  expect(failed.versionId).toBeNull();
  expect(canceled.status).toBe('canceled');
  expect(recoverable.map((r) => r.notes)).toEqual([0, 1, 2, 3]);
  expect(recoverable.every((r) => r.gitType === 'commit')).toBe(true);
});

test('AC-31 undo an edit, then recover the undone result', async ({ page }) => {
  const { api, project } = await createProject(page, 'Undo Trail', 'html');
  const main = mainDirection(project);
  await expect(frontFrame(page).locator('h1')).toHaveText('Undo Trail');
  const file = path.join(main.workTree, 'index.html');
  const base = readFileSync(file, 'utf8');
  await sendPrompt(page, 'Edit to undo');
  await api.waitForRuns(project.id, 2);
  await expect(frontFrame(page).locator('.mock-edit')).toHaveText('Edit to undo');
  const edited = readFileSync(file, 'utf8');
  const editVersion = await headVersion(api, project.id, main.id);
  await showVersions(page);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(async () => (await headVersion(api, project.id, main.id)).meta.kind).toBe('undo');
  await expect(frontFrame(page).locator('.mock-edit')).toHaveCount(0);
  const afterUndo = readFileSync(file, 'utf8');
  const undoVersion = await headVersion(api, project.id, main.id);
  const listAfterUndo = await api.versions(project.id, main.id);
  const row = page.locator('li.version').filter({ has: page.locator('.version-title span[title="Edit to undo"]') });
  await row.getByRole('button', { name: 'Restore' }).click();
  await expect.poll(async () => (await headVersion(api, project.id, main.id)).meta.kind).toBe('restore');
  await expect(frontFrame(page).locator('.mock-edit')).toHaveText('Edit to undo');
  const afterRestore = readFileSync(file, 'utf8');
  const restoreVersion = await headVersion(api, project.id, main.id);
  evidence('AC-31', {
    undoMatchesBase: afterUndo === base,
    undoneVersionStillListed: listAfterUndo.some((v) => v.id === editVersion.id),
    restoreMatchesEdit: afterRestore === edited,
    undo: { kind: undoVersion.meta.kind, parent: undoVersion.parentId?.slice(0, 7) },
    restore: { kind: restoreVersion.meta.kind, restoredFrom: restoreVersion.meta.restoredFrom?.slice(0, 7), edit: editVersion.id.slice(0, 7) },
    versions: (await api.versions(project.id, main.id)).length,
  });
  expect(afterUndo).toBe(base);
  expect(listAfterUndo.some((v) => v.id === editVersion.id)).toBe(true);
  expect(afterRestore).toBe(edited);
});

test('AC-35 AC-36 branch from an earlier version without touching the original, then compare', async ({ page }) => {
  const { api, project } = await createProject(page, 'Branch Point', 'html');
  const main = mainDirection(project);
  await expect(frontFrame(page).locator('h1')).toHaveText('Branch Point');
  const versions = await threeEdits(page, api, project);
  const target = versions[1];
  if (!target) throw new Error('need version 2');
  const mainFile = path.join(main.workTree, 'index.html');
  const mainBefore = readFileSync(mainFile, 'utf8');
  const mainHeadBefore = (await headVersion(api, project.id, main.id)).id;
  const mainVersionsBefore = (await api.versions(project.id, main.id)).map((v) => v.id).sort();
  await showVersions(page);
  const row = page.locator('li.version').filter({ has: page.locator(`.version-title span[title="${target.meta.prompt}"]`) });
  await row.getByRole('button', { name: 'Branch' }).click();
  await page.getByLabel('Direction name').fill('From first note');
  await page.getByRole('button', { name: 'Create direction' }).click();
  await expect(page.locator('.topbar')).toContainText('/ From first note');
  const fork = (await api.project(project.id)).directions.find((d: Direction) => d.name === 'From first note');
  if (!fork) throw new Error('fork missing');
  await expect(frontFrame(page).locator('.mock-edit')).toHaveCount(1);
  const forkFileAtStart = readFileSync(path.join(fork.workTree, 'index.html'), 'utf8');
  const targetHtml = git(project.id, ['show', `${target.id}:index.html`]);
  await sendPrompt(page, 'Fork only note');
  await api.waitForRuns(project.id, 5);
  await expect(frontFrame(page).locator('.mock-edit')).toHaveText(['First note', 'Fork only note']);
  const forkHead = await headVersion(api, project.id, fork.id);
  const mainAfter = readFileSync(mainFile, 'utf8');
  const mainHeadAfter = (await headVersion(api, project.id, main.id)).id;
  const mainVersionsAfter = (await api.versions(project.id, main.id)).map((v) => v.id).sort();

  await showVersions(page);
  await page.locator('.list-item').filter({ hasText: 'Main' }).click();
  await expect(page.locator('.topbar')).toContainText('/ Main');
  const mainHeadRow = page.locator('li.version').filter({ has: page.locator('.badge', { hasText: 'Head' }) });
  await mainHeadRow.getByRole('button', { name: 'Compare' }).click();
  const firstRow = page.locator('li.version').filter({ has: page.locator(`.version-title span[title="${versions[0]?.meta.prompt ?? versions[0]?.title}"]`) });
  await firstRow.getByRole('button', { name: 'Compare' }).click();
  await page.getByRole('button', { name: 'Compare', exact: true }).first().click();
  await expect(page.locator('.compare-pane')).toHaveCount(2);
  const left = page.frameLocator('.compare-pane:nth-child(1) iframe');
  const right = page.frameLocator('.compare-pane:nth-child(2) iframe');
  await expect(left.locator('h1')).toHaveText('Branch Point');
  await expect(right.locator('h1')).toHaveText('Branch Point');
  const leftNotes = await left.locator('.mock-edit').count();
  const rightNotes = await right.locator('.mock-edit').count();
  const titles = await page.locator('.compare-title').allTextContents();
  await page.screenshot({ path: evidencePath('AC-36-compare.png') });
  await page.getByRole('button', { name: 'Close compare' }).click();

  evidence('AC-35', {
    target: { id: target.id.slice(0, 7), prompt: target.meta.prompt },
    forkParentVersion: fork.parentVersionId?.slice(0, 7),
    forkStartMatchesTarget: forkFileAtStart === targetHtml,
    forkHead: { kind: forkHead.meta.kind, prompt: forkHead.meta.prompt },
    mainFileUnchanged: mainAfter === mainBefore,
    mainHeadUnchanged: mainHeadAfter === mainHeadBefore,
    mainVersionsUnchanged: JSON.stringify(mainVersionsAfter) === JSON.stringify(mainVersionsBefore),
    workTrees: [main.workTree, fork.workTree],
  });
  evidence('AC-36', { titles, leftNotes, rightNotes, screenshot: 'verification/ac-edit-evidence/AC-36-compare.png' });
  expect(fork.parentVersionId).toBe(target.id);
  expect(forkFileAtStart).toBe(targetHtml);
  expect(mainAfter).toBe(mainBefore);
  expect(mainHeadAfter).toBe(mainHeadBefore);
  expect(mainVersionsAfter).toEqual(mainVersionsBefore);
  expect(new Set([leftNotes, rightNotes])).toEqual(new Set([0, 3]));
});

test('AC-37 parallel runs in two directions cannot overwrite each other', async ({ page }) => {
  const { api, project } = await createProject(page, 'Parallel Lanes', 'html');
  const main = mainDirection(project);
  const head = (await headVersion(api, project.id, main.id)).id;
  const other = await api.call<Direction>('POST', `/api/projects/${project.id}/directions`, { fromVersionId: head, name: 'Lane B' });
  const [runA, runB] = await Promise.all([
    startRun(api, project.id, main.id, '[slow] Only lane A text'),
    startRun(api, project.id, other.id, '[slow] Only lane B text'),
  ]);
  await page.waitForTimeout(300);
  const bothRunning = [await runStatus(api, runA), await runStatus(api, runB)];
  const [doneA, doneB] = await Promise.all([waitRun(api, runA), waitRun(api, runB)]);
  const fileA = readFileSync(path.join(main.workTree, 'index.html'), 'utf8');
  const fileB = readFileSync(path.join(other.workTree, 'index.html'), 'utf8');
  const projectFile = JSON.parse(readFileSync(path.join(readState().dataDir, 'projects', project.id, 'project.json'), 'utf8')) as Project;
  const refA = git(project.id, ['rev-parse', `refs/heads/d/${main.id}`]).trim();
  const refB = git(project.id, ['rev-parse', `refs/heads/d/${other.id}`]).trim();
  const headA = projectFile.directions.find((d) => d.id === main.id)?.headVersionId;
  const headB = projectFile.directions.find((d) => d.id === other.id)?.headVersionId;
  const treeA = git(project.id, ['show', `${refA}:index.html`]);
  const treeB = git(project.id, ['show', `${refB}:index.html`]);
  const statusA = await api.status(project.id, main.id);
  const statusB = await api.status(project.id, other.id);
  evidence('AC-37', {
    bothRunning,
    statuses: [doneA.status, doneB.status],
    versionIds: [doneA.versionId?.slice(0, 7), doneB.versionId?.slice(0, 7)],
    projectJsonHeads: [headA?.slice(0, 7), headB?.slice(0, 7)],
    refs: [refA.slice(0, 7), refB.slice(0, 7)],
    aHasA: fileA.includes('Only lane A text'),
    aHasB: fileA.includes('Only lane B text'),
    bHasB: fileB.includes('Only lane B text'),
    bHasA: fileB.includes('Only lane A text'),
    committedMatchesDisk: [treeA === fileA, treeB === fileB],
    dirty: [statusA.dirty, statusB.dirty],
  });
  expect(bothRunning).toEqual(['running', 'running']);
  expect([doneA.status, doneB.status]).toEqual(['completed', 'completed']);
  expect(fileA).toContain('Only lane A text');
  expect(fileA).not.toContain('Only lane B text');
  expect(fileB).toContain('Only lane B text');
  expect(fileB).not.toContain('Only lane A text');
  expect(headA).toBe(doneA.versionId);
  expect(headB).toBe(doneB.versionId);
  expect(refA).toBe(doneA.versionId);
  expect(refB).toBe(doneB.versionId);
  expect(treeA).toBe(fileA);
  expect(treeB).toBe(fileB);
});

test('AC-38 interrupted run: discard removes partial and untracked files, keep commits them', async ({ page }) => {
  const { api, project } = await createProject(page, 'Interrupted', 'html');
  const main = mainDirection(project);
  const file = path.join(main.workTree, 'index.html');
  await expect(frontFrame(page).locator('h1')).toHaveText('Interrupted');
  const completed = readFileSync(file, 'utf8');
  const headBefore = (await headVersion(api, project.id, main.id)).id;

  const first = await startRun(api, project.id, main.id, '[slow] Partial one');
  await expect.poll(() => readFileSync(file, 'utf8') !== completed, { intervals: [50] }).toBe(true);
  await api.call('POST', `/api/runs/${first}/cancel`);
  const canceledOne = await waitRun(api, first);
  const stray = path.join(main.workTree, 'stray-note.txt');
  writeFileSync(stray, 'left behind');
  const banner = page.locator('.banner');
  await expect(banner).toContainText('Unfinished changes');
  const statusBeforeDiscard = await api.status(project.id, main.id);
  await banner.getByRole('button', { name: 'Discard' }).click();
  await expect(banner).toHaveCount(0);
  const discardResult = { fileRestored: readFileSync(file, 'utf8') === completed, strayRemoved: !existsSync(stray), head: (await headVersion(api, project.id, main.id)).id === headBefore, dirty: (await api.status(project.id, main.id)).dirty };

  const second = await startRun(api, project.id, main.id, '[slow] Partial two');
  await expect.poll(() => readFileSync(file, 'utf8') !== completed, { intervals: [50] }).toBe(true);
  await api.call('POST', `/api/runs/${second}/cancel`);
  const canceledTwo = await waitRun(api, second);
  const partialTwo = readFileSync(file, 'utf8');
  await expect(banner).toContainText('Unfinished changes');
  await banner.getByRole('button', { name: 'Keep' }).click();
  await expect(banner).toHaveCount(0);
  const kept = await headVersion(api, project.id, main.id);
  const keepResult = { kind: kept.meta.kind, parentIsCompleted: kept.parentId === headBefore, fileIsPartial: readFileSync(file, 'utf8') === partialTwo, committed: git(project.id, ['show', `${kept.id}:index.html`]) === partialTwo, dirty: (await api.status(project.id, main.id)).dirty };
  evidence('AC-38', { canceled: [canceledOne.status, canceledTwo.status], versionIds: [canceledOne.versionId, canceledTwo.versionId], statusBeforeDiscard, discardResult, keepResult });
  expect(canceledOne.status).toBe('canceled');
  expect(statusBeforeDiscard.changed.sort()).toEqual(['index.html', 'stray-note.txt']);
  expect(discardResult).toEqual({ fileRestored: true, strayRemoved: true, head: true, dirty: false });
  expect(keepResult).toEqual({ kind: 'keep', parentIsCompleted: true, fileIsPartial: true, committed: true, dirty: false });
});
