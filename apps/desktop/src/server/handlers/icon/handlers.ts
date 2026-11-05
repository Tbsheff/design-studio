// @generated
import type { IconActions } from "@design-studio/actions/icon/index";

import type { Entries } from "../_core/handler.js";
import { handle as insertIconHandle } from "./insert.js";
import { handle as inspectIconHandle } from "./inspect.js";

const IconEntries = {
  insertIcon: { handle: insertIconHandle },
  inspectIcon: { handle: inspectIconHandle },
} satisfies Entries<typeof IconActions>;

export { IconEntries };
