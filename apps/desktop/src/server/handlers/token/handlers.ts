// @generated
import type { TokenActions } from "@design-studio/actions/token/index";

import type { Entries } from "../_core/handler.js";
import { handle as applyTokenHandle } from "./apply.js";

const TokenEntries = {
  applyToken: { handle: applyTokenHandle },
} satisfies Entries<typeof TokenActions>;

export { TokenEntries };
