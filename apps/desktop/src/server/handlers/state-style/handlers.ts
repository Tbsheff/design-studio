// @generated
import type { StateStyleActions } from "@design-studio/actions/state-style/index";

import type { Entries } from "../_core/handler.js";
import { handle as inspectStateStyleHandle } from "./inspect.js";
import { handle as setForcedStateStyleHandle } from "./set-forced.js";
import { handle as setStateStyleHandle } from "./set.js";

const StateStyleEntries = {
  inspectStateStyle: { handle: inspectStateStyleHandle },
  setForcedStateStyle: { handle: setForcedStateStyleHandle },
  setStateStyle: { handle: setStateStyleHandle },
} satisfies Entries<typeof StateStyleActions>;

export { StateStyleEntries };
