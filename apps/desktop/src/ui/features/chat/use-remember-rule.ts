import { routes } from "@design-studio/actions/design-rule/routes";
import { useCallback, useState } from "react";

import { useAction } from "../../platform/query.js";
import { uiStore } from "../../platform/storage.js";
import type { RunView } from "./run-state-model.js";

interface RememberedRule {
  readonly isChecked: boolean;
  readonly line: string;
}

interface RememberRule {
  readonly canRemember: boolean;
  readonly error: string | null;
  readonly isPending: boolean;
  readonly saved: RememberedRule | null;
  readonly handleOpenRules: () => void;
  readonly handleRemember: () => void;
}

const useRememberRule = (run: RunView): RememberRule => {
  const create = useAction(routes.createDesignRule);
  const [saved, setSaved] = useState<RememberedRule | null>(null);
  const { pending: isPending, run: createRule } = create;
  const error = create.error?.message ?? null;
  const { directionId, runId } = run;
  const text = run.request?.prompt ?? "";
  const canRemember = directionId !== null && text.trim() !== "";

  const handleRemember = useCallback(async (): Promise<void> => {
    const projectId = uiStore.get().activeProjectId;

    if (directionId === null || projectId === null) {
      return;
    }

    const created = await createRule({ directionId, projectId, runId, text });

    if (created) {
      setSaved({ isChecked: created.isChecked, line: created.line });
    }
  }, [createRule, directionId, runId, text]);

  const handleOpenRules = useCallback((): void => {
    uiStore.set({ editorColumn: { isOpen: true, tab: "system" } });
  }, []);

  return {
    canRemember,
    error,
    handleOpenRules,
    handleRemember,
    isPending,
    saved,
  };
};

export { useRememberRule };

export type { RememberRule, RememberedRule };
