import { useCallback } from "react";
import type { KeyboardEvent, ReactElement } from "react";

import type { InspectorTab } from "./inspector-model.js";

const toTabClass = (isSelected: boolean): string => {
  if (isSelected) {
    return "edit-tab on";
  }

  return "edit-tab";
};

const toTabIndex = (isSelected: boolean): number => {
  if (isSelected) {
    return 0;
  }

  return -1;
};

const TabButton = ({
  id,
  label,
  isSelected,
  onTab,
  onKeyDown,
  onRegister,
}: {
  readonly id: InspectorTab;
  readonly label: string;
  readonly isSelected: boolean;
  readonly onTab: (tab: InspectorTab) => void;
  readonly onKeyDown: (event: KeyboardEvent) => void;
  readonly onRegister: (id: InspectorTab, el: HTMLButtonElement | null) => void;
}): ReactElement => {
  const registerButton = useCallback(
    (el: HTMLButtonElement | null) => {
      onRegister(id, el);
    },
    [id, onRegister]
  );

  const selectTab = useCallback(() => {
    onTab(id);
  }, [id, onTab]);

  return (
    <button
      ref={registerButton}
      type="button"
      role="tab"
      id={`edit-tab-${id}`}
      aria-selected={isSelected}
      aria-controls={`edit-pane-${id}`}
      tabIndex={toTabIndex(isSelected)}
      className={toTabClass(isSelected)}
      onClick={selectTab}
      onKeyDown={onKeyDown}
    >
      {label}
    </button>
  );
};

export { TabButton };
