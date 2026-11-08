import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { COPY } from "./copy.js";

const DoctorCardHead = ({
  onClose,
  title,
}: {
  onClose: () => void;
  title: string;
}): ReactElement => (
  <div className="app-fail-head">
    <Icon name="alert" size={14} />
    <strong className="grow">{title}</strong>
    <button
      type="button"
      className="icon-btn small"
      aria-label={COPY.labelDismiss}
      data-tip={COPY.tipDismiss}
      onClick={onClose}
    >
      <Icon name="close" size={12} />
    </button>
  </div>
);

export { DoctorCardHead };
