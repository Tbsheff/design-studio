import { useCallback, useState, useTransition } from "react";

import { errorText } from "../../api.js";

interface PublishAct {
  readonly busy: string | null;
  readonly failure: string | null;
  readonly act: (label: string, task: () => Promise<void>) => void;
  readonly fail: (text: string) => void;
}

const usePublishAct = (): PublishAct => {
  const [label, setLabel] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const act = useCallback(
    (nextLabel: string, task: () => Promise<void>): void => {
      setLabel(nextLabel);
      setFailure(null);
      startTransition(async () => {
        try {
          await task();
        } catch (error) {
          setFailure(errorText(error));
        }
      });
    },
    []
  );

  const fail = useCallback((text: string): void => {
    setFailure(text);
  }, []);

  let busy: string | null = null;

  if (isPending) {
    busy = label;
  }

  return { act, busy, fail, failure };
};

export { usePublishAct };

export type { PublishAct };
