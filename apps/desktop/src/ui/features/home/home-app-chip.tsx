import type { ReactElement, RefObject } from "react";

import { AppChipMain } from "./app-chip-main.js";
import type { AppChip } from "./app-chip-model.js";
import { AppChipRemove } from "./app-chip-remove.js";
import {
  chipBlocker,
  chipName,
  chipProblem,
  getChipLabel,
} from "./chip-logic-model.js";

const toChipClass = (chip: AppChip): string => {
  if (chipProblem(chip) !== null || chipBlocker(chip) !== null) {
    return "home-chip app warn";
  }

  return "home-chip app";
};

const AppChipView = ({
  chip,
  isMenuOpen,
  onMenu,
  onRemove,
  triggerRef,
}: {
  readonly chip: AppChip;
  readonly isMenuOpen: boolean;
  readonly onMenu: () => void;
  readonly onRemove: () => void;
  readonly triggerRef: RefObject<HTMLButtonElement | null>;
}): ReactElement => {
  const name = chipName(chip);

  return (
    <li className={toChipClass(chip)}>
      <AppChipMain
        name={name}
        label={getChipLabel(chip)}
        tip={chip.inspection?.path ?? chip.path}
        isMenuOpen={isMenuOpen}
        onMenu={onMenu}
        triggerRef={triggerRef}
      />
      <AppChipRemove name={name} onRemove={onRemove} />
    </li>
  );
};

export { AppChipView };
