// @generated
import type { TokenActions } from "../../../shared/actions/token/index.js";
import type { Entries } from "../_core/handler.js";
import { handle as applyTokenHandle } from "./apply.js";

const TokenEntries = {
  applyToken: { handle: applyTokenHandle },
} satisfies Entries<typeof TokenActions>;

export { TokenEntries };
