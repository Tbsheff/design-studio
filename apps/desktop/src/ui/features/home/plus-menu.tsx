import { useCallback } from "react";
import type { KeyboardEvent, ReactElement, RefObject } from "react";

import { Pop, moveFocus } from "./home-popovers.js";
import type { PlusMenuActions } from "./plus-menu-model.js";
import { PlusMenuSections } from "./plus-menu-sections.js";

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
}: PlusMenuProps): ReactElement => {
  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      moveFocus(event, ".ui-menu-item");
    },
    []
  );

  return (
    <Pop
      trigger={trigger}
      closing={isClosing}
      onClose={onClose}
      variant="ui-menu home-plus-menu"
      label="Add to the project"
      role="menu"
      onKeyDown={onKeyDown}
    >
      <PlusMenuSections
        actions={actions}
        locationLabel={locationLabel}
        onClose={onClose}
      />
    </Pop>
  );
};

export { PlusMenu };

export type { PlusMenuProps };
