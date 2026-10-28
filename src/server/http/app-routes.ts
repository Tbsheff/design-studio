import { spawn } from 'node:child_process';
import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import type { Context, Hono } from 'hono';
import type { AttachAppRequest, Direction, LegacyCanvasNotice, Project } from '../../shared/contracts.js';
import { firstVersionState, firstVersionWaitText, isFirstVersionRunning, startFirstVersion, waitForFirstVersion, type AttachResponse } from '../app/first-version.js';
import { listAppRoutes } from '../app/routes.js';
import { setAsideLegacyCanvas } from '../canvas/service.js';
import { userGit } from '../git/user-git.js';
import { BadRequestError, ConflictError, NotFoundError } from '../store/errors.js';
import type { StudioProjectStore } from '../store/projects.js';
import type { PreviewService, VersionStore } from '../types.js';
import { warmKit } from '../components/props-service.js';

const SOURCE_PATTERN = /^(.+):(\d+):(\d+)$/;
const EDITOR_TIMEOUT_MS = 5000;
const EDIT_WAIT_MS = 20_000;
const EDIT_ROUTES = /\/d\/[^/]+\/(direct-edit|discard|keep|undo|restore|insert|props|props\/variant-classes|review\/fix|tweaks\/commit|(edit-history|edit-session)\/\w+|design-system\/(apply|save|tokens|tokens\/update))$/;

export interface AppRouteDeps {
  projects: StudioProjectStore;
  versions: VersionStore;
  preview: PreviewService;
  readBody: (c: Context) => Promise<Record<string, unknown>>;
  commitInit: (project: Project) => Promise<Project>;
  watch: (project: Project, direction: Direction) => void;
}

function attachRequest(body: Record<string, unknown>): AttachAppRequest {
  const pick = (key: keyof AttachAppRequest): string | undefined => {
    const value = body[key];
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string' || value.length > 4096) throw new BadRequestError(`${key} must be a string`);
    return value;
  };
  const env = body.env;
  return {
    folder: pick('folder'),
    url: pick('url'),
    appDir: pick('appDir'),
    name: pick('name'),
    ...(env !== undefined ? { env: env as Record<string, string> } : {}),
  };
}

async function appProject(projects: StudioProjectStore, pid: string): Promise<Project> {
  const project = await projects.get(pid);
  if (!project.app) throw new NotFoundError(`project ${pid} is not an attached app`);
  return project;
}

function editorCommand(): string {
  return process.env.STUDIO_EDITOR?.trim() || 'code';
}

function openInEditor(file: string, line: number, col: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(editorCommand(), ['-g', `${file}:${line}:${col}`], { stdio: 'ignore', detached: true });
    const timer = setTimeout(() => {
      child.unref();
      resolve();
    }, EDITOR_TIMEOUT_MS);
    child.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once('exit', (code) => {
      clearTimeout(timer);
      if (code === 0 || code === null) resolve();
      else reject(new Error(`${editorCommand()} exited with code ${code}`));
    });
  });
}

export async function resolveSourceFile(workTree: string, source: string): Promise<{ relative: string; absolute: string; line: number; col: number }> {
  const match = SOURCE_PATTERN.exec(source);
  if (!match?.[1]) throw new BadRequestError('source must be file:line:col');
  const root = await realpath(workTree);
  const absolute = await realpath(path.resolve(root, match[1])).catch(() => null);
  const relative = absolute ? path.relative(root, absolute) : '..';
  if (!absolute || relative.startsWith('..') || path.isAbsolute(relative) || relative.split(path.sep).some((part) => part === '.git' || part === 'node_modules')) throw new BadRequestError('source is not a file in this project');
  if (!(await stat(absolute)).isFile()) throw new BadRequestError('source is not a file');
  return { relative: relative.split(path.sep).join('/'), absolute, line: Number(match[2]), col: Number(match[3]) };
}

function needsFirstVersion(project: Project): boolean {
  return Boolean(project.app) && project.directions[0]?.headVersionId === null;
}

function ensureFirstVersion(deps: AppRouteDeps, project: Project): void {
  if (!needsFirstVersion(project) || isFirstVersionRunning(project.id)) return;
  startFirstVersion(project.id, deps.versions.untrackedCount?.(project) ?? null, () => deps.commitInit(project));
}

async function trackedByUserRepo(workTree: string, relative: string): Promise<boolean> {
  const result = await userGit(workTree, ['ls-files', '--error-unmatch', '--', relative], { allowFail: true }).catch(() => null);
  return result?.code === 0;
}

