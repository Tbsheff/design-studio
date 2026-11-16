import { useCallback } from "react";
import type { ReactElement } from "react";

import { ChoiceItem } from "./choice-item.js";
import { MODE_SHORT_HINT } from "./composer-menu-model.js";
import { MODE_LABEL } from "./composer-mode-model.js";
import type { ComposerMode } from "./composer-mode-model.js";
import { MODE_HINT } from "./run-settings-model.js";

const ModeChoice = ({
  choice,
  isChecked,
  onMode,
  onClose,
}: {
  readonly choice: ComposerMode;
  readonly isChecked: boolean;
  readonly onMode: (mode: ComposerMode) => void;
  readonly onClose: (refocus: boolean) => void;
}): ReactElement => {
  const pick = useCallback((): void => {
    onMode(choice);
    onClose(true);
  }, [onMode, onClose, choice]);

  return (
    <ChoiceItem
      label={MODE_LABEL[choice]}
      hint={MODE_SHORT_HINT[choice]}
      full={MODE_HINT[choice]}
      checked={isChecked}
      onPick={pick}
    />
  );
};

export { ModeChoice };
