// @generated
import type { PageActions } from "@design-studio/actions/page/index";

import type { Entries } from "../_core/handler.js";
import { handle as importPageHandle } from "./import.js";

const PageEntries = {
  importPage: { handle: importPageHandle },
} satisfies Entries<typeof PageActions>;

export { PageEntries };
