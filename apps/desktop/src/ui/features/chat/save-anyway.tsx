import { useFitPopover } from "@design-studio/ui";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { SaveAnywayPop } from "./save-anyway-pop.js";
import { useDismissPopover } from "./use-dismiss-popover.js";

interface SaveAnywayProps {
  readonly count: number;
  readonly isBusy: boolean;
  readonly onSave: () => void;
}

const toWaitTip = (isBusy: boolean): string | null => {
  if (isBusy) {
    return copy.saveAnywayWait;
  }

  return null;
};

const SaveAnyway = ({
  count,
  isBusy,
  onSave,
}: SaveAnywayProps): ReactElement => {
  const [isOpen, setIsOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const popId = useId();
  useFitPopover(popRef, toggleRef, isOpen);

  const onClose = useCallback((): void => {
    setIsOpen(false);
  }, []);

  const onToggle = useCallback((): void => {
    setIsOpen((value) => !value);
  }, []);

  const onConfirm = useCallback((): void => {
    setIsOpen(false);
    onSave();
  }, [onSave]);

  useDismissPopover(isOpen, popRef, toggleRef, onClose);

  useEffect(() => {
    if (isOpen) {
      confirmRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <span className="draft-save-anyway">
      <button
        ref={toggleRef}
        type="button"
        className="btn ghost small"
        aria-expanded={isOpen}
        aria-controls={popId}
        disabled={isBusy}
        data-tip={toWaitTip(isBusy)}
        onClick={onToggle}
      >
        {copy.saveAnyway}
      </button>
      {isOpen && (
        <SaveAnywayPop
          popRef={popRef}
          confirmRef={confirmRef}
          count={count}
          id={popId}
          onCancel={onClose}
          onConfirm={onConfirm}
        />
      )}
    </span>
  );
};

export { SaveAnyway };
