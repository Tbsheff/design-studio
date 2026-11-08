import { useCallback } from "react";
import type { ReactElement } from "react";

import { pick } from "../../platform/pick.js";
import { copy } from "./copy.js";

const ActivityUndo = ({
  before,
  isLocked,
  isUndone,
  onUndo,
}: {
  before: string;
  isLocked: boolean;
  isUndone: boolean;
  onUndo: (versionId: string) => void;
}): ReactElement => {
  const undo = useCallback(() => onUndo(before), [onUndo, before]);

  if (isUndone) {
    return <span className="mcp-row-undone">{copy.undone}</span>;
  }

  return (
    <button
      type="button"
      className="mcp-row-undo"
      disabled={isLocked}
      data-tip={pick(
        isLocked,
        "Wait for the run to finish",
        "Restore the version before this edit"
      )}
      data-tip-align="end"
      onClick={undo}
    >
      {copy.undo}
    </button>
  );
};

export { ActivityUndo };
