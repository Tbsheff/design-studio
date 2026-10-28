import path from 'node:path';
import type { AppRoute, Direction, Project } from '../../shared/contracts.js';
import { listAppRoutes } from '../app/routes.js';
import type { Draft } from './checks.js';

function segmentsOf(value: string): string[] {
  return value.split(/[?#]/)[0]?.split('/').filter(Boolean) ?? [];
}

function segmentMatches(pattern: string[], parts: string[]): boolean {
  const [head, ...rest] = pattern;
  if (head === undefined) return parts.length === 0;
  if (/^\[\[\.\.\..+\]\]$/.test(head)) return true;
  if (/^\[\.\.\..+\]$/.test(head)) return parts.length > 0;
  const [part, ...tail] = parts;
  if (part === undefined) return false;
  if (head !== part && !/^\[.+\]$/.test(head)) return false;
  return segmentMatches(rest, tail);
}

function routeFor(routes: AppRoute[], page: string): AppRoute | null {
  const parts = segmentsOf(page);
  return routes.find((route) => route.route === `/${parts.join('/')}`) ?? routes.find((route) => segmentMatches(segmentsOf(route.route), parts)) ?? null;
}

export async function pageOwnDir(project: Project, direction: Direction, page: string | undefined): Promise<string | null> {
  if (!project.app) return null;
  const routes = await listAppRoutes(direction.workTree, project.app.appDir).catch(() => []);
  const route = routeFor(routes, page ?? '/');
  return route ? path.posix.dirname(route.file) : null;
}

export function markShared(drafts: Draft[], ownDir: string | null): void {
  if (!ownDir) return;
  for (const draft of drafts) {
    const file = draft.fix?.edit.source.file;
    if (file && !file.startsWith(`${ownDir}/`)) draft.shared = file;
  }
}
