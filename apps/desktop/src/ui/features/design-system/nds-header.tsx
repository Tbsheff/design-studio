import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { COPY } from "./copy.js";

const NdsHeader = ({
  isBusy,
  onCancel,
}: {
  isBusy: boolean;
  onCancel: () => void;
}): ReactElement => (
  <header className="home-header">
    <button
      type="button"
      className="btn ghost small has-icon back-btn"
      onClick={onCancel}
      disabled={isBusy}
    >
      <Icon name="arrowLeft" size={14} />
      {COPY.textBack}
    </button>
  </header>
);

export { NdsHeader };
