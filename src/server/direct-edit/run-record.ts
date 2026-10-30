import path from 'node:path';
import type { Direction, Project, Version } from '../../shared/contracts.js';
import type { VersionStore } from '../types.js';
import type { EditHistory } from './history.js';
import type { EditFileChange } from './index.js';

const MAX_RUN_FILES = 50;
const MAX_RUN_BYTES = 4 * 1024 * 1024;
const decoder = new TextDecoder('utf-8', { fatal: true });

function textOf(bytes: Uint8Array | null): string | null | undefined {
  if (bytes === null) return null;
  try {
    return decoder.decode(bytes);
  } catch {
    return undefined;
  }
}

type FileAt = NonNullable<VersionStore['fileAt']>;

async function changeOf(fileAt: FileAt, project: Project, direction: Direction, version: Version & { parentId: string }, relative: string): Promise<EditFileChange | null> {
  const [before, after] = await Promise.all([fileAt(project, version.parentId, relative), fileAt(project, version.id, relative)]).then(([a, b]) => [textOf(a), textOf(b)]);
  if (before === undefined || after === undefined || after === null) return null;
  return { file: path.join(direction.workTree, relative), relative, before: before ?? '', after, ...(before === null ? { created: true } : {}) };
}

async function runChanges(versions: VersionStore, project: Project, direction: Direction, version: Version & { parentId: string }): Promise<EditFileChange[] | null> {
  const total = version.changedFilesTotal ?? version.changedFiles.length;
  const fileAt = versions.fileAt?.bind(versions);
  if (!fileAt || total === 0 || total > MAX_RUN_FILES || version.changedFiles.length < total) return null;
  const changes = await Promise.all(version.changedFiles.map((relative) => changeOf(fileAt, project, direction, version, relative)));
  if (changes.some((change) => change === null)) return null;
  const files = changes as EditFileChange[];
  const bytes = files.reduce((sum, change) => sum + change.before.length + change.after.length, 0);
  return bytes > MAX_RUN_BYTES ? null : files;
}

function hasParent(version: Version | undefined): version is Version & { parentId: string } {
  return version !== undefined && version.parentId !== null;
}

export async function recordRunInHistory(history: EditHistory, versions: VersionStore, project: Project, direction: Direction, versionId: string): Promise<void> {
  const version = (await versions.list(project, direction)).find((item) => item.id === versionId);
  const files = hasParent(version) ? await runChanges(versions, project, direction, version).catch(() => null) : null;
  if (!version || !files) {
    history.clear(project.id, direction.id);
    return;
  }
  history.record({ projectId: project.id, directionId: direction.id, label: version.title, versionId: version.id, files });
}
