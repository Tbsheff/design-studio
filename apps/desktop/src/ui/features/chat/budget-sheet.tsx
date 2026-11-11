import type { Project, ProjectSettings } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { BudgetMenu } from "./budget-menu.js";
import { useBudgetSave } from "./use-budget-save.js";

const BudgetSheet = ({
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
  const { current, error, save } = useBudgetSave(
    projectId,
    settings,
    onSaved,
    onClose
  );

  return (
    <BudgetMenu
      current={current}
      error={error}
      onPick={save}
      onClose={onClose}
    />
  );
};

export { BudgetSheet };
