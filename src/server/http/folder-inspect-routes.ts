import { existsSync } from 'node:fs';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import type { Context, Hono } from 'hono';
import type { FolderInspection, FolderKind } from '../../shared/open-app.js';
import { detectApp, frameworkOf } from '../app/detect.js';
import { nextBinary } from '../app/dev-server.js';
import { installHint } from '../app/install-hint.js';
import { findTokenFile } from '../design-system/app-tokens/detect.js';
import { BadRequestError } from '../store/errors.js';
import type { StudioProjectStore } from '../store/projects.js';

const MAX_PATH = 4096;

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

export async function inspectFolder(projects: StudioProjectStore, raw: string, wanted: string | null = null): Promise<FolderInspection> {
  const empty: FolderInspection = { path: raw, name: path.basename(raw), kind: null, appDir: null, candidates: [], depsInstalled: null, install: null, projectId: null, problem: null };
  const found = await realFolder(raw);
  if ('problem' in found) return { ...empty, problem: found.problem };
  const folder = found.path;
  const detected = await detectApp(folder);
  const kind = detected.framework === 'next' ? 'next' : await plainKind(folder);
  const chosen = wanted && detected.candidates.some((candidate) => candidate.appDir === wanted) ? wanted : null;
  const appDir = kind === 'next' ? (chosen ?? detected.appDir ?? detected.candidates[0]?.appDir ?? null) : null;
  const hint = appDir ? installHint(folder, appDir) : null;
  const existing = (await projects.list()).find((project) => project.imported?.sourcePath === folder && (kind !== 'next' || project.app?.appDir === appDir));
  const problem = kind === null ? 'This folder has no Next.js app, no Vite app and no index.html.' : null;
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
