import type { StructureKey } from "@design-studio/contracts";
import type { ReactNode } from "react";

import type { KeyId } from "../../../shared/keymap.js";
import { COPY } from "./copy.js";
import { LayerToolButton } from "./layer-tool-button.js";
import { LAYER_TOOLS } from "./layer-tools-model.js";

interface LayerToolsProps {
  readonly isBusy: boolean;
  readonly onRun: (key: StructureKey) => void;
  readonly toTip: (label: string, id: KeyId) => string;
}

const LayerTools = ({ isBusy, onRun, toTip }: LayerToolsProps): ReactNode => (
  <div
    className="layers-tools"
    role="toolbar"
    aria-label={COPY.labelLayerActions}
  >
    {LAYER_TOOLS.map((tool) => (
      <LayerToolButton
        key={tool.key}
        isBusy={isBusy}
        onRun={onRun}
        toTip={toTip}
        tool={tool}
      />
    ))}
  </div>
);

export { LayerTools };
