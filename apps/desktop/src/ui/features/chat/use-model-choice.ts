import type { Project } from "@design-studio/contracts";
import { useTransition } from "react";

import { api, errorText } from "../../api.js";

const useModelChoice = (
  projectId: string,
  currentModel: string,
  onSaved: (project: Project) => void,
  setError: (message: string | null) => void
): ((model: string) => void) => {
  const [, startSaving] = useTransition();

  return (model) => {
    if (model === currentModel) {
      return;
    }

    setError(null);
    startSaving(async () => {
      try {
        onSaved(await api.updateSettings(projectId, { model }));
      } catch (thrownError) {
        setError(`Could not save the model: ${errorText(thrownError)}`);
      }
    });
  };
};

export { useModelChoice };
