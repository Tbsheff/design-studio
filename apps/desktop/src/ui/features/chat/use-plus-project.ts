import { useCallback, useMemo } from "react";

import { limitLabel } from "./budget-limit-model.js";
import type {
  ComposerSheetState,
  PlusProjectProps,
} from "./composer-sheet-model.js";
import type { PromptBoxProps } from "./prompt-box-props.js";
import { enabledSkills, useSkillCatalog } from "./skills-model.js";

const NO_DISABLED: readonly string[] = [];

const usePlusProject = (
  box: PromptBoxProps,
  sheet: ComposerSheetState
): PlusProjectProps => {
  const { catalog } = useSkillCatalog();
  const disabled = box.settings.disabledSkills ?? NO_DISABLED;
  let skillsCount: string | null = null;

  if (catalog) {
    skillsCount = String(enabledSkills(catalog, disabled).length);
  }

  const budgetLabel = limitLabel(box.settings.maxBudgetUsd);
  const { show } = sheet;
  const onBudget = useCallback((): void => show("budget"), [show]);
  const onDataUse = useCallback((): void => show("data"), [show]);
  const onSkillList = useCallback((): void => show("skills"), [show]);

  return useMemo(
    () => ({ budgetLabel, onBudget, onDataUse, onSkillList, skillsCount }),
    [budgetLabel, onBudget, onDataUse, onSkillList, skillsCount]
  );
};

export { usePlusProject };
