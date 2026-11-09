import { routes } from "@design-studio/actions/token/routes";
import { useCallback, useState } from "react";
import type { ChangeEvent, FormEvent, KeyboardEvent } from "react";

import { errorText } from "../../api.js";
import { useAction } from "../../platform/query.js";
import { isNewNameReady } from "./token-rename-model.js";
import type { TokenScope } from "./token-usage-context.js";

interface TokenRename {
  readonly draft: string;
  readonly error: string | null;
  readonly handleCancel: () => void;
  readonly handleChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  readonly handleStart: () => void;
  readonly handleSubmit: (event: FormEvent) => void;
  readonly isEditing: boolean;
  readonly isPending: boolean;
  readonly isReady: boolean;
}

const useTokenRename = (
  name: string,
  scope: TokenScope | null
): TokenRename => {
  const [draft, setDraft] = useState(name);
  const [isEditing, setIsEditing] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const rename = useAction(routes.renameToken);
  const { pending: isPending, run } = rename;
  const isReady = isNewNameReady(name, draft);

  const handleStart = useCallback((): void => {
    setDraft(name);
    setHasFailed(false);
    setIsEditing(true);
  }, [name]);

  const handleCancel = useCallback((): void => {
    setIsEditing(false);
    setHasFailed(false);
  }, []);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setDraft(event.target.value.trim());
      setHasFailed(false);
    },
    []
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "Escape") {
        event.stopPropagation();
        handleCancel();
      }
    },
    [handleCancel]
  );

  const handleSubmit = useCallback(
    async (event: FormEvent): Promise<void> => {
      event.preventDefault();

      if (!isReady || scope === null) {
        return;
      }

      const out = await run({ ...scope, name, newName: draft });

      setHasFailed(out === null);
      setIsEditing(out === null);
    },
    [draft, isReady, name, run, scope]
  );

  let error: string | null = null;

  if (isEditing && hasFailed && rename.error) {
    error = errorText(rename.error);
  }

  return {
    draft,
    error,
    handleCancel,
    handleChange,
    handleKeyDown,
    handleStart,
    handleSubmit,
    isEditing,
    isPending,
    isReady,
  };
};

export { useTokenRename };

export type { TokenRename };
