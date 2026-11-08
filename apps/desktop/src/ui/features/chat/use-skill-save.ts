import type { Project, ProjectSettings } from "@design-studio/contracts";
import { startTransition, useCallback, useState } from "react";

import { api, errorText } from "../../api.js";

const NO_DISABLED: string[] = [];

interface SkillSave {
  readonly change: (next: string[]) => void;
  readonly disabled: string[];
  readonly error: string | null;
}

const useSkillSave = (
  projectId: string,
  settings: ProjectSettings,
  onSaved: (project: Project) => void
): SkillSave => {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string[] | null>(null);

  const change = useCallback(
    (next: string[]) => {
      setPending(next);
      startTransition(async () => {
        try {
          const project = await api.updateSettings(projectId, {
            disabledSkills: next,
          });

          setError(null);
          onSaved(project);
          setPending((current) => {
            if (current === next) {
              return null;
            }

            return current;
          });
        } catch (thrownError: unknown) {
          setError(errorText(thrownError));
          setPending(null);
        }
      });
    },
    [projectId, onSaved]
  );

  const disabled = pending ?? settings.disabledSkills ?? NO_DISABLED;

  return { change, disabled, error };
};

export { useSkillSave };
