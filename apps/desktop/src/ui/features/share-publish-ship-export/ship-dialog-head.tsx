import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface ShipDialogHeadProps {
  readonly lead: string;
  readonly isBusy: boolean;
  readonly onClose: () => void;
}

const ShipDialogHead = ({
  isBusy,
  lead,
  onClose,
}: ShipDialogHeadProps): ReactElement => (
  <div className="modal-head">
    <div className="titles">
      <h2>{copy.shipAsA}</h2>
      <p>{lead}</p>
    </div>
    <button
      type="button"
      className="icon-btn"
      aria-label={copy.close}
      onClick={onClose}
      disabled={isBusy}
    >
      <Icon name="close" />
    </button>
  </div>
);

export { ShipDialogHead };
