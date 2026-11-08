import type { VersionChanges } from "@design-studio/contracts";
import { useEffect, useState } from "react";

import { watchVersionChanges } from "./versions-api.js";

interface ChangesState {
  readonly changes: VersionChanges | null;
  readonly error: string | null;
  readonly key: string;
}

const useChanges = (
  projectId: string,
  from: string,
  to: string
): ChangesState | null => {
  const [state, setState] = useState<ChangesState | null>(null);
  const key = `${projectId}/${from}/${to}`;

  useEffect(
    () =>
      watchVersionChanges(projectId, { from, to }, (result) => {
        setState({ key, ...result });
      }),
    [projectId, from, to, key]
  );

  if (state?.key === key) {
    return state;
  }

  return null;
};

export { useChanges };
