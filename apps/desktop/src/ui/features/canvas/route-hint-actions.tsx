import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { openAppPanel } from "../../platform/app-status.js";
import { copy } from "./copy.js";

const RouteHintActions = ({
  onClose,
}: {
  onClose: () => void;
}): ReactElement => {
  const pickRoute = useCallback(() => openAppPanel("routes"), []);

  return (
    <>
      <button type="button" className="btn small" onClick={pickRoute}>
        {copy.pickARoute}
      </button>
      <button
        type="button"
        className="icon-btn small"
        aria-label={copy.dismiss}
        data-tip={copy.dismiss}
        onClick={onClose}
      >
        <Icon name="close" size={12} />
      </button>
    </>
  );
};

export { RouteHintActions };
