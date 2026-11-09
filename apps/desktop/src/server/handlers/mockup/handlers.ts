// @generated
import type { MockupActions } from "@design-studio/actions/mockup/index";

import type { Entries } from "../_core/handler.js";
import { handle as exportMockupHandle } from "./export.js";

const MockupEntries = {
  exportMockup: { handle: exportMockupHandle },
} satisfies Entries<typeof MockupActions>;

export { MockupEntries };
