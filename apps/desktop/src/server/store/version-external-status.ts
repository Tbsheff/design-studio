import type { WorkTreeStatus } from "@design-studio/contracts";

import { comparePaths } from "../platform/git/index.js";

interface KnownChanges {
  readonly head: string;
  readonly changed: Set<string>;
}

interface ExternalStatusDeps {
  readonly changedAmong: (paths: string[]) => Promise<string[]>;
  readonly fullScan: () => Promise<WorkTreeStatus>;
}

const MAX_SCOPED_STATUS_PATHS = 500;

const toStatus = (changed: Set<string>): WorkTreeStatus => {
  const sorted = [...changed].toSorted(comparePaths);

  return { changed: sorted, dirty: sorted.length > 0 };
};

const deleteScoped = (changed: Set<string>, scoped: string[]): void => {
  for (const relative of scoped) {
    changed.delete(relative);

    for (const known of changed) {
      if (known.startsWith(`${relative}/`)) {
        changed.delete(known);
      }
    }
  }
};

interface ExternalStatus {
  readonly forget: (key: string) => void;
  readonly read: (
    key: string,
    head: string,
    paths: string[] | null,
    deps: ExternalStatusDeps
  ) => Promise<WorkTreeStatus>;
}

const createExternalStatus = (): ExternalStatus => {
  const known = new Map<string, KnownChanges>();

  const scan = async (
    key: string,
    head: string,
    deps: ExternalStatusDeps
  ): Promise<WorkTreeStatus> => {
    const full = await deps.fullScan();
    known.set(key, { changed: new Set(full.changed), head });

    return full;
  };

  const read = async (
    key: string,
    head: string,
    paths: string[] | null,
    deps: ExternalStatusDeps
  ): Promise<WorkTreeStatus> => {
    const current = known.get(key);

    if (current?.head !== head) {
      return scan(key, head, deps);
    }

    if (paths === null || paths.length === 0) {
      return toStatus(current.changed);
    }

    if (paths.length > MAX_SCOPED_STATUS_PATHS) {
      return scan(key, head, deps);
    }

    const changedNow = await deps.changedAmong(paths);
    deleteScoped(current.changed, paths);

    for (const relative of changedNow) {
      current.changed.add(relative);
    }

    return toStatus(current.changed);
  };

  const forget = (key: string): void => {
    known.delete(key);
  };

  return { forget, read };
};

export { createExternalStatus };

export type { ExternalStatus, ExternalStatusDeps };
