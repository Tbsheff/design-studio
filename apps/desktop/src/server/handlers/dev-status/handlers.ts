// @generated
import type { DevStatusActions } from "@design-studio/actions/dev-status/index";

import type { Entries } from "../_core/handler.js";
import { handle as listDevStatusHandle } from "./list.js";
import { handle as setDevStatusHandle } from "./set.js";

const DevStatusEntries = {
  listDevStatus: { handle: listDevStatusHandle },
  setDevStatus: { handle: setDevStatusHandle },
} satisfies Entries<typeof DevStatusActions>;

export { DevStatusEntries };
