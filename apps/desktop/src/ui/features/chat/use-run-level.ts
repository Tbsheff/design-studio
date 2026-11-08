import type { Project, RunLevel } from "@design-studio/contracts";
import { useEffect, useRef, useState } from "react";

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
  const [level, setLevel] = useState<RunLevel>(saved ?? "prototype");
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (saved) {
      setLevel(saved);
    }
  }, [saved, projectId]);

  const choose = (next: RunLevel): void => {
    if (next === level) {
      return;
    }

    const previous = level;
    seq.current += 1;
    const ticket = seq.current;
    setLevel(next);
    setError(null);
    api
      .updateSettings(projectId, { defaultLevel: next })
      .then((project) => {
        if (ticket === seq.current) {
          onSaved(project);
        }
      })
      .catch((caught: unknown) => {
        if (ticket !== seq.current) {
          return;
        }

        setLevel(previous);
        setError(`Could not save the run level: ${errorText(caught)}`);
      });
  };

  return { choose, clearError: () => setError(null), error, level };
};

export { useRunLevel };
