import { routes } from "@design-studio/actions/token/routes";
import { useCallback, useState, useTransition } from "react";

import { errorText } from "../../api.js";
import { useAction } from "../../platform/query.js";
import type { TokenScope } from "./token-usage-context.js";

interface TokenDelete {
  readonly error: string | null;
  readonly handleCancel: () => void;
  readonly handleConfirm: () => void;
  readonly handleStart: () => void;
  readonly isConfirming: boolean;
  readonly isPending: boolean;
}

const useTokenDelete = (
  name: string,
  scope: TokenScope | null
): TokenDelete => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const remove = useAction(routes.deleteToken);
  const { run } = remove;

  const handleStart = useCallback((): void => {
    setHasFailed(false);
    setIsConfirming(true);
  }, []);

  const handleCancel = useCallback((): void => {
    setHasFailed(false);
    setIsConfirming(false);
  }, []);

  const handleConfirm = useCallback((): void => {
    if (scope === null) {
      return;
    }

    startTransition(async () => {
      const out = await run({ ...scope, name });

      setHasFailed(out === null);
      setIsConfirming(out === null);
    });
  }, [name, run, scope]);

  let error: string | null = null;

  if (isConfirming && hasFailed && remove.error) {
    error = errorText(remove.error);
  }

  return {
    error,
    handleCancel,
    handleConfirm,
    handleStart,
    isConfirming,
    isPending,
  };
};

export { useTokenDelete };

export type { TokenDelete };
