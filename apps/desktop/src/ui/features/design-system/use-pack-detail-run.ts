import { useCallback, useState, useTransition } from "react";

import { errorText } from "../../api.js";

interface PackDetailRun {
  readonly error: string | null;
  readonly isBusy: boolean;
  readonly run: (task: () => Promise<void>) => void;
}

const usePackDetailRun = (): PackDetailRun => {
  const [isBusy, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const run = useCallback(
    (task: () => Promise<void>): void => {
      if (isBusy) {
        return;
      }

      setMessage(null);
      startTransition(async () => {
        try {
          await task();
        } catch (error) {
          setMessage(errorText(error));
        }
      });
    },
    [isBusy]
  );

  return { error: message, isBusy, run };
};

export { usePackDetailRun };

export type { PackDetailRun };
