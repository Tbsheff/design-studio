import { Icon } from "@design-studio/ui";
import type { StructureKey } from "@design-studio/contracts";
import type { ReactNode } from "react";

import type { KeyId } from "../../../shared/keymap.js";
import { COPY } from "./copy.js";
import { LayerTools } from "./layer-tools.js";
import { ICON_SIZE } from "./layers-constants.js";

interface LayersHeaderProps {
  readonly frameName: string;
  readonly isBusy: boolean;
  readonly onClose: (() => void) | null;
  readonly onRunTool: ((key: StructureKey) => void) | null;
  readonly toTip: (label: string, id: KeyId) => string;
}

const LayersHeader = ({
  frameName,
  isBusy,
  onClose,
  onRunTool,
  toTip,
}: LayersHeaderProps): ReactNode => (
  <header className="layers-head">
    <span className="layers-title">{COPY.layersTitle}</span>
    <span className="layers-frame" data-tip={frameName}>
      {frameName}
    </span>
    {onRunTool && (
      <LayerTools isBusy={isBusy} onRun={onRunTool} toTip={toTip} />
    )}
    {onClose && (
      <button
        type="button"
        className="icon-btn small"
        aria-label={COPY.labelCloseLayers}
        data-tip={COPY.tipClose1}
        data-tip-align="end"
        onClick={onClose}
      >
        <Icon name="close" size={ICON_SIZE} />
      </button>
    )}
  </header>
);

export { LayersHeader };
