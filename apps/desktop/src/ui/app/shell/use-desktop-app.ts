import type { Project } from "@design-studio/contracts";
import { useEffect, useState } from "react";

import type { DesktopCommand } from "../../../shared/desktop-link";
import { api, errorText } from "../../api";
import { COMMAND_EVENT, LAYER_EVENT } from "../../features/commands/registry";
import {
  desktopBridge,
  useDesktopCommand,
  useDesktopContext,
} from "../../platform/desktop";
import { focusNewProject } from "../../platform/focus";
import { uiStore } from "../../platform/storage";
import { isTypingTarget } from "../../platform/typing-target.js";

const projectForFolder = (
  projects: Project[],
  folder: string
): Project | undefined => {
  const clean = folder.replace(/\/+$/, "");

  return projects.find(
    (project) =>
      project.imported?.sourcePath === clean ||
      project.directions.some((direction) => direction.workTree === clean)
  );
};

const textEdit = (kind: "undo" | "redo"): boolean => {
  if (!isTypingTarget(document.activeElement)) {
    return false;
  }

  document.execCommand(kind);

  return true;
};

const openFolder = async (folder: string): Promise<string> => {
  const existing = projectForFolder(await api.listProjects(), folder);

  if (existing) {
    return existing.id;
  }

  const { project } = await api.importProject(folder);

  return project.id;
};

interface DropBridge {
  pathForFile?: (file: File) => string;
  openDropped?: (path: string) => void;
}

const dropBridge = (): DropBridge | undefined =>
  desktopBridge<DropBridge>() ?? undefined;

const hasFiles = (event: DragEvent): boolean =>
  event.dataTransfer?.types.includes("Files") ?? false;

const droppedFolder = (event: DragEvent, bridge: DropBridge): string | null => {
  for (const item of event.dataTransfer?.items ?? []) {
    if (item.kind !== "file" || !item.webkitGetAsEntry()?.isDirectory) {
      continue;
    }

    const file = item.getAsFile();
    const folder = file ? bridge.pathForFile?.(file) : "";

    if (folder) {
      return folder;
    }
  }

  return null;
};

const ownsDrop = (event: DragEvent): boolean =>
  event.defaultPrevented ||
  (event.target instanceof Element && event.target.closest(".prompt") !== null);

const useFolderDrop = (): void => {
  useEffect(() => {
    const bridge = dropBridge();

    if (!bridge?.pathForFile || !bridge.openDropped) {
      return;
    }

    const onDragOver = (event: DragEvent): void => {
      if (ownsDrop(event) || !hasFiles(event)) {
        return;
      }

      event.preventDefault();

      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "copy";
      }
    };

    const onDrop = (event: DragEvent): void => {
      if (ownsDrop(event) || !hasFiles(event)) {
        return;
      }

      event.preventDefault();
      const folder = droppedFolder(event, bridge);

      if (folder) {
        bridge.openDropped?.(folder);
      }
    };

    globalThis.addEventListener("dragover", onDragOver);
    globalThis.addEventListener("drop", onDrop);

    return (): void => {
      globalThis.removeEventListener("dragover", onDragOver);
      globalThis.removeEventListener("drop", onDrop);
    };
  }, []);
};

const runAppCommand = (id: string): void => {
  const layer = id === "palette" || id === "shortcuts";
  globalThis.dispatchEvent(
    new CustomEvent(layer ? LAYER_EVENT : COMMAND_EVENT, { detail: id })
  );
};

const openFolderCommand = async (
  folder: string,
  setError: (error: string | null) => void
): Promise<void> => {
  try {
    const id = await openFolder(folder);
    uiStore.set({ activeProjectId: id });
  } catch (error) {
    setError(`Cannot open ${folder}: ${errorText(error)}`);
  }
};

const useAppCommands = (setError: (error: string | null) => void): void => {
  useDesktopCommand((command: DesktopCommand) => {
    if (command.type === "new-project") {
      uiStore.set({ activeProjectId: null });
      focusNewProject();
    } else if (command.type === "open-project") {
      setError(null);
      uiStore.set({ activeProjectId: command.projectId });
    } else if (command.type === "open-folder") {
      setError(null);
      void openFolderCommand(command.path, setError);
    } else if (command.type === "undo" || command.type === "redo") {
      textEdit(command.type);
    } else if (command.type === "command") {
      runAppCommand(command.id);
    }

    return true;
  });
};

export function useDesktopApp(activeProjectId: string | null): string | null {
  const [error, setError] = useState<string | null>(null);
  useDesktopContext(
    { directionId: null, projectId: null, running: false },
    activeProjectId === null
  );
  useAppCommands(setError);
  useFolderDrop();

  return error;
}
