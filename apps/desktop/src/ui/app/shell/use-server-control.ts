import { useCallback, useTransition } from "react";

import { api } from "../../api";
import type { ServerAction } from "./server-action-button";

const useServerControl = (
  projectId: string,
  refresh: () => void
): ((action: ServerAction) => void) => {
  const [, startTransition] = useTransition();

  return useCallback(
    (action: ServerAction): void => {
      startTransition(async () => {
        try {
          await api.appControl(projectId, action);
          refresh();
        } catch {
          refresh();
        }
      });
    },
    [projectId, refresh]
  );
};

export { useServerControl };
