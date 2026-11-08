// @generated
import type { LayerStyleActions } from "@design-studio/actions/layer-style/index";

import type { Entries } from "../_core/handler.js";
import { handle as applyLayerStyleHandle } from "./apply.js";
import { handle as getLayerStyleHandle } from "./get.js";

const LayerStyleEntries = {
  applyLayerStyle: { handle: applyLayerStyleHandle },
  getLayerStyle: { handle: getLayerStyleHandle },
} satisfies Entries<typeof LayerStyleActions>;

export { LayerStyleEntries };
