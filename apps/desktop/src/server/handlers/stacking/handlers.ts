// @generated
import type { StackingActions } from "@design-studio/actions/stacking/index";

import type { Entries } from "../_core/handler.js";
import { handle as getStackingHandle } from "./get.js";
import { handle as setStackingHandle } from "./set.js";

const StackingEntries = {
  getStacking: { handle: getStackingHandle },
  setStacking: { handle: setStackingHandle },
} satisfies Entries<typeof StackingActions>;

export { StackingEntries };
