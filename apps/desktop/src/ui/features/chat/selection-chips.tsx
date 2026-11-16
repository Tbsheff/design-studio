import type { SelectionContext } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { SelectionChip } from "./selection-chip.js";
import type { RunFocus } from "./use-run-focus.js";

interface SelectionChipsProps {
  readonly focus: RunFocus;
  readonly onRemove: (selector: string) => void;
  readonly selection: SelectionContext[];
}

const SelectionChips = ({
  focus,
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
          count={selection.length}
          focus={focus}
          selected={selected}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
};

export { SelectionChips };
