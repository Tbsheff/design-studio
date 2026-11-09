import { useCallback } from "react";

import { fileLockRoutes, useAction } from "./deps.js";
import {
  canAddGlob,
  toFolderGlob,
  toLockedGlobs,
  toUnlockedGlobs,
} from "./file-lock-model.js";

interface FileLockState {
  readonly canLockFile: boolean;
  readonly canLockFolder: boolean;
  readonly error: string | null;
  readonly globs: readonly string[];
  readonly handleLockFile: () => void;
  readonly handleLockFolder: () => void;
  readonly handleUnlock: (glob: string) => void;
  readonly isPending: boolean;
}

const NONE: readonly string[] = [];

const toLockInput = (
  projectId: string,
  directionId: string | null
): { readonly directionId: string; readonly projectId: string } | null => {
  if (directionId === null) {
    return null;
  }

  return { directionId, projectId };
};

const useFileLock = (
  projectId: string,
  directionId: string | null,
  file: string | null
): FileLockState => {
  const read = useAction(
    fileLockRoutes.getFileLock,
    toLockInput(projectId, directionId)
  );

  const write = useAction(fileLockRoutes.setFileLock);
  const lockedGlobs = read.data?.globs ?? NONE;
  const { run } = write;
  let folder: string | null = null;

  if (file !== null) {
    folder = toFolderGlob(file);
  }

  const save = useCallback(
    (globs: readonly string[]): void => {
      if (directionId === null) {
        return;
      }

      run({ directionId, globs, projectId });
    },
    [directionId, projectId, run]
  );

  const lockFile = useCallback((): void => {
    if (file !== null) {
      save(toLockedGlobs(lockedGlobs, file));
    }
  }, [file, lockedGlobs, save]);

  const lockFolder = useCallback((): void => {
    if (folder !== null) {
      save(toLockedGlobs(lockedGlobs, folder));
    }
  }, [folder, lockedGlobs, save]);

  const unlock = useCallback(
    (glob: string): void => {
      save(toUnlockedGlobs(lockedGlobs, glob));
    },
    [lockedGlobs, save]
  );

  return {
    canLockFile: file !== null && canAddGlob(lockedGlobs, file),
    canLockFolder: folder !== null && canAddGlob(lockedGlobs, folder),
    error: write.error?.message ?? null,
    globs: lockedGlobs,
    handleLockFile: lockFile,
    handleLockFolder: lockFolder,
    handleUnlock: unlock,
    isPending: write.pending,
  };
};

export { useFileLock };

export type { FileLockState };
