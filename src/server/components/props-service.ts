import { existsSync } from 'node:fs';
import { realpath } from 'node:fs/promises';
import path from 'node:path';
import type { Direction, Project } from '../../shared/contracts.js';
import type { ComponentInstance, ComponentListQuery, ComponentSchemaList, InstanceQuery } from '../../shared/props.js';
import type { PreviewService } from '../types.js';
import { listFiles } from './inventory.js';
import { warmProgram } from './props-program.js';
import { searchComponents } from './component-search.js';
import { loadTypeScript } from './props-schema.js';
import { countUses, resolveInstance } from './use-site.js';

export async function sourceFiles(workTree: string): Promise<string[]> {
  const root = await realpath(workTree);
  const src = path.join(root, 'src');
  return listFiles(existsSync(src) ? src : root, (name) => /\.(tsx|jsx)$/i.test(name));
}

export function usesIn(files: string[]): (name: string) => Promise<number> {
  const counts = new Map<string, Promise<number>>();
  return (name) => {
    let count = counts.get(name);
    if (!count) {
      count = countUses(files, name);
      counts.set(name, count);
    }
    return count;
  };
}

export function listComponentSchemas(project: Project, workTree: string, query: ComponentListQuery = {}): Promise<ComponentSchemaList> {
  return searchComponents(project, workTree, query);
}

export async function previewOrigin(preview: PreviewService, project: Project, direction: Direction): Promise<string | null> {
  if (project.kind !== 'react') return null;
  try {
    return new URL(await preview.directionUrl(project, direction)).origin;
  } catch {
    return null;
  }
}

export async function instanceFor(preview: PreviewService, project: Project, direction: Direction, query: InstanceQuery): Promise<ComponentInstance | null> {
  const files = await sourceFiles(direction.workTree);
  return resolveInstance({ workTree: direction.workTree, previewOrigin: await previewOrigin(preview, project, direction) }, query, usesIn(files));
}

const WARM_DELAY_MS = 4000;

export function warmPropsTypes(project: Project, direction: Direction): void {
  if (project.kind !== 'react') return;
  setTimeout(() => {
    void Promise.all([loadTypeScript(), realpath(direction.workTree)])
      .then(([ts, root]) => ts && warmProgram(ts, root))
      .catch(() => undefined);
  }, WARM_DELAY_MS).unref();
}
