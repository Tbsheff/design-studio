import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { GROUP_ROLE } from "./aria-role-model.js";
import { copy } from "./copy.js";
import { FocusChip } from "./focus-chip.js";
import type { RunFocus } from "./use-run-focus.js";

const FocusChips = ({ focus }: { focus: RunFocus }): ReactElement | null => {
  const { addSelection, paths, remove, selectionPath } = focus;
  const canAdd = selectionPath !== null && !paths.includes(selectionPath);

  if (paths.length === 0 && !canAdd) {
    return null;
  }

  return (
    <div className="skill-chips" role={GROUP_ROLE} aria-label={copy.focusFiles}>
      {paths.map((path) => (
        <FocusChip key={path} path={path} onRemove={remove} />
      ))}
      {canAdd && (
        <button
          type="button"
          className="skill-chip focus-add"
          data-tip-side="top"
          data-tip={selectionPath}
          data-testid="focus-add"
          onClick={addSelection}
        >
          <Icon name="pointer" size={12} />
          {copy.focusOnFile}
        </button>
      )}
    </div>
  );
};

export { FocusChips };
