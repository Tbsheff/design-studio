import { routes } from "@design-studio/actions/completion/routes";
import { useCallback } from "react";

import { useAction } from "../../platform/query.js";
import { useUi } from "../../platform/storage.js";
import { toListInput } from "./completion-model.js";

interface CompletionRecordView {
  readonly at: number;
  readonly costUsd: number;
  readonly frame: string | null;
  readonly id: string;
  readonly promptStart: string;
}

interface CompletionState {
  readonly capUsd: number;
  readonly error: string | null;
  readonly isEnabled: boolean;
  readonly isPending: boolean;
  readonly projectId: string | null;
  readonly records: readonly CompletionRecordView[];
  readonly handleSaveCap: (capUsd: number) => void;
  readonly handleSaveEnabled: (isEnabled: boolean) => void;
  readonly spentUsd: number;
}

const useCompletion = (): CompletionState => {
  const ui = useUi();
  const activeId = ui.activeProjectId;
  const list = useAction(routes.listCompletion, toListInput(activeId));
  const save = useAction(routes.setCompletion);
  const currentCap = list.data?.capUsd ?? 1;
  const currentEnabled = list.data?.isEnabled ?? false;
  const { run } = save;

  const saveEnabled = useCallback(
    (next: boolean): void => {
      if (activeId !== null) {
        run({ capUsd: currentCap, isEnabled: next, projectId: activeId });
      }
    },
    [currentCap, activeId, run]
  );

  const saveCap = useCallback(
    (next: number): void => {
      if (activeId !== null) {
        run({ capUsd: next, isEnabled: currentEnabled, projectId: activeId });
      }
    },
    [currentEnabled, activeId, run]
  );

  return {
    capUsd: currentCap,
    error: save.error?.message ?? list.error?.message ?? null,
    handleSaveCap: saveCap,
    handleSaveEnabled: saveEnabled,
    isEnabled: currentEnabled,
    isPending: save.pending,
    projectId: activeId,
    records: list.data?.items ?? [],
    spentUsd: list.data?.spentUsd ?? 0,
  };
};

export { useCompletion };

export type { CompletionRecordView, CompletionState };
