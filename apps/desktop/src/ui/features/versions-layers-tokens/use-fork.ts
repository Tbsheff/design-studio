import { useCallback, useState } from "react";
import type { FormEvent } from "react";

import { COPY } from "./copy.js";

interface ForkApi {
  readonly cancel: () => void;
  readonly error: string | null;
  readonly from: string | null;
  readonly name: string;
  readonly setName: (value: string) => void;
  readonly start: (versionId: string) => void;
  readonly submit: (event: FormEvent) => Promise<void>;
}

const useFork = (
  directionName: string | null,
  onNewDirection: (fromVersionId: string, name: string) => Promise<void>
): ForkApi => {
  const [from, setFrom] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [failure, setFailure] = useState<string | null>(null);

  const start = useCallback(
    (versionId: string): void => {
      setFrom(versionId);
      setName(`${directionName ?? COPY.directionDefault}${COPY.variantSuffix}`);
      setFailure(null);
    },
    [directionName]
  );

  const submit = useCallback(
    async (event: FormEvent): Promise<void> => {
      event.preventDefault();

      if (!from || !name.trim()) {
        return;
      }

      try {
        await onNewDirection(from, name.trim());
        setFrom(null);
      } catch (error: unknown) {
        let message = String(error);

        if (error instanceof Error) {
          ({ message } = error);
        }

        setFailure(message);
      }
    },
    [from, name, onNewDirection]
  );

  const cancel = useCallback((): void => {
    setFrom(null);
  }, []);

  const error = failure;

  return { cancel, error, from, name, setName, start, submit };
};

export { useFork };

export type { ForkApi };
