// @generated
import type { PageActions } from "@design-studio/actions/page/index";

import type { Entries } from "../_core/handler.js";
import { handle as importPageHandle } from "./import.js";
import { handle as inspectMatchesPageHandle } from "./inspect-matches.js";
import { handle as updateMatchesPageHandle } from "./update-matches.js";

const PageEntries = {
  importPage: { handle: importPageHandle },
  inspectMatchesPage: { handle: inspectMatchesPageHandle },
  updateMatchesPage: { handle: updateMatchesPageHandle },
} satisfies Entries<typeof PageActions>;

export { PageEntries };
