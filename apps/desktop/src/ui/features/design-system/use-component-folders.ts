import { useEffect, useState } from "react";

import type { ComponentFolder } from "../../../shared/component-create.js";
import { componentCreateApi } from "./component-create-api.js";
import { toFolderNote, toInitialFolder } from "./create-component-model.js";

interface ComponentFolders {
  readonly folder: string;
  readonly folders: ComponentFolder[] | null;
  readonly note: string | null;
  readonly setFolder: (folder: string) => void;
}

const useComponentFolders = (
  projectId: string,
  directionId: string
): ComponentFolders => {
  const [folders, setFolders] = useState<ComponentFolder[] | null>(null);
  const [folder, setFolder] = useState("");
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let live = true;

    const read = async (): Promise<void> => {
      try {
        const list = await componentCreateApi.folders(projectId, directionId);

        if (!live) {
          return;
        }

        setFolders(list.folders);
        setNote(toFolderNote(list.folders, list.note));
        setFolder(toInitialFolder(list.folders, list.note));
      } catch {
        if (live) {
          setFolders([]);
        }
      }
    };

    read();

    return (): void => {
      live = false;
    };
  }, [projectId, directionId]);

  return { folder, folders, note, setFolder };
};

export { useComponentFolders };

export type { ComponentFolders };
