import { spawn } from 'node:child_process';
import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import type { Context, Hono } from 'hono';
import type { AttachAppRequest, Direction, Project } from '../../shared/contracts.js';
import { listAppRoutes } from '../app/routes.js';
import { BadRequestError, NotFoundError } from '../store/errors.js';
import type { StudioProjectStore } from '../store/projects.js';
import type { PreviewService, VersionStore } from '../types.js';

const SOURCE_PATTERN = /^(.+):(\d+):(\d+)$/;
const EDITOR_TIMEOUT_MS = 5000;

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

export async function finishAttach(deps: AppRouteDeps, attached: Project): Promise<Project> {
  const fresh = attached.directions[0]?.headVersionId === null;
  deps.preview.apps?.forget(attached.id);
  deps.watch(attached, deps.projects.mainDirection(attached));
  void deps.preview.apps?.ensure(attached).catch(() => undefined);
  if (fresh) {
    await deps.versions.ensureRepo(attached);
    void deps.commitInit(attached).catch((error: unknown) => console.error(`[app] first version of ${attached.id} failed`, error));
  }
  return attached;
}

export function registerAppRoutes(app: Hono, deps: AppRouteDeps): void {
  const { projects, preview } = deps;

  app.post('/api/projects/attach', async (c) => c.json({ project: await finishAttach(deps, await projects.attachApp(attachRequest(await deps.readBody(c)))) }));

  app.get('/api/projects/:pid/app', async (c) => {
    const project = await appProject(projects, c.req.param('pid'));
    return c.json({ app: project.app, status: preview.apps?.status(project) ?? null, logs: preview.apps?.logs(project.id) ?? [] });
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
