import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Direction, Project, RunSummary, StudioEvent } from '../../shared/contracts.js';
import type { CanvasService } from '../canvas/service.js';
import type { ExportDeps } from '../export/source.js';
import type { AgentRunner } from '../types.js';
import type { ApprovalQueue } from './approvals.js';
import { downloadsFolder, isInside, safeFolder } from './folders.js';

export interface ControlDeps extends ExportDeps {
  request(method: string, url: string, body?: unknown): Promise<Response>;
  runner: AgentRunner;
  canvas: CanvasService;
  approvals: ApprovalQueue;
  dataDir: string;
  projectsFolder(): Promise<string>;
}

export class ControlError extends Error {}

const REFUSALS: Record<string, string> = {
  run_in_progress: 'A run is going in this direction. Wait for it with wait_for_run or stop it with stop_run, then try again.',
  no_comments: 'There is no comment to send.',
};

export async function studioCall<T>(deps: ControlDeps, method: string, url: string, body?: unknown): Promise<T> {
  const res = await deps.request(method, url, body);
  if (res.ok) return (await res.json()) as T;
  const parsed = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
  const code = parsed?.error ?? `${res.status}`;
  throw new ControlError(REFUSALS[code] ?? parsed?.message ?? code);
}

export async function studioFile(deps: ControlDeps, method: string, url: string, body?: unknown): Promise<{ bytes: Buffer; name: string; note: string | null }> {
  const res = await deps.request(method, url, body);
  if (!res.ok) {
    const parsed = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new ControlError(parsed?.error ?? `${res.status}`);
  }
  const match = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') ?? '');
  return { bytes: Buffer.from(await res.arrayBuffer()), name: path.basename(match?.[1] ?? 'export.bin'), note: res.headers.get('x-studio-export-note') };
}

export async function loadTarget(deps: ControlDeps, projectId: string, directionId?: string): Promise<{ project: Project; direction: Direction }> {
  const project = await deps.projects.get(projectId);
  if (project.designSystemFor && project.designSystemDeleted) throw new ControlError('project not found');
  const direction = directionId ? project.directions.find((d) => d.id === directionId) : (project.directions.find((d) => d.id === 'main') ?? project.directions[0]);
  if (!direction) throw new ControlError(`direction ${directionId ?? 'main'} not found in project ${project.id}`);
  return { project, direction };
}

export function refuseWhileRunning(deps: ControlDeps, project: Project, direction: Direction): void {
  if (deps.runner.isRunning(project.id, direction.id)) throw new ControlError(REFUSALS.run_in_progress);
}

export async function approve(deps: ControlDeps, tool: string, title: string, detail: string): Promise<void> {
  const outcome = await deps.approvals.ask({ tool, title, detail });
  if (outcome === 'allow') return;
  if (outcome === 'closed') throw new ControlError('Design Studio is not open, so nobody can approve this action. Open the Design Studio window and try again.');
  if (outcome === 'timeout') throw new ControlError('Nobody answered the approval prompt in Design Studio within 2 minutes, so the action was refused.');
  throw new ControlError('The user denied this action in Design Studio.');
}

export async function outputFolder(deps: ControlDeps, raw: unknown): Promise<{ folder: string; trusted: boolean }> {
  const downloads = await downloadsFolder();
  const folder = raw === undefined ? await safeFolder(downloads, deps.dataDir) : await safeFolder(raw, deps.dataDir);
  const projects = await safeFolder(await deps.projectsFolder(), deps.dataDir).catch(() => null);
  return { folder, trusted: isInside(folder, downloads) || (projects !== null && isInside(folder, projects)) };
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
  throw new ControlError(`no free file name for ${name} in ${folder}`);
}

export interface RunRecord {
  summary: RunSummary | null;
  events: StudioEvent[];
}

export async function readRun(deps: ControlDeps, runId: string): Promise<RunRecord> {
  return studioCall<RunRecord>(deps, 'GET', `/api/runs/${encodeURIComponent(runId)}`);
}

export function currentStep(events: readonly StudioEvent[]): string | null {
  const open = new Map<string, string>();
  for (const event of events) {
    if (event.type === 'run.tool.started') open.set(event.toolUseId, event.name);
    if (event.type === 'run.tool.finished') open.delete(event.toolUseId);
  }
  return [...open.values()].at(-1) ?? null;
}

export async function changedFiles(deps: ControlDeps, summary: RunSummary): Promise<string[]> {
  if (!summary.versionId) return [];
  const project = await deps.projects.get(summary.projectId);
  const version = await deps.versions.get(project, summary.versionId).catch(() => null);
  return version?.changedFiles ?? [];
}

export function short(text: string, max = 4000): string {
  return text.length > max ? `${text.slice(0, max)}\n[cut at ${max} characters]` : text;
}
