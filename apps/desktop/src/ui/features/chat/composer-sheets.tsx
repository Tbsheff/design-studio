import type { ReactElement } from "react";

import { BudgetSheet } from "./budget-sheet.js";
import type { ComposerSheetState } from "./composer-sheet-model.js";
import { DataUseSheet } from "./data-use-sheet.js";
import type { PromptBoxProps } from "./prompt-box-props.js";
import { SkillsSheet } from "./skills-sheet.js";

const ComposerSheets = ({
  box,
  sheet,
}: {
  readonly box: PromptBoxProps;
  readonly sheet: ComposerSheetState;
}): ReactElement | null => {
  const { close, open } = sheet;
  const handleSaved = box.onSettingsSaved;

  if (open === "skills") {
    return (
      <SkillsSheet
        projectId={box.projectId}
        settings={box.settings}
        onSaved={handleSaved}
        onClose={close}
      />
    );
  }

  if (open === "budget") {
    return (
      <BudgetSheet
        projectId={box.projectId}
        settings={box.settings}
        onSaved={handleSaved}
        onClose={close}
      />
    );
  }

  if (open === "data") {
    return <DataUseSheet onClose={close} />;
  }

  return null;
};

export { ComposerSheets };
