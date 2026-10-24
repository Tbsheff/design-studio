import { useState } from 'react';
import type { Project } from '../shared/contracts';
import { api, errorText } from './api';
import { useDesktopCommand, useDesktopContext } from './desktop';
import { uiStore } from './storage';
import { isTypingTarget } from './typingTarget';

function projectForFolder(projects: Project[], folder: string): Project | undefined {
  const clean = folder.replace(/\/+$/, '');
  return projects.find((project) => project.imported?.sourcePath === clean || project.directions.some((direction) => direction.workTree === clean));
}

function focusNewProject(): void {
  window.requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>('[aria-label="Describe the design"]')?.focus());
}

function textEdit(kind: 'undo' | 'redo'): boolean {
  if (!isTypingTarget(document.activeElement)) return false;
  document.execCommand(kind);
  return true;
}

async function openFolder(folder: string): Promise<string> {
  const existing = projectForFolder(await api.listProjects(), folder);
  if (existing) return existing.id;
  const { project } = await api.importProject(folder);
  return project.id;
}

export function useDesktopApp(activeProjectId: string | null): string | null {
  const [error, setError] = useState<string | null>(null);
  useDesktopContext({ projectId: null, directionId: null, running: false }, activeProjectId === null);
  useDesktopCommand((command) => {
    if (command.type === 'new-project') {
      uiStore.set({ activeProjectId: null });
      focusNewProject();
    } else if (command.type === 'open-project') {
      setError(null);
      uiStore.set({ activeProjectId: command.projectId });
    } else if (command.type === 'open-folder') {
      setError(null);
      openFolder(command.path)
        .then((id) => uiStore.set({ activeProjectId: id }))
        .catch((err) => setError(`Cannot open ${command.path}: ${errorText(err)}`));
    } else if (command.type === 'undo' || command.type === 'redo') {
      textEdit(command.type);
    }
    return true;
  });
  return error;
}
