import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";
import { useCallback } from "react";

import { COPY } from "./copy.js";
import { DmdTitle } from "./dmd-title.js";

const DmdHead = ({
  isDirty,
  onClose,
}: {
  isDirty: boolean;
  onClose: () => false | undefined;
}): ReactElement => {
  const close = useCallback((): void => {
    onClose();
  }, [onClose]);

  return (
    <div className="modal-head">
      <div className="titles">
        <DmdTitle isDirty={isDirty} />
        <p>{COPY.textTheAgentReadsThis}</p>
      </div>
      <button
        type="button"
        className="icon-btn"
        aria-label={COPY.labelCloseDesignMd}
        onClick={close}
      >
        <Icon name="close" />
      </button>
    </div>
  );
};

export { DmdHead };
