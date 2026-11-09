import { routes } from "@design-studio/actions/dev-server/routes";
import { useCallback, useTransition } from "react";

import { call } from "../../platform/http.js";

interface DevServerToggle {
  readonly isPending: boolean;
  readonly onToggle: (projectId: string, isLive: boolean) => void;
}

const runToggle = async (projectId: string, isLive: boolean): Promise<void> => {
  try {
    if (isLive) {
      await call(routes.stopDevServer, { projectId });

      return;
    }

    await call(routes.startDevServer, { projectId });
  } catch {
    globalThis.console.debug("dev server toggle failed");
  }
};

const useDevServerToggle = (): DevServerToggle => {
  const [isPending, startTransition] = useTransition();

  const onToggle = useCallback((projectId: string, isLive: boolean): void => {
    startTransition(async () => {
      await runToggle(projectId, isLive);
    });
  }, []);

  return { isPending, onToggle };
};

export { useDevServerToggle };

export type { DevServerToggle };
