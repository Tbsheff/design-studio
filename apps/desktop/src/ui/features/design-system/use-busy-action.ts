import { useCallback, useState, useTransition } from "react";

import { errorText } from "../../api.js";

interface BusyAction {
  readonly error: string | null;
  readonly isBusy: boolean;
  readonly run: (task: () => Promise<void>) => void;
}

const useBusyAction = (onClose: () => void): BusyAction => {
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
          onClose();
        } catch (error) {
          setMessage(errorText(error));
        }
      });
    },
    [isBusy, onClose]
  );

  return { error: message, isBusy, run };
};

export { useBusyAction };

export type { BusyAction };
