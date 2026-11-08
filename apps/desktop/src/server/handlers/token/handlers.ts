// @generated
import type { TokenActions } from "@design-studio/actions/token/index";

import type { Entries } from "../_core/handler.js";
import { handle as applyTokenHandle } from "./apply.js";
import { handle as exportTokenHandle } from "./export.js";

const TokenEntries = {
  applyToken: { handle: applyTokenHandle },
  exportToken: { handle: exportTokenHandle },
} satisfies Entries<typeof TokenActions>;

export { TokenEntries };
