import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { MenuItem } from "./menu-item.js";
import { MenuPanel } from "./menu-panel.js";
import { toFocusLabel } from "./run-focus-model.js";
import type { SelectionChipMenu as ChipMenu } from "./use-selection-chip-menu.js";

const SelectionChipMenu = ({ chip }: { chip: ChipMenu }): ReactElement => {
  const {
    filePath,
    onFileOnly: handleFileOnly,
    onPicture: handlePicture,
  } = chip;

  return (
    <MenuPanel
      panel={chip.panel}
      menu={chip.menu}
      menuClass="selection-chip-menu"
      label={copy.selectionOptions}
    >
      {chip.hasPicture && (
        <MenuItem
          label={copy.sendPicture}
          hint={copy.sendPictureHint}
          checked={chip.isPictureOn}
          onPick={handlePicture}
        />
      )}
      {filePath !== null && (
        <MenuItem
          label={`${copy.onlyChange}${toFocusLabel(filePath)}`}
          hint={copy.onlyChangeHint}
          checked={chip.isFileOnly}
          onPick={handleFileOnly}
        />
      )}
    </MenuPanel>
  );
};

export { SelectionChipMenu };
