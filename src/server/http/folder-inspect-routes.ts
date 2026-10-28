import { existsSync } from 'node:fs';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import type { Context, Hono } from 'hono';
import type { FolderInspection, FolderKind } from '../../shared/open-app.js';
import { detectApp, frameworkOf, readPackage, type AppDetection } from '../app/detect.js';
import { nextBinary } from '../app/dev-server.js';
import { installHint } from '../app/install-hint.js';
import { nextAppWorkspace } from '../app/workspace-root.js';
import { findTokenFile } from '../design-system/app-tokens/detect.js';
import { BadRequestError } from '../store/errors.js';
import type { StudioProjectStore } from '../store/projects.js';

const MAX_PATH = 4096;
const PREFERRED_APP = /(^|\/)(web|dashboard|app|site|frontend)$/;

interface InspectDeps {
  projects: StudioProjectStore;
  readBody: (c: Context) => Promise<Record<string, unknown>>;
}

function expandHome(raw: string): string {
  const home = process.env.HOME ?? '';
  return home && (raw === '~' || raw.startsWith('~/')) ? path.join(home, raw.slice(1)) : raw;
}

async function realFolder(raw: string): Promise<{ path: string } | { problem: string }> {
  const input = expandHome(raw.trim());
  if (!path.isAbsolute(input)) return { problem: 'Use a full path that starts with / (or ~/).' };
  const real = await realpath(input).catch(() => null);
  if (!real) return { problem: `No folder at ${input}.` };
  if (!(await stat(real)).isDirectory()) return { problem: `${real} is a file, not a folder.` };
  return { path: real };
}

async function plainKind(folder: string): Promise<FolderKind | null> {
  const pkgText = await readFile(path.join(folder, 'package.json'), 'utf8').catch(() => null);
  let pkg: Record<string, unknown> | null = null;
  try {
    pkg = pkgText ? (JSON.parse(pkgText) as Record<string, unknown>) : null;
  } catch {
    pkg = null;
  }
  if (frameworkOf(pkg) === 'vite') return 'vite';
  if (pkgText && (await findTokenFile(folder)) !== null) return 'tokens';
  return existsSync(path.join(folder, 'index.html')) ? 'html' : null;
}

async function memberDetection(root: string, appDir: string): Promise<AppDetection> {
  const pkg = await readPackage(path.join(root, appDir));
  return { framework: 'next', appDir, candidates: [{ appDir, name: String(pkg?.name ?? path.basename(appDir)), framework: 'next' }] };
}

function chooseAppDir(detected: AppDetection, wanted: string | null): string | null {
  const chosen = wanted && detected.candidates.some((candidate) => candidate.appDir === wanted) ? wanted : null;
  const preferred = detected.candidates.find((candidate) => PREFERRED_APP.test(candidate.appDir)) ?? detected.candidates[0];
  return chosen ?? detected.appDir ?? preferred?.appDir ?? null;
}

export async function inspectFolder(projects: StudioProjectStore, raw: string, wanted: string | null = null): Promise<FolderInspection> {
  const empty: FolderInspection = { path: raw, name: path.basename(raw), kind: null, appDir: null, candidates: [], depsInstalled: null, install: null, projectId: null, problem: null };
  const found = await realFolder(raw);
  if ('problem' in found) return { ...empty, problem: found.problem };
  const workspace = await nextAppWorkspace(found.path);
  const folder = workspace?.root ?? found.path;
  const detected = workspace ? await memberDetection(folder, workspace.appDir) : await detectApp(folder);
  const kind = detected.framework === 'next' ? 'next' : await plainKind(folder);
  const appDir = kind === 'next' ? chooseAppDir(detected, wanted) : null;
  const hint = appDir ? installHint(folder, appDir) : null;
  const existing = (await projects.list()).find((project) => project.imported?.sourcePath === folder && (kind !== 'next' || project.app?.appDir === appDir));
  const problem = kind === null ? 'This folder has no Next.js app, no Vite app and no index.html. Add the name of your app folder to the path.' : null;
  return {
    path: folder,
    name: path.basename(folder),
    kind,
    appDir,
    candidates: detected.candidates,
    depsInstalled: appDir ? nextBinary(folder, appDir) !== null : null,
    install: hint ? { command: hint.command, dir: hint.dir } : null,
    projectId: existing?.id ?? null,
    problem,
    workspace: workspace ? { root: workspace.root, name: workspace.name, opened: found.path } : null,
  };
}

export function registerFolderInspectRoutes(app: Hono, deps: InspectDeps): void {
  app.post('/api/folders/inspect', async (c) => {
    const body = await deps.readBody(c);
    const raw = body.path;
    if (typeof raw !== 'string' || raw.trim() === '' || raw.length > MAX_PATH || raw.includes('\0')) throw new BadRequestError('path is required');
    return c.json(await inspectFolder(deps.projects, raw, typeof body.appDir === 'string' ? body.appDir : null));
  });
}
