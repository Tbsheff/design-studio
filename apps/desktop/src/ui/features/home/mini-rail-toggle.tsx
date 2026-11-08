import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { setRail } from "./rail-store-model.js";

const ICON_SIZE = 14;

const MiniRailToggle = ({
  showTip,
}: {
  readonly showTip: string;
}): ReactElement => {
  const openRail = useCallback((): void => {
    setRail("open");
  }, []);

  return (
    <div className="prail-head">
      <button
        type="button"
        className="icon-btn small"
        aria-label={copy.showProjects}
        aria-expanded="false"
        data-tip={showTip}
        data-tip-align="start"
        onClick={openRail}
      >
        <Icon name="sidebar" size={ICON_SIZE} />
      </button>
    </div>
  );
};

export { MiniRailToggle };
