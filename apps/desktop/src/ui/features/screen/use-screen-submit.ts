import { useCallback, useTransition } from "react";
import type { FormEvent } from "react";

interface ScreenSubmit {
  readonly handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly isPending: boolean;
}

const useScreenSubmit = <Done>(
  send: () => Promise<Done | null>,
  onDone: () => void
): ScreenSubmit => {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();

      startTransition(async () => {
        const done = await send();

        if (done !== null) {
          onDone();
        }
      });
    },
    [onDone, send]
  );

  return { handleSubmit, isPending };
};

export { useScreenSubmit };

export type { ScreenSubmit };
