import { useCallback, useState } from "react";

import { homePrefs } from "./home-prefs-model.js";
import { setComposerFocus } from "./use-home-keys.js";

interface EditAppConfirm {
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  readonly onRequest: () => void;
  readonly path: string | null;
}

const isFolderConfirmed = (folder: string): boolean =>
  homePrefs.get().editAppFolders.includes(folder);

const toConfirmedFolders = (folder: string): string[] => {
  const folders = homePrefs.get().editAppFolders;

  if (folders.includes(folder)) {
    return folders;
  }

  return [...folders, folder];
};

const useEditAppConfirm = (
  folder: string | null,
  setIsEditApp: (isEditApp: boolean) => void
): EditAppConfirm => {
  const [asked, setAsked] = useState<string | null>(null);
  let path: string | null = null;

  if (asked !== null && asked === folder) {
    path = asked;
  }

  const startEditApp = useCallback((): void => {
    setIsEditApp(true);
    setComposerFocus();
  }, [setIsEditApp]);

  const onRequest = useCallback((): void => {
    if (folder === null) {
      return;
    }

    if (isFolderConfirmed(folder)) {
      startEditApp();

      return;
    }

    setAsked(folder);
  }, [folder, startEditApp]);

  const onConfirm = useCallback((): void => {
    if (path === null) {
      return;
    }

    homePrefs.set({ editAppFolders: toConfirmedFolders(path) });
    setAsked(null);
    startEditApp();
  }, [path, startEditApp]);

  const onCancel = useCallback((): void => {
    setAsked(null);
  }, []);

  return { onCancel, onConfirm, onRequest, path };
};

export { useEditAppConfirm };

export type { EditAppConfirm };
