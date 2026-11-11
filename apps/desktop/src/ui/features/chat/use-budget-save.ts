import type { Project, ProjectSettings } from "@design-studio/contracts";
import { startTransition, useCallback, useState } from "react";

import { api, errorText } from "../../api.js";

interface PendingLimit {
  readonly value: number | null;
}

interface BudgetSave {
  readonly current: number | null;
  readonly error: string | null;
  readonly save: (value: number | null) => void;
}

const useBudgetSave = (
  projectId: string,
  settings: ProjectSettings,
  onSaved: (project: Project) => void,
  onDone: () => void
): BudgetSave => {
  const [pending, setPending] = useState<PendingLimit | null>(null);
  const [error, setError] = useState<string | null>(null);
  let current = settings.maxBudgetUsd;

  if (pending !== null) {
    current = pending.value;
  }

  const save = useCallback(
    (value: number | null): void => {
      setPending({ value });
      setError(null);
      startTransition(async () => {
        try {
          const project = await api.updateSettings(projectId, {
            maxBudgetUsd: value,
          });

          onSaved(project);
          setPending(null);
          onDone();
        } catch (thrownError: unknown) {
          setPending(null);
          setError(errorText(thrownError));
        }
      });
    },
    [projectId, onSaved, onDone]
  );

  return { current, error, save };
};

export { useBudgetSave };
