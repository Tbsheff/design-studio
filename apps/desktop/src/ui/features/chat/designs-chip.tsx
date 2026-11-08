import type { ReactElement } from "react";

import type { PlusMenuProps } from "./composer-menu-model.js";
import { StateChip } from "./state-chip.js";

const DesignsChip = ({
  designs,
  onClear,
}: {
  designs: PlusMenuProps["designs"];
  onClear: () => void;
}): ReactElement | null => {
  if (!designs || designs.value <= 1 || designs.disabledReason !== null) {
    return null;
  }

  return (
    <StateChip
      label={`${designs.value} designs`}
      short={`${designs.value}×`}
      tip={`Send makes ${designs.value} designs side by side.`}
      onClear={onClear}
    />
  );
};

export { DesignsChip };
