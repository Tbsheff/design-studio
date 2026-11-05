// @generated
import type { FillActions } from "@design-studio/actions/fill/index";

import type { Entries } from "../_core/handler.js";
import { handle as getFillHandle } from "./get.js";
import { handle as setFillHandle } from "./set.js";

const FillEntries = {
  getFill: { handle: getFillHandle },
  setFill: { handle: setFillHandle },
} satisfies Entries<typeof FillActions>;

export { FillEntries };
