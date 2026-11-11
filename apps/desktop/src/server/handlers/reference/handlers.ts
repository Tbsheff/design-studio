// @generated
import type { ReferenceActions } from "@design-studio/actions/reference/index";

import type { Entries } from "../_core/handler.js";
import { handle as importReferenceHandle } from "./import.js";
import { handle as listReferenceHandle } from "./list.js";
import { handle as setReferenceHandle } from "./set.js";

const ReferenceEntries = {
  importReference: { handle: importReferenceHandle },
  listReference: { handle: listReferenceHandle },
  setReference: { handle: setReferenceHandle },
} satisfies Entries<typeof ReferenceActions>;

export { ReferenceEntries };
