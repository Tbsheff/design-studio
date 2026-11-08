import { BrandMark, Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { setRail } from "./rail-store-model.js";

const HEAD_ICON_SIZE = 14;

const OpenRailHead = ({
  collapseTip,
}: {
  readonly collapseTip: string;
}): ReactElement => {
  const collapse = useCallback((): void => {
    setRail("mini");
  }, []);

  return (
    <div className="prail-head">
      <button
        type="button"
        className="icon-btn small"
        aria-label={copy.collapseProjects}
        aria-expanded="true"
        data-tip={collapseTip}
        data-tip-align="start"
        onClick={collapse}
      >
        <Icon name="sidebar" size={HEAD_ICON_SIZE} />
      </button>
      <BrandMark />
      <span className="prail-title">{copy.projects}</span>
    </div>
  );
};

export { OpenRailHead };
