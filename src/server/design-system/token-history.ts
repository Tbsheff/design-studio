import path from 'node:path';
import type { Direction, Project, Version } from '../../shared/contracts.js';
import type { DirectEditDeps, EditFileChange } from '../direct-edit/index.js';
import { readSnapshot, type FileSnapshot } from './create-token.js';

export async function snapshotChanges(workTree: string, snapshots: FileSnapshot[]): Promise<EditFileChange[] | null> {
  return readChanges(workTree, snapshots).catch(() => null);
}

async function readChanges(workTree: string, snapshots: FileSnapshot[]): Promise<EditFileChange[] | null> {
  const changes: EditFileChange[] = [];
  for (const before of snapshots) {
    const after = await readSnapshot(workTree, before.relative);
    if (before.content === after.content) continue;
    if (before.content === null || after.content === null) return null;
    changes.push({ file: path.join(workTree, before.relative), relative: before.relative, before: before.content, after: after.content });
  }
  return changes;
}

export function recordTokenEdit(deps: DirectEditDeps, project: Project, direction: Direction, version: Version, files: EditFileChange[] | null): void {
  if (files === null || files.length === 0) return;
  deps.history?.record({ projectId: project.id, directionId: direction.id, label: version.title, versionId: version.id, files });
}
