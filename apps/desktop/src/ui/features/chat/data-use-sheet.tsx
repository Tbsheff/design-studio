import { Icon } from "@design-studio/ui";
import { useEffect } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { useDismiss } from "./use-dismiss.js";

const LOCK_SIZE = 14;

const DataUseSheet = ({
  onClose,
}: {
  readonly onClose: () => void;
}): ReactElement => {
  const ref = useDismiss<HTMLDialogElement>(onClose);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    globalThis.addEventListener("keydown", onKey);

    return (): void => globalThis.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      open
      className="ui-menu data-use-pop"
      aria-label={copy.dataUse}
      data-testid="data-disclosure"
    >
      <div className="ui-menu-label data-use-head">
        <Icon name="lock" size={LOCK_SIZE} />
        {copy.dataUse}
      </div>
      <p className="data-use-text">{copy.dataUseText}</p>
    </dialog>
  );
};

export { DataUseSheet };
