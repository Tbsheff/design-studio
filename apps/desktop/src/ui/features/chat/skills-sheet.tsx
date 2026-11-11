import type { Project, ProjectSettings } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { SkillsIndicatorPop } from "./skills-indicator-pop.js";
import { useSkillSave } from "./use-skill-save.js";

const SkillsSheet = ({
  projectId,
  settings,
  onSaved,
  onClose,
}: {
  readonly projectId: string;
  readonly settings: ProjectSettings;
  readonly onSaved: (project: Project) => void;
  readonly onClose: () => void;
}): ReactElement => {
  const { change, disabled, error } = useSkillSave(
    projectId,
    settings,
    onSaved
  );

  return (
    <SkillsIndicatorPop
      disabled={disabled}
      allowBash={settings.allowBash}
      error={error}
      onChange={change}
      onClose={onClose}
    />
  );
};

export { SkillsSheet };
