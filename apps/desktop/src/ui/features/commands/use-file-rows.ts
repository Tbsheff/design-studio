import { routes } from "@design-studio/actions/workspace/routes";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { api, call, uiStore } from "./deps.js";
import { toFileRows } from "./file-rows-model.js";
import type { SourceFile } from "./file-rows-model.js";
import type { Row } from "./palette-row-types.js";

interface FileRows {
  readonly isFailed: boolean;
  readonly isLoading: boolean;
  readonly rows: Row[];
}

interface FileScope {
  readonly directionId: string | null;
  readonly projectId: string;
}

const NO_FILES: readonly SourceFile[] = [];
const NO_ROWS: Row[] = [];

const inflight = new Map<string, Promise<readonly SourceFile[]>>();

const toScopeKey = (scope: FileScope): string =>
  `${scope.projectId}:${scope.directionId ?? ""}`;

const toScope = (): FileScope | null => {
  const { activeProjectId, directionByProject } = uiStore.get();

  if (activeProjectId === null) {
    return null;
  }

  return {
    directionId: directionByProject[activeProjectId] ?? null,
    projectId: activeProjectId,
  };
};

const readFiles = async (scope: FileScope): Promise<readonly SourceFile[]> => {
  if (scope.directionId === null) {
    const listed = await call(routes.listFilesWorkspace, {
      projectId: scope.projectId,
    });

    return listed.files;
  }

  const listed = await call(routes.listFilesWorkspace, {
    directionId: scope.directionId,
    projectId: scope.projectId,
  });

  return listed.files;
};

const loadFiles = async (scope: FileScope): Promise<readonly SourceFile[]> => {
  const key = toScopeKey(scope);
  const pending = inflight.get(key);

  if (pending) {
    return pending;
  }

  const started = readFiles(scope);

  inflight.set(key, started);

  try {
    return await started;
  } finally {
    inflight.delete(key);
  }
};

const toDirectionId = async (scope: FileScope): Promise<string | null> => {
  if (scope.directionId !== null) {
    return scope.directionId;
  }

  const project = await api.getProject(scope.projectId);

  return project.directions[0]?.id ?? null;
};

interface OpenTarget {
  readonly directionId: string;
  readonly file: string;
  readonly projectId: string;
}

const useFileRows = (
  isEnabled: boolean,
  query: string,
  onOpen: (target: OpenTarget) => void
): FileRows => {
  const [files, setFiles] = useState<readonly SourceFile[] | null>(null);
  const [isFailed, setIsFailed] = useState(false);

  useEffect(() => {
    const scope = toScope();

    if (!isEnabled || scope === null) {
      return (): void => {
        globalThis.console.debug("files idle");
      };
    }

    let isLive = true;

    const load = async (): Promise<void> => {
      try {
        const loaded = await loadFiles(scope);

        if (isLive) {
          setFiles(loaded);
        }
      } catch {
        if (isLive) {
          setIsFailed(true);
        }
      }
    };

    startTransition(load);

    return (): void => {
      isLive = false;
    };
  }, [isEnabled]);

  const openFile = useCallback(
    (path: string): void => {
      const scope = toScope();

      if (scope === null) {
        return;
      }

      const open = async (): Promise<void> => {
        try {
          const directionId = await toDirectionId(scope);

          if (directionId !== null) {
            onOpen({ directionId, file: path, projectId: scope.projectId });
          }
        } catch {
          setIsFailed(true);
        }
      };

      startTransition(open);
    },
    [onOpen]
  );

  const rows = useMemo(() => {
    if (!isEnabled || toScope() === null) {
      return NO_ROWS;
    }

    return toFileRows(files ?? NO_FILES, query, openFile);
  }, [files, isEnabled, openFile, query]);

  const isLoading = isEnabled && files === null && !isFailed;

  return { isFailed, isLoading, rows };
};

export { useFileRows };

export type { FileRows, OpenTarget };
