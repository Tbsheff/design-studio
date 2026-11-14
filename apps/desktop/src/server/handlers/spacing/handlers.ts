// @generated
import type { SpacingActions } from "@design-studio/actions/spacing/index";

import type { Entries } from "../_core/handler.js";
import { handle as getDividerSpacingHandle } from "./get-divider.js";
import { handle as getSpacingHandle } from "./get.js";
import { handle as setDividerSpacingHandle } from "./set-divider.js";
import { handle as setSpacingHandle } from "./set.js";

const SpacingEntries = {
  getDividerSpacing: { handle: getDividerSpacingHandle },
  getSpacing: { handle: getSpacingHandle },
  setDividerSpacing: { handle: setDividerSpacingHandle },
  setSpacing: { handle: setSpacingHandle },
} satisfies Entries<typeof SpacingActions>;

export { SpacingEntries };
