import type { RunEffort } from "@design-studio/contracts";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { ChoiceItem } from "./choice-item.js";
import {
  EFFORT_HINT,
  EFFORT_LABEL,
  toEffortValue,
} from "./run-settings-model.js";
import type { EffortChoice as EffortOption } from "./run-settings-model.js";
import { EFFORT_SHORT } from "./slash-groups.js";

const EffortChoice = ({
  choice,
  isChecked,
  onEffort,
  onClose,
}: {
  readonly choice: EffortOption;
  readonly isChecked: boolean;
  readonly onEffort: (effort: RunEffort | null) => void;
  readonly onClose: (refocus: boolean) => void;
}): ReactElement => {
  const pick = useCallback((): void => {
    onEffort(toEffortValue(choice));
    onClose(true);
  }, [onEffort, onClose, choice]);

  return (
    <ChoiceItem
      label={EFFORT_LABEL[choice]}
      hint={EFFORT_SHORT[choice]}
      full={EFFORT_HINT[choice]}
      checked={isChecked}
      onPick={pick}
    />
  );
};

export { EffortChoice };
