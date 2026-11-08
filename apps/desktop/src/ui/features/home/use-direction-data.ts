import type { Version, WorkTreeStatus } from "@design-studio/contracts";
import { useCallback, useEffect } from "react";
import type { MutableRefObject } from "react";

import { api } from "../../api.js";
import { toVersionsWith } from "./studio-data-model.js";
import { useKeyedState } from "./use-keyed-state.js";

interface DirectionData {
  readonly versions: Version[];
  readonly status: WorkTreeStatus | null;
  readonly setStatus: (status: WorkTreeStatus | null) => void;
  readonly refreshVersions: () => void;
  readonly addVersion: (version: Version) => void;
}

type DirectionRef = MutableRefObject<string | null>;

const EMPTY_VERSIONS: Version[] = [];

const toDirectionKey = (
  projectId: string,
  directionId: string | null
): string | null => {
  if (directionId === null) {
    return null;
  }

  return `${projectId}/${directionId}`;
};

const getVersionsOrNull = async (
  projectId: string,
  directionId: string
): Promise<Version[] | null> => {
  try {
    return await api.listVersions(projectId, directionId);
  } catch {
    return null;
  }
};

const getStatusOrNull = async (
  projectId: string,
  directionId: string
): Promise<WorkTreeStatus | null> => {
  try {
    return await api.status(projectId, directionId);
  } catch {
    return null;
  }
};

const runVersionsRefresh = async (
  projectId: string,
  directionId: string,
  directionRef: DirectionRef,
  setVersions: (versions: Version[]) => void
): Promise<void> => {
  const list = await getVersionsOrNull(projectId, directionId);

  if (list !== null && directionRef.current === directionId) {
    setVersions(list);
  }
};

const runStatusRefresh = async (
  projectId: string,
  directionId: string,
  directionRef: DirectionRef,
  setStatus: (status: WorkTreeStatus | null) => void
): Promise<void> => {
  const status = await getStatusOrNull(projectId, directionId);

  if (status !== null && directionRef.current === directionId) {
    setStatus(status);
  }
};

const useDirectionData = (
  projectId: string,
  directionId: string | null,
  directionRef: DirectionRef
): DirectionData => {
  const key = toDirectionKey(projectId, directionId);
  const versionsBox = useKeyedState<Version[]>(key, EMPTY_VERSIONS);
  const statusBox = useKeyedState<WorkTreeStatus | null>(key, null);
  const { set: setVersions, update: updateVersions } = versionsBox;
  const { set: setStatus } = statusBox;

  const refreshVersions = useCallback((): void => {
    const { current } = directionRef;

    if (current) {
      runVersionsRefresh(projectId, current, directionRef, setVersions);
    }
  }, [projectId, directionRef, setVersions]);

  const addVersion = useCallback(
    (version: Version): void => {
      updateVersions((previous) => toVersionsWith(previous, version));

      if ((version.changedFilesTotal ?? 0) > version.changedFiles.length) {
        refreshVersions();
      }
    },
    [refreshVersions, updateVersions]
  );

  useEffect(() => {
    if (!directionId) {
      return;
    }

    refreshVersions();
    runStatusRefresh(projectId, directionId, directionRef, setStatus);
  }, [projectId, directionId, directionRef, refreshVersions, setStatus]);

  return {
    addVersion,
    refreshVersions,
    setStatus,
    status: statusBox.value,
    versions: versionsBox.value,
  };
};

export { useDirectionData };

export type { DirectionData, DirectionRef };
