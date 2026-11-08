import type { ReactElement, RefObject } from "react";

import type { PlusMenuActions } from "./plus-menu-model.js";
import { PlusMenuSections } from "./plus-menu-sections.js";
import { Pop } from "./pop.js";
import { moveFocusInMenu } from "./popover-focus-model.js";

interface PlusMenuProps {
  readonly trigger: RefObject<HTMLElement | null>;
  readonly onClose: (shouldRefocus: boolean) => void;
  readonly actions: PlusMenuActions;
  readonly locationLabel: string;
  readonly isClosing: boolean;
}

const PlusMenu = ({
  trigger,
  onClose,
  actions,
  locationLabel,
  isClosing,
}: PlusMenuProps): ReactElement => (
  <Pop
    trigger={trigger}
    closing={isClosing}
    onClose={onClose}
    variant="ui-menu home-plus-menu"
    label="Add to the project"
    role="menu"
    onKeyDown={moveFocusInMenu}
  >
    <PlusMenuSections
      actions={actions}
      locationLabel={locationLabel}
      onClose={onClose}
    />
  </Pop>
);

export { PlusMenu };

export type { PlusMenuProps };
