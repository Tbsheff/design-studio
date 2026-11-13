import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { toZoomText } from "./canvas-view-model.js";
import { copy } from "./copy.js";

interface ShareZoomBarProps {
  readonly scale: number;
  readonly onFit: () => void;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
}

const ShareZoomBar = ({
  onFit,
  onZoomIn,
  onZoomOut,
  scale,
}: ShareZoomBarProps): ReactElement => (
  <div className="share-zoom ui-menu">
    <button
      type="button"
      className="btn ghost icon"
      aria-label={copy.zoomOut}
      data-tip={copy.zoomOut}
      onClick={onZoomOut}
    >
      <Icon name="minus" />
    </button>
    <button
      type="button"
      className="btn ghost"
      data-tip={copy.fit}
      onClick={onFit}
    >
      {toZoomText(scale)}
    </button>
    <button
      type="button"
      className="btn ghost icon"
      aria-label={copy.zoomIn}
      data-tip={copy.zoomIn}
      onClick={onZoomIn}
    >
      <Icon name="plus" />
    </button>
  </div>
);

export { ShareZoomBar };
