import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { useLive } from "../../platform/live-store.js";
import {
  openPrototypeDialog,
  prototypeSource,
} from "../../platform/prototype-dialog.js";
import { copy } from "./copy.js";

const ICON_SIZE = 14;

const PlusPrototypeItem = ({
  onAct,
}: {
  onAct: (run: () => void) => () => void;
}): ReactElement | null => {
  const appProjectId = useLive(prototypeSource);

  const openDialog = useCallback((): void => {
    if (appProjectId !== null) {
      openPrototypeDialog(appProjectId);
    }
  }, [appProjectId]);

  const handleOpen = onAct(openDialog);

  const handlePick = useCallback((): void => {
    handleOpen();
  }, [handleOpen]);

  if (appProjectId === null) {
    return null;
  }

  return (
    <button
      type="button"
      className="ui-menu-item"
      role="menuitem"
      tabIndex={-1}
      onClick={handlePick}
      data-testid="plus-new-prototype"
    >
      <Icon name="doc" size={ICON_SIZE} />
      <span>{copy.newHtmlPrototype}</span>
    </button>
  );
};

export { PlusPrototypeItem };
