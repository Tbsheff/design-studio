import type { RefObject } from "react";

import { api } from "../../api.js";
import { droppedFolder } from "./chip-logic-model.js";
import type { ChipFlow } from "./use-chip-flow.js";

type FolderSink = (folderPath: string) => void;

const inspectDroppedFolder = async (
  folderPath: string,
  flow: ChipFlow,
  sink: FolderSink | null
): Promise<void> => {
  try {
    const inspection = await api.inspectFolder(folderPath);

    if (inspection.kind) {
      flow.putFolder(folderPath);

      return;
    }

    sink?.(folderPath);
  } catch {
    flow.putFolder(folderPath);
  }
};

const useRoutedFolderDrop = (
  flow: ChipFlow,
  sinkRef: RefObject<FolderSink | null>
): ((data: DataTransfer) => boolean) => {
  const takeDrop = (data: DataTransfer): boolean => {
    const folder = droppedFolder(data);

    if (!(folder && "path" in folder)) {
      return flow.takeDrop(data);
    }

    inspectDroppedFolder(folder.path, flow, sinkRef.current);

    return true;
  };

  return takeDrop;
};

export { useRoutedFolderDrop };

export type { FolderSink };
