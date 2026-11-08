import type { InsertableComponent } from "@design-studio/contracts/insert";
import { Icon } from "@design-studio/ui";
import type { MouseEvent, ReactElement } from "react";
import { useCallback } from "react";

import type { MenuAnchor } from "./components-panel-props.js";
import { COPY } from "./copy.js";

const MENU_GAP = 4;

const CardInsertButton = ({
  component,
  onInsertMenu,
}: {
  component: InsertableComponent;
  onInsertMenu: (component: InsertableComponent, at: MenuAnchor) => void;
}): ReactElement => {
  const open = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      const rect = event.currentTarget.getBoundingClientRect();

      onInsertMenu(component, { x: rect.left, y: rect.bottom + MENU_GAP });
    },
    [component, onInsertMenu]
  );

  return (
    <button
      type="button"
      className="icon-btn small cmp-insert"
      aria-label={`Insert ${component.name}`}
      aria-haspopup="menu"
      data-tip={COPY.tipInsertInTheSelection}
      data-testid="component-insert"
      onClick={open}
    >
      <Icon name="plus" size={14} />
    </button>
  );
};

export { CardInsertButton };
