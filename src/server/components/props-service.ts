import { existsSync } from 'node:fs';
import { realpath } from 'node:fs/promises';
import path from 'node:path';
import type { Direction, Project } from '../../shared/contracts.js';
import type { ComponentInstance, ComponentSchemaList, InstanceQuery } from '../../shared/props.js';
import type { PreviewService } from '../types.js';
import { listFiles } from './inventory.js';
import { componentSchemas, declaredComponents, readModule, type ComponentRef } from './props-schema.js';
import { countUses, resolveInstance } from './use-site.js';

const LIST_MAX = 40;

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

export async function listComponentSchemas(workTree: string): Promise<ComponentSchemaList> {
  const files = await sourceFiles(workTree);
  const refs: ComponentRef[] = [];
  for (const file of files) {
    const parsed = await readModule(file);
    if (!parsed) continue;
    for (const item of declaredComponents(parsed.ast)) if (item.name !== 'App') refs.push({ file, name: item.name });
  }
  const uses = usesIn(files);
  const schemas = await componentSchemas(workTree, refs);
  const listed = await Promise.all(schemas.flatMap((schema) => (schema ? [uses(schema.name).then((count) => ({ ...schema, uses: count }))] : [])));
  listed.sort((a, b) => b.uses - a.uses || a.name.localeCompare(b.name));
  return { components: listed.slice(0, LIST_MAX), truncated: listed.length > LIST_MAX };
}

async function previewOrigin(preview: PreviewService, project: Project, direction: Direction): Promise<string | null> {
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
