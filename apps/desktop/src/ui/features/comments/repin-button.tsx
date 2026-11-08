import type { ReactElement } from "react";
import { useCallback } from "react";

import type { DesignComment } from "./deps.js";
import type { CommentsControl } from "./use-comments.js";

const toRepinLabel = (isActive: boolean): string => {
  if (isActive) {
    return "Pick an element…";
  }

  return "Re-pin";
};

const RepinButton = ({
  comment,
  control,
}: {
  comment: DesignComment;
  control: CommentsControl;
}): ReactElement => {
  const isActive = control.repinId === comment.id;
  const { setRepinId } = control;

  const toggle = useCallback((): void => {
    if (isActive) {
      setRepinId(null);

      return;
    }

    setRepinId(comment.id);
  }, [comment.id, isActive, setRepinId]);

  return (
    <button
      type="button"
      className="btn small"
      aria-pressed={isActive}
      onClick={toggle}
    >
      {toRepinLabel(isActive)}
    </button>
  );
};

export { RepinButton };
