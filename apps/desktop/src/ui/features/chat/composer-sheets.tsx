import type { ReactElement } from "react";

import type { ComposerSheetState } from "./composer-sheet-model.js";
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

  return null;
};

export { ComposerSheets };
