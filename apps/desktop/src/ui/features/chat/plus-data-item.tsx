import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { openSampleDataDialog } from "../../platform/sample-data-dialog.js";
import { useUi } from "../../platform/storage.js";
import { copy } from "./copy.js";

const ICON_SIZE = 14;

const PlusDataItem = ({
  onAct,
}: {
  onAct: (run: () => void) => () => void;
}): ReactElement | null => {
  const { activeProjectId } = useUi();
  const handleOpen = onAct(openSampleDataDialog);

  const handlePick = useCallback((): void => {
    handleOpen();
  }, [handleOpen]);

  if (activeProjectId === null) {
    return null;
  }

  return (
    <button
      type="button"
      className="ui-menu-item"
      role="menuitem"
      tabIndex={-1}
      onClick={handlePick}
    >
      <Icon name="layers" size={ICON_SIZE} />
      <span>{copy.sampleData}</span>
    </button>
  );
};

export { PlusDataItem };
