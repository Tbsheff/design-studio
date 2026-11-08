import { Icon } from "@design-studio/ui";
import type { StructureKey } from "@design-studio/contracts";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { STRUCTURE_KEY_IDS } from "../../../shared/structure-keys.js";
import type { KeyId } from "../../../shared/keymap.js";
import { ICON_SIZE } from "./layers-constants.js";
import { toAriaDisabled, toToolClass } from "./layer-tools-model.js";
import type { LayerTool } from "./layer-tools-model.js";

interface LayerToolButtonProps {
  readonly isBusy: boolean;
  readonly onRun: (key: StructureKey) => void;
  readonly toTip: (label: string, id: KeyId) => string;
  readonly tool: LayerTool;
}

const LayerToolButton = ({
  isBusy,
  onRun,
  toTip,
  tool,
}: LayerToolButtonProps): ReactNode => {
  const handleRunTool = useCallback((): void => {
    if (!isBusy) {
      onRun(tool.key);
    }
  }, [isBusy, onRun, tool.key]);

  return (
    <button
      type="button"
      className={toToolClass(tool.key)}
      aria-label={tool.label}
      aria-disabled={toAriaDisabled(isBusy)}
      data-tip={toTip(tool.label, STRUCTURE_KEY_IDS[tool.key])}
      data-tip-align="end"
      onClick={handleRunTool}
    >
      <Icon name={tool.icon} size={ICON_SIZE} />
    </button>
  );
};

export { LayerToolButton };
