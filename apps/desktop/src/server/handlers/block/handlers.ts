// @generated
import type { BlockActions } from "@design-studio/actions/block/index";

import type { Entries } from "../_core/handler.js";
import { handle as insertBlockHandle } from "./insert.js";
import { handle as listBlockHandle } from "./list.js";

const BlockEntries = {
  insertBlock: { handle: insertBlockHandle },
  listBlock: { handle: listBlockHandle },
} satisfies Entries<typeof BlockActions>;

export { BlockEntries };
