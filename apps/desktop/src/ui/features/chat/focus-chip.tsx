import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toFocusLabel } from "./run-focus-model.js";

const FocusChip = ({
  onRemove,
  path,
}: {
  onRemove: (path: string) => void;
  path: string;
}): ReactElement => {
  const remove = useCallback(() => onRemove(path), [onRemove, path]);

  return (
    <span
      className="skill-chip focus-chip"
      data-tip-side="top"
      data-tip={path}
      data-testid="focus-chip"
    >
      <Icon name="pointer" size={12} />
      {toFocusLabel(path)}
      <button
        type="button"
        aria-label={`${copy.removeFocus} ${toFocusLabel(path)}`}
        onClick={remove}
      >
        <Icon name="close" size={11} />
      </button>
    </span>
  );
};

export { FocusChip };
