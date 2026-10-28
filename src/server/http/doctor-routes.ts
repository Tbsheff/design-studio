import { constants } from 'node:fs';
import { copyFile } from 'node:fs/promises';
import type { Context, Hono } from 'hono';
import type { AppDoctorResult, AppFixResult, DoctorCause, DoctorCauseKind } from '../../shared/app-doctor.js';
import type { AppServerStatus, Project } from '../../shared/contracts.js';
import { BadRequestError, ConflictError, NotFoundError } from '../store/errors.js';
import type { StudioProjectStore } from '../store/projects.js';
import type { AppControl, PreviewService } from '../types.js';

export interface DoctorRouteDeps {
  projects: StudioProjectStore;
  preview: PreviewService;
  readBody: (c: Context) => Promise<Record<string, unknown>>;
}

const KINDS: DoctorCauseKind[] = ['env-validation', 'missing-env-file', 'port-in-use', 'install', 'auth-redirect'];

export interface DoctorView {
  status: AppServerStatus;
  doctor: AppDoctorResult;
}

async function appProject(projects: StudioProjectStore, pid: string): Promise<Project> {
  const project = await projects.get(pid);
  if (!project.app) throw new NotFoundError(`project ${pid} is not an attached app`);
  return project;
}

function control(preview: PreviewService): Required<Pick<AppControl, 'doctor'>> & AppControl {
  const apps = preview.apps;
  if (!apps?.doctor) throw new BadRequestError('app servers are not available');
  return apps as Required<Pick<AppControl, 'doctor'>> & AppControl;
}

async function reattach(deps: DoctorRouteDeps, project: Project, patch: { env?: Record<string, string>; url?: string }): Promise<void> {
  const app = project.app;
  const folder = project.imported?.sourcePath;
  if (!app || !folder) throw new BadRequestError('project is not an attached app');
  const url = patch.url ?? (app.mode === 'url' ? app.url : undefined);
  const updated = await deps.projects.attachApp({ folder, appDir: app.appDir, ...(url ? { url } : {}), env: patch.env ?? app.env ?? {} });
  const apps = control(deps.preview);
  apps.forget(updated.id);
  void apps.restart(updated).catch(() => undefined);
}

async function applyFix(deps: DoctorRouteDeps, project: Project, cause: DoctorCause): Promise<string> {
  const fix = cause.fix;
  if (!fix) throw new BadRequestError(`The ${cause.kind} problem has no one-click fix. ${cause.command ? `Run ${cause.command}.` : cause.detail}`);
  if (fix.kind === 'set-env') {
    await reattach(deps, project, { env: { ...(project.app?.env ?? {}), ...fix.env } });
    return `Set ${Object.keys(fix.env).join(', ')} for next dev. The dev server restarts.`;
  }
  if (fix.kind === 'copy-env-example') {
    await copyFile(fix.from, fix.to, constants.COPYFILE_EXCL).catch((error: unknown) => {
      throw new ConflictError(`Could not copy .env.example: ${error instanceof Error ? error.message : String(error)}`);
    });
    void control(deps.preview).restart(project).catch(() => undefined);
    return 'Copied .env.example to .env.local with its example values. Put real values in it yourself. The dev server restarts.';
  }
  if (fix.kind === 'use-url') {
    await reattach(deps, project, { url: fix.url });
    return `The studio now uses the dev server at ${fix.url}.`;
  }
  void control(deps.preview).restart(project).catch(() => undefined);
  return 'The dev server restarts on a free port.';
}

export async function readDoctor(deps: DoctorRouteDeps, pid: string, fresh: boolean): Promise<DoctorView> {
  const project = await appProject(deps.projects, pid);
  const apps = control(deps.preview);
  const doctor = await apps.doctor(project, fresh);
  return { status: apps.status(project), doctor };
}

export async function fixApp(deps: DoctorRouteDeps, pid: string, kind: unknown): Promise<AppFixResult> {
  if (typeof kind !== 'string' || !KINDS.includes(kind as DoctorCauseKind)) throw new BadRequestError(`kind must be one of ${KINDS.join(', ')}`);
  const project = await appProject(deps.projects, pid);
  const doctor = await control(deps.preview).doctor(project, false);
  const cause = doctor.causes.find((item) => item.kind === kind);
  if (!cause) throw new ConflictError(`The doctor does not see a ${kind} problem now. Read app_doctor again.`);
  return { kind: cause.kind, applied: await applyFix(deps, project, cause) };
}

export function registerDoctorRoutes(app: Hono, deps: DoctorRouteDeps): void {
  app.get('/api/projects/:pid/app/doctor', async (c) => c.json(await readDoctor(deps, c.req.param('pid'), c.req.query('fresh') === '1')));
  app.post('/api/projects/:pid/app/doctor/fix', async (c) => c.json(await fixApp(deps, c.req.param('pid'), (await deps.readBody(c)).kind)));
}
