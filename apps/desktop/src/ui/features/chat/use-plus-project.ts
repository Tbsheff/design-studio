import { useCallback, useMemo } from "react";

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

  const { show } = sheet;
  const onSkillList = useCallback((): void => show("skills"), [show]);

  return useMemo(
    () => ({ onSkillList, skillsCount }),
    [onSkillList, skillsCount]
  );
};

export { usePlusProject };
