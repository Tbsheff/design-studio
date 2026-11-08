import type { InsertableList } from "@design-studio/contracts/insert";
import { useCallback, useEffect, useState } from "react";

import { insertApi, insertError } from "./component-insert-api.js";

interface InsertableState {
  readonly error: string | null;
  readonly list: InsertableList | null;
  readonly scope: string;
  readonly stamp: string;
}

interface Insertable {
  readonly error: string | null;
  readonly list: InsertableList | null;
  readonly retry: () => void;
}

const useInsertable = (
  projectId: string,
  directionId: string | null,
  enabled: boolean,
  version: string
): Insertable => {
  const [state, setState] = useState<InsertableState>({
    error: null,
    list: null,
    scope: "",
    stamp: "",
  });

  const [attempt, setAttempt] = useState(0);
  const scope = `${projectId}:${directionId}`;

  useEffect(() => {
    if (!enabled || !directionId) {
      return;
    }

    let live = true;
    const stamp = `${version}:${attempt}`;

    const read = async (): Promise<void> => {
      try {
        const list = await insertApi.list(projectId, directionId);

        if (live) {
          setState({ error: null, list, scope, stamp });
        }
      } catch (error: unknown) {
        if (live) {
          setState((prev) => ({
            error: insertError(error),
            list: prev.list,
            scope,
            stamp,
          }));
        }
      }
    };

    read();

    return (): void => {
      live = false;
    };
  }, [projectId, directionId, enabled, scope, version, attempt]);

  const retry = useCallback((): void => setAttempt((count) => count + 1), []);

  if (state.scope !== scope) {
    return { error: null, list: null, retry };
  }

  return { error: state.error, list: state.list, retry };
};

export { useInsertable };

export type { Insertable };
