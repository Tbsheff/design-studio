import type { StyleValueRow } from "@design-studio/contracts/style-search";
import type { ReactElement } from "react";
import { useCallback } from "react";

import { toShownValue } from "./match-candidates-model.js";
import { MatchMenuPopup } from "./match-menu-popup.js";
import { MatchMenuTrigger } from "./match-menu-trigger.js";
import type { RowActions } from "./match-rows-model.js";
import { useRowMenu } from "./use-row-menu.js";

const RowMenu = ({
  row,
  actions,
  replaceLabel,
}: {
  readonly row: StyleValueRow;
  readonly actions: RowActions;
  readonly replaceLabel: string;
}): ReactElement => {
  const { close, firstItemRef, isOpen, menuRef, rootRef, toggle, triggerRef } =
    useRowMenu();

  const selectValue = useCallback(() => {
    close();
    actions.selectValue(row);
  }, [close, actions, row]);

  const replace = useCallback(() => {
    close();
    actions.replace(row);
  }, [close, actions, row]);

  return (
    <div className="sm-menu-root" ref={rootRef}>
      <MatchMenuTrigger
        triggerRef={triggerRef}
        isOpen={isOpen}
        label={`Actions for ${toShownValue(row)}`}
        onToggle={toggle}
      />
      {isOpen && (
        <MatchMenuPopup
          row={row}
          actions={actions}
          replaceLabel={replaceLabel}
          firstItemRef={firstItemRef}
          menuRef={menuRef}
          onSelectValue={selectValue}
          onReplace={replace}
          onDone={close}
        />
      )}
    </div>
  );
};

export { RowMenu };
