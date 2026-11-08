import { startTransition, useCallback } from "react";

import { runOrReport } from "./settle-model.js";

type LinkRunner = <Result>(task: () => Promise<Result>) => void;

const useLinkRunner = (onError: (message: string) => void): LinkRunner =>
  useCallback<LinkRunner>(
    (task) => {
      startTransition(async () => {
        await runOrReport(task(), (error) => onError(error.message));
      });
    },
    [onError]
  );

export { useLinkRunner };

export type { LinkRunner };
