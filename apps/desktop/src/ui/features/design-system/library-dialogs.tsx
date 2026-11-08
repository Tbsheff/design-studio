import { useModalDialog } from "@design-studio/ui";
import type { ReactElement, ReactNode } from "react";
import { useCallback } from "react";

const toDialogClass = (isWide: boolean): string => {
  if (isWide) {
    return "modal wide";
  }

  return "modal";
};

const PackDialogShell = ({
  children,
  isBusy,
  isWide,
  label,
  onClose,
}: {
  children: ReactNode;
  isBusy: boolean;
  isWide: boolean;
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
      className={toDialogClass(isWide)}
      aria-label={label}
      onMouseDown={onMouseDown}
    >
      {children}
    </dialog>
  );
};

export { PackDialogShell };
