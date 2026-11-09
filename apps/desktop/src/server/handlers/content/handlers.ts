// @generated
import type { ContentActions } from "@design-studio/actions/content/index";

import type { Entries } from "../_core/handler.js";
import { handle as applyContentHandle } from "./apply.js";
import { handle as importContentHandle } from "./import.js";

const ContentEntries = {
  applyContent: { handle: applyContentHandle },
  importContent: { handle: importContentHandle },
} satisfies Entries<typeof ContentActions>;

export { ContentEntries };
