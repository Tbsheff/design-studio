import type { StructureKey } from "@design-studio/contracts";
import type { IconName } from "@design-studio/ui";

import { COPY } from "./copy.js";

interface LayerTool {
  readonly icon: IconName;
  readonly key: StructureKey;
  readonly label: string;
}

const LAYER_TOOLS: readonly LayerTool[] = [
  { icon: "copy", key: "duplicate", label: COPY.toolDuplicate },
  { icon: "layers", key: "group", label: COPY.toolGroup },
  { icon: "frame", key: "wrap", label: COPY.toolWrap },
  { icon: "expand", key: "unwrap", label: COPY.toolUnwrap },
  { icon: "trash", key: "delete", label: COPY.toolDelete },
];

const toToolClass = (key: StructureKey): string => {
  if (key === "delete") {
    return "icon-btn small layers-delete";
  }

  return "icon-btn small";
};

const toAriaDisabled = (isBusy: boolean): true | undefined => {
  if (isBusy) {
    return true;
  }
};

export { LAYER_TOOLS, toAriaDisabled, toToolClass };

export type { LayerTool };
