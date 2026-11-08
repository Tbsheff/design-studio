import { Icon } from "@design-studio/ui";
import type { ReactElement, RefObject } from "react";

import { copy } from "./copy.js";

const RunDetailsHead = ({
  closeButton,
  onClose,
}: {
  closeButton: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}): ReactElement => (
  <div className="drawer-head">
    <strong>{copy.runDetails}</strong>
    <div className="spacer" />
    <button
      ref={closeButton}
      type="button"
      className="icon-btn"
      aria-label={copy.close}
      data-tip={copy.close}
      data-tip-align="end"
      onClick={onClose}
    >
      <Icon name="close" />
    </button>
  </div>
);

export { RunDetailsHead };
