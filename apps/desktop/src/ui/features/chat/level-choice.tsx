import type { RunLevel } from "@design-studio/contracts";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { ChoiceItem } from "./choice-item.js";
import { levelGist, levelHint, levelLabel } from "./level-model.js";

const LevelChoice = ({
  item,
  isChecked,
  onLevel,
  onClose,
}: {
  item: RunLevel;
  isChecked: boolean;
  onLevel: (level: RunLevel) => void;
  onClose: (refocus: boolean) => void;
}): ReactElement => {
  const pick = useCallback((): void => {
    onLevel(item);
    onClose(true);
  }, [onLevel, onClose, item]);

  return (
    <ChoiceItem
      label={levelLabel(item)}
      hint={levelGist(item).hint}
      meta={levelGist(item).cost}
      full={levelHint(item)}
      checked={isChecked}
      onPick={pick}
    />
  );
};

export { LevelChoice };