async function setAsideCanvas(deps: AppRouteDeps, project: Project): Promise<LegacyCanvasNotice | null> {
  try {
    return await setAsideLegacyCanvas(project, (id) => deps.projects.projectDir(id), trackedByUserRepo);
  } catch (error) {
    console.error(`[app] could not set aside the old canvas of ${project.id}`, error);
    return null;
  }
}

export async function finishAttach(deps: AppRouteDeps, attached: Project): Promise<AttachResponse> {
  const fresh = needsFirstVersion(attached);
  deps.preview.apps?.forget(attached.id);
  deps.watch(attached, deps.projects.mainDirection(attached));
  warmKit(attached, deps.projects.mainDirection(attached));
  const starting = deps.preview.apps?.ensure(attached).catch(() => undefined);
  if (attached.app?.mode === 'url') await starting;
  if (!fresh) return { project: attached, firstVersion: null, legacyCanvas: null };
  const legacyCanvas = await setAsideCanvas(deps, attached);
  await deps.versions.ensureRepo(attached);
  ensureFirstVersion(deps, attached);
  return { project: attached, firstVersion: firstVersionState(attached.id), legacyCanvas };
}

async function holdEditsForFirstVersion(deps: AppRouteDeps, pid: string): Promise<void> {
  const project = await deps.projects.get(pid).catch(() => null);
  if (!project || !needsFirstVersion(project)) return;
  ensureFirstVersion(deps, project);
  if (await waitForFirstVersion(pid, EDIT_WAIT_MS)) {
    const saved = await deps.projects.get(pid);
    if (!needsFirstVersion(saved)) return;
  }
  throw new ConflictError(firstVersionWaitText(pid));
}

export function registerAppRoutes(app: Hono, deps: AppRouteDeps): void {
  const { projects, preview } = deps;

  app.use('/api/projects/:pid/d/:did/*', async (c, next) => {
    if (c.req.method !== 'GET' && EDIT_ROUTES.test(c.req.path)) await holdEditsForFirstVersion(deps, c.req.param('pid'));
    await next();
  });

  app.post('/api/projects/attach', async (c) => c.json(await finishAttach(deps, await projects.attachApp(attachRequest(await deps.readBody(c))))));

  app.get('/api/projects/:pid/app', async (c) => {
    const project = await appProject(projects, c.req.param('pid'));
    ensureFirstVersion(deps, project);
    return c.json({ app: project.app, status: preview.apps?.status(project) ?? null, logs: preview.apps?.logs(project.id) ?? [], firstVersion: firstVersionState(project.id) });
  });

  app.post('/api/projects/:pid/app/config', async (c) => {
    const project = await appProject(projects, c.req.param('pid'));
    const body = await deps.readBody(c);
    const current = project.app;
    const folder = project.imported?.sourcePath;
    if (!current || !folder) throw new BadRequestError('project is not an attached app');
    const url = body.url === undefined ? current.url : body.url;
    const env = body.env === undefined ? current.env : body.env;
    const updated = await projects.attachApp({ folder, appDir: current.appDir, ...(typeof url === 'string' && url.trim() !== '' ? { url } : {}), env: (env ?? {}) as Record<string, string> });
    preview.apps?.forget(updated.id);
    void preview.apps?.restart(updated).catch(() => undefined);
    return c.json({ app: updated.app });
  });

  app.post('/api/projects/:pid/app/:action', async (c) => {
    const project = await appProject(projects, c.req.param('pid'));
    const control = preview.apps;
    if (!control) throw new BadRequestError('app servers are not available');
    const action = c.req.param('action');
    if (action === 'stop') await control.stop(project.id);
    else if (action === 'start') void control.ensure(project).catch(() => undefined);
    else if (action === 'restart') void control.restart(project).catch(() => undefined);
    else throw new NotFoundError(`unknown app action ${action}`);
    return c.json(control.status(project));
  });

  app.get('/api/projects/:pid/app/routes', async (c) => {
    const project = await appProject(projects, c.req.param('pid'));
    return c.json({ routes: await listAppRoutes(projects.mainDirection(project).workTree, project.app?.appDir ?? '.') });
  });

  app.post('/api/projects/:pid/d/:did/open-source', async (c) => {
    const project = await projects.get(c.req.param('pid'));
    const direction = projects.directionOf(project, c.req.param('did'));
    const body = await deps.readBody(c);
    if (typeof body.source !== 'string' || body.source.length > 2000) throw new BadRequestError('source is required');
    const file = await resolveSourceFile(direction.workTree, body.source);
    try {
      await openInEditor(file.absolute, file.line, file.col);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      return c.json({ error: 'no_editor', message: `Could not open an editor (${reason}). Set STUDIO_EDITOR to your editor command, for example code or cursor.`, path: file.relative }, 422);
    }
    return c.json({ opened: true, path: file.relative, line: file.line, col: file.col });
  });
}
