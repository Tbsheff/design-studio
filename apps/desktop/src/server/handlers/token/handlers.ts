// @generated
import type { TokenActions } from "@design-studio/actions/token/index";

import type { Entries } from "../_core/handler.js";
import { handle as applyTokenHandle } from "./apply.js";
import { handle as exportTokenHandle } from "./export.js";
import { handle as setTokenHandle } from "./set.js";

const TokenEntries = {
  applyToken: { handle: applyTokenHandle },
  exportToken: { handle: exportTokenHandle },
  setToken: { handle: setTokenHandle },
} satisfies Entries<typeof TokenActions>;

export { TokenEntries };
