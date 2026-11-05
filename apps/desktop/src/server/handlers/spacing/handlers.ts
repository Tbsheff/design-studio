// @generated
import type { SpacingActions } from "@design-studio/actions/spacing/index";

import type { Entries } from "../_core/handler.js";
import { handle as getSpacingHandle } from "./get.js";
import { handle as setSpacingHandle } from "./set.js";

const SpacingEntries = {
  getSpacing: { handle: getSpacingHandle },
  setSpacing: { handle: setSpacingHandle },
} satisfies Entries<typeof SpacingActions>;

export { SpacingEntries };
