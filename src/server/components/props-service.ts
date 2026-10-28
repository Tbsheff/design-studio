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
import { resolveInstance } from './use-site.js';
import { cachedFileList, cachedUseCount } from './tree-cache.js';

const isJsxFile = (name: string) => /\.(tsx|jsx)$/i.test(name);

export async function sourceFiles(workTree: string): Promise<string[]> {
  const root = await realpath(workTree);
  const src = path.join(root, 'src');
  const dir = existsSync(src) ? src : root;
  return cachedFileList(path.resolve(workTree), dir, isJsxFile, () => listFiles(dir, isJsxFile));
}

export function usesIn(files: string[], workTree: string): (name: string) => Promise<number> {
  const counts = new Map<string, Promise<number>>();
  return (name) => {
    let count = counts.get(name);
    if (!count) {
      count = cachedUseCount(path.resolve(workTree), files, name);
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
  return resolveInstance({ workTree: direction.workTree, previewOrigin: await previewOrigin(preview, project, direction) }, query, usesIn(files, direction.workTree));
}

const WARM_DELAY_MS = 4000;
const KIT_WARM_DELAY_MS = 50;
const warmedKits = new Set<string>();

export function warmKit(project: Project, direction: Direction): void {
  const key = `${project.id}/${direction.id}/${direction.workTree}`;
  if (project.kind !== 'react' || warmedKits.has(key)) return;
  warmedKits.add(key);
  setTimeout(() => void searchComponents(project, direction.workTree, {}).catch(() => warmedKits.delete(key)), KIT_WARM_DELAY_MS).unref();
  warmPropsTypes(project, direction);
}

export function warmPropsTypes(project: Project, direction: Direction): void {
  if (project.kind !== 'react') return;
  setTimeout(() => {
    void Promise.all([loadTypeScript(), realpath(direction.workTree)])
      .then(([ts, root]) => ts && warmProgram(ts, root))
      .catch(() => undefined);
  }, WARM_DELAY_MS).unref();
}
