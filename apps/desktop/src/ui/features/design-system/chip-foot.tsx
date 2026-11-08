import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";
import { useCallback } from "react";

import { COPY } from "./copy.js";

const ICON_SIZE = 14;

const ChipFoot = ({
  onClose,
  onOpenDesignMd,
}: {
  onClose: (shouldRefocus: boolean) => void;
  onOpenDesignMd: () => void;
}): ReactElement => {
  const open = useCallback((): void => {
    onClose(true);
    onOpenDesignMd();
  }, [onClose, onOpenDesignMd]);

  return (
    <div className="ds-foot">
      <span className="hint">{COPY.textSourceDesignSystemTokens}</span>
      <button type="button" className="btn small has-icon" onClick={open}>
        <Icon name="doc" size={ICON_SIZE} />
        {COPY.textOpenDesignMd}
      </button>
    </div>
  );
};

export { ChipFoot };
