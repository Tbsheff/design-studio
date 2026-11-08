import type { ReactElement } from "react";
import { useCallback } from "react";

import type { ChipDialog } from "./chip-model.js";

const ChipActionButton = ({
  dialog,
  label,
  onOpen,
}: {
  dialog: ChipDialog;
  label: string;
  onOpen: (dialog: ChipDialog) => void;
}): ReactElement => {
  const open = useCallback((): void => {
    onOpen(dialog);
  }, [dialog, onOpen]);

  return (
    <button type="button" className="btn small" onClick={open}>
      {label}
    </button>
  );
};

export { ChipActionButton };
