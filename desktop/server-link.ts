import type { ChildProcess } from 'node:child_process';
import path from 'node:path';
import type { Project } from '../src/shared/contracts.js';
import { isDesktopLinkMessage, isProjectId, type DesktopLinkMessage, type DesktopRunInfo } from '../src/shared/desktop-link.js';

export interface FinishedRun {
  run: DesktopRunInfo;
  status: string;
  costUsd: number;
  error: string | null;
}

export class ServerLink {
  private token: string | null = null;
  private dataDir: string | null = null;
  private origin: string | null = null;
  private readonly active = new Map<string, DesktopRunInfo>();

  constructor(private readonly onFinished: (finished: FinishedRun) => void) {}

  attach(child: ChildProcess, origin: string): void {
    this.token = null;
    this.dataDir = null;
    this.origin = origin;
    this.active.clear();
    child.on('message', (raw: unknown) => {
      if (isDesktopLinkMessage(raw)) this.handle(raw);
    });
    child.once('exit', () => this.active.clear());
  }

  private handle(message: DesktopLinkMessage): void {
    if (message.kind === 'hello') {
      this.token = message.token;
      this.dataDir = message.dataDir;
    } else if (message.kind === 'run-started') {
      this.active.set(message.run.runId, message.run);
    } else {
      this.active.delete(message.run.runId);
      this.onFinished({ run: message.run, status: message.status, costUsd: message.costUsd, error: message.error });
    }
  }

  activeRuns(): DesktopRunInfo[] {
    return [...this.active.values()];
  }

  async project(projectId: string): Promise<Project | null> {
    if (!this.token || !this.origin || !isProjectId(projectId)) return null;
    const res = await fetch(`${this.origin}/api/projects/${projectId}`, { headers: { 'x-studio-token': this.token } }).catch(() => null);
    if (!res?.ok) return null;
    return (await res.json()) as Project;
  }

  async workTree(projectId: string, directionId: string | null): Promise<string | null> {
    const project = await this.project(projectId);
    if (!project || !this.dataDir) return null;
    const direction = project.directions.find((item) => item.id === directionId) ?? project.directions[0];
    if (!direction) return null;
    return allowedRevealPath(direction.workTree, this.dataDir, project.imported?.sourcePath ?? null);
  }
}

function inside(child: string, parent: string): boolean {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export function allowedRevealPath(target: string, dataDir: string, importedFrom: string | null): string | null {
  const resolved = path.resolve(target);
  if (inside(resolved, path.resolve(dataDir))) return resolved;
  if (importedFrom && inside(resolved, path.resolve(importedFrom))) return resolved;
  return null;
}
