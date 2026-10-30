import { existsSync } from 'node:fs';
import path from 'node:path';
import type { AppHealth } from '../../shared/found-apps.js';
import type { Project } from '../../shared/contracts.js';
import type { AppControl } from '../types.js';
import { frameworkOf, readPackage } from './detect.js';
import { nextBinary } from './dev-server.js';
import { installHint } from './install-hint.js';

export function installCommand(root: string, appDir: string): { command: string; dir: string; full: string } {
  const hint = installHint(root, appDir);
  return { command: hint.command, dir: hint.dir, full: `cd ${JSON.stringify(hint.dir)} && ${hint.command}` };
}

export function installDetail(name: string, hint: { command: string; dir: string }): string {
  return `${name} cannot start yet. The app's dependencies are not installed, so the dev server cannot start. Run ${hint.command} in ${hint.dir}, then check again.`;
}

function needsInstall(project: Project, root: string, appDir: string): AppHealth {
  const hint = installCommand(root, appDir);
  return { projectId: project.id, state: 'install', title: 'Dependencies are not installed', detail: installDetail(project.name, hint), command: hint.full };
}

async function attachedHealth(project: Project, root: string, apps: AppControl | undefined): Promise<AppHealth> {
  const app = project.app;
  const base: AppHealth = { projectId: project.id, state: 'ready', title: null, detail: null, command: null };
  if (!app) return base;
  const status = apps?.status(project);
  if (status?.state === 'starting') return { ...base, state: 'building' };
  if (status?.state === 'failed' && apps?.doctor) {
    const cause = (await apps.doctor(project, false).catch(() => null))?.causes.find((item) => item.severity === 'error');
    if (cause?.kind === 'install') return needsInstall(project, root, app.appDir);
    return { ...base, state: 'failed', title: cause?.title ?? 'The dev server failed', detail: cause?.detail ?? status.message, command: cause?.command ?? null };
  }
  if (app.mode === 'managed' && nextBinary(root, app.appDir) === null) return needsInstall(project, root, app.appDir);
  return base;
}

export async function viteNeedsInstall(folder: string): Promise<boolean> {
  return frameworkOf(await readPackage(folder)) === 'vite' && !existsSync(path.join(folder, 'node_modules'));
}

export async function projectHealth(project: Project, apps: AppControl | undefined): Promise<AppHealth> {
  const root = project.imported?.sourcePath;
  if (!root) return { projectId: project.id, state: 'static', title: null, detail: null, command: null };
  if (project.app) return attachedHealth(project, root, apps);
  if (await viteNeedsInstall(root)) return needsInstall(project, root, '.');
  return { projectId: project.id, state: 'static', title: null, detail: null, command: null };
}
