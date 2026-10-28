import path from 'node:path';
import type { Project } from '../../shared/contracts.js';
import { nextAppWorkspace, type WorkspaceRoot } from '../app/workspace-root.js';

export interface WorkspaceFields {
  workspaceRoot: string | null;
  appDir: string | null;
  openedAs?: string;
}

export async function workspaceOf(folder: string): Promise<WorkspaceRoot | null> {
  return nextAppWorkspace(folder).catch(() => null);
}

export function sameFolderOrRoot(project: Project, folder: string, workspace: WorkspaceRoot | null): boolean {
  const source = project.imported?.sourcePath;
  if (source === undefined) return false;
  const resolved = path.resolve(source);
  return resolved === folder || (workspace !== null && resolved === workspace.root && project.app?.appDir === workspace.appDir);
}

export function workspaceFields(project: Project, opened: string): WorkspaceFields {
  const root = project.imported?.sourcePath ? path.resolve(project.imported.sourcePath) : null;
  const appDir = project.app?.appDir ?? null;
  const inWorkspace = root !== null && appDir !== null && appDir !== '.';
  const fields: WorkspaceFields = { workspaceRoot: inWorkspace ? root : null, appDir };
  if (inWorkspace && root !== opened) fields.openedAs = `Opened as part of the ${path.basename(root)} monorepo at ${root}, with ${appDir} as the app.`;
  return fields;
}
