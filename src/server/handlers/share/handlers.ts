// @generated
import type { ShareActions } from "../../../shared/actions/share/index.js";
import type { Entries } from "../_core/handler.js";
import { handle as listShareHandle } from "./list.js";

const ShareEntries = {
  listShare: { handle: listShareHandle },
} satisfies Entries<typeof ShareActions>;

export { ShareEntries };
