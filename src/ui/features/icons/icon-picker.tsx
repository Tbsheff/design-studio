import { useCallback, useId, useMemo } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { useModalDialog } from "./deps.js";
import type { SelectionContext } from "./deps.js";
import type { IconMode } from "./icon-target.js";
import { PickerBody } from "./picker-body.js";
import { PickerFoot } from "./picker-foot.js";
import { PickerHead } from "./picker-head.js";
import type { SearchIds } from "./use-icon-search.js";
import { usePicker } from "./use-picker.js";

import styles from "./icons.module.css";

interface IconPickerProps {
  readonly directionId: string;
  readonly mode: IconMode;
  readonly onClose: () => void;
  readonly onDone: (message: string) => void;
  readonly projectId: string;
  readonly target: SelectionContext;
}

const TITLES = { insert: copy.insert, swap: copy.swap } as const;

const IconPicker = (props: IconPickerProps): ReactElement => {
  const { directionId, mode, onClose, onDone, projectId, target } = props;
  const gridId = useId();
  const hintId = useId();

  const ids: SearchIds = useMemo(
    () => ({ directionId, projectId }),
    [directionId, projectId]
  );

  const setup = useMemo(
    () => ({ ids, mode, onClose, onDone, target }),
    [ids, mode, onClose, onDone, target]
  );

  const picker = usePicker(setup);
  const { busy } = picker.insert;

  const handleDismiss = useCallback((): boolean => {
    if (busy) {
      return false;
    }

    onClose();

    return true;
  }, [busy, onClose]);

  const { ref } = useModalDialog(handleDismiss);
  const title = TITLES[mode];

  return (
    <dialog aria-label={title} className={`modal ${styles.dialog}`} ref={ref}>
      <form className="modal-form" noValidate onSubmit={picker.handleSubmit}>
        <PickerHead hintId={hintId} title={title} />
        <PickerBody gridId={gridId} hintId={hintId} picker={picker} />
        <PickerFoot mode={mode} picker={picker} onCancel={onClose} />
      </form>
    </dialog>
  );
};

export { IconPicker };

export type { IconPickerProps };
