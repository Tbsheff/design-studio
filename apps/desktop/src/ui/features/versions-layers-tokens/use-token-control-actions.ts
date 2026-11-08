import type { DirectStyleProperty } from "@design-studio/contracts";
import { useCallback } from "react";

import type { TokenCreateRequest } from "./token-control-model.js";

interface ActionsInput {
  readonly close: (shouldRefocus: boolean) => void;
  readonly commit: () => void;
  readonly open: (view: "picker") => void;
  readonly preview: (changes: Record<string, string>) => void;
  readonly prop: DirectStyleProperty;
  readonly requestCreate: ((request: TokenCreateRequest) => void) | null;
  readonly targets: DirectStyleProperty[];
  readonly value: string;
  readonly view: "picker" | null;
}

interface Actions {
  readonly create: (() => void) | null;
  readonly handleToggle: () => void;
  readonly handleWrite: (cssVar: string) => void;
}

const useTokenControlActions = (input: ActionsInput): Actions => {
  const { close, commit, open, preview, prop, requestCreate } = input;
  const { targets, value, view } = input;

  const handleWrite = useCallback(
    (cssVar: string): void => {
      close(true);

      preview(
        Object.fromEntries(targets.map((name) => [name, `var(${cssVar})`]))
      );
      commit();
    },
    [close, commit, preview, targets]
  );

  const handleToggle = useCallback((): void => {
    if (view === "picker") {
      close(false);
    } else {
      open("picker");
    }
  }, [close, open, view]);

  const handleCreate = useCallback((): void => {
    close(false);
    requestCreate?.({ prop, targets, value });
  }, [close, prop, requestCreate, targets, value]);

  let create: (() => void) | null = null;

  if (requestCreate) {
    create = handleCreate;
  }

  return { create, handleToggle, handleWrite };
};

export { useTokenControlActions };
