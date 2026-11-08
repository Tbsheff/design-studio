import { useCallback } from "react";
import type { ReactElement } from "react";

import { pick } from "./deps.js";

interface TabButtonProps<Tab extends string> {
  readonly id: Tab;
  readonly isSelected: boolean;
  readonly label: string;
  readonly onSelect: (tab: Tab) => void;
}

const CritiqueTabButton = <Tab extends string>({
  id,
  isSelected,
  label,
  onSelect,
}: TabButtonProps<Tab>): ReactElement => {
  const handleSelect = useCallback(() => onSelect(id), [id, onSelect]);

  return (
    <button
      aria-selected={isSelected}
      className={pick(isSelected, "on", "")}
      onClick={handleSelect}
      role="tab"
      type="button"
    >
      {label}
    </button>
  );
};

export { CritiqueTabButton };
