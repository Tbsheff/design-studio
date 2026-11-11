// @generated
import type { VariationActions } from "@design-studio/actions/variation/index";

import type { Entries } from "../_core/handler.js";
import { handle as startVariationHandle } from "./start.js";

const VariationEntries = {
  startVariation: { handle: startVariationHandle },
} satisfies Entries<typeof VariationActions>;

export { VariationEntries };
