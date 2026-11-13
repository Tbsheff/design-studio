// @generated
import type { PageActions } from "@design-studio/actions/page/index";

import type { Entries } from "../_core/handler.js";
import { handle as importSourcePageHandle } from "./import-source.js";
import { handle as importPageHandle } from "./import.js";
import { handle as inspectMatchesPageHandle } from "./inspect-matches.js";
import { handle as inspectSourceChangesPageHandle } from "./inspect-source-changes.js";
import { handle as inspectSourcePageHandle } from "./inspect-source.js";
import { handle as setSourcePageHandle } from "./set-source.js";
import { handle as updateMatchesPageHandle } from "./update-matches.js";

const PageEntries = {
  importPage: { handle: importPageHandle },
  importSourcePage: { handle: importSourcePageHandle },
  inspectMatchesPage: { handle: inspectMatchesPageHandle },
  inspectSourceChangesPage: { handle: inspectSourceChangesPageHandle },
  inspectSourcePage: { handle: inspectSourcePageHandle },
  setSourcePage: { handle: setSourcePageHandle },
  updateMatchesPage: { handle: updateMatchesPageHandle },
} satisfies Entries<typeof PageActions>;

export { PageEntries };
