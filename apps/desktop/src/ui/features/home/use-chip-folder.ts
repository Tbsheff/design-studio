import { useCallback, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import { hasNativePicker, pickFolder } from "../../platform/desktop.js";
import { droppedFolder } from "./chip-logic-model.js";
import { focusRequest } from "./focus-bus-model.js";
import type { AppChipState } from "./use-app-chip.js";
import { useOpenAppRequests } from "./use-open-app-requests.js";

interface ChipFolder {
  readonly addAppFolder: () => Promise<void>;
  readonly isFolderPopOpen: boolean;
  readonly putFolder: (path: string) => void;
  readonly setIsFolderPopOpen: Dispatch<SetStateAction<boolean>>;
  readonly takeDrop: (data: DataTransfer) => boolean;
}

const useChipFolder = (
  app: AppChipState,
  setFormError: (message: string | null) => void
): ChipFolder => {
  const [isFolderPopOpen, setIsFolderPopOpen] = useState(false);
  const { set } = app;

  const putFolder = useCallback(
    (path: string): void => {
      set(path);
      setFormError(null);
      focusRequest("prompt", true, true);
    },
    [set, setFormError]
  );

  const takeDrop = (data: DataTransfer): boolean => {
    const folder = droppedFolder(data);

    if (!folder) {
      return false;
    }

    if ("path" in folder) {
      putFolder(folder.path);
    } else {
      setFormError("Drop a folder in the desktop app, or use Add app folder.");
    }

    return true;
  };

  const addAppFolder = useCallback(async (): Promise<void> => {
    if (!hasNativePicker()) {
      setIsFolderPopOpen((open) => !open);

      return;
    }

    const picked = await pickFolder({ title: "Choose your app folder" });

    if (picked.kind === "picked") {
      putFolder(picked.path);
    }
  }, [putFolder]);

  const pickApp = useCallback((): void => {
    addAppFolder();
  }, [addAppFolder]);

  useOpenAppRequests(putFolder, pickApp);

  return {
    addAppFolder,
    isFolderPopOpen,
    putFolder,
    setIsFolderPopOpen,
    takeDrop,
  };
};

export { useChipFolder };

export type { ChipFolder };
