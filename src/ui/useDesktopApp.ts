import { useEffect, useState } from 'react';
import type { Project } from '../shared/contracts';
import type { DesktopCommand } from '../shared/desktop-link';
import { api, errorText } from './api';
import { COMMAND_EVENT, LAYER_EVENT } from './commands/registry';
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

interface DropBridge {
  pathForFile?: (file: File) => string;
  openDropped?: (path: string) => void;
}

function dropBridge(): DropBridge | undefined {
  return (window as unknown as { studioDesktop?: DropBridge }).studioDesktop;
}

function hasFiles(event: DragEvent): boolean {
  return event.dataTransfer?.types.includes('Files') ?? false;
}

function droppedFolder(event: DragEvent, bridge: DropBridge): string | null {
  for (const item of Array.from(event.dataTransfer?.items ?? [])) {
    if (item.kind !== 'file' || !item.webkitGetAsEntry()?.isDirectory) continue;
    const file = item.getAsFile();
    const folder = file ? bridge.pathForFile?.(file) : '';
    if (folder) return folder;
  }
  return null;
}

function ownsDrop(event: DragEvent): boolean {
  return event.defaultPrevented || (event.target instanceof Element && event.target.closest('.prompt') !== null);
}

function useFolderDrop(): void {
  useEffect(() => {
    const bridge = dropBridge();
    if (!bridge?.pathForFile || !bridge.openDropped) return undefined;
    const onDragOver = (event: DragEvent) => {
      if (ownsDrop(event) || !hasFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    };
    const onDrop = (event: DragEvent) => {
      if (ownsDrop(event) || !hasFiles(event)) return;
      event.preventDefault();
      const folder = droppedFolder(event, bridge);
      if (folder) bridge.openDropped?.(folder);
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, []);
}

function runAppCommand(id: string): void {
  const layer = id === 'palette' || id === 'shortcuts';
  window.dispatchEvent(new CustomEvent(layer ? LAYER_EVENT : COMMAND_EVENT, { detail: id }));
}

function useAppCommands(setError: (error: string | null) => void): void {
  useDesktopCommand((command: DesktopCommand) => {
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
    } else if (command.type === 'command') {
      runAppCommand(command.id);
    }
    return true;
  });
}

export function useDesktopApp(activeProjectId: string | null): string | null {
  const [error, setError] = useState<string | null>(null);
  useDesktopContext({ projectId: null, directionId: null, running: false }, activeProjectId === null);
  useAppCommands(setError);
  useFolderDrop();
  return error;
}
