import type { PackSummary } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { COPY } from "./copy.js";
import { PackBadges } from "./pack-badges.js";

const DetailHead = ({
  isBusy,
  onClose,
  pack,
}: {
  isBusy: boolean;
  onClose: () => void;
  pack: PackSummary;
}): ReactElement => (
  <div className="modal-head">
    <div className="titles">
      <h2>{pack.name}</h2>
      <p>{pack.description}</p>
      <PackBadges pack={pack} tags={0} />
    </div>
    <button
      type="button"
      className="icon-btn"
      aria-label={COPY.labelCloseDesignSystem}
      onClick={onClose}
      disabled={isBusy}
    >
      <Icon name="close" />
    </button>
  </div>
);

export { DetailHead };
