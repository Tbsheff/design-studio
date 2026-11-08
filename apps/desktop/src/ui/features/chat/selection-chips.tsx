import type { SelectionContext } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { SelectionChip } from "./selection-chip.js";

interface SelectionChipsProps {
  readonly onRemove: (selector: string) => void;
  readonly selection: SelectionContext[];
}

const SelectionChips = ({
  selection,
  onRemove,
}: SelectionChipsProps): ReactElement | null => {
  if (selection.length === 0) {
    return null;
  }

  return (
    <div className="chips flex flex-wrap gap-1 px-2 pt-2">
      {selection.map((selected) => (
        <SelectionChip
          key={selected.selector}
          selected={selected}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
};

export { SelectionChips };
