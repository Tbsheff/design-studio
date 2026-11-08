// @generated
import type { ReferenceActions } from "@design-studio/actions/reference/index";

import type { Entries } from "../_core/handler.js";
import { handle as importReferenceHandle } from "./import.js";

const ReferenceEntries = {
  importReference: { handle: importReferenceHandle },
} satisfies Entries<typeof ReferenceActions>;

export { ReferenceEntries };
