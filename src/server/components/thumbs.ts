import { mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import type { ComponentInfo, Direction, Project } from '../../shared/contracts.js';
import type { PreviewService } from '../types.js';
import { listComponents } from './inventory.js';

export const COMPONENT_VIEWPORT = { width: 1280, height: 800 };

interface Batch {
  version: string;
  done: Promise<Map<string, Buffer>>;
}

export interface ComponentService {
  list(project: Project, direction: Direction): Promise<ComponentInfo[]>;
  thumb(project: Project, direction: Direction, id: string, version: string): Promise<Buffer | null>;
}

export function createComponentService(deps: { preview: PreviewService; scratchDir: (projectId: string) => string }): ComponentService {
  const batches = new Map<string, Batch>();
  let queue: Promise<unknown> = Promise.resolve();

  const render = async (project: Project, direction: Direction, version: string): Promise<Map<string, Buffer>> => {
    const shots = new Map<string, Buffer>();
    const components = (await listComponents(direction.workTree, project.kind)).filter((item) => item.selector !== null);
    if (components.length === 0 || !deps.preview.elementShots) return shots;
    const url = await deps.preview.directionUrl(project, direction);
    const dir = path.join(deps.scratchDir(project.id), `${direction.id}-${version.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24) || 'v'}`);
    await mkdir(dir, { recursive: true });
    try {
      const paths = await deps.preview.elementShots(url, COMPONENT_VIEWPORT, components.map((item) => item.selector ?? ''), path.join(dir, 'shot'));
      for (const [index, file] of paths.entries()) {
        const component = components[index];
        if (component && file) shots.set(component.id, await readFile(file));
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
    return shots;
  };

  const batchFor = (project: Project, direction: Direction, version: string): Batch => {
    const key = `${project.id}/${direction.id}`;
    const known = batches.get(key);
    if (known?.version === version) return known;
    const done = queue.then(() => render(project, direction, version));
    queue = done.catch(() => undefined);
    const batch = { version, done };
    batches.set(key, batch);
    done.catch(() => {
      if (batches.get(key) === batch) batches.delete(key);
    });
    return batch;
  };

  return {
    list: (project, direction) => listComponents(direction.workTree, project.kind),
    async thumb(project, direction, id, version) {
      const shots = await batchFor(project, direction, version).done;
      return shots.get(id) ?? null;
    },
  };
}
