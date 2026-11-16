import type { ReactElement } from "react";

import type { PlusMenuProps } from "./composer-menu-model.js";
import { copy } from "./copy.js";
import { MenuItem } from "./menu-item.js";
import { MenuSection } from "./menu-section.js";
import { PlusDataItem } from "./plus-data-item.js";
import { PlusProjectSection } from "./plus-project-section.js";
import { PlusPrototypeItem } from "./plus-prototype-item.js";

const PlusMenuBody = ({
  menuProps,
  onAct,
}: {
  menuProps: PlusMenuProps;
  onAct: (run: () => void) => () => void;
}): ReactElement => (
  <>
    <MenuSection label="Add">
      <MenuItem
        icon="paperclip"
        label="Attach image"
        onPick={onAct(menuProps.onAttach)}
      />
      <MenuItem
        icon="folder"
        label={copy.attachFolder}
        onPick={onAct(menuProps.onAttachFolder)}
      />
      <MenuItem
        icon="file"
        label={copy.attachZipOrFile}
        onPick={onAct(menuProps.onAttachZip)}
      />
      <MenuItem
        icon="globe"
        label={copy.attachWebPage}
        onPick={onAct(menuProps.onAttachUrl)}
      />
      <MenuItem
        icon="file"
        label="Mention a file or token"
        meta="@"
        onPick={onAct(menuProps.onMention)}
      />
      {menuProps.onFocusSelection && (
        <MenuItem
          icon="pointer"
          label={copy.focusOnFile}
          onPick={onAct(menuProps.onFocusSelection)}
        />
      )}
      <MenuItem
        icon="book"
        label="Skills and commands"
        meta="/"
        onPick={onAct(menuProps.onSkills)}
      />
      <PlusDataItem onAct={onAct} />
      <PlusPrototypeItem onAct={onAct} />
    </MenuSection>
    <PlusProjectSection project={menuProps.project ?? null} onAct={onAct} />
  </>
);

export { PlusMenuBody };
