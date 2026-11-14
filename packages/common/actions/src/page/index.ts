import { importSourcePage } from "./import-source.js";
// @generated
import { importPage } from "./import.js";
import { inspectFlowPage } from "./inspect-flow.js";
import { inspectMatchesPage } from "./inspect-matches.js";
import { inspectSourceChangesPage } from "./inspect-source-changes.js";
import { inspectSourcePage } from "./inspect-source.js";
import { setSourcePage } from "./set-source.js";
import { updateMatchesPage } from "./update-matches.js";

const PageActions = {
  importPage,
  importSourcePage,
  inspectFlowPage,
  inspectMatchesPage,
  inspectSourceChangesPage,
  inspectSourcePage,
  setSourcePage,
  updateMatchesPage,
} as const;

export { PageActions };
