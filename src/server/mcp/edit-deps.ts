import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Direction, Project } from '../../shared/contracts.js';
import type { CanvasService } from '../canvas/service.js';
import type { EditRecorder } from '../direct-edit/index.js';
import type { ExportDeps } from '../export/source.js';
import type { AgentRunner, EventBus } from '../types.js';
import type { ActivityLog } from './activity.js';
import type { ApprovalAsk, ApprovalQueue } from './approvals.js';
import { warmKit } from '../components/props-service.js';
import { mcpErrorText } from './error-copy.js';
import { downloadsFolder, isInside, safeFolder } from './folders.js';

export interface EditDeps extends ExportDeps {
  request(method: string, url: string, body?: unknown): Promise<Response>;
  runner: AgentRunner;
  canvas: CanvasService;
  bus: EventBus;
  approvals: ApprovalQueue;
  activity: ActivityLog;
  dataDir: string;
  projectsFolder(): Promise<string>;
  history?: EditRecorder;
}

export class EditError extends Error {
  constructor(
    message: string,
    readonly code: string | null = null,
  ) {
    super(message);
  }
}

export const RUN_BUSY = 'A studio run is editing this design. Try again when it finishes.';

const REFUSALS: Record<string, string> = {
  run_in_progress: RUN_BUSY,
};

async function failure(res: Response): Promise<EditError> {
  const parsed = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
  const code = parsed?.error ?? `${res.status}`;
  return new EditError(REFUSALS[code] ?? mcpErrorText(parsed?.message ?? code), code);
}

export async function studioCall<T>(deps: EditDeps, method: string, url: string, body?: unknown): Promise<T> {
  const res = await deps.request(method, url, body);
  if (!res.ok) throw await failure(res);
  return (await res.json()) as T;
}

export async function studioFile(deps: EditDeps, method: string, url: string, body?: unknown): Promise<{ bytes: Buffer; name: string; note: string | null }> {
  const res = await deps.request(method, url, body);
  if (!res.ok) throw await failure(res);
  const match = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') ?? '');
  return { bytes: Buffer.from(await res.arrayBuffer()), name: path.basename(match?.[1] ?? 'export.bin'), note: res.headers.get('x-studio-export-note') };
}

export async function loadTarget(deps: EditDeps, projectId: string, directionId?: string): Promise<{ project: Project; direction: Direction }> {
  const project = await deps.projects.get(projectId);
  if (project.designSystemFor && project.designSystemDeleted) throw new EditError('project not found');
  const direction = directionId ? project.directions.find((d) => d.id === directionId) : (project.directions.find((d) => d.id === 'main') ?? project.directions[0]);
  if (!direction) throw new EditError(`direction ${directionId ?? 'main'} not found in project ${project.id}`);
  warmKit(project, direction);
  return { project, direction };
}

export function refuseWhileRunning(deps: EditDeps, project: Project, direction: Direction): void {
  if (deps.runner.isRunning(project.id, direction.id)) throw new EditError(RUN_BUSY);
}

export async function approve(deps: EditDeps, ask: ApprovalAsk): Promise<void> {
  const outcome = await deps.approvals.ask(ask);
  if (outcome === 'allow') return;
  if (outcome === 'closed') throw new EditError('Design Studio is not open, so nobody can approve this write. Open the Design Studio window, or write to ~/Downloads or the projects folder.');
  if (outcome === 'timeout') throw new EditError('Nobody approved this write in Design Studio within 2 minutes, so it was refused.');
  throw new EditError('The user denied this write in Design Studio.');
}

export async function outputFolder(deps: EditDeps, raw: unknown): Promise<{ folder: string; trusted: boolean }> {
  const downloads = await downloadsFolder();
  const folder = await safeFolder(raw === undefined ? downloads : raw, deps.dataDir);
  const projects = await safeFolder(await deps.projectsFolder(), deps.dataDir).catch(() => null);
  return { folder, trusted: isInside(folder, downloads) || (projects !== null && isInside(folder, projects)) };
}

export async function exportFolder(deps: EditDeps, projectId: string, raw: unknown): Promise<{ folder: string; trusted: boolean }> {
  if (raw !== undefined) return outputFolder(deps, raw);
  const folder = path.join(deps.dataDir, 'exports', projectId);
  await mkdir(folder, { recursive: true });
  return { folder, trusted: true };
}

export async function writeUnique(folder: string, name: string, bytes: Uint8Array): Promise<string> {
  const ext = path.extname(name);
  const stem = name.slice(0, name.length - ext.length) || 'export';
  for (let n = 1; n < 1000; n += 1) {
    const target = path.join(folder, n === 1 ? `${stem}${ext}` : `${stem}-${n}${ext}`);
    try {
      await writeFile(target, bytes, { flag: 'wx' });
      return target;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
  }
  throw new EditError(`no free file name for ${name} in ${folder}`);
}

export function short(text: string, max = 4000): string {
  return text.length > max ? `${text.slice(0, max)}\n[cut at ${max} characters]` : text;
}

export function oneLine(text: string, max = 80): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}
