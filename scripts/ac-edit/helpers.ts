import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, type Frame, type Page } from '@playwright/test';
import type { Project, RunSummary } from '../../src/shared/contracts';
import { ROOT } from '../../e2e/support/server';
import { BACKUP_STATE } from './ports';
import { openHome, type StudioApi } from '../../e2e/support/studio';

export function readState(): { dataDir: string; workDir: string; pid: number } {
  return JSON.parse(readFileSync(BACKUP_STATE, 'utf8')) as { dataDir: string; workDir: string; pid: number };
}

export const EVIDENCE_DIR = path.join(ROOT, 'verification', 'ac-edit-evidence');

export function evidence(ac: string, data: unknown): void {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const file = path.join(EVIDENCE_DIR, `${ac}.json`);
  writeFileSync(file, JSON.stringify(data, null, 2));
  console.log(`[${ac}] ${JSON.stringify(data)}`);
}

export function evidencePath(name: string): string {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  return path.join(EVIDENCE_DIR, name);
}

export async function openStudio(page: Page, projectId: string): Promise<void> {
  await page.evaluate((pid) => localStorage.setItem('design-studio.ui.v1', JSON.stringify({ activeProjectId: pid })), projectId);
  await page.goto('/');
  await expect(page.locator('.topbar')).toBeVisible();
}

export async function createProject(page: Page, prompt: string, kind: 'html' | 'react'): Promise<{ api: StudioApi; project: Project }> {
  const api = await openHome(page);
  const { project } = await api.call<{ project: Project }>('POST', '/api/projects', { prompt, kind });
  await api.waitForRuns(project.id, 1, 120_000);
  await openStudio(page, project.id);
  return { api, project: await api.project(project.id) };
}

export async function importHtmlFixture(page: Page, html: string): Promise<{ api: StudioApi; project: Project; folder: string }> {
  const api = await openHome(page);
  const folder = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'ac edit fixture ')));
  writeFileSync(path.join(folder, 'index.html'), html);
  const { project } = await api.call<{ project: Project }>('POST', '/api/projects/import', { path: folder });
  await openStudio(page, project.id);
  return { api, project, folder };
}

export async function startRun(api: StudioApi, pid: string, did: string, prompt: string, extra: Record<string, unknown> = {}): Promise<string> {
  const { runId } = await api.call<{ runId: string }>('POST', `/api/projects/${pid}/d/${did}/runs`, { prompt, mode: 'edit', ...extra });
  return runId;
}

export async function waitRun(api: StudioApi, runId: string, timeoutMs = 60_000): Promise<RunSummary> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const { summary } = await api.call<{ summary: RunSummary | null }>('GET', `/api/runs/${runId}`);
    if (summary && summary.status !== 'running') return summary;
    if (Date.now() > deadline) throw new Error(`run ${runId} still running`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

export async function runStatus(api: StudioApi, runId: string): Promise<string> {
  const { summary } = await api.call<{ summary: RunSummary | null }>('GET', `/api/runs/${runId}`);
  return summary?.status ?? 'pending';
}

export function runFile(projectId: string, runId: string): RunSummary {
  const file = path.join(readState().dataDir, 'projects', projectId, 'runs', `${runId}.json`);
  return JSON.parse(readFileSync(file, 'utf8')) as RunSummary;
}

export function git(projectId: string, args: string[]): string {
  const gitDir = path.join(readState().dataDir, 'projects', projectId, 'git');
  return execFileSync('git', args, { env: { ...process.env, GIT_DIR: gitDir }, encoding: 'utf8' });
}

export async function previewFrame(page: Page, origin: string): Promise<Frame> {
  await expect.poll(() => page.frames().some((frame) => frame.url().includes(origin))).toBe(true);
  const frame = page.frames().find((candidate) => candidate.url().includes(origin));
  if (!frame) throw new Error('preview frame not found');
  return frame;
}

export function changedLines(before: string, after: string): { index: number; before: string; after: string }[] {
  const a = before.split('\n');
  const b = after.split('\n');
  const max = Math.max(a.length, b.length);
  const out: { index: number; before: string; after: string }[] = [];
  for (let index = 0; index < max; index += 1) if (a[index] !== b[index]) out.push({ index, before: a[index] ?? '', after: b[index] ?? '' });
  return out;
}

export async function artboardTransform(page: Page): Promise<string> {
  return (await page.locator('.artboard').getAttribute('style')) ?? '';
}
