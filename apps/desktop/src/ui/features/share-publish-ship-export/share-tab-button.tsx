import { useCallback } from "react";
import type { ReactElement } from "react";

import { pick } from "../../platform/pick.js";
import type { ShareMode } from "./share-mode.js";

interface ShareTabButtonProps {
  readonly id: ShareMode;
  readonly label: string;
  readonly isSelected: boolean;
  readonly onMode: (mode: ShareMode) => void;
}

const TAB_ROLE = "tab";

const ShareTabButton = ({
  id,
  isSelected,
  label,
  onMode,
}: ShareTabButtonProps): ReactElement => {
  const selectTab = useCallback((): void => {
    onMode(id);
  }, [id, onMode]);

  return (
    <button
      type="button"
      role={TAB_ROLE}
      aria-selected={isSelected}
      className={pick(isSelected, "on", "")}
      onClick={selectTab}
    >
      {label}
    </button>
  );
};

export { ShareTabButton };
