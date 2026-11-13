// @generated
import type { LayerStyleActions } from "@design-studio/actions/layer-style/index";

import type { Entries } from "../_core/handler.js";
import { handle as applyLayerStyleHandle } from "./apply.js";
import { handle as getLayerStyleHandle } from "./get.js";
import { handle as setLayerStyleHandle } from "./set.js";
import { handle as updateLayerStyleHandle } from "./update.js";

const LayerStyleEntries = {
  applyLayerStyle: { handle: applyLayerStyleHandle },
  getLayerStyle: { handle: getLayerStyleHandle },
  setLayerStyle: { handle: setLayerStyleHandle },
  updateLayerStyle: { handle: updateLayerStyleHandle },
} satisfies Entries<typeof LayerStyleActions>;

export { LayerStyleEntries };
