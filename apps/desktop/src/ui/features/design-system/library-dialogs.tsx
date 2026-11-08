import { useModalDialog } from "@design-studio/ui";
import type { ReactElement, ReactNode } from "react";
import { useCallback } from "react";

const PackDialogShell = ({
  children,
  isBusy,
  label,
  onClose,
}: {
  children: ReactNode;
  isBusy: boolean;
  label: string;
  onClose: () => void;
}): ReactElement => {
  const dismiss = useCallback((): false | undefined => {
    if (isBusy) {
      return false;
    }

    onClose();
  }, [isBusy, onClose]);

  const { onMouseDown, ref } = useModalDialog(dismiss);

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-label={label}
      onMouseDown={onMouseDown}
    >
      {children}
    </dialog>
  );
};

export { PackDialogShell };
