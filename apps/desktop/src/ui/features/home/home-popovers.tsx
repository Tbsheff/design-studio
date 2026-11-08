import type { RunLevel } from "@design-studio/contracts";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { VariationsControl } from "../canvas/variations-control.js";
import {
  ChoiceItem,
  levelGist,
  levelHint,
  levelLabel,
} from "../chat/level-control.js";

interface LevelChoiceProps {
  readonly item: RunLevel;
  readonly level: RunLevel;
  readonly onLevel: (level: RunLevel) => void;
  readonly onClose: (refocus: boolean) => void;
}

const LevelChoice = ({
  item,
  level,
  onLevel,
  onClose,
}: LevelChoiceProps): ReactElement => {
  const pick = useCallback((): void => {
    onLevel(item);
    onClose(true);
  }, [item, onClose, onLevel]);

  return (
    <ChoiceItem
      label={levelLabel(item)}
      hint={levelGist(item).hint}
      meta={levelGist(item).cost}
      full={levelHint(item)}
      checked={level === item}
      focusable
      onPick={pick}
    />
  );
};

export { LevelChoice, VariationsControl };
