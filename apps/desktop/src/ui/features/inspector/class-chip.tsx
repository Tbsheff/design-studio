import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface ClassChipProps {
  readonly name: string;
  readonly isEditable: boolean;
  readonly onRemove: (name: string) => void;
}

const ClassChip = ({
  name,
  isEditable,
  onRemove,
}: ClassChipProps): ReactElement => {
  const remove = useCallback(() => onRemove(name), [onRemove, name]);

  return (
    <span className="prp-class">
      <code>{name}</code>
      {isEditable && (
        <button
          type="button"
          className="prp-class-x"
          aria-label={`Remove ${name}`}
          onClick={remove}
        >
          {copy.times}
        </button>
      )}
    </span>
  );
};

export { ClassChip };
