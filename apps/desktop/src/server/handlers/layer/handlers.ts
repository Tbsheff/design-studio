// @generated
import type { LayerActions } from "@design-studio/actions/layer/index";

import type { Entries } from "../_core/handler.js";
import { handle as renameLayerHandle } from "./rename.js";

const LayerEntries = {
  renameLayer: { handle: renameLayerHandle },
} satisfies Entries<typeof LayerActions>;

export { LayerEntries };
