import type { Version } from "@design-studio/contracts";
import { useCallback, useMemo, useState } from "react";

import { indexVersions } from "./version-labels.js";
import type { VersionIndex } from "./version-labels.js";
import {
  toNamedVersions,
  toRenamed,
  toSortedVersions,
} from "./versions-panel-model.js";
import type { RenamedVersions } from "./versions-panel-model.js";

interface VersionNamesApi {
  readonly index: VersionIndex;
  readonly rename: (version: Version, name: string | null) => void;
  readonly sorted: Version[];
}

const useVersionNames = (
  versions: Version[],
  onRename: ((version: Version, name: string | null) => Promise<void>) | null
): VersionNamesApi => {
  const [renamed, setRenamed] = useState<RenamedVersions | null>(null);

  const named = useMemo(
    () => toNamedVersions(versions, renamed),
    [versions, renamed]
  );

  const sorted = useMemo(() => toSortedVersions(named), [named]);
  const index = useMemo(() => indexVersions(named), [named]);

  const rename = useCallback(
    (version: Version, name: string | null): void => {
      setRenamed((previous) => toRenamed(previous, versions, version.id, name));
      void onRename?.(version, name);
    },
    [onRename, versions]
  );

  return { index, rename, sorted };
};

export { useVersionNames };
