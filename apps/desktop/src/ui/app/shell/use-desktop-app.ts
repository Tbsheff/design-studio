import type { Project } from "@design-studio/contracts";
import { useEffect, useState } from "react";

import type { DesktopCommand } from "../../../shared/desktop-link";
import { api, errorText } from "../../api";
import { runThemeCommand } from "../../features/commands";
import { COMMAND_EVENT, LAYER_EVENT } from "../../features/commands/registry";
import {
  desktopBridge,
  useDesktopCommand,
  useDesktopContext,
} from "../../platform/desktop";
import { focusNewProject } from "../../platform/focus";
import { pick } from "../../platform/pick.js";
import { uiStore } from "../../platform/storage";
import { isTypingTarget } from "../../platform/typing-target.js";

const trimTrailingSlashes = (folder: string): string => {
  let clean = folder;

  while (clean.endsWith("/")) {
    clean = clean.slice(0, -1);
  }

  return clean;
};

const projectForFolder = (
  projects: Project[],
  folder: string
): Project | null => {
  const clean = trimTrailingSlashes(folder);

  return (
    projects.find(
      (project) =>
        project.imported?.sourcePath === clean ||
        project.directions.some((direction) => direction.workTree === clean)
    ) ?? null
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

const dropBridge = (): DropBridge | null => desktopBridge<DropBridge>();

const hasFiles = (event: DragEvent): boolean =>
  event.dataTransfer?.types.includes("Files") ?? false;

const toItemFolder = (
  item: DataTransferItem,
  bridge: DropBridge
): string | null => {
  if (item.kind !== "file" || !item.webkitGetAsEntry()?.isDirectory) {
    return null;
  }

  const file = item.getAsFile();

  if (!file) {
    return null;
  }

  return bridge.pathForFile?.(file) ?? null;
};

const droppedFolder = (event: DragEvent, bridge: DropBridge): string | null => {
  for (const item of event.dataTransfer?.items ?? []) {
    const folder = toItemFolder(item, bridge);

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
  if (runThemeCommand(id)) {
    return;
  }

  const layer = id === "palette" || id === "shortcuts";

  globalThis.dispatchEvent(
    new CustomEvent(pick(layer, LAYER_EVENT, COMMAND_EVENT), { detail: id })
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
    switch (command.type) {
      case "new-project": {
        uiStore.set({ activeProjectId: null });
        focusNewProject();

        break;
      }

      case "open-project": {
        setError(null);
        uiStore.set({ activeProjectId: command.projectId });

        break;
      }

      case "open-folder": {
        setError(null);
        void openFolderCommand(command.path, setError);

        break;
      }

      case "undo":
      case "redo": {
        return textEdit(command.type);
      }

      case "command": {
        runAppCommand(command.id);

        break;
      }

      default: {
        break;
      }
    }

    return true;
  });
};

const useDesktopApp = (activeProjectId: string | null): string | null => {
  const [error, setError] = useState<string | null>(null);

  useDesktopContext(
    { directionId: null, projectId: null, running: false },
    activeProjectId === null
  );
  useAppCommands(setError);
  useFolderDrop();

  return error;
};

export { useDesktopApp };
