import { droppedFolder } from "./chip-logic-model.js";
import type { ChipFlow } from "./use-chip-flow.js";

const useRoutedFolderDrop = (
  flow: ChipFlow
): ((data: DataTransfer) => boolean) => {
  const takeDrop = (data: DataTransfer): boolean => {
    const folder = droppedFolder(data);

    if (!(folder && "path" in folder)) {
      return flow.takeDrop(data);
    }

    flow.putFolder(folder.path);

    return true;
  };

  return takeDrop;
};

export { useRoutedFolderDrop };
