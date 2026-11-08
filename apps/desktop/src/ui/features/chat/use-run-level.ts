import type { Project, RunLevel } from "@design-studio/contracts";
import { useRef, useState, startTransition } from "react";

import { api, errorText } from "../../api.js";

interface RunLevelState {
  level: RunLevel;
  error: string | null;
  choose: (level: RunLevel) => void;
  clearError: () => void;
}

const useRunLevel = (
  projectId: string,
  saved: RunLevel | undefined,
  onSaved: (project: Project) => void
): RunLevelState => {
  const [pending, setPending] = useState<RunLevel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);
  const level = pending ?? saved ?? "prototype";

  const choose = (next: RunLevel): void => {
    if (next === level) {
      return;
    }

    seq.current += 1;
    const ticket = seq.current;
    setPending(next);
    setError(null);
    startTransition(async () => {
      try {
        const project = await api.updateSettings(projectId, {
          defaultLevel: next,
        });

        if (ticket === seq.current) {
          onSaved(project);
          setPending(null);
        }
      } catch (thrownError: unknown) {
        if (ticket !== seq.current) {
          return;
        }

        setPending(null);
        setError(`Could not save the run level: ${errorText(thrownError)}`);
      }
    });
  };

  const clearError = (): void => setError(null);

  return { choose, clearError, error, level };
};

export { useRunLevel };

export type { RunLevelState };
