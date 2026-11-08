import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";
import { useCallback } from "react";

import { uiStore } from "../../platform/storage.js";
import type { LibraryFrom } from "../../platform/storage.js";
import { COPY } from "./copy.js";

const ICON_SIZE = 14;

const ChangePackFoot = ({
  from,
  isBusy,
}: {
  from: LibraryFrom | null;
  isBusy: boolean;
}): ReactElement => {
  const manage = useCallback((): void => {
    uiStore.set({
      activeProjectId: null,
      libraryFrom: from,
      screen: "design-systems",
    });
  }, [from]);

  const create = useCallback((): void => {
    uiStore.set({ activeProjectId: null, screen: "new-design-system" });
  }, []);

  return (
    <div className="modal-foot">
      <button
        type="button"
        className="btn ghost"
        disabled={isBusy}
        onClick={manage}
      >
        {COPY.textManage}
      </button>
      <button
        type="button"
        className="btn ghost has-icon"
        disabled={isBusy}
        onClick={create}
      >
        <Icon name="plus" size={ICON_SIZE} />
        {COPY.textNewDesignSystem2}
      </button>
    </div>
  );
};

export { ChangePackFoot };
