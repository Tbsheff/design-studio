import { useCallback } from "react";
import type { ReactElement } from "react";

import { pick } from "../../platform/pick.js";
import type { Tab } from "./app-tabs";

interface AppPanelTabButtonProps {
  readonly id: Tab;
  readonly isSelected: boolean;
  readonly label: string;
  readonly onSelect: (tab: Tab) => void;
}

const AppPanelTabButton = ({
  id,
  isSelected,
  label,
  onSelect,
}: AppPanelTabButtonProps): ReactElement => {
  const selectTab = useCallback(() => onSelect(id), [id, onSelect]);

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      className={pick(isSelected, "on", "")}
      onClick={selectTab}
    >
      {label}
    </button>
  );
};

export { AppPanelTabButton };
