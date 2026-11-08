import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { setRail } from "./rail-store-model.js";

const ICON_SIZE = 14;

interface MiniRailFootProps {
  readonly showTip: string;
  readonly onNewPrototype: () => void;
}

const MiniRailFoot = ({
  showTip,
  onNewPrototype,
}: MiniRailFootProps): ReactElement => {
  const openRail = useCallback((): void => {
    setRail("open");
  }, []);

  return (
    <div className="prail-foot">
      <button
        type="button"
        className="icon-btn small"
        aria-label={copy.newPrototype}
        data-tip={copy.newPrototype}
        data-tip-side="top"
        data-tip-align="start"
        onClick={onNewPrototype}
      >
        <Icon name="plus" size={ICON_SIZE} />
      </button>
      <button
        type="button"
        className="icon-btn small"
        aria-label={copy.showProjects}
        aria-expanded="false"
        data-tip={showTip}
        data-tip-side="top"
        data-tip-align="start"
        onClick={openRail}
      >
        <Icon name="sidebar" size={ICON_SIZE} />
      </button>
    </div>
  );
};

export { MiniRailFoot };
